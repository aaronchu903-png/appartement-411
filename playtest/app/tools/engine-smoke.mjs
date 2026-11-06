import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8765';
const day = process.argv[3] || '10';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}/engine/?day=${day}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.scene-player-phone', { timeout: 15000 });
await page.waitForTimeout(800);
const speaker = await page.textContent('.scene-player-dialogue-text');
await page.click('.scene-player-phone');
await page.waitForTimeout(400);
const speaker2 = await page.textContent('.scene-player-dialogue-text');
const shot = await page.evaluate(() => window.__scenePlayer?.getShot?.());
console.log(JSON.stringify({ day, errors, speaker, speaker2, shot, phase: await page.evaluate(() => window.__scenePlayer?.getPhase?.()) }, null, 2));
if (errors.length) process.exit(1);
await browser.close();
