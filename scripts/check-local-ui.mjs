import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';

const baseURL = process.env.UI_BASE_URL || 'http://localhost:3000';
const channel = process.env.PLAYWRIGHT_CHANNEL || (existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'chrome' : undefined);
const browser = await chromium.launch({ channel, headless: true });
const errors = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const locale of ['en', 'ru', 'en', 'ru']) {
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: locale, exact: true }).click();
      await page.waitForFunction(value => document.documentElement.lang === value, locale);
      const russian = locale === 'ru';
      assert.match(await page.locator('h1').innerText(), russian ? /частичек вас/ : /pieces of you/);
      // Dynamic labels must follow React state, including after repeated language switches.
      await page.getByRole('button', { name: 'Pause memory motion', exact: true }).click();
      await page.waitForFunction(value => document.querySelector('.hero-orbit-toolbar button').textContent.includes(value), russian ? 'Продолжить' : 'Play motion');
      await page.getByRole('button', { name: 'Read memory: One more coffee', exact: true }).click();
      await page.getByRole('region', { name: 'Selected memory' }).waitFor();
      await page.getByRole('button', { name: 'Close memory', exact: true }).click();
      await page.getByRole('button', { name: 'Resume memory motion', exact: true }).click();
      await page.waitForFunction(value => document.querySelector('.hero-orbit-toolbar button').textContent.includes(value), russian ? 'Остановить' : 'Pause motion');
      await page.locator('.hero-actions a').first().click();
      await page.waitForURL(/\/(create|auth)$/);
      if (new URL(page.url()).pathname === '/create') {
        await page.locator('input[autocomplete="given-name"]').fill('Анна');
        await page.getByLabel('Upload your portrait', { exact: true }).setInputFiles({ name: 'portrait.webp', mimeType: 'image/webp', buffer: readFileSync('public/images/hero-woman-v2.webp') });
        await page.locator('.hero-uploaded-portrait img').waitFor();
        assert.equal(await page.locator('.hero-personal-signature strong').innerText(), 'Анна');
        assert.equal(await page.locator('.hero-orbit-card').first().isDisabled(), true);
        await page.getByRole('button', { name: russian ? 'Удалить фото' : 'Remove photo', exact: true }).click();
        await page.locator('.hero-personal-monogram').waitFor();
        await page.locator('input[autocomplete="username"]').fill('ANNA-test');
        assert.equal(await page.locator('input[autocomplete="username"]').inputValue(), 'annatest');
        assert.equal(await page.locator('input[maxlength="100"]').inputValue(), 'Museum of Анна');
        await page.locator('select').selectOption('8');
        const unavailable = page.locator('form [role="alert"]');
        if (await unavailable.count()) {
          assert.match(await unavailable.innerText(), russian ? /Создание музея пока недоступно/ : /Museum creation is not available/);
          assert.equal(await page.locator('button[type="submit"]').isDisabled(), true);
        }
      } else {
        await expect(page.locator('h1')).toHaveText(russian ? /Заходите/ : /Come on in/);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(value => document.documentElement.lang === value, locale);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      console.log(`PASS create CTA, form, dynamic labels, reload: ${locale}, ${width}px`);
    }
    for (const route of ['/demo', '/privacy', '/m/invalid', '/museum/missing', '/museum/missing/share', '/missing-page', '/dashboard']) {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
      await page.locator('.editorial-home').waitFor();
      assert.equal(await page.locator('.editorial-home').count(), 1, route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS public routes and EN/RU browser checks; no runtime or hydration errors.');
} finally {
  await browser.close();
}
