import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// Use ONLY the locally running CLI project, not .env.local or a deployed Supabase.
const cli = spawnSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'], { encoding: 'utf8', windowsHide: true });
if (cli.status !== 0) throw new Error('Start local Supabase with npm run db:start before running smoke tests.');
const jsonLine = cli.stdout.trim().split('\n').findLast((line) => line.trim().startsWith('{'));
let local;
try { local = JSON.parse(cli.stdout); } catch { local = JSON.parse(jsonLine); }
if (!['127.0.0.1', 'localhost'].includes(new URL(local.API_URL).hostname)) throw new Error('Smoke tests require local Supabase.');
const env = { ...process.env, NEXT_PUBLIC_SITE_URL: 'http://localhost:3100', NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  SECURITY_SECRET: 'local-smoke-security-secret-0123456789abcdef', NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'local-e2e-sitekey', TURNSTILE_SECRET_KEY: 'local-e2e-secret',
  PEXELS_API_KEY: 'local-e2e-pexels', NEXT_PUBLIC_ANALYTICS_PROVIDER: 'plausible', NEXT_PUBLIC_ANALYTICS_DOMAIN: 'museum-smoke.test', NEXT_PUBLIC_ANALYTICS_ENDPOINT: 'https://plausible.io/api/event',
  NEXT_PUBLIC_SUPABASE_GOOGLE_ENABLED: 'false', E2E_MAILPIT_URL: local.MAILPIT_URL || local.INBUCKET_URL,
};
if (!env.PLAYWRIGHT_CHANNEL && process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')) env.PLAYWRIGHT_CHANNEL = 'msedge';
if (!env.PLAYWRIGHT_CHANNEL && process.platform === 'win32' && existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')) env.PLAYWRIGHT_CHANNEL = 'chrome';
async function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
    child.on('error', reject); child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code}`)));
  });
}
if (!process.argv.includes('--skip-build')) await run(['node_modules/next/dist/bin/next', 'build']);
await run(['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2).filter((arg) => arg !== '--skip-build')]);
