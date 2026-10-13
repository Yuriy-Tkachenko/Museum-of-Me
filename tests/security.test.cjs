/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');

// Compile the real server modules in isolation, mocking only external boundaries.
function harness({ rpc = async () => ({ data: 0, error: null }), fetchImpl = global.fetch, from, storage, user = null, mfaLevel = 'aal2' } = {}) {
  const jar = new Map();
  const cache = new Map();
  const env = { NODE_ENV: 'production', SECURITY_SECRET: 's'.repeat(64), NEXT_PUBLIC_SITE_URL: 'https://museum.test', TURNSTILE_SECRET_KEY: 'test-secret' };
  function load(name) {
    if (name === 'server-only') return {};
    if (name === '@/lib/admin-analytics') return { recordMuseumBirth: async () => {} };
    if (name === 'next/headers') return { cookies: async () => ({ get: (key) => jar.get(key), set: (key, value, options) => jar.set(key, { value, options }) }) };
    if (name === '@/lib/supabase/server') return { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }), mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: mfaLevel }, error: null }) } } }) };
    if (name === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => ({ rpc, from, storage }) };
    if (!name.startsWith('@/')) return require(name);
    const file = path.resolve(name.slice(2) + '.ts');
    if (cache.has(file)) return cache.get(file).exports;
    const loaded = { exports: {} }; cache.set(file, loaded);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
      Buffer, Request, Response, File, FormData, URL, Uint8Array, AbortSignal, crypto, process: { env }, fetch: fetchImpl,
    }, { filename: file })(load, loaded, loaded.exports);
    return loaded.exports;
  }
  return { load, jar, env };
}

test('poster images reject arbitrary URLs and convert bounded WebP to JPEG', async () => {
  const webp = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#c3d4a0' } }).webp().toBuffer();
  const requests = [];
  const h = harness({ fetchImpl: async (url, options) => { requests.push({ url, options }); return new Response(webp); } });
  h.env.NEXT_PUBLIC_SUPABASE_URL = 'https://storage.museum.test';
  const { posterImage } = h.load('@/lib/media');
  for (const url of ['http://localhost/private', 'https://evil.test/image.png', 'https://images.pexels.com.evil.test/photos/1/x.jpg', 'data:image/svg+xml,abc', 'https://storage.museum.test/arbitrary']) {
    assert.equal(await posterImage(url), null);
  }
  assert.equal(requests.length, 0);
  const result = await posterImage('https://images.pexels.com/photos/1/photo.webp');
  assert.match(result, /^data:image\/jpeg;base64,/);
  assert.equal((await sharp(Buffer.from(result.split(',')[1], 'base64')).metadata()).format, 'jpeg');
  assert.equal(requests[0].options.redirect, 'error');
  const invalid = harness({ fetchImpl: async () => new Response('<svg></svg>') }).load('@/lib/media');
  assert.equal(await invalid.posterImage('https://images.pexels.com/photos/1/photo.jpg'), null);
});

test('visitor cookies are signed, HttpOnly, secure; forged and expired identities fail closed', async () => {
  const h = harness(); const s = h.load('@/lib/security');
  await assert.rejects(s.visitorIdentity(), { status: 403 });
  const identity = await s.visitorIdentity(true);
  assert.equal(identity.length, 64);
  assert.equal(await s.visitorIdentity(), identity);
  const cookie = h.jar.get('__Host-museum-visitor');
  assert.equal(cookie.options.httpOnly, true); assert.equal(cookie.options.secure, true); assert.equal(cookie.options.sameSite, 'strict');
  cookie.value = (cookie.value[0] === 'f' ? 'a' : 'f') + cookie.value.slice(1);
  await assert.rejects(s.visitorIdentity(), { status: 403 });
  cookie.value = `${'a'.repeat(64)}.1000000000000.${'b'.repeat(64)}`;
  await assert.rejects(s.visitorIdentity(), { status: 403 });
});

test('origin checks reject cross-site, missing origin, and spoofed forwarded headers', () => {
  const s = harness().load('@/lib/security');
  for (const origin of ['', 'https://evil.test', 'https://museum.test.evil.test']) {
    assert.throws(() => s.requireSameOrigin(new Request('https://museum.test/api', { headers: { origin, 'x-forwarded-host': 'museum.test' } })), { status: 403 });
  }
  s.requireSameOrigin(new Request('https://museum.test/api', { headers: { origin: 'https://museum.test' } }));
});

