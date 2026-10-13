const { test, expect } = require('@playwright/test');
const fs = require('fs');

const out = '/opt/cursor/artifacts';
fs.mkdirSync(out, { recursive: true });

test('rooftop first visit is a labelled placeholder', async ({ page }) => {
  await page.goto('/index.html?preview=rooftop');
  const roof = page.locator('#rooftop');
  await expect(roof).toBeVisible();
  await expect(roof).toHaveAttribute('data-state', 'dry');
  await expect(page.locator('[data-prop="pot_dry"]').first()).toBeVisible();
  await expect(page.locator('[data-prop="pot_empty"]')).toBeVisible();
  await expect(page.locator('[data-prop="old_chair"]')).toBeVisible();
  await expect(page.locator('[data-prop="wood_sign"]')).toHaveText('wood_sign');
  await expect(page.locator('[data-prop="watering_can"]')).toBeVisible();
  await expect(page.locator('[data-prop="weeds"]')).toBeVisible();
  const font = await roof.evaluate(function (el) { return getComputedStyle(el).fontFamily; });
  expect(font.toLowerCase()).toContain('noto sans');
  await page.screenshot({ path: out + '/rooftop-first-visit.png' });
});

for (const leaves of ['full', 'wilting', 'dormant']) {
  test('five pots, ' + leaves + ', do not scroll', async ({ page }) => {
    await page.goto('/index.html?preview=pots&leaves=' + leaves);
    const screen = page.locator('#potScreen');
    await expect(screen).toBeVisible();
    await expect(screen.locator(':scope > button.pot')).toHaveCount(5);
    await expect(screen.locator('button.pot').first()).toHaveAttribute('data-leaves', leaves);
    const fits = await screen.evaluate(function (el) { return el.scrollHeight <= el.clientHeight + 1; });
    expect(fits).toBe(true);
    const font = await screen.evaluate(function (el) { return getComputedStyle(el).fontFamily; });
    expect(font.toLowerCase()).toContain('noto sans');
    await page.screenshot({ path: out + '/pots-' + leaves + '.png' });
    if (leaves === 'full') {
      await screen.locator('button.pot').nth(1).click();
      await expect(page.locator('#potSheet')).toBeVisible();
      await expect(page.locator('#potSheet')).toContainText('À table');
      await expect(page.locator('#potSheet')).toContainText('Jour 10');
      await page.screenshot({ path: out + '/pots-words.png' });
    }
  });
}
