const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = '/opt/cursor/artifacts/sofa-test';

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('sofa scene screenshots and no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('./index.html', { waitUntil: 'networkidle' });

  await page.screenshot({ path: path.join(OUT, '01-start.png'), fullPage: true });

  await page.click('#overlay');
  await page.waitForFunction(() => window.__sofaScene?.getPhase() === 'play');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, '02-t1-bubble.png'), fullPage: true });

  await page.waitForFunction(() => window.__sofaScene?.getPhase() === 'waitTail', { timeout: 15000 });
  await page.evaluate(() => {
    window.__sofaScene.setT(6);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '03-tail-question.png'), fullPage: true });

  await page.evaluate(() => {
    window.__sofaScene.setT(6);
    window.__sofaScene.setIdleGlow(true);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '04-idle-glow.png'), fullPage: true });

  await page.screenshot({ path: path.join(OUT, '10-close-tail.png'), fullPage: true });

  await page.evaluate(() => window.__sofaScene.tapTail());
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '05-peek-derriere.png'), fullPage: true });

  await page.evaluate(() => window.__sofaScene.setT(11));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '06-gag-walkout.png'), fullPage: true });

  await page.evaluate(() => window.__sofaScene.setT(14.2));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '07-glance-camera.png'), fullPage: true });

  await page.evaluate(() => window.__sofaScene.showBlack());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '08-black.png'), fullPage: true });

  await page.evaluate(() => window.__sofaScene.skipToWordcard());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '09-wordcard.png'), fullPage: true });

  expect(errors, `console errors: ${errors.join('; ')}`).toEqual([]);
});
