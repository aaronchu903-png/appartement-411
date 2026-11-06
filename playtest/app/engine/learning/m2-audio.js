/**
 * M2 / placement clips from audio/d01_03/audio_manifest.json (item id → file).
 * No capture branching; missing manifest or file → play() rejects (caller may ignore).
 */

const MANIFEST_URL = new URL('../../../audio/d01_03/audio_manifest.json', import.meta.url);
const CLIP_BASE = new URL('../../../audio/d01_03/', import.meta.url);

let manifestPromise = null;
let activeAudio = null;

export function normalizeLearningItems(items = []) {
  return (items || []).map((it) => {
    if (typeof it === 'string') return { id: it, audio: it };
    if (it && typeof it === 'object' && it.id) {
      return { id: it.id, audio: it.audio || it.id };
    }
    return { id: String(it), audio: String(it) };
  });
}

export async function loadM2AudioManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) return { version: 1, clips: {} };
        return r.json();
      })
      .catch(() => ({ version: 1, clips: {} }));
  }
  return manifestPromise;
}

function clipFileFromEntry(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && typeof entry.file === 'string') return entry.file;
  return null;
}

export function clipUrlFromManifest(manifest, clipId) {
  const rel = clipFileFromEntry(manifest?.clips?.[clipId]);
  if (!rel) return null;
  return new URL(rel, CLIP_BASE).href;
}

export function stopM2Clip() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}

/**
 * @returns {Promise<{ ok: boolean, clipId: string, reason?: string }>}
 */
export async function playM2Clip(clipId, { rate = 1 } = {}) {
  if (!clipId) return { ok: false, clipId: '', reason: 'no_clip_id' };
  const manifest = await loadM2AudioManifest();
  const url = clipUrlFromManifest(manifest, clipId);
  if (!url) return { ok: false, clipId, reason: 'missing_manifest_entry' };
  stopM2Clip();
  const a = new Audio(url);
  a.playbackRate = rate;
  activeAudio = a;
  try {
    await a.play();
    return { ok: true, clipId };
  } catch (e) {
    activeAudio = null;
    return { ok: false, clipId, reason: e?.message || 'play_failed' };
  }
}

/** Resolve clip for a learning_module step (listening / dictation / learn_words). */
export function primaryClipForStep(step) {
  const mod = step?.module;
  const items = normalizeLearningItems(step?.items);
  if (mod === 'listening' || mod === 'dictation') {
    return step?.prompt?.audio || items[0]?.audio || items[0]?.id || null;
  }
  if (mod === 'learn_words') {
    return items[0]?.audio || items[0]?.id || null;
  }
  return null;
}
