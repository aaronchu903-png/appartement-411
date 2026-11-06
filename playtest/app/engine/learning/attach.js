const LINE_MERGE_KEYS = new Set(['items', 'focus', 'anchor', 'card_on_unlock']);

/**
 * Merge learning/attach/dayNN.json into an episode (Days 1–6 only).
 * Never overwrites story text fields.
 */
export function mergeLearningAttach(episode, attachDoc) {
  if (!attachDoc?.attach?.length) return episode;
  const ep = structuredClone(episode);
  const stepById = new Map();
  for (const scene of ep.scenes || []) {
    for (const beat of scene.beats || []) {
      for (const st of beat.steps || []) {
        if (st.id) stepById.set(st.id, { scene, beat, step: st });
      }
    }
  }
  for (const row of attachDoc.attach) {
    if (row.line_id) {
      const hit = stepById.get(row.line_id);
      if (!hit) continue;
      for (const k of Object.keys(row)) {
        if (k === 'line_id') continue;
        if (!LINE_MERGE_KEYS.has(k)) {
          throw new Error(`attach: forbidden override key "${k}" on line ${row.line_id}`);
        }
        hit.step[k] = row[k];
      }
      continue;
    }
    if (row.after_scene && row.do === 'learning_module') {
      const scene = (ep.scenes || []).find((s) => s.id === row.after_scene);
      if (!scene) continue;
      const { after_scene, ...step } = row;
      const beat = {
        id: `_attach_${after_scene}_${scene.beats.length}`,
        steps: [step]
      };
      scene.beats.push(beat);
    }
  }
  return ep;
}
