/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');

function authHarness() {
  const jar = new Map();
  const password = 'A-test-password-with-enough-entropy';
  const salt = 'a'.repeat(32);
  const env = { ADMIN_LOGIN: 'test_admin', ADMIN_PASSWORD_HASH: `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`,
    ADMIN_SESSION_SECRET: 's'.repeat(64), NEXT_PUBLIC_SITE_URL: 'https://museum.test' };
  class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const source = ts.transpileModule(fs.readFileSync('lib/admin-auth.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} };
  const requireModule = name => name === 'server-only' ? {} : name === '@/lib/security' ? { HttpError } : name === 'next/headers'
    ? { cookies: async () => ({ get: name => jar.get(name), set: (name, value, options) => jar.set(name, { value, options }), delete: name => jar.delete(name) }) } : require(name);
  vm.runInNewContext(`(function(require,module,exports){${source}})`, { Buffer, Date, process: { env } })(requireModule, loaded, loaded.exports);
  return { ...loaded.exports, jar, env, password };
}

test('administrator passwords and sessions are separate, signed and revocable', async () => {
  const auth = authHarness();
  assert.equal(await auth.checkAdminPassword('test_admin', auth.password), true);
  assert.equal(await auth.checkAdminPassword('test_admin', 'wrong'), false);
  assert.equal(await auth.checkAdminPassword('other_admin', auth.password), false);
  await assert.rejects(auth.requireAdmin(), { status: 401 });
  await auth.signInAdmin();
  const cookie = auth.jar.get('museum-admin');
  assert.equal(cookie.options.httpOnly, true); assert.equal(cookie.options.secure, true); assert.equal(cookie.options.sameSite, 'strict');
  assert.equal(cookie.value.includes(auth.password), false);
  assert.equal(await auth.isAdmin(), true);
  auth.jar.set('museum-admin', { ...cookie, value: cookie.value.slice(0, -1) + (cookie.value.endsWith('a') ? 'b' : 'a') });
  assert.equal(await auth.isAdmin(), false);
  auth.jar.set('museum-admin', cookie);
  auth.env.ADMIN_SESSION_SECRET = 'new-secret-'.repeat(5);
  assert.equal(await auth.isAdmin(), false);
  await auth.signInAdmin();
  auth.env.ADMIN_PASSWORD_HASH = 'b'.repeat(32) + ':' + 'c'.repeat(128);
  assert.equal(await auth.isAdmin(), false);
  await auth.signOutAdmin(); assert.equal(auth.jar.size, 0);
});

test('administrator access fails closed when configuration is missing', async () => {
  const auth = authHarness(); delete auth.env.ADMIN_PASSWORD_HASH;
  assert.equal(await auth.isAdmin(), false);
  await assert.rejects(auth.checkAdminPassword('test_admin', auth.password), { status: 503 });
});
