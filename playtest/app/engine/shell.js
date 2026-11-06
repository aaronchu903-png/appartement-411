import { loadEpisodePack } from './loader.js';
import { EpisodeRuntime } from './runtime.js';
import { loadEngineProgress, saveEngineProgress } from './episode-save.js';
import { compileEpisodeScene } from './compile-episode-scene.js';
import { loadRegistryBundle } from './registry.js';
import { initScenePlayer, hudPanelText } from '../scenes/scene-player.js';
import { renderLearningModule } from './learning/module-ui.js';
import { shotForStep, createHoldController } from './subshots.js';
import { resumeToIndex } from './resume.js';

const SPEAKER_LABELS = Object.freeze({
  narrator: 'Narrateur',
  noe: 'Noé',
  camille: 'Camille',
  lefevre: 'Lefèvre',
  martin: 'Madame Martin',
  croissant: 'Croissant'
});

function parseDay() {
  const q = new URLSearchParams(window.location.search);
  const raw = Number(q.get('day') || '10');
  if (!Number.isFinite(raw) || raw < 1 || raw > 11) return 10;
  return Math.floor(raw);
}

/** Last dialogue line scripted for a beat (used when line was cleared after advance). */
function dialogueLineForBeat(runtime, beatId) {
  if (!beatId || !runtime?.items) return null;
  let found = null;
  for (const item of runtime.items) {
    if (item.beatId !== beatId) continue;
    const s = item.step;
    if (s?.do === 'say' || s?.do === 'phone_bubble') {
      found = {
        who: s.who,
        fr: s.fr,
        zh: s.zh,
        audio: s.audio,
        kind: s.do === 'phone_bubble' ? 'phone' : 'say'
      };
    }
  }
  return found;
}

