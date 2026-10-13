import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const credentials = Object.fromEntries(readFileSync('.local-test-account.txt', 'utf8').trim().split('\n').map(line => {
  const separator = line.indexOf(': ');
  return [line.slice(0, separator), line.slice(separator + 2)];
}));
const channel = existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'chrome' : undefined;
const browser = await chromium.launch({ channel, headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3000/create');
  await expect(page).toHaveURL(/\/auth$/);
  await page.locator('input[type="email"]').fill(credentials.Email);
  await page.locator('input[type="password"]').fill('invalid-password-for-check');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.form-panel p[role="alert"]')).toContainText('Invalid login credentials');
  await page.locator('input[type="password"]').fill(credentials.Password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30000 });
  await page.goto('http://localhost:3000/create');
  await expect(page.locator('input[autocomplete="given-name"]')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.locator('input[autocomplete="given-name"]')).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS real password login, invalid password rejection, protected museum form and session persistence.');
} finally {
  await browser.close();
}
