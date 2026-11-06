/** Maps episode beat ids to scene-player shot ids and bubble start times (day10 kitchen). */

export const DAY10_SCENE_URL = '../scenes/day10-kitchen/scene.json';

export async function loadDay10SceneTable() {
  const res = await fetch(new URL(DAY10_SCENE_URL, import.meta.url));
  if (!res.ok) throw new Error(`day10 scene ${res.status}`);
  const cfg = await res.json();
  const shotById = new Map(cfg.shots.map((s) => [s.id, s]));
  const bubbleStarts = (cfg.bubbles || []).map((b) => b.t0);
  const audioStarts = (cfg.audio || []).map((a) => a.t);
  const cueTimes = [...new Set([...bubbleStarts, ...audioStarts])].sort((a, b) => a - b);
  return { cfg, shotById, cueTimes };
}

export function beatToSceneTime(beatId, table) {
  const shot = table.shotById.get(beatId);
  if (shot) return shot.t0 + 0.8;
  const audio = (table.cfg.audio || []).find((a) => a.id === beatId);
  if (audio) return audio.t;
  return null;
}

export function syncPlayerToBeat(player, beatId, table) {
  const t = beatToSceneTime(beatId, table);
  if (t == null) {
    player.setShot?.(beatId);
    return;
  }
  player.setT?.(t);
}