test('actual streamed body size is bounded without Content-Length', async () => {
  const s = harness().load('@/lib/security');
  const request = new Request('https://museum.test', { method: 'POST', body: 'a'.repeat(101) });
  await assert.rejects(s.limitedBody(request, 100), { status: 413 });
  assert.equal((await s.limitedBody(new Request('https://museum.test', { method: 'POST', body: 'abc' }), 100)).toString(), 'abc');
});

test('rate limits return 429 with Retry-After and deny on database outage', async () => {
  let input;
  const h = harness({ rpc: async (_name, args) => { input = args; return { data: 42 }; } });
  const s = h.load('@/lib/security');
  await assert.rejects(s.rateLimit('search', 'visitor', 20, 60), (error) => {
    const response = s.securityError(error); assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '42'); return true;
  });
  assert.match(input.p_key, /^[a-f0-9]{64}$/); assert.equal(input.p_key.includes('visitor'), false);
  await assert.rejects(harness({ rpc: async () => ({ error: true }) }).load('@/lib/security').rateLimit('search', 'visitor', 20, 60), { status: 503 });
});

test('Turnstile requires success, exact hostname and action; no secret means no bypass', async () => {
  let result = { success: true, hostname: 'museum.test', action: 'submit_exhibit' };
  const h = harness({ fetchImpl: async () => Response.json(result) }); const s = h.load('@/lib/security');
  await s.verifyTurnstile('valid');
  for (const bad of [{ success: false }, { success: true, hostname: 'evil.test', action: 'submit_exhibit' }, { success: true, hostname: 'museum.test', action: 'other' }]) {
    result = bad; await assert.rejects(s.verifyTurnstile('invalid'), { status: 400 });
  }
  await assert.rejects(s.verifyTurnstile('x'.repeat(2049)), { status: 400 });
  delete h.env.TURNSTILE_SECRET_KEY;
  await assert.rejects(s.verifyTurnstile('valid'), { status: 503 });
});

test('official Turnstile test keys require explicit localhost configuration and a verified dummy response', async () => {
  let result = { success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } };
  let calls = 0;
  const h = harness({ fetchImpl: async () => { calls++; return Response.json(result); } });
  Object.assign(h.env, { LOCAL_TURNSTILE_TEST_MODE: 'true', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA', TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' });
  const { verifyTurnstile } = h.load('@/lib/security');
  await verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX');
  assert.equal(calls, 1, 'local tests still verify with Cloudflare');
  await assert.rejects(verifyTurnstile('forged-token'), { status: 400 });
  for (const bad of [{ success: false, metadata: { result_with_testing_key: true } }, { success: true }]) {
    result = bad; await assert.rejects(verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX'), { status: 400 });
  }
  result = { success: true, metadata: { result_with_testing_key: true } };
  for (const site of ['https://museum.test', 'http://museum.test', 'http://localhost.evil.test', 'https://localhost:3000']) {
    h.env.NEXT_PUBLIC_SITE_URL = site;
    await assert.rejects(verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX'), { status: 503 });
  }
  h.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  h.env.LOCAL_TURNSTILE_TEST_MODE = 'false';
  await assert.rejects(verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX'), { status: 503 });
  h.env.LOCAL_TURNSTILE_TEST_MODE = 'true';
  h.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'real-key';
  await assert.rejects(verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX'), { status: 503 });
});

test('uploads reject spoofed MIME, SVG, corrupt data and oversize files; real images become WebP', async () => {
  const media = harness().load('@/lib/media');
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).png().toBuffer();
  const output = await media.normalizeUpload(new File([png], '../../evil.png', { type: 'image/png' }));
  assert.equal((await sharp(output).metadata()).format, 'webp');
  for (const file of [new File([png], 'fake.jpg', { type: 'image/jpeg' }), new File(['<svg onload="alert(1)"/>'], 'fake.png', { type: 'image/png' }), new File(['garbage'], 'fake.webp', { type: 'image/webp' })]) {
    await assert.rejects(media.normalizeUpload(file), { status: 415 });
  }
  await assert.rejects(media.normalizeUpload(new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })), { status: 413 });
});

test('image URL allowlist blocks SSRF, XSS URLs, credentials and deceptive hosts', () => {
  const { isPexelsImage } = harness().load('@/lib/media');
  assert.equal(isPexelsImage('https://images.pexels.com/photos/123/photo.jpeg?w=1600'), true);
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'http://127.0.0.1/x', 'https://images.pexels.com.evil.test/photos/1/a.jpg', 'https://user@images.pexels.com/photos/1/a.jpg', 'https://images.pexels.com:444/photos/1/a.jpg']) assert.equal(isPexelsImage(url), false);
});

