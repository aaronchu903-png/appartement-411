const { test, expect } = require('@playwright/test');
const fs = require('fs');

const out = '/opt/cursor/artifacts';
fs.mkdirSync(out, { recursive: true });

const NB = '\u202F';
const AP = '\u2019';

test('letter 10 is the note under the door, without the cafe P.S.', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=letter');
  const paper = page.locator('#letterPaper');
  await expect(paper).toBeVisible();
  await expect(page.locator('#letterCard h2')).toHaveText('Mot à Madame Lefèvre · Jour 10');
  await expect(page.locator('#grammarLine')).toContainText('Le conditionnel de politesse');
  const text = await paper.innerText();
  expect(text).toContain('Chère Madame,');
  expect(text).toContain('Merci pour la clé. Le basilic est sur le toit, dans un pot.');
  expect(text).toContain('Il a de l' + AP + 'eau. Une feuille se redresse' + NB + '!');
  expect(text).toContain('Vous voudriez une photo du basilic' + NB + '?');
  expect(text).toContain('Je pourrais vous apporter une feuille, jeudi.');
  expect(text).toContain('Et un jour, vous pourriez monter… si vous voulez.');
  expect(text).toContain('À jeudi' + NB + '!');
  expect(text).toContain('le 411 (et Croissant)');
  expect(text).not.toContain('P.S.');
  expect(text).not.toContain('6. Le jardin');
  await expect(page.locator('[data-gap="voudriez"]')).toHaveText('voudriez');
  await expect(page.locator('[data-gap="pourrais"]')).toHaveText('pourrais');
  await expect(page.locator('[data-gap="pourriez"]')).toHaveText('pourriez');
  await page.screenshot({ path: out + '/letter10.png', fullPage: true });
});

test('letter 10 adds the cafe P.S. after the signature', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=letter&choice=cafe');
  const paper = page.locator('#letterPaper');
  await expect(paper).toBeVisible();
  const text = await paper.innerText();
  const sig = text.indexOf('le 411 (et Croissant)');
  const ps = text.indexOf('P.S. Noé voudrait du café. Toujours.');
  expect(sig).toBeGreaterThan(-1);
  expect(ps).toBeGreaterThan(sig);
  await page.screenshot({ path: out + '/letter10-ps.png', fullPage: true });
});

test('the polite-conditional card leads into the three gaps', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html?preview=letter&lesson=1');
  await expect(page.locator('#lessonCard h2')).toHaveText('Le conditionnel de politesse');
  await expect(page.locator('#lessonStep')).toHaveAttribute('data-kind', 'example');
  await expect(page.locator('.examples')).toContainText('Je veux du pain.');
  await expect(page.locator('.examples')).toContainText('Je voudrais du pain.');
  await page.screenshot({ path: out + '/letter10-lesson.png', fullPage: true });
  await page.locator('#btnLessonNext').click();
  await expect(page.locator('#lessonStep')).toHaveAttribute('data-kind', 'pattern');
  await expect(page.locator('.pattern')).toContainText('vous pourriez');
  await page.locator('#btnLessonNext').click();
  await expect(page.locator('#lessonTryQ')).toHaveText('Camille, tu ___ fermer la fenêtre' + NB + '?');
  await page.locator('[data-try="pourrais"]').click();
  await expect(page.locator('#lessonTryMsg')).toContainText('Oui');
  await page.locator('#btnLessonOk').click();
  await expect(page.locator('#gapPanel')).toHaveAttribute('data-gap', 'voudriez');
  await expect(page.locator('#gapMeaning')).toContainText('您愿意要一张罗勒的照片吗？');
  await page.locator('[data-gapopt="voudriez"]').click();
  await expect(page.locator('#gapPanel')).toHaveAttribute('data-gap', 'pourrais');
  await page.locator('[data-gapopt="pourrais"]').click();
  await expect(page.locator('#gapPanel')).toHaveAttribute('data-gap', 'pourriez');
  await page.locator('[data-gapopt="pourriez"]').click();
  await expect(page.locator('#letterDone')).toBeVisible();
  await expect(page.locator('#letterPaper')).not.toContainText('P.S.');
  await expect(page.locator('#letterPaper')).toContainText('le 411 (et Croissant)');
});
