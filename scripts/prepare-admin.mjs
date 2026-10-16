import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
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
const email = (process.env.ADMIN_EMAIL || 'yuriy.tk4ko@gmail.com').trim().toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL must be a valid email address.');
const values = { ADMIN_EMAIL: email, ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex') };
let env = await readFile('.env.local', 'utf8');
for (const obsolete of ['ADMIN_LOGIN', 'ADMIN_PASSWORD_HASH', 'ADMIN_TOTP_SECRET']) env = env.replace(new RegExp(`^${obsolete}=.*\\r?\\n?`, 'gm'), '');
for (const [key, value] of Object.entries(values)) {
  env = env.replace(new RegExp(`^${key}=.*\\r?\\n?`, 'gm'), '');
  env = `${env.trimEnd()}\n${key}=${value}\n`;
}
await writeFile('.env.local', env);
await writeFile('.local-admin-account.txt', `URL: ${process.env.NEXT_PUBLIC_SITE_URL}/admin/login\nGoogle account: ${email}\nAuthenticator: managed by Supabase MFA\n`);
console.log('Administrator Google account is configured. Authenticator enrollment is managed in the admin login flow. Rebuild and restart the app.');
