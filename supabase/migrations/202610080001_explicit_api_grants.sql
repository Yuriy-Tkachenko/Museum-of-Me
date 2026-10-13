begin;

-- Do not depend on the project's automatic grants for newly created tables.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.profiles, public.museums,
  public.invite_links, public.exhibits, public.request_limits to service_role;

revoke all on public.profiles, public.museums, public.invite_links, public.exhibits,
  public.request_limits from anon, authenticated;
grant select on public.profiles, public.museums, public.invite_links to authenticated;
grant select (id, museum_id, invite_id, title, caption, media_type, image_url,
  image_source, image_source_id, image_author, created_at) on public.exhibits to authenticated;

-- Existing owner/reveal RLS policies remain in force; browser writes stay blocked.
commit;
