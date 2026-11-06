// fix17: resume lands on the exact saved step. A save is written at an advance() stop (a line, a module or a wait),
// so replaying stop-by-stop from step 0 reaches saved.index exactly and leaves that stop's pending line/module live,
// so its bubble and HUD are re-shown. Nothing is auto-played past it (the old code started AT saved.index and then
// advanced saved.index more times, playing past dialogue).
export function resumeToIndex(runtime, saved) {
  const target = Math.min(saved?.index ?? 0, runtime.items.length);
  if (!target) { runtime.advance(); return runtime.snapshot(); }
  runtime.index = 0;
  let guard = 0;
  while (runtime.index < target && !runtime.done && guard++ < 100000) {
    runtime.world.pendingLine = null;
    runtime.world.pendingModule = null;
    runtime.advance();
  }
  // the saved jar and flags are authoritative over the replayed ones
  if (saved.flags) runtime.flags = { ...saved.flags };
  if (saved.cagnotte_eur != null) runtime.cagnotte_eur = saved.cagnotte_eur;
  return runtime.snapshot();
}
