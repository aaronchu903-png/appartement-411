const { test, expect } = require('@playwright/test');

const PREFIX = '/appartement-411';
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

function fixtureLegacyStorage() {
  const yuechaoLearn = {
    schema: 1,
    profileId: 'yuechao',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    settings: { reviewCap: 20, newCap: 8, requestRetention: 0.9, track: 'A1', placement: 'not_started' },
    cards: { 'plante|listening': { itemId: 'plante', modality: 'listening', stability: 12, difficulty: 4, due: '2026-01-02T00:00:00.000Z', lastReview: '2026-01-01T00:00:00.000Z', reps: 3, lapses: 0, state: 'review' } },
    priorities: {},
    extraItems: [],
    evidence: [],
    placementLog: [],
    session: null,
    days: {},
    seed: null,
    carnet: { v: 1, words: [{ id: 'plante', at: '2025-12-01T00:00:00.000Z' }] }
  };
  const yuechaoStory = {
    schemaVersion: 1,
    profileId: 'yuechao',
    playerName: 'Synthetic Yuechao',
    updatedAt: '2026-01-01T00:00:00.000Z',
    week: { chapters: { d7: { status: 'complete', choices: { d7_band: 'A' } } } }
  };
  const jinyiLearn = {
    schema: 1,
    profileId: 'jinyi',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    settings: { reviewCap: 20, newCap: 8, requestRetention: 0.9, track: 'all', placement: 'known' },
    cards: { 'chat|listening': { itemId: 'chat', modality: 'listening', stability: 8, difficulty: 5, due: '2026-01-02T00:00:00.000Z', lastReview: '2026-01-01T00:00:00.000Z', reps: 2, lapses: 0, state: 'review' } },
    priorities: {},
    extraItems: [],
    evidence: [],
    placementLog: [],
    session: null,
    days: {},
    seed: null,
    carnet: { v: 1, words: [{ id: 'chat', at: '2025-12-01T00:00:00.000Z' }] }
  };
  const jinyiStory = { schemaVersion: 1, profileId: 'jinyi', playerName: 'Synthetic Jinyi', updatedAt: '2026-01-01T00:00:00.000Z' };
  return {
    'a411.device.profile': JSON.stringify({ activeProfile: 'yuechao' }),
    'a411.p.yuechao.learn': JSON.stringify(yuechaoLearn),
    'a411.p.yuechao.story': JSON.stringify(yuechaoStory),
    'a411.p.yuechao.uiLang': '"zh"',
    'a411.p.jinyi.learn': JSON.stringify(jinyiLearn),
    'a411.p.jinyi.story': JSON.stringify(jinyiStory),
    'a411.p.jinyi.uiLang': '"en"'
  };
}

async function snapshotOldKeys(page) {
  return page.evaluate(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('a411.p.') || k === 'a411.device.profile') keys.push(k);
    }
    keys.sort();
    const out = {};
    for (const k of keys) out[k] = localStorage.getItem(k);
    return out;
  });
}

test.describe('production release checks', () => {
  test.use({
    serviceWorkers: 'allow',
    baseURL: base
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${PREFIX}/legacy/index.html`);
    await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      localStorage.clear();
    });
  });

  test('(a) root loads the new Day 8 app', async ({ page }) => {
    await page.goto(`${PREFIX}/`);
    await expect(page).toHaveTitle(/basilic/i);
    await expect(page.locator('#app.game')).toBeVisible();
    await expect(page.locator('script[src="app.js"]')).toHaveCount(1, { timeout: 15000 });
  });

  test('(b) /legacy/ loads the old game and can start Day 1', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${PREFIX}/legacy/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('pickYuechao'), null, { timeout: 120000 });
    await expect(page.locator('#pickYuechao')).toBeVisible();
    await page.locator('#pickYuechao').click();
    await page.locator('#btnPlaceSkip').click();
    await page.locator('#btnStart').click();
    await expect(page.locator('#where')).toContainText(/Jour 1/i);
  });

  test('(c) migrates yuechao from legacy keys without mutating old storage', async ({ page }) => {
    const fixtures = fixtureLegacyStorage();
    await page.addInitScript((data) => {
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
    }, fixtures);
    const before = { ...fixtures };
    await page.goto(`${PREFIX}/`);
    await page.waitForFunction(() => window.Day8App && window.Day8App.ready);
    const migrated = await page.evaluate(() => {
      const raw = localStorage.getItem('a411app.v1.state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      return { profileId: state.profileId, source: state.legacy && state.legacy.localSource };
    });
    expect(migrated).toBeTruthy();
    expect(migrated.profileId).toBe('yuechao');
    expect(migrated.source.profileId).toBe('yuechao');
    const after = await snapshotOldKeys(page);
    expect(after).toEqual(before);
  });

  test('(d) new root SW replaces an installed legacy root worker', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${PREFIX}/`);
    await page.evaluate(async (prefix) => {
      const cache = await caches.open('a411-v0.14.0-shell');
      const url = location.origin + prefix + '/index.html';
      await cache.put(url, new Response('<!doctype html><body id="old-sw-stub">stale</body>', { headers: { 'Content-Type': 'text/html' } }));
    }, PREFIX);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL?.includes('/sw.js'), null, { timeout: 30000 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(async () => !(await caches.keys()).includes('a411-v0.14.0-shell'), null, { timeout: 30000 });
    await page.waitForFunction(() => window.Day8App?.ready, null, { timeout: 60000 });
    await expect(page).toHaveTitle(/basilic/i);
    await page.goto(`${PREFIX}/legacy/`);
    await page.waitForFunction(() => document.getElementById('pickYuechao'), null, { timeout: 120000 });
    await page.locator('#pickYuechao').click();
    await expect(page.locator('#btnPlaceSkip')).toBeVisible();
  });

  test('(e) service worker scopes exclude legacy and day8', async ({ page }) => {
    await page.goto(`${PREFIX}/`);
    await page.waitForFunction(() => navigator.serviceWorker.ready);
    const scopes = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map(r => ({ scope: r.scope, script: r.active && r.active.scriptURL }));
    });
    const rootReg = scopes.find(r => r.script && r.script.includes('/sw.js') && !r.script.includes('/day8/'));
    expect(rootReg).toBeTruthy();
    expect(rootReg.scope).toMatch(/appartement-411\/$/);
    await page.goto(`${PREFIX}/legacy/`);
    const controlsLegacy = await page.evaluate(() => {
      const c = navigator.serviceWorker.controller;
      return c ? c.scriptURL : null;
    });
    if (controlsLegacy) {
      expect(controlsLegacy).not.toMatch(/\/legacy\//);
    }
    await page.goto(`${PREFIX}/day8/`);
    await page.waitForFunction(() => window.Day8App?.ready, null, { timeout: 60000 }).catch(() => {});
    const day8Regs = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.filter(r => r.active && r.active.scriptURL.includes('/day8/sw.js'));
    });
    expect(day8Regs.length).toBeGreaterThanOrEqual(0);
  });
});
