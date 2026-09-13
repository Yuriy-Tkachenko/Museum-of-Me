create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('exhibits', 'exhibits', true)
on conflict (id) do update set public = excluded.public;

create type public.museum_status as enum ('collecting', 'unlocked');
create type public.exhibit_media_type as enum ('image', 'video', 'audio', 'link', 'text');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,32}$'),
  constraint profiles_display_name_not_blank check (length(trim(display_name)) > 0)
);

create table public.museums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  theme text not null default 'paper',
  required_exhibits integer not null default 5,
  status public.museum_status not null default 'collecting',
  created_at timestamptz not null default now(),
  unlocked_at timestamptz,
  constraint museums_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint museums_title_not_blank check (length(trim(title)) > 0),
  constraint museums_required_exhibits_positive check (required_exhibits > 0),
  constraint museums_unlock_state_consistent check (
    (status = 'collecting' and unlocked_at is null)
    or (status = 'unlocked' and unlocked_at is not null)
  )
);

create table public.invite_links (
  id uuid primary key default gen_random_uuid(),
  museum_id uuid not null references public.museums(id) on delete cascade,
  token text not null unique,
  max_submissions integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint invite_links_id_museum_id_unique unique (id, museum_id),
  constraint invite_links_token_format check (token ~ '^[A-Za-z0-9_-]{8,128}$'),
  constraint invite_links_max_submissions_positive check (max_submissions > 0)
);

create table public.exhibits (
  id uuid primary key default gen_random_uuid(),
  museum_id uuid not null references public.museums(id) on delete cascade,
  invite_id uuid not null,
  title text not null,
  caption text,
  media_type public.exhibit_media_type not null default 'text',
  image_url text,
  image_source text,
  image_source_id text,
  image_author text,
  created_at timestamptz not null default now(),
  constraint exhibits_title_not_blank check (length(trim(title)) > 0),
  constraint exhibits_invite_museum_fk foreign key (invite_id, museum_id)
    references public.invite_links(id, museum_id) on delete restrict,
  constraint exhibits_image_metadata_consistent check (
    (media_type = 'image' and image_url is not null)
    or media_type <> 'image'
  )
);

create index profiles_user_id_idx on public.profiles(user_id);
create index museums_owner_id_idx on public.museums(owner_id);
create index museums_status_idx on public.museums(status);
create index invite_links_museum_id_idx on public.invite_links(museum_id);
create index invite_links_expires_at_idx on public.invite_links(expires_at);
create index exhibits_museum_id_idx on public.exhibits(museum_id);
create index exhibits_invite_id_idx on public.exhibits(invite_id);
create index exhibits_created_at_idx on public.exhibits(created_at desc);

alter table public.profiles enable row level security;
alter table public.museums enable row level security;
alter table public.invite_links enable row level security;
alter table public.exhibits enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "museums_select_own"
  on public.museums for select
  using (auth.uid() = owner_id);

create policy "museums_insert_own"
  on public.museums for insert
  with check (auth.uid() = owner_id);

create policy "museums_update_own"
  on public.museums for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "museums_delete_own"
  on public.museums for delete
  using (auth.uid() = owner_id);

create policy "invite_links_select_own_museum"
  on public.invite_links for select
  using (exists (
    select 1 from public.museums
    where museums.id = invite_links.museum_id
      and museums.owner_id = auth.uid()
  ));

create policy "invite_links_insert_own_museum"
  on public.invite_links for insert
  with check (exists (
    select 1 from public.museums
    where museums.id = invite_links.museum_id
      and museums.owner_id = auth.uid()
  ));

create policy "invite_links_update_own_museum"
  on public.invite_links for update
  using (exists (
    select 1 from public.museums
    where museums.id = invite_links.museum_id
      and museums.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.museums
    where museums.id = invite_links.museum_id
      and museums.owner_id = auth.uid()
  ));

create policy "invite_links_delete_own_museum"
  on public.invite_links for delete
  using (exists (
    select 1 from public.museums
    where museums.id = invite_links.museum_id
      and museums.owner_id = auth.uid()
  ));

-- Deliberately no INSERT/UPDATE/DELETE policies: exhibits are written only by a server Route Handler.
create policy "exhibits_select_own_museum"
  on public.exhibits for select
  using (exists (
    select 1 from public.museums
    where museums.id = exhibits.museum_id
      and museums.owner_id = auth.uid()
  ));
