const { test, expect } = require('@playwright/test');

const LIVE = 'https://aaronchu903-png.github.io';
const PREFIX = '/appartement-411';

function fixtureLegacyStorage() {
  const yuechaoLearn = {
    schema: 1,
    profileId: 'yuechao',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    settings: { reviewCap: 20, newCap: 8, requestRetention: 0.9, track: 'A1', placement: 'not_started' },
    cards: { 'plante|listening': { itemId: 'plante', modality: 'listening', stability: 12, difficulty: 4, due: '2026-01-02T00:00:00.000Z', lastReview: '2026-01-01T00:00:00.000Z', reps: 3, lapses: 0, state: 'review' } },
    priorities: {}, extraItems: [], evidence: [], placementLog: [], session: null, days: {}, seed: null,
    carnet: { v: 1, words: [{ id: 'plante', at: '2025-12-01T00:00:00.000Z' }] }
  };
  const yuechaoStory = { schemaVersion: 1, profileId: 'yuechao', playerName: 'Synthetic Yuechao', updatedAt: '2026-01-01T00:00:00.000Z' };
  const jinyiLearn = {
    schema: 1, profileId: 'jinyi', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    settings: { reviewCap: 20, newCap: 8, requestRetention: 0.9, track: 'all', placement: 'known' },
    cards: { 'chat|listening': { itemId: 'chat', modality: 'listening', stability: 8, difficulty: 5, due: '2026-01-02T00:00:00.000Z', lastReview: '2026-01-01T00:00:00.000Z', reps: 2, lapses: 0, state: 'review' } },
    priorities: {}, extraItems: [], evidence: [], placementLog: [], session: null, days: {}, seed: null,
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

test.describe('live production checks', () => {
  test.use({
    baseURL: LIVE,
    serviceWorkers: 'allow',
    storageState: { cookies: [], origins: [] }
  });

  test('(a) live root is Day 8 app', async ({ page }) => {
    await page.goto(`${PREFIX}/`);
    await expect(page).toHaveTitle(/basilic/i);
    await page.screenshot({ path: '/opt/cursor/artifacts/live-root.png', fullPage: true });
  });

  test('(b) live legacy loads', async ({ page }) => {
    await page.goto(`${PREFIX}/legacy/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('pickYuechao'), null, { timeout: 120000 });
    await page.screenshot({ path: '/opt/cursor/artifacts/live-legacy.png', fullPage: true });
  });

  test('(c) live migration preserves legacy keys', async ({ page }) => {
    const fixtures = fixtureLegacyStorage();
    await page.addInitScript((data) => { for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v); }, fixtures);
    const before = { ...fixtures };
    await page.goto(`${PREFIX}/`);
    await page.waitForFunction(() => window.Day8App?.ready, null, { timeout: 60000 });
    const profileId = await page.evaluate(() => JSON.parse(localStorage.getItem('a411app.v1.state')).profileId);
    expect(profileId).toBe('yuechao');
    const after = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('a411.p.') || k === 'a411.device.profile').sort();
      const out = {}; for (const k of keys) out[k] = localStorage.getItem(k); return out;
    });
    expect(after).toEqual(before);
  });

  test('(e) live SW scopes', async ({ page }) => {
    await page.goto(`${PREFIX}/`);
    await page.waitForFunction(() => navigator.serviceWorker.ready);
    const scopes = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => r.scope));
    expect(scopes.some(s => s.endsWith('/appartement-411/'))).toBeTruthy();
  });
});
