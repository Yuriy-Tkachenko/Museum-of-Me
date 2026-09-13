/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'); const vm = require('node:vm'); const fs = require('node:fs');
function analytics({ env = {}, navigator = {} } = {}) {
  const sent = []; const storage = new Map(); const loaded = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('lib/analytics.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(`(function(module,exports){${source}})`, {
    URL, window: { location: { origin: 'https://museum.test', href: 'https://museum.test/m/secret-token?email=private' } }, navigator,
    process: { env: { NEXT_PUBLIC_ANALYTICS_PROVIDER: 'plausible', NEXT_PUBLIC_ANALYTICS_DOMAIN: 'museum.test', ...env } },
    sessionStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    fetch: (url, init) => { sent.push({ url, ...init }); return Promise.resolve({ ok: true }); },
  })(loaded, loaded.exports);
  return { ...loaded.exports, sent, storage };
}
test('analytics is optional and respects DNT and GPC without storage writes', () => {
  for (const options of [{ env: { NEXT_PUBLIC_ANALYTICS_PROVIDER: '' } }, { env: { NEXT_PUBLIC_ANALYTICS_DOMAIN: '' } }, { navigator: { doNotTrack: '1' } }, { navigator: { globalPrivacyControl: true } }]) {
    const a = analytics(options); a.track('landing_view', {}, 'session'); a.rememberSource('exhibit'); assert.equal(a.sent.length, 0); assert.equal(a.storage.size, 0);
  }
});
test('only whitelisted event properties leave the app; private URLs and referrers never do', () => {
  const a = analytics(); a.track('exhibit_submitted', { museum: '00000000-0000-4000-8000-000000000000', token: 'secret', email: 'private', title: 'Private title', source: 'evil', method: 'download' });
  const request = a.sent[0]; const body = JSON.parse(request.body);
  assert.equal(request.credentials, 'omit'); assert.equal(request.referrerPolicy, 'no-referrer'); assert.equal(request.keepalive, true);
  assert.equal(body.url, 'https://museum.test/invite'); assert.deepEqual(body.props, { museum: '00000000-0000-4000-8000-000000000000', method: 'download' });
  assert.equal(request.body.includes('secret'), false);
});
test('view events deduplicate across rerenders; completed shares remain countable', () => {
  const a = analytics(); a.track('landing_view', {}, 'session'); a.track('landing_view', {}, 'session'); a.track('museum_shared', { method: 'copy' }); a.track('museum_shared', { method: 'download' });
  assert.equal(a.sent.length, 3); a.rememberSource('exhibit'); assert.equal(a.creationSource(), 'exhibit');
});
