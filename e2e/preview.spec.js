const { test, expect } = require('@playwright/test');

async function installSave(page, throughDay) {
  await page.goto('/appartement-411/legacy/');
  const wrote = await page.evaluate((throughDay) => {
    const L = window.A411.Logic;
    const WL = window.A411.WeekLogic;
    const S = L.newSave({ reducedMotion: true });
    S.progress.status = 'complete';
    S.progress.scene = 'end';
    S.progress.step = 0;
    S.progress.episode = 1;
    S.settings.reducedMotion = true;
    WL.ensureWeek(S);
    S.week.letterSeen = true;
    S.week.traceRule = 'story';
    const today = WL.dayKey(new Date());
    S.week.rituals = {};
    for (let n = 1; n <= throughDay; n++) {
      S.week.letters[n] = { status: 'done', gaps: {} };
      S.week.evenings[n] = { day: today };
      S.week.rituals[n] = { at: new Date().toISOString(), day: today };
      if (n === 1) continue;
      const cid = 'd' + n;
      WL.startChapter(S, cid, new Date());
      WL.completeChapter(S, cid, new Date());
    }
    if (S.week.chapters.d7) {
      S.week.chapters.d7.choices = Object.assign({ d7_band: 'A', d7_plan: 'verite', d7_salut: 'vous', d7_reponse: 'moi' }, S.week.chapters.d7.choices || {});
    }
    S.world.choices.d7_band = 'A';
    S.world.choices.d6_offre = 'oui';
    const store = window.A411.Learn.storyStore(localStorage, 'yuechao', L);
    const res = store.write(S);
    const learn = window.A411.Learn.emptyLearn('yuechao', new Date());
    learn.settings.placement = 'skipped';
    learn.settings.uiMode = 'player';
    window.A411.Learn.saveLearn(localStorage, learn);
    localStorage.setItem('a411.device.profile', JSON.stringify({ activeProfile: 'yuechao' }));
    return res;
  }, throughDay);
  expect(wrote.ok, JSON.stringify(wrote)).toBe(true);
}

async function openPlayer(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('/appartement-411/legacy/');
  await page.locator('#pickYuechao').click();
  await page.locator('#btnPlaceSkip').click();
  await page.locator('#btnStart').click();
  await page.locator('#where').waitFor();
}

async function flags(page) {
  return page.evaluate(() => ({
    hold: window.A411_HUB_HOLD || null,
    fast: window.A411_HUB_FAST || null,
    mode: window.A411.Learn.uiMode(window.A411.App.learn(), 'yuechao'),
    status: window.A411.HubPlay.status(),
    beats: window.A411.HubStory.ORDER
  }));
}

async function tapMap(page, c, r) {
  await page.evaluate(() => {
    const b = document.getElementById('hubInteract');
    if (b) b.style.pointerEvents = 'none';
  });
  const pos = await page.evaluate(({ c, r }) => {
    const canvas = document.getElementById('hubCanvas');
    const rect = canvas.getBoundingClientRect();
    const scale = Number(canvas.dataset.scale) || 1;
    const mapW = canvas.width / scale;
    const mapH = canvas.height / scale;
    return {
      x: rect.left + ((c * 16 + 8) / mapW) * rect.width,
      y: rect.top + ((r * 16 + 8) / mapH) * rect.height
    };
  }, { c, r });
  await page.touchscreen.tap(pos.x, pos.y);
  await page.evaluate(() => {
    const b = document.getElementById('hubInteract');
    if (b) b.style.pointerEvents = '';
  });
}

async function untilPrompt(page) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await page.locator('#hubInteract').isVisible().catch(() => false)) return;
    if (await page.locator('#btnNext').isVisible().catch(() => false)) {
      await page.locator('#btnNext').click();
      await page.waitForTimeout(40);
      continue;
    }
    await page.waitForTimeout(50);
  }
  throw new Error('interact prompt did not appear: ' + JSON.stringify(await flags(page)));
}

