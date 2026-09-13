begin;
-- Opaque collection identifier for aggregate funnels; never an access credential.
alter table public.museums add column analytics_id uuid not null default gen_random_uuid();
create unique index museums_analytics_id on public.museums(analytics_id);
-- Keep uploads below Vercel's function payload limit, including multipart overhead.
update storage.buckets set file_size_limit = 4194304 where id = 'exhibits';

create or replace function public.create_museum_secure(p_owner uuid, p_username text, p_name text, p_title text, p_required integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_slug text := p_username;
begin
  insert into public.profiles(user_id, username, display_name) values (p_owner, p_username, p_name)
    on conflict (user_id) do update set username = excluded.username, display_name = excluded.display_name;
  insert into public.museums(owner_id, slug, title, required_exhibits) values (p_owner, v_slug, p_title, p_required) returning id into v_id;
  insert into public.invite_links(museum_id, max_submissions) values (v_id, p_required);
  return jsonb_build_object('slug', v_slug, 'analyticsId', (select analytics_id from public.museums where id = v_id));
end;
$$;
revoke all on function public.create_museum_secure(uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.create_museum_secure(uuid, text, text, text, integer) to service_role;

create or replace function public.submit_exhibit_secure(p_token text, p_visitor text, p_submission uuid, p_exhibit uuid, p_title text, p_caption text, p_image text, p_source text, p_source_id text, p_author text)
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
  return jsonb_build_object('ok', true, 'unlocked', v_count >= v_museum.required_exhibits, 'analyticsId', v_museum.analytics_id);
end;
$$;
revoke all on function public.submit_exhibit_secure(text, text, uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_exhibit_secure(text, text, uuid, uuid, text, text, text, text, text, text) to service_role;
commit;
