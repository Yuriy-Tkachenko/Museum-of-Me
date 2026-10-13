begin;

alter table public.museums add column portrait_path text;
alter table public.museums add constraint museum_portrait_path_format check (
  portrait_path is null or portrait_path ~ ('^portraits/' || owner_id::text || '/[a-f0-9-]{36}/portrait\.webp$')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portraits', 'portraits', false, 4194304, array['image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy portraits_storage_server_only on storage.objects as restrictive for all to anon, authenticated
using (bucket_id <> 'portraits') with check (bucket_id <> 'portraits');

drop function public.create_museum_secure(uuid, text, text, text, integer);
create function public.create_museum_secure(p_owner uuid, p_username text, p_name text, p_title text, p_required integer, p_portrait text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.profiles(user_id, username, display_name) values (p_owner, p_username, p_name)
    on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
  insert into public.museums(owner_id, slug, title, required_exhibits, portrait_path)
    values (p_owner, p_username, p_title, p_required, p_portrait) returning id into v_id;
  insert into public.invite_links(museum_id, max_submissions) values (v_id, p_required);
  return jsonb_build_object('slug', p_username, 'analyticsId', (select analytics_id from public.museums where id = v_id));
end;
$$;
revoke all on function public.create_museum_secure(uuid, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.create_museum_secure(uuid, text, text, text, integer, text) to service_role;

commit;
