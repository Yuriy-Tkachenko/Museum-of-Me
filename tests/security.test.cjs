/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');

// Compile the real server modules in isolation, mocking only external boundaries.
function harness({ rpc = async () => ({ data: 0, error: null }), fetchImpl = global.fetch, from, user = null } = {}) {
  const jar = new Map();
  const cache = new Map();
  const env = { NODE_ENV: 'production', SECURITY_SECRET: 's'.repeat(64), NEXT_PUBLIC_SITE_URL: 'https://museum.test', TURNSTILE_SECRET_KEY: 'test-secret' };
  function load(name) {
    if (name === 'server-only') return {};
    if (name === 'next/headers') return { cookies: async () => ({ get: (key) => jar.get(key), set: (key, value, options) => jar.set(key, { value, options }) }) };
    if (name === '@/lib/supabase/server') return { createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) };
    if (name === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => ({ rpc, from }) };
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
  const { createMuseumSchema } = harness().load('@/lib/validation');
  const valid = { name: 'Alice', username: 'alice', title: 'Museum', requiredExhibits: 5 };
  for (const change of [{ name: 'a'.repeat(81) }, { title: 'x'.repeat(101) }, { username: "alice'; drop table museums;--" }, { requiredExhibits: 101 }]) assert.equal(createMuseumSchema.safeParse({ ...valid, ...change }).success, false);
});

test('locked public museum never queries exhibits or returns any exhibit data', async () => {
  const queried = [];
  const h = harness({ from: (table) => {
    queried.push(table);
    if (table === 'exhibits') throw new Error('Exhibit access before reveal!');
    const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: table === 'museums' ? { id: 'id', slug: 'alice', title: 'Alice', owner_id: 'owner', status: 'collecting' } : { display_name: 'Alice' } }) };
    return builder;
  } });
  h.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'; h.env.SUPABASE_SERVICE_ROLE_KEY = 'test';
  const result = await h.load('@/lib/public-museum').getPublicMuseum('alice');
  assert.equal(result.exists, true); assert.equal(result.unlocked, false); assert.equal(result.exhibits.length, 0); assert.equal(queried.includes('exhibits'), false);
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
