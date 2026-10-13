import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Disposable Postgres with minimal Supabase auth/storage schema contracts.
// No production URL, credentials, mounted folders or published ports are used.
const container = `museum-security-${randomUUID().slice(0, 8)}`;
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
function sql(source) { return docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], source); }
function concurrentSql(source) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { windowsHide: true });
    let output = ''; let error = '';
    child.stdout.on('data', (chunk) => { output += chunk; }); child.stderr.on('data', (chunk) => { error += chunk; });
    child.on('error', reject); child.on('close', (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
    child.stdin.end(source);
  });
}
const owner = '10000000-0000-4000-8000-000000000001';
const stranger = '10000000-0000-4000-8000-000000000002';
let started = false;
try {
  docker(['run', '--detach', '--rm', '--name', container, '-e', 'POSTGRES_PASSWORD=local-security-test', 'postgres:17-alpine']); started = true;
  for (let n = 0; ; n++) {
    // The image briefly runs a socket-only bootstrap server before restarting.
    // TCP readiness waits for the final server and avoids racing that restart.
    try { docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); break; }
    catch (error) { if (n > 30) throw error; await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  sql(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public, storage to anon, authenticated, service_role;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid, bucket_id text);
    alter table storage.objects enable row level security;
    grant all on storage.objects to anon, authenticated, service_role;
    create policy legacy_permissive on storage.objects for all to authenticated using (true) with check (true);
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  sql(readFileSync('supabase/migrations/202609110001_initial_museum_schema.sql', 'utf8'));
  sql(`insert into auth.users values ('${owner}'), ('${stranger}');
    insert into public.museums(owner_id,slug,title) values ('${owner}', 'legacy', 'Legacy');
    insert into public.invite_links(museum_id,token) select id,'mila-7x3p' from public.museums where slug='legacy';`);
  sql(readFileSync('supabase/migrations/202609130001_security_pass.sql', 'utf8'));
  sql(readFileSync('supabase/migrations/202609130002_public_mvp.sql', 'utf8'));
  sql(readFileSync('supabase/migrations/202610060001_museum_portraits.sql', 'utf8'));
  sql(readFileSync('supabase/migrations/202610080001_explicit_api_grants.sql', 'utf8'));
  assert.equal(sql("select public from storage.buckets where id='portraits'"), 'f');
  assert.equal(sql("select has_function_privilege('authenticated','public.create_museum_secure(uuid,text,text,text,integer,text)','EXECUTE')"), 'f');
  assert.equal(sql("select bool_and(token ~ '^[a-f0-9]{64}$') from public.invite_links"), 't');
  assert.equal(sql("select public from storage.buckets where id='exhibits'"), 'f');
  assert.equal(sql("select has_table_privilege('authenticated','public.museums','INSERT') or has_table_privilege('authenticated','public.museums','UPDATE') or has_table_privilege('anon','public.exhibits','INSERT')"), 'f');
  assert.equal(sql("select has_function_privilege('authenticated','public.consume_rate_limit(text,integer,integer)','EXECUTE') or has_function_privilege('anon','public.submit_exhibit_secure(text,text,uuid,uuid,text,text,text,text,text,text)','EXECUTE')"), 'f');
  assert.equal(sql(`select public.create_museum_secure('${owner}', 'alice', 'Alice', 'Museum', 3)->>'slug'`), 'alice');
  const token = sql("select token from public.invite_links where museum_id=(select id from public.museums where slug='alice')");
  const submit = (visitor, id = randomUUID(), title = 'Memory') => `select public.submit_exhibit_secure('${token}', '${visitor}', '${id}', '${randomUUID()}', '${title}', 'Story', null, 'none', null, null);`;
  const submission = randomUUID();
  assert.equal(JSON.parse(sql(submit('a'.repeat(64), submission))).ok, true);
  assert.equal(JSON.parse(sql(submit('a'.repeat(64), randomUUID()))).duplicate, true);
  assert.equal(JSON.parse(sql(submit('b'.repeat(64), submission))).duplicate, true);
  const asUser = (id, query) => sql(`set role authenticated; set request.jwt.claim.sub='${id}'; ${query}`).split('\n').at(-1);
  assert.equal(asUser(owner, 'select count(*) from public.exhibits'), '0');
  assert.equal(asUser(stranger, 'select count(*) from public.museums'), '0');
  assert.equal(asUser(stranger, 'select count(*) from public.invite_links'), '0');
  assert.equal(asUser(owner, "select collected_exhibits from public.museums where slug='alice'"), '1');
  sql("insert into storage.objects values(gen_random_uuid(),'exhibits')");
  assert.equal(asUser(owner, 'select count(*) from storage.objects'), '0');
  sql("insert into storage.objects values(gen_random_uuid(),'portraits')");
  assert.equal(asUser(owner, "select count(*) from storage.objects where bucket_id='portraits'"), '0');
  assert.throws(() => sql(`update public.museums set portrait_path='portraits/${stranger}/${randomUUID()}/portrait.webp' where slug='alice'`));
  const beforeLong = sql("select count(*) from public.exhibits");
  assert.throws(() => sql(submit('c'.repeat(64), randomUUID(), 'x'.repeat(121))));
  assert.equal(sql("select count(*) from public.exhibits"), beforeLong);
  const outputs = await Promise.all(Array.from({ length: 12 }, (_, n) => concurrentSql(submit(n.toString(16).padStart(64, '0')))));
  assert.equal(outputs.filter((result) => JSON.parse(result).ok).length, 2);
  assert.equal(sql("select status || ':' || collected_exhibits from public.museums where slug='alice'"), 'unlocked:3');
  assert.equal(asUser(owner, 'select count(*) from public.exhibits'), '3');
  assert.equal(asUser(stranger, 'select count(*) from public.exhibits'), '0');
  const limits = await Promise.all(Array.from({ length: 20 }, () => concurrentSql(`select public.consume_rate_limit('${'e'.repeat(64)}',5,60)`)));
  assert.equal(limits.filter((value) => value === '0').length, 5);
  sql(`update public.request_limits set expires_at=now()-interval '1 second' where key='${'e'.repeat(64)}'`);
  assert.equal(sql(`select public.consume_rate_limit('${'e'.repeat(64)}',5,60)`), '0');
  assert.throws(() => sql(`select public.create_museum_secure('${owner}', 'alice', 'Changed', 'Duplicate', 5)`));
  assert.equal(sql(`select display_name from public.profiles where user_id='${owner}'`), 'Alice');
  console.log('PASS: migrations, token rotation, RLS before/after reveal, cross-owner access, storage, RPC grants, field constraints, rollback, duplicate submissions, concurrent reveal and shared rate limits.');
} finally {
  if (started) docker(['stop', container]);
}
