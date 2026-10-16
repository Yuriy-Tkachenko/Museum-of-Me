/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');

function authHarness() {
  const jar = new Map();
  const env = { ADMIN_EMAIL: 'admin@example.com', ADMIN_SESSION_SECRET: 's'.repeat(64), NEXT_PUBLIC_SITE_URL: 'https://museum.test' };
  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const source = ts.transpileModule(fs.readFileSync('lib/admin-auth.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} };
  const requireModule = name => name === 'server-only' ? {} : name === '@/lib/security' ? { HttpError } : name === 'next/headers'
    ? { cookies: async () => ({ get: name => jar.get(name), set: (name, value, options) => jar.set(name, { value, options }), delete: name => jar.delete(name) }) } : require(name);
  vm.runInNewContext(`(function(require,module,exports){${source}})`, { Buffer, Date, process: { env } })(requireModule, loaded, loaded.exports);
  return { ...loaded.exports, jar, env };
}

test('administrator Google identity and sessions are restricted, signed and revocable', async () => {
  const auth = authHarness();
  assert.equal(auth.adminEmail(), 'admin@example.com');
  assert.equal(auth.isAdminGoogleUser({ email: 'admin@example.com', app_metadata: { provider: 'google' } }), true);
  assert.equal(auth.isAdminGoogleUser({ email: 'other@example.com', app_metadata: { provider: 'google' } }), false);
  assert.equal(auth.isAdminGoogleUser({ email: 'admin@example.com', app_metadata: { provider: 'email' } }), false);
  await assert.rejects(auth.requireAdmin(), { status: 401 });
  await auth.signInAdmin();
  const cookie = auth.jar.get('museum-admin');
  assert.equal(cookie.options.httpOnly, true); assert.equal(cookie.options.secure, true); assert.equal(cookie.options.sameSite, 'strict');
  assert.equal(cookie.value.includes(auth.env.ADMIN_EMAIL), false);
  assert.equal(await auth.isAdmin(), true);
  auth.jar.set('museum-admin', { ...cookie, value: cookie.value.slice(0, -1) + (cookie.value.endsWith('a') ? 'b' : 'a') });
  assert.equal(await auth.isAdmin(), false);
  auth.jar.set('museum-admin', cookie);
  auth.env.ADMIN_SESSION_SECRET = 'new-secret-'.repeat(5);
  assert.equal(await auth.isAdmin(), false);
  await auth.signInAdmin();
  auth.env.ADMIN_EMAIL = 'new-admin@example.com';
  assert.equal(await auth.isAdmin(), false);
  await auth.signOutAdmin(); assert.equal(auth.jar.size, 0);
});

test('administrator access fails closed when configuration is missing', async () => {
  const auth = authHarness(); delete auth.env.ADMIN_SESSION_SECRET;
  assert.equal(await auth.isAdmin(), false);
  await assert.rejects(auth.signInAdmin(), { status: 503 });
});
