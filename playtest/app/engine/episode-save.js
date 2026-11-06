const ENGINE_KEY = 'a411.p.jinyi.engine';
const PROFILE_KEY = 'a411.device.profile';

function storage() {
  return window.localStorage;
}

function activeProfile() {
  try {
    const raw = storage().getItem(PROFILE_KEY);
    if (!raw) return 'jinyi';
    const o = JSON.parse(raw);
    return o?.activeProfile === 'yuechao' ? 'yuechao' : 'jinyi';
  } catch {
    return 'jinyi';
  }
}

/** Engine progress is written only for the Jinyi dev profile. */
export function loadEngineProgress(day) {
  if (activeProfile() !== 'jinyi') return null;
  try {
    const raw = storage().getItem(ENGINE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const slot = data?.days?.[String(day)];
    if (!slot) return null;
    return slot;
  } catch {
    return null;
  }
}

export function saveEngineProgress(day, payload) {
  if (activeProfile() !== 'jinyi') return false;
  try {
    const raw = storage().getItem(ENGINE_KEY);
    const data = raw ? JSON.parse(raw) : { schema: 1, profileId: 'jinyi', days: {} };
    if (data.profileId !== 'jinyi') return false;
    data.days[String(day)] = {
      episodeId: payload.episodeId,
      version: payload.version,
      index: payload.index,
      beatId: payload.beatId,
      flags: payload.flags,
      cagnotte_eur: payload.cagnotte_eur,
      updatedAt: new Date().toISOString()
    };
    storage().setItem(ENGINE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearEngineProgress(day) {
  if (activeProfile() !== 'jinyi') return;
  try {
    const raw = storage().getItem(ENGINE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    delete data.days?.[String(day)];
    storage().setItem(ENGINE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
