import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL);
if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(origin.hostname)) {
  throw new Error('Test account setup requires a localhost site URL.');
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `museum-test-${randomBytes(6).toString('hex')}@example.com`;
const password = `Museum!${randomBytes(18).toString('base64url')}9a`;
const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw new Error(`Could not create the test account: ${error.message}`);
let env = await readFile('.env.local', 'utf8');
env = env.replace(/^LOCAL_PASSWORD_LOGIN=.*\r?\n?/gm, '');
await writeFile('.env.local', `${env.trimEnd()}\nLOCAL_PASSWORD_LOGIN=true\n`);
await writeFile('.local-test-account.txt', `URL: ${origin.origin}/auth\nEmail: ${email}\nPassword: ${password}\n`);
console.log('Confirmed test account created. Credentials saved in .local-test-account.txt. Rebuild and restart the app.');
