'use strict';

// NODE_PATH=/tmp/kilo/node_modules node app/art-tests.cjs
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const mobileSizes = [[390, 844], [375, 667]];
const fixtures = [
  { scene: 'roof' }, { scene: 'roof', night: true, water: .6 },
  { scene: 'kitchen' }, { scene: 'kitchen', danger: .8, reaction: 'catch' },
  { scene: 'kitchen', action: 'catdone', elapsed: 700 },
  { scene: 'doorway' }, { scene: 'stairs', walkProgress: .5 },
  { scene: 'lefevre', night: true }, { scene: 'lefevre', action: 'giveKey', elapsed: 800 },
  { scene: 'facade', night: true }
].map(s => ({ time: 1234, ...s }));
const goldens = [
  '37dd7b832aa2949fb7eb53ce6350dcbeb6ea221fe3c2346a71a81f57640ee4bb',
  '2701f67ad4ee907993bf6a69b66712a2e904863b47d52f1decc0e2f5b0d8a001',
  '657766cf8c122ecbe8b956b3214199084df0fc6243f30d14ebffbdf45e732b95',
  'e8fea0857092dc4a59314657944b096d356f24946ff1242a1c263cd676e4813a',
  'caf802ef0a194f953117a5d5768a3f9e68fc8672e46c57651d3454047ff635dc',
  '485b0bef4a643d7b8e8cbaab7721c273c7b43a29d9b658641d5377be787c89d9',
  '3634f43a70843f9ef1ef8dec10cbcebb0e194e8afbec4511919af135c403e89d',
  '374c6c6aded94ce10bfebc2f87858844de721aa42b29afa2fb8270ee3eaf54f3',
  '4030cc794ec363373c5075c2cf2faade4e947a140a2c04df29dd9797b5016e61',
  '2e543d55b79021490d8bff98a78cc7ff8ef3251ee9d281ac683ad29eb4e9939d'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    if (process.env.ART_PREVIEW) {
      const directory = path.join(__dirname, 'screenshots');
      for (const name of fs.readdirSync(directory)) {
        const capture = /^round3-art-(\d+)-.*\.png$/.exec(name);
        if (capture && !mobileSizes.some(([width]) => width === Number(capture[1]))) fs.unlinkSync(path.join(directory, name));
      }
    }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.setContent('<canvas style="width:390px;height:844px"></canvas>');
    await page.addScriptTag({ path: path.join(__dirname, 'art.js') });
    const hash = async state => createHash('sha256').update(Buffer.from(await page.evaluate(s => {
      const c = document.querySelector('canvas');
      Day8Art.draw(c, s);
      return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
    }, state))).digest('hex');
    const actual = [];
    for (const state of fixtures) actual.push(await hash(state));
    assert.deepEqual(actual, goldens, 'nine unchanged legacy goldens plus repaired handover');
    const kitchen = { v2: true, scene: 'kitchen', growth: [0, 0], time: 1234, speaker: 'noe' };
    assert.equal(await hash(kitchen), await hash(kitchen), 'fixed-time V2 frames deterministic');
    assert.notEqual(await hash(kitchen), await hash({ ...kitchen, time: 1710 }), 'V2 idle has micro-motion');
    assert.equal(await hash({ ...kitchen, reducedMotion: true }), await hash({ ...kitchen, time: 9134, reducedMotion: true }), 'reduced-motion pixels stable');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const started = await page.evaluate(s => {
      const c = document.querySelector('canvas'), runner = Day8Art.start(c, s);
      const bytes = Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
      runner.stop(); return bytes;
    }, kitchen);
    assert.equal(createHash('sha256').update(Buffer.from(started)).digest('hex'), await hash({ ...kitchen, reducedMotion: true }), 'runner honors prefers-reduced-motion');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await hash({ v2: true, scene: 'kitchen', recall: true, focus: 'pot', focusZoom: 1 }), await hash({ v2: true, scene: 'kitchen' }), 'recall suppresses answer spotlights');
    const props = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      const ids = ['plante', 'basilic', 'bol', 'soupe', 'pain', 'cle', 'toit', 'heure', 'porte', 'fenetre', 'table', 'tasse', 'chaise', 'fromage'];
      const images = ids.map(id => {
        if (!Day8Art.drawWord(c, id) || c.width !== 120 || c.height !== 80) throw new Error(`Missing prop: ${id}`);
        return c.toDataURL();
      });
      if (Day8Art.drawWord(c, 'unsupported') !== false || c.toDataURL() !== images.at(-1)) throw new Error('Unsupported props must leave the canvas untouched');
      return images;
    });
    assert.equal(new Set(props).size, 14, 'picture choices have distinct object art rather than shared scene thumbnails');
    const review = await page.evaluate(() => {
      const c = document.querySelector('canvas'), ctx = c.getContext('2d');
      const options = { pot: { id: 1, growth: 3, dueCount: 10, thirsty: true }, time: 1234 };
      const frame = extra => { const hits = Day8Art.drawReview(c, { ...options, ...extra }); return { hits, image: c.toDataURL(), data: ctx.getImageData(0, 0, c.width, c.height).data }; };
      const dry = frame({ moisture: 0 }), partial = frame({ moisture: 1 }), recovered = frame({ moisture: 3 });
      if (c.width !== 320 || c.height !== 112 || ctx.imageSmoothingEnabled) throw new Error('Review must retain its pixel-art aspect ratio');
      if (dry.data.some((v, i) => i % 4 === 3 && v !== 255)) throw new Error('Review has transparent gaps');
      if (dry.hits.pot.x >= 50 || dry.hits.cat.x <= 50) throw new Error('Review must place pot LEFT and kitten RIGHT');
      const green = data => {
        let top = 112, pixels = 0;
        for (let y = 0; y < 86; y++) for (let x = 50; x < 110; x++) {
          const i = (y * 320 + x) * 4;
          if (['120,149,104', '66,105,87', '164,180,120', '147,154,135', '111,124,116', '174,177,154'].includes(Array.from(data.slice(i, i + 3)).join(','))) { top = Math.min(top, y); pixels++; }
        }
        return { top, pixels };
      };
      const dg = green(dry.data), rg = green(recovered.data);
      if (!(dg.pixels > 100 && rg.pixels > 100 && dg.top > rg.top)) throw new Error('Thirsty foliage must droop then recover');
      const reactions = ['idle', 'happy', 'roll', 'tilt'].map(reaction => {
        const blank = frame({ reaction, cat: false }).data, shown = frame({ reaction });
        const hit = shown.hits.cat;
        let hearts = 0, changed = 0;
        for (let i = 0; i < blank.length; i += 4) {
          if (shown.data[i] === 223 && shown.data[i + 1] === 160 && shown.data[i + 2] === 160) hearts++;
          if (blank[i] === shown.data[i] && blank[i + 1] === shown.data[i + 1] && blank[i + 2] === shown.data[i + 2]) continue;
          changed++;
          const x = i / 4 % 320 / 320 * 100, y = Math.floor(i / 4 / 320) / 112 * 100;
          if (x < hit.x - hit.width / 2 || x > hit.x + hit.width / 2 || y < hit.y - hit.height / 2 || y > hit.y + hit.height / 2) throw new Error(`${reaction} leaves strip cat bounds`);
        }
        if (changed < 300 || (['happy', 'roll'].includes(reaction) ? hearts < 20 : hearts !== 0)) throw new Error(`${reaction} incorrect hearts/kitten feedback`);
        return shown.image;
      });
      if (frame({ reducedMotion: true, reaction: 'roll', time: 0 }).image !== frame({ reducedMotion: true, reaction: 'roll', time: 9999 }).image) throw new Error('Reduced-motion strip must be stable');
      if (frame({ pot: { ...options.pot, hint: true }, reducedMotion: true, time: 0 }).image !== frame({ pot: { ...options.pot, hint: true }, reducedMotion: true, time: 9999 }).image) throw new Error('Reduced-motion hint must be stable');
      const flights = [0, .5, 1].map(dropProgress => frame({ dropProgress }).image);
      return { plants: [dry.image, partial.image, recovered.image], reactions, flights };
    });
    assert.equal(new Set(review.plants).size, 3, 'dry, partly watered and recovered plants are distinct without changing growth');
    assert.equal(new Set(review.reactions).size, 4, 'strip has idle, hearts, roll and genuinely tilted head poses');
    assert.equal(new Set(review.flights).size, 3, 'optional single-drop API has distinct flight and landing frames');
    const checkHandover = () => page.evaluate(() => {
      const c = document.querySelector('canvas'), ctx = c.getContext('2d');
      for (const v2 of [false, true]) for (const reducedMotion of [false, true]) for (const action of ['openHand', 'giveKey']) for (const elapsed of [0, 400, 800, 1450, 9000]) {
        const state = { v2, reducedMotion, scene: 'lefevre', action, elapsed, time: elapsed };
        Day8Art.draw(c, state);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        const at = i => (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
        for (const colors of [[0x377c60, 0x285c50], [0x815574, 0x603e5b]]) {
          const pixels = new Set();
          let left = c.width, right = 0;
          for (let i = 0; i < data.length / 4; i++) {
            const color = at(i);
            if (color === 0x718c7b) throw new Error('Detached grey-green sleeve returned');
            if (colors.includes(color)) { pixels.add(i); left = Math.min(left, i % c.width); right = Math.max(right, i % c.width); }
          }
          const scale = v2 ? Day8Art.layout(c, state).scale : 1;
          if (colors[0] === 0x377c60 && (pixels.size < 100 || right - left > 45 * 1.15 * scale + 2)) throw new Error('Receiver missing or reaching beyond normal sprite proportions');
          const total = pixels.size;
          let largest = 0;
          while (pixels.size) {
            const queue = [pixels.values().next().value]; pixels.delete(queue[0]);
            for (let j = 0; j < queue.length; j++) for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
              const next = queue[j] + dy * c.width + dx;
              if (pixels.delete(next)) queue.push(next);
            }
            largest = Math.max(largest, queue.length);
          }
          if (largest / total < .98) throw new Error(`${v2}/${action}/${elapsed}: disconnected sleeve, ${largest}/${total} connected pixels`);
        }
        if (action === 'giveKey' && (elapsed >= 1450 || v2 && reducedMotion)) {
          let contact = false;
          for (let i = 0; i < data.length / 4 - c.width; i++) {
            if (at(i) === 0xddbc7d && at(i + c.width) === 0xf1c7a5) contact = true;
          }
          if (!contact) throw new Error('Settled handover must leave a visible key touching the palm');
        }
      }
    });
    const garden = { v2: true, scene: 'roof', time: 1234, garden: { slots: [{ id: 1, growth: 2 }] } };
    const soils = [];
    for (let moisture = 0; moisture <= 3; moisture++) soils.push(await hash({ ...garden, moisture: { 1: moisture } }));
    assert.equal(new Set(soils).size, 4, 'soil has four moisture levels independent of growth');
    const reactions = [];
    for (const reaction of ['idle', 'happy', 'roll', 'tilt']) reactions.push(await hash({ ...garden, reaction }));
    assert.equal(new Set(reactions).size, 4, 'review cat reactions are visibly distinct');
    for (const size of mobileSizes) {
      await page.setViewportSize({ width: size[0], height: size[1] });
      await page.evaluate(([w, h]) => {
        const c = document.querySelector('canvas'); c.style.width = w + 'px'; c.style.height = h + 'px';
        document.body.style.margin = '0';
      }, size);
      await checkHandover();
      const perched = await page.evaluate(() => {
        const c = document.querySelector('canvas'), s = { v2: true, scene: 'roof', action: 'review', time: 1234 };
        const ctx = c.getContext('2d');
        Day8Art.draw(c, { ...s, cat: false });
        const empty = ctx.getImageData(0, 0, c.width, c.height).data;
        return ['idle', 'happy', 'roll', 'tilt'].map(reaction => {
          const hit = Day8Art.draw(c, { ...s, reaction }).cat;
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let changed = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] === empty[i] && data[i + 1] === empty[i + 1] && data[i + 2] === empty[i + 2]) continue;
            changed++;
            const x = i / 4 % c.width / c.width * 100, y = Math.floor(i / 4 / c.width) / c.height * 100;
            if (y >= 45) throw new Error(`${reaction}: duplicate floor cat or covered reaction`);
            if (x < hit.x - hit.width / 2 || x > hit.x + hit.width / 2 || y < hit.y - hit.height / 2 || y > hit.y + hit.height / 2) throw new Error(`${reaction}: cat pixels outside projected hitbox`);
          }
          if (changed < 100) throw new Error(`${reaction}: missing perched cat`);
          return c.toDataURL();
        });
      });
      assert.equal(new Set(perched).size, 4, `four distinct perched review reactions at ${size[0]}px, with no floor duplicate`);
      for (const scene of ['kitchen', 'doorway', 'stairs', 'lefevre', 'facade', 'roof']) {
        const model = { ...kitchen, scene, night: scene !== 'kitchen' };
        await hash(model);
        if (process.env.ART_PREVIEW) await page.screenshot({ path: path.join(__dirname, `screenshots/round3-art-${size[0]}-${scene}.png`) });
        const result = await page.evaluate(s => {
          const c = document.querySelector('canvas'), a = Day8Art;
          const spots = a.draw(c, s), pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let transparent = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) transparent++;
          return { transparent, spots, width: c.width, height: c.height, layout: a.layout(c, s) };
        }, model);
        assert.equal(result.transparent, 0, `${scene} fills entire viewport`);
        assert.equal(result.width, 320, 'all scenes use the mobile pixel width');
        assert.equal(result.layout.portrait, true);
        assert.equal(result.height, Math.round(320 * size[1] / size[0]));
        assert.ok(Math.abs(result.width / result.height - size[0] / size[1]) < .01);
      }
      const faces = await page.evaluate(() => {
        const c = document.querySelector('canvas'), s = { v2: true, scene: 'lefevre', night: true, time: 1234 };
        Day8Art.draw(c, s);
        const l = Day8Art.layout(c, s), ctx = c.getContext('2d');
        return [[227, 218], [120, 225], [340, 225]].map(([x, feet]) => {
          const data = ctx.getImageData(Math.round((x + 4) * l.scale + l.ox), Math.round((feet - 59 + 8) * l.scale + l.oy), Math.round(23 * l.scale), Math.round(18 * l.scale)).data;
          let skin = 0, eyes = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 241 && data[i + 1] === 199 && data[i + 2] === 165) skin++;
            if (data[i] === 48 && data[i + 1] === 48 && data[i + 2] === 58) eyes++;
          }
          return { skin, eyes };
        });
      });
      assert.ok(faces.every(f => f.skin > 100 && f.eyes >= 4), `all three dinner faces visible at ${size[0]}px: ${JSON.stringify(faces)}`);
      console.log(`Dinner face pixels ${size[0]}px: ${JSON.stringify(faces)}`);
      const establishing = { v2: true, scene: 'facade', establishingProgress: .6 };
      assert.equal(await hash(establishing), await hash({ ...establishing, time: 98123, elapsed: 2345, cat: true, speaker: 'lefevre', focus: 'window', night: true }), 'empty establishing shot ignores character, focus and incidental clocks');
      const windowCounts = [];
      for (let step = 0; step <= 100; step++) {
        const progress = step / 100;
        const count = await page.evaluate(progress => {
          const c = document.querySelector('canvas'), s = { v2: true, scene: 'facade', establishingProgress: progress };
          const spots = Day8Art.draw(c, s), l = Day8Art.layout(c, s), ctx = c.getContext('2d');
          if (Object.keys(spots).length) throw new Error('Establishing scene exposes hotspots');
          let count = 0;
          for (let row = 0; row < 10; row++) for (let col = 0; col < 4; col++) {
            const x = Math.round(111 + col * 74 + 15 + l.ox), y = Math.round(140 + row * 71 + 8 + l.oy);
            if (x < 0 || x >= c.width || y < 0 || y >= c.height) continue;
            const d = ctx.getImageData(x, y, 1, 1).data;
            if (d[0] === 220 && d[1] === 177 && d[2] === 123) count++;
          }
          return count;
        }, progress);
        windowCounts.push(count);
        if (process.env.ART_PREVIEW && [0, 50, 100].includes(step)) await page.screenshot({ path: path.join(__dirname, `screenshots/round3-art-${size[0]}-establishing-${step}.png`) });
      }
      assert.equal(windowCounts[0], 0);
      assert.ok(windowCounts.at(-1) >= 12);
      assert.ok(windowCounts.every((n, i) => i === 0 || n >= windowCounts[i - 1] && n - windowCounts[i - 1] <= 1), 'windows light individually, never turn off');
      console.log(`Establishing ${size[0]}px: ${windowCounts.at(-1)} windows lit successively`);
      for (const count of [2, 24, 60]) {
        const slots = Array.from({ length: count }, (_, i) => ({ id: i + 1, growth: i % 6, due: i % 3 === 0 }));
        const seen = new Set();
        for (let bay = 0; bay < Math.ceil(count / 24); bay++) {
          const model = { v2: true, scene: 'roof', night: true, garden: { slots, bay }, time: 1200 };
          const spots = await page.evaluate(s => Day8Art.draw(document.querySelector('canvas'), s), model);
          for (const spot of Object.values(spots).filter(s => s.id.startsWith('pot:'))) {
            assert.ok(spot.visible && spot.x > 0 && spot.x < 100, 'every bay pot is visible');
            assert.ok(!seen.has(spot.id), 'no duplicate pot across bays'); seen.add(spot.id);
          }
          if (process.env.ART_PREVIEW) await page.screenshot({ path: path.join(__dirname, `screenshots/round3-art-${size[0]}-pots${count}-bay${bay}.png`) });
        }
        assert.equal(seen.size, count, 'every fixture pot has a reachable bay');
      }
      for (const phase of ['push', 'lift', 'done']) {
        const living = await page.evaluate(phase => {
          const c = document.querySelector('canvas');
          const s = { v2: true, scene: 'kitchen', growth: [0, 0], catGame: { active: true, elapsed: 5000, phase, phaseElapsed: 1600 } };
          const h = Day8Art.draw(c, s).pot, data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let leaves = 0;
          const colors = ['120,149,104', '66,105,87', '164,180,120'];
          for (let y = Math.max(0, Math.floor((h.y - h.height / 2) / 100 * c.height)); y < (h.y + h.height / 2) / 100 * c.height; y++) {
            for (let x = Math.max(0, Math.floor((h.x - h.width / 2) / 100 * c.width)); x < (h.x + h.width / 2) / 100 * c.width; x++) {
              const i = (y * c.width + x) * 4;
              if (colors.includes([data[i], data[i + 1], data[i + 2]].join(','))) leaves++;
            }
          }
          return { leaves, visible: h.visible };
        }, phase);
        assert.ok(living.visible && living.leaves > 100, `${phase} leaves visibly remain in story pot`);
      }
      const gait = [];
      for (const elapsed of [10, 135, 260, 385, 1220, 1350, 1600, 1950]) {
        const state = { v2: true, scene: 'kitchen', time: 0, catGame: { active: true, elapsed, reach: 1 } };
        await hash(state);
        const pixels = await page.evaluate(s => {
          const c = document.querySelector('canvas'), l = Day8Art.layout(c, s), cat = Day8Art.motion(s).cat;
          return Array.from(c.getContext('2d').getImageData(Math.round((cat.x - 13) * l.scale + l.ox), Math.round((cat.y - 7) * l.scale + l.oy), Math.round(30 * l.scale), Math.round(11 * l.scale)).data);
        }, state);
        gait.push(createHash('sha256').update(Buffer.from(pixels)).digest('hex'));
        if (process.env.ART_PREVIEW) await page.screenshot({ path: path.join(__dirname, `screenshots/round3-art-${size[0]}-cat-${elapsed}.png`) });
      }
      assert.equal(new Set(gait.slice(0, 4)).size, 4, 'four distinct rendered foot poses, not just translated sprite');
    }
    console.log('Art browser checks passed at 390x844 and 375x667: nine unchanged legacy pixel goldens plus repaired handover, four rendered walk poses, three visible dinner faces, sequential empty facade, portrait composition, deterministic/reduced motion, distinct picture props, four soil moisture levels, 12 full-viewport scenes, 2/24/60-pot bays, living cat-ending plant.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
