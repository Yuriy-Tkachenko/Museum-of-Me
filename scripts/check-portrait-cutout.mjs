import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import sharp from 'sharp';
import { chromium, expect } from '@playwright/test';

const credentials = Object.fromEntries(readFileSync('.local-test-account.txt', 'utf8').trim().split('\n').map(line => {
  const i = line.indexOf(': '); return [line.slice(0, i), line.slice(i + 2)];
}));
// An opaque portrait exercises real segmentation, unlike the existing cutout.
const photo = await sharp('public/images/hero-woman-v2.webp').flatten({ background: '#b6d1cc' }).jpeg().toBuffer();
const channel = existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe') ? 'chrome' : undefined;
const browser = await chromium.launch({ channel, headless: true });
mkdirSync('test-results', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('Browser error:', message.text()); });
  await page.goto('http://localhost:3000/auth');
  await page.locator('input[type="email"]').fill(credentials.Email);
  await page.locator('input[type="password"]').fill(credentials.Password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('http://localhost:3000/create');
    await page.locator('input[autocomplete="given-name"]').fill('Alex');
    // Observe painted frames through processing and image decoding.
    await page.evaluate(() => {
      window.portraitFrameCheck = { active: true, flashed: false };
      const check = () => {
        const frame = document.querySelector('.hero-uploaded-portrait');
        if (frame) {
          const style = getComputedStyle(frame);
          if (style.visibility !== 'hidden' && style.display !== 'none' && parseFloat(style.borderTopWidth) > 0) window.portraitFrameCheck.flashed = true;
        }
        if (window.portraitFrameCheck.active) requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    await page.getByLabel('Upload your portrait', { exact: true }).setInputFiles({ name: 'portrait.jpg', mimeType: 'image/jpeg', buffer: photo });
    await expect(page.getByText('Adjust your photo', { exact: true })).toBeVisible();
    await page.getByLabel('Photo size', { exact: true }).fill('1.2');
    await page.getByRole('button', { name: 'Apply crop', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Remove background', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Remove background', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Keep original photo', exact: true })).toBeEnabled({ timeout: 60000 });
    await expect(page.locator('.hero-cutout-portrait')).toBeVisible();
    assert.equal(await page.evaluate(() => { window.portraitFrameCheck.active = false; return window.portraitFrameCheck.flashed; }), false, 'no oval frame flashes while preparing the cutout');
    const encoded = await page.locator('.hero-uploaded-portrait img').evaluate(img => {
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return canvas.toDataURL('image/webp').split(',')[1];
    });
    const output = Buffer.from(encoded, 'base64');
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, opaque = 0;
    for (let i = 3; i < data.length; i += 4) { if (data[i] < 20) transparent++; if (data[i] > 240) opaque++; }
    assert.ok(transparent > info.width * info.height * .1, 'background is transparent');
    assert.ok(opaque > info.width * info.height * .1, 'person is retained');
    writeFileSync(`test-results/portrait-cutout-${width}.webp`, output);
    await page.locator('.creation-live-preview').screenshot({ path: `test-results/portrait-cutout-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole('button', { name: 'Keep original photo', exact: true }).click();
    await expect(page.locator('.hero-cutout-portrait')).toHaveCount(0);
    await expect(page.locator('.hero-uploaded-portrait')).toBeVisible();
    await page.getByRole('button', { name: 'Remove background', exact: true }).click();
    await expect(page.locator('.hero-cutout-portrait')).toBeVisible();
    await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
    await expect(page.locator('.hero-personal-monogram')).toBeVisible();
    console.log(`PASS real segmentation, alpha, original restoration and removal at ${width}px`);
  }
  // A failed model download keeps the original usable and unlocks the form.
  await page.goto('http://localhost:3000/create');
  await page.route('**/models/portrait/**', route => route.abort());
  await page.getByLabel('Upload your portrait', { exact: true }).setInputFiles({ name: 'portrait.jpg', mimeType: 'image/jpeg', buffer: photo });
  await expect(page.getByRole('status')).toContainText('Your original is ready to use.', { timeout: 30000 });
  await expect(page.getByRole('button', { name: 'Remove background', exact: true })).toBeEnabled();
  await expect(page.locator('.hero-uploaded-portrait')).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS model failure retains the original photograph; no runtime errors.');
} finally { await browser.close(); }
