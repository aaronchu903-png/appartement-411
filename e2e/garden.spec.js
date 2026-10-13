const { test, expect } = require('@playwright/test');
const fs = require('fs');

const out = '/opt/cursor/artifacts';
fs.mkdirSync(out, { recursive: true });

async function labelsClearFabs(page) {
  const hit = await page.evaluate(function () {
    function box(el) {
      var r = el.getBoundingClientRect();
      return { t: r.top, b: r.bottom, l: r.left, right: r.right, text: (el.textContent || '').trim(), id: el.id || el.className };
    }
    function overlaps(a, b) {
      return a.l < b.right - 1 && a.right > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
    }
    var labels = Array.prototype.slice.call(document.querySelectorAll('#potScreen .name, #potScreen .cap, #potScreen .where')).map(box);
    var fabs = ['#btnWordbook', '#btnMusic'].map(function (sel) { return document.querySelector(sel); }).filter(Boolean).map(box);
    var problems = [];
    labels.forEach(function (a) {
      if (a.b > window.innerHeight - 1 || a.t < 0) problems.push('offscreen ' + a.text);
      fabs.forEach(function (b) { if (overlaps(a, b)) problems.push(a.text + ' overlaps ' + b.id); });
    });
    return problems;
  });
  expect(hit).toEqual([]);
}

async function onePause(page) {
  await expect(page.locator('#btnPause')).toHaveCount(1);
  await expect(page.locator('#btnPotsHome')).toHaveCount(0);
  const ids = await page.locator('#topbar > *').evaluateAll(function (els) { return els.map(function (e) { return e.id; }); });
  expect(ids).toEqual(['where', 'btnPause']);
}

async function stemInSoil(page) {
  const ok = await page.locator('#gardenCanvas').evaluate(function (canvas) {
    var ctx = canvas.getContext('2d');
    var anchors = [39, 117, 195, 273, 351];
    return anchors.every(function (x) {
      var stem = ctx.getImageData(x, 600, 1, 1).data;
      var pot = ctx.getImageData(x, 708, 1, 1).data;
      return stem[3] > 200 && pot[3] > 200 && pot[0] > pot[2];
    });
  });
  expect(ok).toBe(true);
}

test('rooftop first visit uses the day scene', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=rooftop');
  const roof = page.locator('#rooftop');
  await expect(roof).toHaveAttribute('data-ready', '1');
  await expect(roof).toHaveAttribute('data-state', 'dry');
  await expect(roof).toHaveAttribute('data-scene', 'firstvisit');
  await expect(roof).toHaveAttribute('data-night', '0');
  await expect(roof).toHaveAttribute('data-entry', '15,5');
  await expect(roof).toHaveAttribute('data-bg', /rooftop_day\.png$/);
  await expect(roof).toHaveAttribute('data-composed', '0');
  const rendering = await roof.locator('canvas').evaluate(function (el) { return getComputedStyle(el).imageRendering; });
  expect(rendering).toMatch(/pixelated|crisp-edges/);
  await expect(page.locator('[data-prop="pot_dry"]').first()).toBeVisible();
  await expect(page.locator('[data-prop="pot_empty"]')).toBeVisible();
  await expect(page.locator('[data-prop="old_chair"]')).toBeVisible();
  await expect(page.locator('[data-prop="wood_sign"]')).toHaveText('');
  await expect(page.locator('[data-prop="watering_can"]')).toBeVisible();
  await expect(page.locator('[data-prop="weeds"]').first()).toBeVisible();
  await expect(roof).not.toContainText('muguet');
  const font = await roof.evaluate(function (el) { return getComputedStyle(el).fontFamily; });
  expect(font.toLowerCase()).toContain('noto sans');
  await onePause(page);
  await page.screenshot({ path: out + '/rooftop-first-visit.png' });
});

test('Day 10 roof goals glow and stay within 8 tiles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=rooftop&walk=pot');
  const roof = page.locator('#rooftop');
  await expect(roof).toHaveAttribute('data-ready', '1');
  await expect(roof).toHaveAttribute('data-walk', 'pot_empty');
  const steps = Number(await roof.getAttribute('data-steps'));
  expect(steps).toBeGreaterThan(0);
  expect(steps).toBeLessThanOrEqual(8);
  await expect(page.locator('.goal-glow')).toHaveCount(1);
  await expect(page.locator('.goal-glow')).toHaveAttribute('data-prop', 'pot_empty');
  await expect(page.locator('.walk-goal')).toContainText('Un pot vide');
  await expect(roof).not.toContainText('arrosoir');
  await expect(page.locator('.tap-hand')).toBeVisible();
  await page.waitForFunction(function () { return localStorage.getItem('a411.p.jinyi.tapHand') === '1'; });
  await expect(page.locator('.tap-hand')).toHaveCount(0);
  await page.locator('.walk-goal button.qbtn').click();
  await expect(page.locator('.walk-goal')).toContainText('那边');
  await page.locator('[data-prop="old_chair"]').click();
  await expect(roof).toHaveAttribute('data-feedback', '1');
  const before = await roof.getAttribute('data-player');
  const canvasBox = await page.locator('#roofCanvas').boundingBox();
  await page.mouse.click(canvasBox.x + canvasBox.width * (112 / 192), canvasBox.y + canvasBox.height * (236 / 256));
  await expect(roof).not.toHaveAttribute('data-player', before);
  await expect(roof).not.toContainText('arrosoir');
  await page.screenshot({ path: out + '/rooftop-pot-goal.png' });
  await page.locator('.goal-glow').click();
  await expect(roof).toHaveAttribute('data-arrived', '1');
  await expect(page.locator('.roof-pigeon')).toHaveClass(/go/);

  await page.goto('/index.html?preview=rooftop&walk=can');
  const can = page.locator('#rooftop');
  await expect(can).toHaveAttribute('data-ready', '1');
  await expect(can).toHaveAttribute('data-walk', 'watering_can');
  await expect(page.locator('.tap-hand')).toHaveCount(0);
  const canSteps = Number(await can.getAttribute('data-steps'));
  expect(canSteps).toBeGreaterThan(0);
  expect(canSteps).toBeLessThanOrEqual(8);
  await expect(page.locator('.goal-glow')).toHaveAttribute('data-prop', 'watering_can');
  await expect(page.locator('.walk-goal')).toContainText('arrosoir');
  await expect(page.locator('.walk-goal')).not.toContainText('pot vide');
  await page.screenshot({ path: out + '/rooftop-can-goal.png' });
});

