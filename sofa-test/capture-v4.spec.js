const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_REPO = path.join(__dirname, 'v4');
const OUT_ART = '/opt/cursor/artifacts/sofa-test/v4';

test.use({ viewport: { width: 473, height: 1024 } });

test.beforeAll(() => {
  fs.mkdirSync(OUT_REPO, { recursive: true });
  fs.mkdirSync(OUT_ART, { recursive: true });
});

function md5(file) {
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

function saveBoth(page, name) {
  return Promise.all([
    page.screenshot({ path: path.join(OUT_REPO, name), fullPage: true }),
    page.screenshot({ path: path.join(OUT_ART, name), fullPage: true })
  ]);
}

async function captureAt(page, cfg) {
  await page.evaluate((c) => {
    if (c.shot) window.__sofaScene.setShot(c.shot);
    else window.__sofaScene.setT(c.t);
    if (c.idleGlow) window.__sofaScene.enableTapRing(true);
  }, cfg);
  if (cfg.t != null) {
    await page.waitForFunction((t) => Math.abs(window.__sofaScene.getT() - t) < 0.02, cfg.t);
  }
  if (cfg.expectPeek) {
    await page.waitForFunction(() => {
      const d = window.__sofaScene.getLastCatDraw();
      return d && (d.key === 'peek_0' || d.key === 'peek_1');
    });
  }
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      })
  );
  await page.waitForTimeout(80);
}

test('v4 portrait screenshots', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  const windows = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'scene.json'), 'utf8')
  ).shots;

  await page.goto('./index.html', { waitUntil: 'networkidle' });
  await saveBoth(page, 'start.png');

  await page.click('#overlay');
  await page.waitForFunction(() => window.__sofaScene?.getPhase() === 'play');

  const shots = [
    { file: 'shot-01.png', t: 0.8, shotId: 1 },
    { file: 'shot-02.png', t: 2.05, shotId: 2 },
    { file: 'shot-03.png', t: 5.42, shotId: 3 },
    { file: 'shot-04.png', t: 6.2, shotId: 4, idleGlow: true },
    { file: 'shot-05.png', t: 8.25, shotId: 5, expectPeek: true },
    { file: 'shot-06.png', t: 10.4, shotId: 6 },
    { file: 'shot-07.png', t: 12.5, shotId: 7 },
    { file: 'shot-08.png', t: 14.5, shotId: 8 },
    { file: 'shot-ou-bubble-only.png', t: 4.85, shotId: 3 },
    { file: 'shot-ou-tail-visible.png', t: 5.35, shotId: 3 }
  ];

  for (const s of shots) {
    const win = windows.find((w) => w.id === s.shotId);
    expect(s.t, `${s.file} timing`).toBeGreaterThanOrEqual(win.t0);
    expect(s.t, `${s.file} timing`).toBeLessThan(win.t1);
    await captureAt(page, s);
    await saveBoth(page, s.file);
  }

  const ouA = path.join(OUT_REPO, 'shot-ou-bubble-only.png');
  const ouB = path.join(OUT_REPO, 'shot-ou-tail-visible.png');
  expect(md5(ouA)).not.toEqual(md5(ouB));

  expect(errors, errors.join('; ')).toEqual([]);
});