test('long museum fields fail and SQL-shaped usernames are rejected', () => {
  const { createMuseumSchema, updateMuseumDetailsSchema } = harness().load('@/lib/validation');
  const valid = { name: 'Alice', username: 'alice', title: 'Museum', requiredExhibits: 5 };
  for (const change of [{ name: 'a'.repeat(81) }, { title: 'x'.repeat(101) }, { username: "alice'; drop table museums;--" }, { requiredExhibits: 101 }]) assert.equal(createMuseumSchema.safeParse({ ...valid, ...change }).success, false);
  assert.equal(updateMuseumDetailsSchema.safeParse({ name: 'Alice', username: 'alice', title: 'Museum' }).success, true);
  assert.equal(updateMuseumDetailsSchema.safeParse({ name: 'Alice', username: 'alice', title: 'Museum', owner_id: 'victim' }).success, false);
});

test('museum settings require MFA and update only the signed-in owner through the atomic RPC', async () => {
  const request = body => new Request('https://museum.test/api/museums/settings', { method: 'PATCH', headers: { origin: 'https://museum.test', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const valid = { name: 'Alice Smith', username: 'alice_new', title: 'Alice Museum' };
  assert.equal((await harness().load('@/app/api/museums/settings/route').PATCH(request(valid))).status, 401);
  assert.equal((await harness({ user: { id: 'owner' }, mfaLevel: 'aal1' }).load('@/app/api/museums/settings/route').PATCH(request(valid))).status, 403);

  let update;
  const builder = { select: () => builder, eq: () => builder, order: () => builder, limit: () => builder, maybeSingle: async () => ({ data: { id: 'museum-id', portrait_path: null }, error: null }) };
  const h = harness({ user: { id: 'owner' }, from: () => builder, rpc: async (name, args) => {
    if (name === 'consume_rate_limit') return { data: 0, error: null };
    if (name === 'update_museum_details_secure') { update = args; return { data: { slug: args.p_username }, error: null }; }
    return { data: 0, error: null };
  } });
  const response = await h.load('@/app/api/museums/settings/route').PATCH(request(valid));
  assert.equal(response.status, 200);
  assert.equal(update.p_owner, 'owner'); assert.equal(update.p_museum, 'museum-id');
  assert.equal(update.p_username, 'alice_new'); assert.equal(update.p_name, 'Alice Smith');
  assert.equal(update.p_portrait, null);
  assert.equal((await h.load('@/app/api/museums/settings/route').PATCH(request({ ...valid, owner_id: 'victim' }))).status, 400);
});

test('museum settings safely replace and remove the owner portrait', async () => {
  const owner = '10000000-0000-4000-8000-000000000001';
  const oldPath = `portraits/${owner}/20000000-0000-4000-8000-000000000002/portrait.webp`;
  const uploads = []; const removed = []; const updates = [];
  const builder = { select: () => builder, eq: () => builder, order: () => builder, limit: () => builder, maybeSingle: async () => ({ data: { id: 'museum-id', portrait_path: oldPath }, error: null }) };
  const storage = { from: bucket => ({
    upload: async (path, bytes, options) => { uploads.push({ bucket, path, bytes, options }); return { error: null }; },
    remove: async paths => { removed.push(...paths); return { error: null }; },
  }) };
  const h = harness({ user: { id: owner }, from: () => builder, storage, rpc: async (name, args) => {
    if (name === 'consume_rate_limit') return { data: 0, error: null };
    if (name === 'update_museum_details_secure') { updates.push(args); return { data: { slug: args.p_username }, error: null }; }
    return { data: 0, error: null };
  } });
  const route = h.load('@/app/api/museums/settings/route').PATCH;
  const fields = form => { form.set('name', 'Alice'); form.set('username', 'alice'); form.set('title', 'Alice Museum'); return form; };
  const send = form => route(new Request('https://museum.test/api/museums/settings', { method: 'PATCH', headers: { origin: 'https://museum.test' }, body: form }));
  const image = await sharp({ create: { width: 120, height: 90, channels: 3, background: '#dccab0' } }).png().toBuffer();
  const replacement = fields(new FormData()); replacement.set('portrait', new File([image], 'portrait.png', { type: 'image/png' }));
  assert.equal((await send(replacement)).status, 200);
  assert.equal(uploads.length, 1); assert.match(updates[0].p_portrait, new RegExp(`^portraits/${owner}/[a-f0-9-]{36}/portrait\\.webp$`));
  assert.equal(removed[0], oldPath);
  const removal = fields(new FormData()); removal.set('portraitAction', 'remove');
  assert.equal((await send(removal)).status, 200); assert.equal(updates[1].p_portrait, null);
});

test('locked public museum never queries exhibits or returns any exhibit data', async () => {
  const queried = [];
  const owner = '10000000-0000-4000-8000-000000000001';
  const h = harness({ from: (table) => {
    queried.push(table);
    if (table === 'exhibits') throw new Error('Exhibit access before reveal!');
    const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: table === 'museums' ? { id: 'id', slug: 'alice', title: 'Alice', owner_id: owner, status: 'collecting', portrait_path: `portraits/${owner}/20000000-0000-4000-8000-000000000002/portrait.webp` } : { display_name: 'Alice' } }) };
    return builder;
  } });
  h.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'; h.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
  const result = await h.load('@/lib/public-museum').getPublicMuseum('alice');
  assert.equal(result.exists, true); assert.equal(result.unlocked, false); assert.equal(result.exhibits.length, 0); assert.equal(queried.includes('exhibits'), false);
  assert.equal(result.portraitUrl, undefined, 'closed galleries never expose portrait URLs');
});

