/** Local learning evidence log (MODULES_V1 §9). */
export function createEvidenceStore() {
  return { events: [] };
}

export function pushEvidence(store, type, fields) {
  store.events.push({ type, at: new Date().toISOString(), ...fields });
  return store;
}

export function exportEvidenceJson(store) {
  return JSON.stringify({ schema: 'a411-learning-evidence/1', events: store.events }, null, 2);
}