async function playToEnd(page, day) {
  const deadline = Date.now() + 180000;
  let idle = 0;
  while (Date.now() < deadline) {
    if (await page.locator('#chapterEnd').isVisible().catch(() => false)) {
      await expect(page.locator('#where')).toContainText('Jour ' + day);
      return;
    }
    const stepKey = await page.evaluate(() => {
      const st = window.A411.HubPlay.status();
      return st && st.step ? st.step.key : null;
    });
    const prefer = { d8_pot: 'basil', d9_table: 'bread' }[stepKey];
    if (await page.locator('#btnNext').isVisible().catch(() => false)) {
      await page.locator('#btnNext').click();
      idle = 0;
      await page.waitForTimeout(30);
      continue;
    }
    const opt = prefer ? page.locator('[data-opt="' + prefer + '"]') : page.locator('[data-opt]').first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
      idle = 0;
      await page.waitForTimeout(30);
      continue;
    }
    if (await page.locator('#hubInteract').isVisible().catch(() => false)) {
      await page.locator('#hubInteract').click();
      idle = 0;
      await page.waitForTimeout(40);
      continue;
    }
    idle++;
    if (idle > 80) throw new Error('stuck on Jour ' + day + ': ' + JSON.stringify(await flags(page)));
    await page.waitForTimeout(50);
  }
  throw new Error('Jour ' + day + ' did not finish');
}

test('a long-press on an answer word opens the glossary and does not pick it', async ({ page }) => {
  await openPlayer(page);
  await page.evaluate(() => {
    const S = window.A411.App.state();
    window.A411.WeekLogic.ensureWeek(S).letterSeen = true;
    window.A411.App.openChapter('d7');
    const steps = window.A411.Week.CHAPTERS.d7.steps;
    S.week.chapters.d7.step = steps.findIndex((st) => st.key === 'd7_plan');
    window.A411.App.render();
  });
  const word = page.locator('[data-opt="verite"] span[lang="fr"]');
  await expect(word).toBeVisible();
  const box = await word.boundingBox();
  const x = box.x + Math.min(box.width - 8, box.width * 0.62);
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForSelector('#lookupCard', { timeout: 3000 });
  await page.screenshot({ path: '/opt/cursor/artifacts/option-lookup.png' });
  const picked = await page.locator('#choiceAfter').count();
  await page.mouse.up();
  expect(picked).toBe(0);
  await expect(page.locator('#lookupCard')).toBeVisible();
  await expect(page.locator('[data-opt="verite"]')).toBeVisible();
  await expect(page.locator('#where')).toHaveAttribute('data-cid', 'd7');
  await expect(page.locator('#where')).toContainText('Jour 7 · La visite de Madame Martin');
});

test('the chapter header matches the chapter that is playing', async ({ page }) => {
  await openPlayer(page);
  await page.evaluate(() => {
    const S = window.A411.App.state();
    window.A411.WeekLogic.ensureWeek(S).letterSeen = true;
    window.A411.App.openChapter('d4');
  });
  await expect(page.locator('#where')).toHaveAttribute('data-cid', 'd4');
  await expect(page.locator('#where')).toContainText('Jour 4 · La voisine en colère');
  await expect(page.locator('#screen')).not.toContainText('Toc, toc. C’est Madame Lefèvre, la voisine du dessous.');

  await page.evaluate(() => {
    const S = window.A411.App.state();
    S.world.choices.d6_offre = 'oui';
    window.A411.WeekLogic.ensureWeek(S).letterSeen = true;
    window.A411.App.openChapter('d7');
    const c = S.week.chapters.d7;
    c.choices.d6_offre = 'oui';
    c.choices.d7_band = 'A';
    c.choices.d7_salut = 'vous';
    c.choices.d7_plan = 'verite';
    c.choices.d7_reponse = 'moi';
    c.step = window.A411.Week.CHAPTERS.d7.steps.findIndex((st) => st.id === 'n_d7_gag');
    window.A411.App.render();
  });
  await expect(page.locator('#where')).toHaveAttribute('data-cid', 'd7');
  await expect(page.locator('#where')).toContainText('Jour 7 · La visite de Madame Martin');
  await expect(page.locator('#narr')).toContainText('Toc, toc. C’est Madame Lefèvre, la voisine du dessous.');
  await expect(page.locator('#stepNo')).toHaveText('28 / 44');
  await page.screenshot({ path: '/opt/cursor/artifacts/day7-header-gag.png' });
});