test('Day 10 tap guide shows the hand, the glow and the cat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=rooftop&walk=pot&tapIdle=0');
  const roof = page.locator('#rooftop');
  await expect(roof).toHaveAttribute('data-ready', '1');
  await expect(page.locator('.tap-hand')).toBeVisible();
  await expect(page.locator('.goal-glow')).toHaveAttribute('data-prop', 'pot_empty');
  await expect(page.locator('[data-cat="sit"].look-right')).toBeVisible();
  await page.screenshot({ path: out + '/rooftop-tap-guide.png' });
});

test('tidy rooftop at night', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=rooftop&scene=tidy&night=1');
  const roof = page.locator('#rooftop');
  await expect(roof).toHaveAttribute('data-ready', '1');
  await expect(roof).toHaveAttribute('data-scene', 'tidy');
  await expect(roof).toHaveAttribute('data-night', '1');
  await expect(roof).toHaveAttribute('data-bg', /rooftop_night\.png$/);
  await expect(roof).toHaveAttribute('data-composed', '0');
  await expect(page.locator('[data-prop="weeds"]')).toHaveCount(0);
  await expect(page.locator('[data-prop="basil_planted"]').first()).toBeVisible();
  await expect(page.locator('[data-prop="watering_can"]')).toBeVisible();
  await expect(page.locator('[data-prop="old_chair"]')).toBeVisible();
  await page.screenshot({ path: out + '/rooftop-tidy-night.png' });
});

for (const size of [{ width: 390, height: 844, name: '390' }, { width: 375, height: 667, name: '375' }]) {
  for (const leaves of ['full', 'wilting', 'dormant']) {
    test('five pots ' + leaves + ' at ' + size.width + 'x' + size.height, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('/index.html?preview=pots&leaves=' + leaves);
      const screen = page.locator('#potScreen');
      await expect(screen).toHaveAttribute('data-ready', '1');
      await expect(screen.locator('button.pot')).toHaveCount(5);
      await expect(screen.locator('button.pot').first()).toHaveAttribute('data-leaves', leaves);
      const rendering = await screen.locator('canvas').evaluate(function (el) { return getComputedStyle(el).imageRendering; });
      expect(rendering).toMatch(/pixelated|crisp-edges/);
      const fits = await page.evaluate(function () {
        var screen = document.getElementById('potScreen');
        var doc = document.scrollingElement;
        return getComputedStyle(screen).overflow === 'hidden' && doc.scrollHeight <= window.innerHeight + 1;
      });
      expect(fits).toBe(true);
      const font = await screen.evaluate(function (el) { return getComputedStyle(el).fontFamily; });
      expect(font.toLowerCase()).toContain('noto sans');
      await onePause(page);
      await labelsClearFabs(page);
      await stemInSoil(page);
      if (size.width === 390) await page.screenshot({ path: out + '/pots-' + leaves + '.png' });
      if (leaves === 'full' && size.width === 390) {
        await screen.locator('button.pot').nth(1).click();
        await expect(page.locator('#potSheet')).toBeVisible();
        await expect(page.locator('#potSheet')).toContainText('À table');
        await expect(page.locator('#potSheet')).toContainText('Jour 10');
        await page.screenshot({ path: out + '/pots-words.png' });
      }
    });
  }
}

test('five pots at night', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=pots&leaves=full&night=1');
  const screen = page.locator('#potScreen');
  await expect(screen).toHaveAttribute('data-ready', '1');
  await expect(screen).toHaveAttribute('data-night', '1');
  await onePause(page);
  await labelsClearFabs(page);
  await stemInSoil(page);
  const dayClay = await page.locator('#gardenCanvas').evaluate(function (canvas) {
    var px = canvas.getContext('2d').getImageData(39, 708, 1, 1).data;
    return px[3] > 200 && px[0] > 100 && px[0] > px[2];
  });
  expect(dayClay).toBe(true);
});
