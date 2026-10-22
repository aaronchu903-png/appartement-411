const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = '/opt/cursor/artifacts/sofa-test';
const LIVE = process.env.SOFA_LIVE_URL || 'https://aaronchu903-png.github.io/appartement-411/sofa-test/';

test('live site loads and screenshots', async ({ page, request }) => {
  fs.mkdirSync(OUT, { recursive: true });

  const base = LIVE.endsWith('/') ? LIVE : `${LIVE}/`;
  const res = await request.get(base);
  if (res.status() !== 200) throw new Error(`index ${res.status()}`);
  const json = await request.get(`${base}scene.json`);
  if (json.status() !== 200) throw new Error(`scene.json ${json.status()}`);
  const asset = await request.get(`${base}assets/sofa_early.png`);
  if (asset.status() !== 200) throw new Error(`asset ${asset.status()}`);

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, 'live-01-start.png'), fullPage: true });

  await page.click('#overlay');
  await page.waitForFunction(() => window.__sofaScene?.getPhase() === 'waitTail', { timeout: 20000 });
  await page.evaluate(() => {
    window.__sofaScene.setT(6);
    window.__sofaScene.setIdleGlow(true);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'live-10-close-tail.png'), fullPage: true });
});