test('Madame Martin stands on the floor beside the sofa', async ({ page }) => {
  await openPlayer(page);
  await page.evaluate(() => {
    const S = window.A411.App.state();
    window.A411.WeekLogic.ensureWeek(S).letterSeen = true;
    window.A411.App.openChapter('d7');
    const c = S.week.chapters.d7;
    c.choices.d7_band = 'B';
    c.choices.d7_plan = 'verite';
    c.step = window.A411.Week.CHAPTERS.d7.steps.findIndex((st) => st.key === 'd7_reponse');
    window.A411.App.render();
  });
  await expect(page.locator('#choicePrompt')).toContainText('Madame Martin attend');
  const pixels = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    window.A411.Art.scene(ctx, 'cat', { martin: 'cross', camille: 'sad', noe: 'sad', cat: 'sit', speaker: 'martin' });
    const rgb = (x, y) => {
      const d = ctx.getImageData(x, y, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    return { boot: rgb(68, 42), noeBoot: rgb(38, 42), floor: rgb(68, 45), oldHead: rgb(73, 14), sofa: rgb(55, 31) };
  });
  expect(pixels.boot).toEqual([30, 30, 36]);
  expect(pixels.noeBoot).toEqual([30, 30, 36]);
  expect(pixels.floor).toEqual([157, 128, 100]);
  expect(pixels.sofa).toEqual([75, 93, 138]);
  expect(pixels.oldHead[0]).toBeGreaterThan(180);
  await page.locator('canvas.stage').screenshot({ path: '/opt/cursor/artifacts/martin-floor.png' });
  await expect(page.locator('#where')).toContainText('Jour 7 · La visite de Madame Martin');
});

test('a fresh profile plays Day 8 to the end by touch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installSave(page, 7);
  await page.reload();
  await page.locator('#btnEarly').click();
  const before = await flags(page);
  expect(before.hold).toBeFalsy();
  expect(before.fast).toBeFalsy();
  expect(before.mode).toBe('player');
  expect(before.beats.d8).toContain('d8_B');
  await untilPrompt(page);
  await expect(page.locator('#hubInteract')).toHaveText('La plante');
  await expect(page.locator('#where')).toHaveAttribute('data-cid', 'd8');
  await expect(page.locator('#where')).toContainText('Jour 8 · Le basilic');
  await page.screenshot({ path: '/opt/cursor/artifacts/day8-hub-prompt.png' });
  await tapMap(page, 7, 5);
  await expect.poll(() => page.evaluate(() => {
    const st = window.A411.HubPlay.status();
    return st.view === 'chapter' && st.step && st.step.beat;
  })).toBe('d8_B');
  await playToEnd(page, 8);
  await page.screenshot({ path: '/opt/cursor/artifacts/day8-complete.png' });
  const done = await page.evaluate(() => {
    const S = window.A411.App.state();
    return { status: S.week.chapters.d8.status, beats: S.week.hub.d8.beats, hold: window.A411_HUB_HOLD || null };
  });
  expect(done.hold).toBeFalsy();
  expect(done.status).toBe('complete');
  expect(done.beats).toContain('d8_H');
});

test('a profile resuming from Day 7 can trigger Day 8', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installSave(page, 7);
  await page.reload();
  await expect(page.locator('#btnEarly')).toContainText('Jour 8');
  await page.reload();
  await page.locator('#btnEarly').click();
  const info = await flags(page);
  expect(info.hold).toBeFalsy();
  expect(info.mode).toBe('player');
  await untilPrompt(page);
  await expect(page.locator('#hubInteract')).toBeVisible();
  await page.screenshot({ path: '/opt/cursor/artifacts/day8-resume-prompt.png' });
  await page.locator('#hubInteract').click();
  await expect.poll(() => page.evaluate(() => {
    const st = window.A411.HubPlay.status();
    return st.view === 'chapter' && st.step && st.step.beat;
  })).toBe('d8_B');
});

test('Day 9 story beats trigger on touch and the day can be finished', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installSave(page, 8);
  await page.reload();
  await page.locator('#btnEarly').click();
  const info = await flags(page);
  expect(info.hold).toBeFalsy();
  expect(info.fast).toBeFalsy();
  expect(info.mode).toBe('player');
  expect(info.beats.d9).toContain('d9_B');
  await untilPrompt(page);
  await expect(page.locator('#hubInteract')).toHaveText("L'escalier");
  await expect(page.locator('#where')).toHaveAttribute('data-cid', 'd9');
  await expect(page.locator('#where')).toContainText('Jour 9 · Six heures');
  await page.screenshot({ path: '/opt/cursor/artifacts/day9-hub-prompt.png' });
  await tapMap(page, 5, 17);
  await expect.poll(() => page.evaluate(() => {
    const st = window.A411.HubPlay.status();
    return st.view === 'chapter' && st.step && st.step.beat;
  })).toBe('d9_B');
  await playToEnd(page, 9);
  await page.screenshot({ path: '/opt/cursor/artifacts/day9-complete.png' });
  const done = await page.evaluate(() => {
    const S = window.A411.App.state();
    return { status: S.week.chapters.d9.status, beats: S.week.hub.d9.beats, hold: window.A411_HUB_HOLD || null };
  });
  expect(done.hold).toBeFalsy();
  expect(done.status).toBe('complete');
  expect(done.beats).toContain('d9_J');
});
