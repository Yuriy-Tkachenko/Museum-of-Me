import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SECURITY_SECRET', 'NEXT_PUBLIC_SITE_URL'];
const missing = required.filter(name => !process.env[name]?.trim());
if (missing.length) {
  console.error('Missing configuration in .env.local: ' + missing.join(', '));
  process.exitCode = 1;
} else {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid Supabase URL.');
    if (process.env.SECURITY_SECRET.length < 32) throw new Error('SECURITY_SECRET must have at least 32 characters.');
    const admin = createClient(url.href, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const checks = [
      ['Auth server key', () => admin.auth.admin.listUsers({ page: 1, perPage: 1 })],
      ['Museum schema and portrait migration', () => admin.from('museums').select('id,portrait_path,analytics_id').limit(0)],
      ['Profiles', () => admin.from('profiles').select('user_id,display_name').limit(0)],
      ['Invitations', () => admin.from('invite_links').select('token,museum_id').limit(0)],
      ['Exhibits', () => admin.from('exhibits').select('id,museum_id,image_url').limit(0)],
    ];
    for (const [label, check] of checks) {
      const { error } = await check();
      if (error) throw new Error(`${label}: check the project keys and apply the migrations from supabase/migrations.`);
      console.log(`OK: ${label}`);
    }
    for (const bucket of ['exhibits', 'portraits']) {
      const { data, error } = await admin.storage.getBucket(bucket);
      if (error || !data) throw new Error(`Missing bucket ${bucket}: apply the migrations.`);
      if (data.public) throw new Error(`Bucket ${bucket} must be private.`);
      console.log(`OK: private ${bucket} storage`);
    }
    console.log('Supabase connection checks passed. Restart the app after changing .env.local.');
    console.log('Google OAuth requires an allowed /auth/callback redirect; keep TOTP MFA enabled in Supabase Auth.');
  } catch (error) {
    // Never print response bodies, keys or user records.
    console.error(error instanceof Error ? error.message : 'Supabase check failed.');
    process.exitCode = 1;
  }
}