function inviteBackend() {
  const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: { id: 'invite', museum_id: 'museum', expires_at: null, status: 'collecting' } }) };
  return builder;
}
function exhibitRequest(changes = {}, duplicate = false) {
  const form = new FormData();
  const fields = { title: 'Memory', caption: 'Story', imageSource: 'none', submissionId: crypto.randomUUID(), turnstileToken: 'valid', ...changes };
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  if (duplicate) form.append('title', 'Second title');
  return new Request('https://museum.test/api/museums/token/exhibits', { method: 'POST', headers: { origin: 'https://museum.test' }, body: form });
}

test('exhibit Route Handler rejects oversized/duplicate fields and unsafe URLs before writes', async () => {
  let writes = 0;
  const h = harness({ from: inviteBackend, rpc: async (name) => { if (name === 'submit_exhibit_secure') writes++; return { data: 0 }; } });
  await h.load('@/lib/security').visitorIdentity(true);
  const { POST } = h.load('@/app/api/museums/[token]/exhibits/route');
  const params = { params: Promise.resolve({ token: 'a'.repeat(64) }) };
  for (const request of [exhibitRequest({ title: 'x'.repeat(121) }), exhibitRequest({ caption: 'x'.repeat(301) }), exhibitRequest({}, true), exhibitRequest({ imageSource: 'pexels', imageUrl: 'http://127.0.0.1/private', imageSourceId: '1' }), exhibitRequest({ turnstileToken: '' })]) {
    assert.equal((await POST(request, params)).status, 400);
  }
  assert.equal(writes, 0);
});

test('exhibit route passes text as RPC parameters, exposes no counts and rejects replay', async () => {
  let inserted;
  let duplicate = false;
  const h = harness({ from: inviteBackend, fetchImpl: async () => Response.json({ success: true, hostname: 'museum.test', action: 'submit_exhibit' }), rpc: async (name, args) => {
    if (name === 'submit_exhibit_secure') { inserted = args; return { data: duplicate ? { duplicate: true } : { ok: true } }; }
    return { data: 0 };
  } });
  await h.load('@/lib/security').visitorIdentity(true);
  const { POST } = h.load('@/app/api/museums/[token]/exhibits/route');
  const params = { params: Promise.resolve({ token: 'a'.repeat(64) }) };
  const payload = "<script>alert(1)</script>'; select 1; --";
  const response = await POST(exhibitRequest({ title: payload }), params);
  assert.equal(response.status, 201); assert.deepEqual(await response.json(), { ok: true });
  assert.equal(inserted.p_title, payload); assert.match(inserted.p_visitor, /^[a-f0-9]{64}$/);
  duplicate = true; assert.equal((await POST(exhibitRequest(), params)).status, 409);
});

