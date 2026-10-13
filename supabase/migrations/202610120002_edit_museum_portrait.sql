begin;

drop function if exists public.update_museum_details_secure(uuid, uuid, text, text, text);
create function public.update_museum_details_secure(p_owner uuid, p_museum uuid, p_name text, p_username text, p_title text, p_portrait text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.museums where id = p_museum and owner_id = p_owner) then raise exception 'Museum not found'; end if;
  update public.profiles set display_name = p_name, username = p_username where user_id = p_owner;
  if not found then raise exception 'Profile not found'; end if;
  update public.museums set title = p_title, slug = p_username, portrait_path = p_portrait where id = p_museum and owner_id = p_owner;
  return jsonb_build_object('slug', p_username);
end;
$$;

revoke all on function public.update_museum_details_secure(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_museum_details_secure(uuid, uuid, text, text, text, text) to service_role;

commit;
