import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

process.loadEnvFile('.env.local');
if (process.env.NEXT_PUBLIC_SITE_URL !== 'http://localhost:3000') throw new Error('This check requires the local server.');
const credentials = Object.fromEntries(readFileSync('.local-admin-account.txt', 'utf8').trim().split('\n').map(line => {
  const i = line.indexOf(': '); return [line.slice(0, i), line.slice(i + 2)];
}));
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = 'museum-admin-analytics';
const suffix = randomBytes(6).toString('hex');
const accounts = [], museumIds = [];
async function account(label) {
  const email = `${label}-${suffix}@example.com`, password = `Check!${randomBytes(18).toString('hex')}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  accounts.push(data.user.id); return { id: data.user.id, email, password };
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
mkdirSync('test-results', { recursive: true });
try {
  const { error: anonymousDownload } = await anon.storage.from(bucket).download('measurement-start.json');
  assert.ok(anonymousDownload, 'anonymous users must not read private analytics');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const panel = await context.newPage();
  await panel.goto('http://localhost:3000/admin?tab=analytics');
  await expect(panel).toHaveURL(/\/admin\/login$/);
  await context.addCookies([{ name: 'museum-admin', value: `${Date.now() + 600000}.${'a'.repeat(48)}.${'a'.repeat(64)}`, domain: 'localhost', path: '/' }]);
  await panel.goto('http://localhost:3000/admin');
  await expect(panel).toHaveURL(/\/admin\/login$/);
  const crossSite = await panel.request.post('http://localhost:3000/api/admin/login', { headers: { origin: 'https://other.test' }, data: { login: credentials.Login, password: credentials.Password } });
  assert.equal(crossSite.status(), 403);
  await panel.getByLabel('Логин администратора', { exact: true }).fill(credentials.Login);
  await panel.getByLabel('Пароль', { exact: true }).fill('incorrect-password');
  await panel.getByRole('button', { name: 'Войти в панель' }).click();
  await expect(panel.locator('.admin-error[role="alert"]')).toHaveText('Неверный логин или пароль.');
  await panel.getByLabel('Пароль', { exact: true }).fill(credentials.Password);
  await panel.getByRole('button', { name: 'Войти в панель' }).click();
  await expect(panel).toHaveURL(/\/admin$/);
  assert.equal((await panel.content()).includes(process.env.ADMIN_PASSWORD_HASH), false);
  console.log('PASS separate administrator login, incorrect password, forged session, CSRF and private storage.');

  const owner = await account('admin-parent');
  const childOwner = await account('admin-child');
  const { data: created, error: createError } = await admin.rpc('create_museum_secure', { p_owner: owner.id, p_username: `parent_${suffix}`, p_name: 'Тестовый владелец', p_title: `Проверка роста ${suffix}`, p_required: 1 });
  if (createError) throw createError;
  const { data: parent, error: parentError } = await admin.from('museums').select('id,analytics_id').eq('owner_id', owner.id).single();
  if (parentError) throw parentError;
  museumIds.push(parent.id);
  const { data: invite, error: inviteError } = await admin.from('invite_links').select('token').eq('museum_id', parent.id).single();
  if (inviteError) throw inviteError;

  const fake = await browser.newContext();
  const fakePage = await fake.newPage();
  await fakePage.goto('http://localhost:3000/');
  const forgedClick = await fakePage.evaluate(async museum => {
    const r = await fetch('/api/analytics/create-click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ museum, source: 'exhibit' }) }); return r.status;
  }, parent.analytics_id);
  assert.equal(forgedClick, 403, 'non-participants cannot manufacture contributor clicks');
  await fake.close();

  const guest = await browser.newContext();
  const page = await guest.newPage();
  await page.goto(`http://localhost:3000/m/${invite.token}`);
  await page.locator('form input[maxlength="120"]').first().fill('Тестовый экспонат');
  await page.locator('form textarea').fill('Временное воспоминание для проверки аналитики.');
  const submit = page.getByRole('button', { name: 'Add to museum', exact: false });
  await expect(submit).toBeEnabled({ timeout: 60000 });
  const submitted = page.waitForResponse(r => r.url().endsWith('/exhibits') && r.request().method() === 'POST');
  await submit.click();
  const response = await submitted;
  assert.equal(response.status(), 201, await response.text());
  await expect(page.locator('#submission-success')).toBeVisible();
  const clicked = page.waitForResponse(r => r.url().endsWith('/api/analytics/create-click'));
  await page.locator('#submission-success a[href="/create"]').click();
  assert.equal((await clicked).status(), 200);
  await page.waitForURL(/\/(auth|create)$/);
  // Repeating the same participant's click must not add a second event.
  const repeated = await page.evaluate(async museum => {
    const r = await fetch('/api/analytics/create-click', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ museum, source: 'exhibit' }) }); return r.status;
  }, created.analyticsId);
  assert.equal(repeated, 200);
  await page.goto('http://localhost:3000/auth');
  await page.locator('input[type="email"]').fill(childOwner.email);
  await page.locator('input[type="password"]').fill(childOwner.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(create|dashboard)$/);
  await page.goto('http://localhost:3000/create');
  await page.locator('input[autocomplete="given-name"]').fill('Новый участник');
  await page.locator('input[autocomplete="username"]').fill(`child_${suffix}`);
  const birth = page.waitForResponse(r => r.url().endsWith('/api/museums') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Create museum ↗', exact: true }).click();
  const birthResponse = await birth;
  assert.equal(birthResponse.status(), 201, await birthResponse.text());
  const { data: child, error: childError } = await admin.from('museums').select('id').eq('owner_id', childOwner.id).single();
  if (childError) throw childError;
  museumIds.push(child.id);
  const { data: event, error: birthEventError } = await admin.storage.from(bucket).download(`births/${child.id}.json`);
  if (birthEventError) throw birthEventError;
  assert.equal(JSON.parse(await event.text()).parentId, parent.id);
  const { data: clicks } = await admin.storage.from(bucket).list('clicks', { search: parent.id });
  assert.equal(clicks.length, 1);
  console.log('PASS genuine submission, unique CTA click, attribution through login and child museum creation.');

  for (const width of [1440, 390]) {
    await panel.setViewportSize({ width, height: 1000 });
    await panel.goto(`http://localhost:3000/admin?q=${suffix}`);
    const row = panel.locator('tbody tr').filter({ hasText: owner.email });
    await expect(row).toContainText(`parent_${suffix}`);
    await expect(row).toContainText('Не отображается');
    await panel.screenshot({ path: `test-results/admin-users-${width}.png`, fullPage: true });
    await panel.goto('http://localhost:3000/admin?tab=analytics');
    const parentRow = panel.locator('tbody tr').filter({ hasText: `parent_${suffix}` });
    await expect(parentRow.locator('td').nth(2)).toHaveText('1 / 1');
    await expect(parentRow.locator('td').nth(3)).toHaveText('1');
    await expect(parentRow.locator('td').nth(4)).toHaveText('1');
    await expect(parentRow.locator('td').nth(5)).toHaveText('Открыт');
    assert.equal(await panel.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await panel.screenshot({ path: `test-results/admin-analytics-${width}.png`, fullPage: true });
  }
  await panel.reload(); await expect(panel).toHaveURL(/\/admin\?tab=analytics$/);
  await panel.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(panel).toHaveURL(/\/admin\/login$/);
  await panel.goto('http://localhost:3000/admin'); await expect(panel).toHaveURL(/\/admin\/login$/);
  console.log('PASS Russian users/analytics tabs, correct per-museum counts, mobile layout, session and logout.');
} finally {
  await browser.close();
  for (const id of museumIds) {
    const { data: clicks, error } = await admin.storage.from(bucket).list('clicks', { search: id });
    if (error) throw error;
    const paths = clicks.filter(file => file.name.startsWith(`${id}-`)).map(file => `clicks/${file.name}`);
    paths.push(`births/${id}.json`);
    const { error: removeError } = await admin.storage.from(bucket).remove(paths); if (removeError) throw removeError;
    const { error: exhibitError } = await admin.from('exhibits').delete().eq('museum_id', id); if (exhibitError) throw exhibitError;
  }
  for (const id of accounts) {
    // Recover IDs in case a test failed immediately after museum creation.
    const { data: rows, error } = await admin.from('museums').select('id').eq('owner_id', id); if (error) throw error;
    for (const row of rows) { const { error } = await admin.from('exhibits').delete().eq('museum_id', row.id); if (error) throw error; }
    const { error: deleteError } = await admin.auth.admin.deleteUser(id); if (deleteError) throw deleteError;
  }
  console.log('Removed only the disposable verification accounts, museums and analytics events.');
}
