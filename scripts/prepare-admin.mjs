import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
if (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_LOGIN) {
  throw new Error('Administrator access is already configured. Existing credentials were not changed.');
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = 'museum-admin-analytics';
let { data: existing, error: bucketError } = await admin.storage.getBucket(bucket);
if (bucketError && bucketError.message !== 'Bucket not found') throw new Error('Could not inspect analytics storage.');
if (!existing) {
  const { error } = await admin.storage.createBucket(bucket, { public: false, allowedMimeTypes: ['application/json'], fileSizeLimit: 8192 });
  if (error) throw new Error('Could not create private analytics storage.');
  ({ data: existing } = await admin.storage.getBucket(bucket));
}
if (!existing || existing.public) throw new Error('Analytics storage must be private.');
const startedAt = new Date().toISOString();
const { error: startError } = await admin.storage.from(bucket).upload('measurement-start.json', Buffer.from(JSON.stringify({ startedAt })), { contentType: 'application/json', upsert: false });
if (startError && startError.statusCode !== '409' && startError.message !== 'The resource already exists') throw new Error('Could not initialise analytics.');
const login = `museum_admin_${randomBytes(3).toString('hex')}`;
const password = `Museum!${randomBytes(18).toString('base64url')}9a`;
const salt = randomBytes(16).toString('hex');
const values = { ADMIN_LOGIN: login, ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, ADMIN_SESSION_SECRET: randomBytes(32).toString('hex') };
let env = await readFile('.env.local', 'utf8');
for (const [key, value] of Object.entries(values)) {
  env = env.replace(new RegExp(`^${key}=.*\\r?\\n?`, 'gm'), '');
  env = `${env.trimEnd()}\n${key}=${value}\n`;
}
await writeFile('.env.local', env);
await writeFile('.local-admin-account.txt', `URL: ${process.env.NEXT_PUBLIC_SITE_URL}/admin/login\nLogin: ${login}\nPassword: ${password}\n`);
console.log('Administrator configured. Credentials saved in .local-admin-account.txt. Analytics storage is private. Rebuild and restart the app.');
