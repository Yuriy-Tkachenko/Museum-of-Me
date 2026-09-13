begin;
-- Browser writes would bypass server limits and reveal rules.
revoke insert, update, delete on public.museums, public.invite_links, public.exhibits from anon, authenticated;
revoke select on public.exhibits from anon, authenticated;
grant select (id, museum_id, invite_id, title, caption, media_type, image_url, image_source, image_source_id, image_author, created_at) on public.exhibits to authenticated;
drop policy museums_insert_own on public.museums;
drop policy museums_update_own on public.museums;
drop policy invite_links_insert_own_museum on public.invite_links;
drop policy invite_links_update_own_museum on public.invite_links;
drop policy exhibits_select_own_museum on public.exhibits;
create policy exhibits_select_own_unlocked on public.exhibits for select to authenticated
  using (exists (select 1 from public.museums m where m.id = exhibits.museum_id and m.owner_id = auth.uid() and m.status = 'unlocked'));

alter table public.museums add column collected_exhibits integer not null default 0;
alter table public.museums drop constraint museums_slug_format;
alter table public.museums add constraint museums_slug_format check (slug ~ '^[a-z0-9_]+(?:-[a-z0-9_]+)*$');
update public.museums m set collected_exhibits = (select count(*) from public.exhibits e where e.museum_id = m.id);
alter table public.museums add constraint museums_field_limits check (length(title) <= 100 and length(slug) <= 64 and length(theme) <= 32 and required_exhibits between 1 and 100) not valid;
alter table public.profiles add constraint profiles_field_limits check (length(display_name) <= 80 and (avatar_url is null or length(avatar_url) <= 2048)) not valid;
alter table public.exhibits add constraint exhibits_field_limits check (length(title) <= 120 and length(caption) <= 300 and length(image_url) <= 2048 and length(image_source_id) <= 120 and length(image_author) <= 160) not valid;
alter table public.invite_links add constraint invite_submission_limit check (max_submissions between 1 and 100) not valid;
-- Rotate weak demo/legacy tokens; owners see replacements in their dashboard.
update public.invite_links set token = encode(gen_random_bytes(32), 'hex') where token !~ '^([a-f0-9]{64}|m-[a-f0-9]{32})$';
alter table public.invite_links drop constraint invite_links_token_format;
alter table public.invite_links add constraint invite_links_token_format check (token ~ '^([a-f0-9]{64}|m-[a-f0-9]{32})$');
alter table public.invite_links alter column token set default encode(gen_random_bytes(32), 'hex');
alter table public.exhibits add column submission_id uuid;
alter table public.exhibits add column visitor_hash text;
create unique index exhibits_submission_once on public.exhibits(invite_id, submission_id);
create unique index exhibits_visitor_once on public.exhibits(invite_id, visitor_hash);

update storage.buckets set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/webp'] where id = 'exhibits';
create policy exhibits_storage_server_only on storage.objects as restrictive for all to anon, authenticated
  using (bucket_id <> 'exhibits') with check (bucket_id <> 'exhibits');

create table public.request_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
create index request_limits_expiry on public.request_limits(expires_at);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon, authenticated;
create function public.consume_rate_limit(p_key text, p_limit integer, p_seconds integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_hits integer; v_expires timestamptz; v_now timestamptz := clock_timestamp();
begin
  if p_limit < 1 or p_seconds not between 1 and 86400 or length(p_key) <> 64 then raise exception 'Invalid limit'; end if;
  delete from public.request_limits where key in (select key from public.request_limits where expires_at < v_now - interval '1 day' order by key limit 100 for update skip locked);
  insert into public.request_limits as r (key, hits, expires_at) values (p_key, 1, v_now + make_interval(secs => p_seconds))
  on conflict (key) do update set
    hits = case when r.expires_at <= v_now then 1 else least(r.hits + 1, p_limit + 1) end,
    expires_at = case when r.expires_at <= v_now then v_now + make_interval(secs => p_seconds) else r.expires_at end
  returning hits, expires_at into v_hits, v_expires;
  return case when v_hits > p_limit then greatest(1, ceil(extract(epoch from (v_expires - v_now)))::integer) else 0 end;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- p_owner comes only from server auth.getUser(), never from request JSON.
create function public.create_museum_secure(p_owner uuid, p_username text, p_name text, p_title text, p_required integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_slug text := p_username;
begin
  insert into public.profiles(user_id, username, display_name) values (p_owner, p_username, p_name)
    on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
  insert into public.museums(owner_id, slug, title, required_exhibits) values (p_owner, v_slug, p_title, p_required) returning id into v_id;
  insert into public.invite_links(museum_id, max_submissions) values (v_id, p_required);
  return jsonb_build_object('slug', v_slug);
end;
$$;
revoke all on function public.create_museum_secure(uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.create_museum_secure(uuid, text, text, text, integer) to service_role;

create function public.submit_exhibit_secure(p_token text, p_visitor text, p_submission uuid, p_exhibit uuid, p_title text, p_caption text, p_image text, p_source text, p_source_id text, p_author text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_invite public.invite_links; v_museum public.museums; v_count integer;
begin
  if p_visitor !~ '^[a-f0-9]{64}$' or p_visitor is null or p_submission is null then raise exception 'Invalid submission'; end if;
  select * into v_invite from public.invite_links where token = p_token;
  if not found then return jsonb_build_object('unavailable', true); end if;
  -- Serialize all invites to this museum: count, insert and reveal are atomic.
  select * into v_museum from public.museums where id = v_invite.museum_id for update;
  select * into v_invite from public.invite_links where id = v_invite.id for update;
  if exists (select 1 from public.exhibits where invite_id = v_invite.id and (submission_id = p_submission or visitor_hash = p_visitor)) then return jsonb_build_object('duplicate', true); end if;
  if v_museum.status <> 'collecting' or v_invite.expires_at <= clock_timestamp() then return jsonb_build_object('unavailable', true); end if;
  select count(*) into v_count from public.exhibits where invite_id = v_invite.id;
  if v_count >= v_invite.max_submissions then return jsonb_build_object('unavailable', true); end if;
  insert into public.exhibits(id, museum_id, invite_id, title, caption, media_type, image_url, image_source, image_source_id, image_author, submission_id, visitor_hash)
    values(p_exhibit, v_museum.id, v_invite.id, p_title, p_caption, case when p_image is null then 'text'::public.exhibit_media_type else 'image'::public.exhibit_media_type end, p_image, p_source, p_source_id, p_author, p_submission, p_visitor);
  select count(*) into v_count from public.exhibits where museum_id = v_museum.id;
  update public.museums set collected_exhibits = v_count,
    status = case when v_count >= required_exhibits then 'unlocked'::public.museum_status else status end,
    unlocked_at = case when v_count >= required_exhibits then clock_timestamp() else unlocked_at end where id = v_museum.id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.submit_exhibit_secure(text, text, uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_exhibit_secure(text, text, uuid, uuid, text, text, text, text, text, text) to service_role;
commit;
