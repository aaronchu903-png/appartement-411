import { loadRegistryBundle } from './registry.js';
import { mergeLearningAttach } from './learning/attach.js';

const EP_ROOT = new URL('../../episodes/', import.meta.url);
const STORY_ROOT = new URL('../../story/episodes/', import.meta.url);
const STAGING_ROOT = new URL('../../tech/sitcom_engine/staging/', import.meta.url);
const ATTACH_ROOT = new URL('../../learning/attach/', import.meta.url);

const DAY_FILES = Object.freeze({
  1: 'day01_bienvenue_chez_nous.json',
  2: 'day02_the_ou_cafe.json',
  3: 'day03_deux_colis.json',
  4: 'day04_la_voisine.json',
  5: 'day05_la_cle.json',
  6: 'day06_ou_est_croissant.json',
  7: 'day07_la_visite.json',
  8: 'day08_la_cle_du_toit.json',
  9: 'day09_six_heures.json',
  10: 'day10_le_jardin.json',
  11: 'day11_jeudi_soir.json'
});

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url.pathname}: ${res.status}`);
  return res.json();
}

export async function loadEpisodeByDay(day) {
  const n = Number(day);
  if (!DAY_FILES[n]) throw new Error(`No episode route for day ${day}`);
  const file = DAY_FILES[n];
  const roots = n >= 1 && n <= 11 ? [STORY_ROOT, EP_ROOT] : [EP_ROOT, STORY_ROOT];
  for (const root of roots) {
    const url = new URL(file, root);
    try {
      return await fetchJson(url);
    } catch {
      /* try next */
    }
  }
  throw new Error(`Episode file missing for day ${n}: ${file}`);
}

let stagingIndexPromise = null;
/** fix17: staging/index.json lists the days that have a staging file, so a day without one never fetches (no console 404). */
export function loadStagingIndex() {
  stagingIndexPromise ||= fetch(new URL('index.json', STAGING_ROOT)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return stagingIndexPromise;
}

export async function loadStagingForDay(day) {
  const index = await loadStagingIndex();
  if (!index?.days?.map(Number).includes(Number(day))) return null;
  const url = new URL(`day${day}.json`, STAGING_ROOT);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Apply staging swap ops onto episode beat metadata (prop swaps at beat). */
export function applyStaging(episode, staging) {
  if (!staging?.ops?.length) return { episode, swaps: [] };
  const beatIndex = new Map();
  for (const scene of episode.scenes) {
    for (const beat of scene.beats) beatIndex.set(beat.id, { scene, beat });
  }
  const swaps = [];
  for (const op of staging.ops) {
    const hit = beatIndex.get(op.at);
    if (!hit) continue;
    hit.beat._stagingSwap = op.swap;
    swaps.push(op);
  }
  return { episode, swaps };
}

async function loadAttachForDay(day) {
  const n = Number(day);
  if (n < 1 || n > 6) return null;
  const url = new URL(`day${String(n).padStart(2, '0')}.json`, ATTACH_ROOT);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function loadEpisodePack(day) {
  const [episode, registry, staging, attach] = await Promise.all([
    loadEpisodeByDay(day),
    loadRegistryBundle(),
    loadStagingForDay(day),
    loadAttachForDay(day)
  ]);
  let ep = episode;
  if (attach) ep = mergeLearningAttach(ep, attach);
  const staged = applyStaging(ep, staging);
  return { ...staged, registry, day: Number(day), attach };
}
