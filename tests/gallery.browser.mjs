import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

let browser;
let server;
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3187';
before(async () => {
  if (!process.env.TEST_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3187'], {
      stdio: 'ignore',
    });
    for (let attempt = 0; ; attempt++) {
      if (server.exitCode !== null) throw new Error('Local test server could not start.');
      try { if ((await fetch(baseURL)).ok) break; } catch {}
      if (attempt === 120) throw new Error('Build the app before running tests (npm run build).');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
});
after(async () => {
  await browser?.close();
  server?.kill();
});

async function withPage(options, run) {
  const context = await browser.newContext({ baseURL, ...options });
  try { await run(await context.newPage()); } finally { await context.close(); }
}

test('normal-motion desktop gallery restores native modal cursors', async () => {
  await withPage({ reducedMotion: 'no-preference', hasTouch: false }, async page => {
    await page.goto('/photos/football');
    await page.waitForFunction(() => document.body.classList.contains('has-custom-cursor'));
    assert.equal(await page.evaluate(() => matchMedia('(pointer: fine)').matches), true);
    const opener = page.getByRole('button', { name: /^Open photo 1 of/ });
    assert.equal(await opener.evaluate(el => getComputedStyle(el).cursor), 'none');
    await opener.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await dialog.evaluate(el => el.matches(':modal')), true);
    assert.equal(await dialog.evaluate(el => getComputedStyle(el).cursor), 'default');
    assert.equal(await dialog.locator('img').evaluate(el => getComputedStyle(el).cursor), 'default');
    for (const button of await dialog.getByRole('button').all()) {
      await button.hover();
      assert.equal(await button.evaluate(el => getComputedStyle(el).cursor), 'pointer');
    }
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await opener.evaluate(el => getComputedStyle(el).cursor), 'none');
  });
});

test('gallery contains focus, blocks background focus, navigates and restores the opener', async () => {
  await withPage({ reducedMotion: 'reduce' }, async page => {
    await page.goto('/photos/football');
    const opener = page.getByRole('button', { name: /^Open photo 2 of/ });
    await opener.click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.equal(await page.getByRole('button', { name: /esc \/ close/ }).evaluate(el => el === document.activeElement), true);
    assert.equal(await dialog.evaluate(el => el.matches(':modal')), true);
    await page.locator('[title="Toggle motion effects"]').evaluate(el => el.focus());
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
    for (const key of ['Shift+Tab', 'Tab', 'Tab', 'Tab', 'Tab', 'Tab']) {
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest('dialog')), true);
    }
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('dialog').textContent.includes('03/'));
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.querySelector('dialog').textContent.includes('02/'));
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await opener.evaluate(el => el === document.activeElement), true);
    await opener.click();
    await page.getByRole('button', { name: /esc \/ close/ }).click();
    assert.equal(await opener.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
});

test('live reduced-motion changes stop and restart the cursor and smooth scrolling', async () => {
  await withPage({ reducedMotion: 'no-preference', hasTouch: false }, async page => {
    await page.goto('/photos/football');
    const waitForMotion = enabled => page.waitForFunction(expected =>
      document.body.classList.contains('has-custom-cursor') === expected &&
      !!document.querySelector('.vf-cursor') === expected &&
      document.documentElement.classList.contains('lenis') === expected,
    enabled);
    await waitForMotion(true);
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await waitForMotion(false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await waitForMotion(true);
    }
  });
});
