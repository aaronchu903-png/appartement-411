'use strict';

// NODE_PATH=/tmp/kilo/node_modules node app/art-tests.cjs
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const path = require('node:path');
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
  '9348938c130125c089fa8758f90286889628db8fa59a628f730eb6ee317015a3',
  '2e543d55b79021490d8bff98a78cc7ff8ef3251ee9d281ac683ad29eb4e9939d'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
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
    assert.deepEqual(actual, goldens, 'default rendering preserves pre-V2 raw pixel goldens');
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
    for (const size of [[390, 844], [1280, 800]]) {
      await page.setViewportSize({ width: size[0], height: size[1] });
      await page.evaluate(([w, h]) => {
        const c = document.querySelector('canvas'); c.style.width = w + 'px'; c.style.height = h + 'px';
        document.body.style.margin = '0';
      }, size);
      for (const scene of ['kitchen', 'doorway', 'stairs', 'lefevre', 'facade', 'roof']) {
        const model = { ...kitchen, scene, night: scene !== 'kitchen' };
        await hash(model);
        if (process.env.ART_PREVIEW) await page.screenshot({ path: `/tmp/kilo/day8-jf/preview-${size[0]}-${scene}.png` });
        const result = await page.evaluate(s => {
          const c = document.querySelector('canvas'), a = Day8Art;
          const spots = a.draw(c, s), pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let transparent = 0;
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) transparent++;
          return { transparent, spots, width: c.width, height: c.height, layout: a.layout(c, s) };
        }, model);
        assert.equal(result.transparent, 0, `${scene} fills entire viewport`);
        assert.ok(Math.abs(result.width / result.height - size[0] / size[1]) < .01);
      }
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
          if (process.env.ART_PREVIEW) await page.screenshot({ path: `/tmp/kilo/day8-jf/preview-${size[0]}-pots${count}-bay${bay}.png` });
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
    }
    console.log('Art browser checks passed: 10 unchanged pixel goldens, deterministic/reduced motion, 12 full-viewport scenes, 2/24/60-pot bays, living cat-ending plant.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