export async function bootEngineShell(root) {
  const day = parseDay();
  root.innerHTML = `<div class="engine-shell"><div id="engine-stage"></div>
    <div id="engine-module" class="engine-module" hidden></div></div>`;

  const q = new URLSearchParams(window.location.search);
  const kitchenMessage = q.get('kitchenMessage') === '1';
  const pack = await loadEpisodePack(day);
  let episode = pack.episode;
  if (kitchenMessage) {
    episode = await fetch(new URL('../../episodes/day10.json', import.meta.url)).then((r) => r.json());
  }
  const saved = loadEngineProgress(day);
  // fix17: the runtime starts at step 0; resumeToIndex replays up to the saved step (see resume.js)
  const runtime = new EpisodeRuntime(episode, { startIndex: 0 });

  let player;
  let sceneUrl;
  let moduleUiDispose = null;

  const kitchenUrl = new URL('../scenes/day10-kitchen/scene.json', import.meta.url);
  const baseKitchen = await fetch(kitchenUrl).then((r) => r.json());
  const baseStairwell = await fetch(new URL('../scenes/day10-stairwell/scene.json', import.meta.url)).then((r) => r.json());
  const baseRooftop = await fetch(new URL('../scenes/day10-rooftop/scene.json', import.meta.url)).then((r) => r.json());
  const handoff = await fetch(new URL('../../style/canonical/sets/floor_strips/handoff_cameras.json', import.meta.url)).then((r) => r.json());
  const registry = await loadRegistryBundle();
  const stageRecords = await fetch(new URL('../scenes/stage-records/index.json', import.meta.url))
    .then((r) => (r.ok ? r.json() : []))
    .then((names) => Promise.all((names || []).map((n) => fetch(new URL(`../scenes/stage-records/${n}`, import.meta.url)).then((r) => r.json()))))
    .catch(() => []);
  const compiled = compileEpisodeScene(episode, handoff, baseKitchen, registry, {
    stairwell: baseStairwell,
    rooftop: baseRooftop,
    stageRecords
  });
  const blob = new Blob([JSON.stringify(compiled)], { type: 'application/json' });
  sceneUrl = URL.createObjectURL(blob);

  const stageEl = root.querySelector('#engine-stage');
  const assetBase = kitchenUrl.href;
  player = await initScenePlayer(stageEl, sceneUrl, { assetBaseUrl: assetBase });

  function persist() {
    const snap = runtime.snapshot();
    saveEngineProgress(day, {
      episodeId: pack.episode.id,
      version: pack.episode.version,
      index: snap.index,
      beatId: snap.beatId,
      flags: snap.flags,
      cagnotte_eur: snap.cagnotte_eur
    });
  }

  function showModule(step) {
    const el = root.querySelector('#engine-module');
    moduleUiDispose?.();
    moduleUiDispose = null;
    if (!step) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    renderLearningModule(el, { do: 'learning_module', ...step }, {
      onDone: () => {
        runtime.clearPending();
        el.hidden = true;
        syncVisuals();
        persist();
      }
    }).then((ui) => {
      moduleUiDispose = ui.dispose;
    }).catch((err) => console.error('module ui', err));
  }

  function applyHud(snap, inSubshot = false) {
    // subshots: inside a sub-shot only the pending line speaks (a silent insert has nobody speaking over it)
    const line = snap.pendingLine || (inSubshot ? null : dialogueLineForBeat(runtime, snap.beatId));
    const api = player;
    const dlg = stageEl.querySelector('.scene-player-dialogue');
    const speaker = stageEl.querySelector('.scene-player-dialogue-speaker');
    const text = stageEl.querySelector('.scene-player-dialogue-text');
    if (!dlg) return;
    if (!line?.fr && !line?.zh) {
      speaker.textContent = '';
      speaker.hidden = true;
      text.textContent = '▸ Touchez pour continuer…';
      text.classList.add('is-tap-hint');
      dlg.hidden = false;
      return;
    }
    const who = line.who;
    const isNarrator = who === 'narrator';
    const isScreen = line.kind === 'phone' || who === 'martin';
    speaker.hidden = isNarrator;
    if (isScreen) {
      speaker.hidden = false;
      speaker.classList.add('is-screen-message');
      speaker.textContent = 'Message';
    } else {
      speaker.classList.remove('is-screen-message');
      speaker.textContent = isNarrator ? '' : (SPEAKER_LABELS[who] || who);
    }
    // French first, Chinese gloss under it: the same rule as the player's bubble HUD (hudPanelText)
    text.textContent = hudPanelText(line);
    text.classList.remove('is-tap-hint');
    dlg.hidden = false;
    if (line.audio && snap.pendingLine) api.playClip?.(line.audio);
  }

  // subshots: the sub-shot on screen follows the last APPLIED step; hold rules come from compiled shot.subshot.hold.
  const hold = createHoldController();
  let liveSubId = null;
  const timers = [];
  const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };
  const nowMs = () => (globalThis.__A411_NOW ? globalThis.__A411_NOW() : performance.now());

  function currentSubshot(snap) {
    const shots = player.getConfig?.()?.shots || [];
    const last = runtime.items[runtime.index - 1];
    if (last) {
      const sub = shotForStep(shots, last.beatId, last.stepIndex);
      if (sub && !(snap.done)) return sub;
    }
    // a pending line belongs to the last applied step's beat: never pre-show the next beat's sub-shot over it
    if (snap.pendingLine && last && last.beatId !== snap.beatId) return null;
    // about to start a beat with sub-shots: show its first sub-shot, not the end state
    if (snap.beatId) return shots.find((s) => s.subshot?.beat === snap.beatId && s.subshot.index === 0) || null;
    return null;
  }

  const inSub = (it, sub) => it && it.beatId === sub.subshot.beat && it.stepIndex >= sub.subshot.fromStep && it.stepIndex <= sub.subshot.toStep;

  function settle(sub) {
    // a sub-shot is one picture: its line-less setup steps apply without extra taps, up to its first line
    let guard = 0;
    while (guard++ < 200) {
      const snap = runtime.snapshot();
      if (snap.done || snap.pendingLine || snap.pendingModule) break;
      if (!inSub(runtime.items[runtime.index], sub)) break;
      runtime.advance();
    }
  }

  function leaveSubshot(sub) {
    // apply the rest of the sub-shot's steps plus the first step after it (silent insert skip / auto-advance)
    let guard = 0;
    while (guard++ < 200) {
      const snap = runtime.snapshot();
      if (snap.done || snap.pendingModule) break;
      const last = runtime.items[runtime.index - 1];
      const before = !last || last.beatId !== sub.subshot.beat ? !runtime.items.slice(0, runtime.index).some((it) => it.beatId === sub.subshot.beat) : last.stepIndex < sub.subshot.fromStep;
      if (!before && !inSub(last, sub)) break;
      if (snap.pendingLine) runtime.clearPending(); else runtime.advance();
    }
    syncVisuals();
    persist();
  }

  function syncVisuals(opts = {}) {
    let snap = runtime.snapshot();
    let sub = currentSubshot(snap);
    // fix17: a restored save is already a settled stop (persist runs after syncVisuals), so resume never settles past it
    if (sub && !opts.restore && inSub(runtime.items[runtime.index - 1], sub) && liveSubId !== sub.id) {
      settle(sub);
      snap = runtime.snapshot();
      sub = currentSubshot(snap);
    }
    if (sub) {
      const live = inSub(runtime.items[runtime.index - 1], sub);
      const fresh = live && liveSubId !== sub.id;
      if (live) liveSubId = sub.id;
      const st = live ? hold.enter(sub, nowMs()) : { bubbleAt: 0, autoAdvanceAt: null };
      player.setShot?.(sub.id);
      if (fresh) clearTimers();
      const delay = Math.max(0, st.bubbleAt - nowMs());
      if (delay > 0 && snap.pendingLine) {
        // action lead: the cat/actor action plays before any bubble or HUD line
        player.setT?.(sub.t0 + 0.05);
        applyHud({ ...snap, pendingLine: null }, true);
        // after the lead: the active line's own bubble window (its compiled t0 carries the full bubble delay; the remaining
        // wall-clock delay is shorter, so t0 + 0.8 + delay landed before the window and the line was never drawn)
        const leadIt = runtime.items[runtime.index - 1];
        const own = leadIt && (player.getConfig?.()?.bubbles || []).find((x) => x.beat === leadIt.beatId && x.step === leadIt.stepIndex && x.t0 >= sub.t0 && x.t0 < sub.t1);
        timers.push(setTimeout(() => { player.setT?.(own ? own.t0 + 0.05 : sub.t0 + 0.8 + delay / 1000 + 0.05); applyHud(runtime.snapshot(), true); }, delay));
      } else {
        const all = (player.getConfig?.()?.bubbles || []).filter((x) => x.t0 >= sub.t0 && x.t0 < sub.t1);
        const lastIt = runtime.items[runtime.index - 1];
        const mine = snap.pendingLine && lastIt ? all.find((x) => x.beat === lastIt.beatId && x.step === lastIt.stepIndex) : null;
        const b = all.map((x) => x.t0);
        player.setT?.(mine ? mine.t0 + 0.05 : Math.max(sub.t0 + 0.8, b.length ? Math.min(...b) + 0.05 : 0));
        applyHud(snap, true);
      }
      if (fresh) {
        if (st.autoAdvanceAt != null) timers.push(setTimeout(() => leaveSubshot(sub), Math.max(0, st.autoAdvanceAt - nowMs())));
      }
      if (window.__engine) window.__engine.subshotId = sub.id;
    } else if (snap.beatId) {
      if (window.__engine) window.__engine.subshotId = null;
      liveSubId = null;
      const shots = player.getConfig?.()?.shots || [];
      // snapshot.beatId is the NEXT item's beat; while a line is pending, the picture is the beat of the line being said
      // (a beat's last line used to show the following beat's shot and bubble)
      const lastIt = runtime.items[runtime.index - 1];
      const bid = snap.pendingLine && lastIt?.beatId ? lastIt.beatId : snap.beatId;
      const sh = shots.find((s) => s.id === bid)
        || shots.find((s) => s.id === `${bid}_arrosage`);
      if (sh) {
        player.setShot?.(sh.id);
        // the active line's own bubble window (beat + authored step), else the beat's settle time
        const mine = snap.pendingLine && lastIt
          ? (player.getConfig?.()?.bubbles || []).find((x) => x.beat === lastIt.beatId && x.step === lastIt.stepIndex && x.t0 >= sh.t0 && x.t0 < sh.t1)
          : null;
        player.setT?.(mine ? mine.t0 + 0.05 : sh.t0 + 0.8);
      } else {
        player.setShot?.(bid);
      }
      applyHud(snap);
    } else applyHud(snap);
    showModule(snap.pendingModule);
    player.enableTapAdvance?.(true);
  }

  function onTap() {
    const snap = runtime.snapshot();
    if (snap.pendingModule) return;
    const sub = currentSubshot(snap);
    if (sub && inSub(runtime.items[runtime.index - 1], sub)) {
      const verdict = hold.tap(nowMs());
      if (verdict === 'blocked') return; // silent insert: tap-to-skip only after the skip lock
      if (verdict === 'skip') { clearTimers(); leaveSubshot(sub); return; }
    }
    if (snap.pendingLine) {
      runtime.clearPending();
    } else {
      runtime.advance();
    }
    syncVisuals();
    persist();
    if (runtime.snapshot().done) {
      player.setT?.(player.getConfig?.().timing?.sceneEnd - 1 || 1000);
    }
  }

  player.enableTapAdvance?.(true);
  player.onAdvanceTap = onTap;

  resumeToIndex(runtime, saved);
  player.start?.();
  try {
    syncVisuals({ restore: !!saved?.index });
    persist();
  } catch (err) {
    console.error('engine sync', err);
  }

  const packForUi = kitchenMessage ? { ...pack, episode } : pack;
  window.__engine = { day, runtime, player, pack: packForUi, syncVisuals, tap: onTap, subshotId: window.__engine?.subshotId ?? null };
  window.__A411_CAPTURE_READY = true;
  return { day, runtime, player };
}

if (typeof window !== 'undefined') {
  window.bootEngineShell = bootEngineShell;
}

export { hudPanelText };