test('museum route requires authentication and ignores a forged owner in JSON', async () => {
  const request = () => new Request('https://museum.test/api/museums', { method: 'POST', headers: { origin: 'https://museum.test', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Alice', username: 'alice', title: 'Museum', requiredExhibits: 5, owner_id: 'victim' }) });
  assert.equal((await harness().load('@/app/api/museums/route').POST(request())).status, 401);
  assert.equal((await harness({ user: { id: 'aal1-user' }, mfaLevel: 'aal1' }).load('@/app/api/museums/route').POST(request())).status, 403);
  let owner;
  const h = harness({ user: { id: 'verified-user' }, rpc: async (name, args) => {
    if (name === 'create_museum_secure') { owner = args.p_owner; return { data: { slug: 'alice' } }; }
    return { data: 0 };
  } });
  assert.equal((await h.load('@/app/api/museums/route').POST(request())).status, 201);
  assert.equal(owner, 'verified-user');
});

test('Pexels route is gated by signed visitor identity before any external search', async () => {
  let fetched = false;
  const h = harness({ fetchImpl: async () => { fetched = true; return Response.json({ photos: [] }); } });
  const { GET } = h.load('@/app/api/pexels/search/route');
  assert.equal((await GET(new Request('https://museum.test/api/pexels/search?q=coffee'))).status, 403);
  assert.equal(fetched, false);
});

test('museum portrait uploads are normalized, private, owned by the authenticated user and committed with creation', async () => {
  const owner = '10000000-0000-4000-8000-000000000001';
  const uploads = []; const removed = []; const calls = [];
  let rpcError = null;
  const h = harness({ user: { id: owner }, storage: { from: bucket => ({
    upload: async (path, bytes, options) => { uploads.push({ bucket, path, bytes, options }); return { error: null }; },
    remove: async paths => { removed.push(...paths); return { error: null }; },
  }) }, rpc: async (name, args) => { calls.push({ name, args }); return name === 'create_museum_secure' ? { data: { slug: 'anna', analyticsId: 'id' }, error: rpcError } : { data: 0, error: null }; } });
  const route = h.load('@/app/api/museums/route').POST;
  const portrait = await sharp({ create: { width: 80, height: 100, channels: 3, background: '#dccab0' } }).png().toBuffer();
  const form = () => { const f = new FormData(); f.set('name', 'Анна'); f.set('username', 'anna'); f.set('title', 'Музей Анны'); f.set('requiredExhibits', '3'); return f; };
  const send = f => route(new Request('https://museum.test/api/museums', { method: 'POST', headers: { origin: 'https://museum.test' }, body: f }));
  const f = form(); f.set('portrait', new File([portrait], 'me.png', { type: 'image/png' }));
  assert.equal((await send(f)).status, 201);
  assert.equal(uploads[0].bucket, 'portraits');
  assert.match(uploads[0].path, new RegExp(`^portraits/${owner}/[a-f0-9-]{36}/portrait\\.webp$`));
  assert.equal((await sharp(uploads[0].bytes).metadata()).format, 'webp');
  assert.equal(calls.find(c => c.name === 'create_museum_secure').args.p_portrait, uploads[0].path);
  assert.equal(removed.length, 0);
  const bad = form(); bad.set('portrait', new File(['<svg></svg>'], 'fake.png', { type: 'image/png' }));
  assert.equal((await send(bad)).status, 415); assert.equal(uploads.length, 1);
  const duplicate = form(); duplicate.append('name', 'Someone else');
  assert.equal((await send(duplicate)).status, 400);
  const forged = form(); forged.set('portrait', `portraits/${owner}/forged/portrait.webp`);
  assert.equal((await send(forged)).status, 400);
  rpcError = { code: '23505' };
  assert.equal((await send(f)).status, 409); assert.equal(removed.length, 1);
  rpcError = { message: 'Network failure' };
  assert.equal((await send(f)).status, 503); assert.equal(removed.length, 1, 'ambiguous commits retain private uploads');
});

test('portrait URL signing rejects external URLs and another owner’s storage paths', async () => {
  const owner = '10000000-0000-4000-8000-000000000001';
  const path = `portraits/${owner}/20000000-0000-4000-8000-000000000002/portrait.webp`;
  const signed = [];
  const h = harness({ storage: { from: bucket => ({ createSignedUrl: async (value, expiry) => {
    signed.push({ bucket, value, expiry }); return { data: { signedUrl: 'https://signed.example/portrait' }, error: null };
  } }) } });
  const { portraitImageUrl } = h.load('@/lib/media');
  for (const value of [null, 'https://evil.test/me.jpg', path.replace(owner, '30000000-0000-4000-8000-000000000003'), path.replace('portrait.webp', '../portrait.webp')]) assert.equal(await portraitImageUrl(value, owner), null);
  assert.equal(signed.length, 0);
  assert.equal(await portraitImageUrl(path, owner), 'https://signed.example/portrait');
  assert.equal(signed[0].bucket, 'portraits'); assert.equal(signed[0].expiry, 3600);
});

test('portrait normalization preserves cutout transparency', async () => {
  const input = await sharp({ create: { width: 80, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp({ create: { width: 40, height: 80, channels: 4, background: '#a4492e' } }).png().toBuffer(), left: 20, top: 10 }])
    .png().toBuffer();
  const { normalizeUpload } = harness().load('@/lib/media');
  const normalized = await normalizeUpload(new File([input], 'portrait.png', { type: 'image/png' }), { maxEdge: 2400 });
  const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(data[3], 0, 'transparent background remains transparent');
  assert.equal(data[(50 * info.width + 40) * 4 + 3], 255, 'person remains opaque');
});
