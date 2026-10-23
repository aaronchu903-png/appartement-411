const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT_REPO = path.join(__dirname, 'v3');
const OUT_ART = '/opt/cursor/artifacts/sofa-test/v3';

test.use({ viewport: { width: 473, height: 1024 } });

test.beforeAll(() => {
  fs.mkdirSync(OUT_REPO, { recursive: true });
  fs.mkdirSync(OUT_ART, { recursive: true });
});

function saveBoth(page, name) {
  return Promise.all([
    page.screenshot({ path: path.join(OUT_REPO, name), fullPage: true }),
    page.screenshot({ path: path.join(OUT_ART, name), fullPage: true })
  ]);
}

test('v3 portrait screenshots', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('./index.html', { waitUntil: 'networkidle' });
  await saveBoth(page, 'start.png');

  await page.click('#overlay');
  await page.waitForFunction(() => window.__sofaScene?.getPhase() === 'play');

  const shots = [
    { file: 'shot-01.png', t: 0.8 },
    { file: 'shot-02.png', t: 2.5 },
    { file: 'shot-03.png', t: 4.2 },
    { file: 'shot-04.png', shot: 4 },
    { file: 'shot-05.png', t: 9 },
    { file: 'shot-06.png', t: 10.85 },
    { file: 'shot-07.png', t: 12.8 },
    { file: 'shot-08.png', t: 14.5 }
  ];

  for (const s of shots) {
    await page.evaluate((cfg) => {
      if (cfg.shot) window.__sofaScene.setShot(cfg.shot);
      else window.__sofaScene.setT(cfg.t);
    }, s);
    await page.waitForTimeout(250);
    await saveBoth(page, s.file);
  }

  await page.evaluate(() => {
    window.__sofaScene.setT(4.85);
  });
  await page.waitForTimeout(200);
  await saveBoth(page, 'shot-ou-bubble-only.png');

  await page.evaluate(() => {
    window.__sofaScene.setT(5.35);
  });
  await page.waitForTimeout(200);
  await saveBoth(page, 'shot-ou-tail-visible.png');

  expect(errors, errors.join('; ')).toEqual([]);
});
