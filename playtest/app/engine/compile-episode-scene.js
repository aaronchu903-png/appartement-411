import { cameraFromHandoff } from './registry.js';
import { relationGroups, closeSubjectCamera } from './relation-framing.js';
import { isFrozenDay } from './frozen-days.js';
import { splitBeat, holdPlan, SUBSHOT_RULES, aimTargets, closeFrameCrop, catFramedInSegment, catNameRes, CLOSE_FRAME_BAND } from './subshots.js';
import {
  worldAtBeat,
  buildSitcomStageOverlay,
  applySitcomOverlayToStage,
  buildStageActorsFromWorld,
  catHidden
} from './sitcom-stage.js';

const SET_FLAGS = Object.freeze({
  kitchen: { kitchen: true },
  kitchen_table4: { kitchen: true, table4: true },
  stairwell: { stairwell: true },
  rooftop: { rooftop: true }
});

function handoffSetForEpisodeSet(setId) {
  if (setId === 'kitchen_table4') return 'kitchen';
  if (setId === 'stairwell' || setId === 'rooftop') return setId;
  return 'kitchen';
}

function lineFromStep(step) {
  if (step.do === 'say' || step.do === 'phone_bubble') {
    return {
      text: step.fr,
      gloss: step.zh,
      who: step.who,
      kind: step.do === 'phone_bubble' ? 'screen' : step.who,
      anchor: step.do === 'phone_bubble' ? 'martin' : step.who,
      ...(step.do === 'phone_bubble' && step.rect ? { rect: step.rect } : {}),
      ...(step.do === 'phone_bubble' && step.tail === false ? { tail: false } : {})
    };
  }
  return null;
}

/** H5c: a stage record (e.g. STAGE_D1-3) covering this episode day + set wins over the set's shot-0 stage. Honoured only when present. */
function stageRecordFor(records, day, setId) {
  if (!Array.isArray(records) || day == null) return null;
  const d = Number(day);
  for (const rec of records) {
    if (!rec || !Array.isArray(rec.days) || !rec.days.map(Number).includes(d)) continue;
    const st = rec.sets?.[setId];
    if (st) return st;
  }
  return null;
}

/** Per-beat stage-record overrides (e.g. propStates.laptop=off for one beat), keyed "<day>:<beatId>". */
function stageRecordBeatOverride(records, day, setId, beatId) {
  if (!Array.isArray(records) || day == null) return null;
  for (const rec of records) {
    if (!rec || !Array.isArray(rec.days) || !rec.days.map(Number).includes(Number(day))) continue;
    const o = rec.beatOverrides?.[`${Number(day)}:${beatId}`];
    if (o && (!o.set || o.set === setId)) return o;
  }
  return null;
}

function sceneBaseForSet(setId, bases) {
  if (setId === 'stairwell') return bases.stairwell || bases.kitchen;
  if (setId === 'rooftop') return bases.rooftop || bases.kitchen;
  return bases.kitchen;
}

function resolveCompiledCrop(baseKitchen, cropRef, handoff, setName, fallback) {
  if (!cropRef) return fallback;
  if (typeof cropRef === 'object' && cropRef.x != null) return { ...cropRef };
  const lib = baseKitchen?.cropLibrary?.[cropRef];
  if (lib) {
    if (typeof lib === 'object' && lib.x != null) return { ...lib };
    if (typeof lib === 'string') return resolveCompiledCrop(baseKitchen, lib, handoff, setName, fallback);
  }
  try {
    return cameraFromHandoff(handoff, setName, cropRef);
  } catch {
    return fallback;
  }
}

/** Build a tap-driven scene.json from an episode (Day 11 POC). */
/** fix19b ruling 4: aim order speaker > props named in the line's fr (registry props[id].fr_aliases) > the rest. */
export function namedProps(fr, world, registry) {
  const txt = String(fr || '').toLowerCase();
  return Object.entries(registry?.props || {}).filter(([id, def]) => world?.props?.[id] && world.props[id].visible !== false
    && (def?.fr_aliases || []).some((a) => new RegExp(`(^|[^\\p{L}])${a.toLowerCase()}($|[^\\p{L}])`, 'u').test(txt))).map(([id]) => id);
}
export function aimPriority(steps, on0, world, registry) {
  // fix20: every on-stage speaker of the segment is prio 0 (first speaker first); props / the cat named by ANY of its lines are prio 1
  const says = steps.filter((st) => st?.do === 'say' && st.who && world?.actors?.[st.who]);
  const speakers = [...new Set(says.map((st) => st.who))];
  const speaker = speakers[0] || null;
  const named = [...new Set(says.flatMap((st) => namedProps(st.fr, world, registry)))];
  // fix20: a line naming the cat (catNameRes: Croissant + registry fr_aliases « chat ») makes the drawn cat a named subject
  const catNamed = !!(world?.cat && says.some((st) => catNameRes(registry).some((r) => r.test(st.fr || ''))));
  const on = [...new Set([...speakers, ...named, ...(catNamed && !on0.some((x) => x === 'cat' || x === 'croissant') ? ['cat'] : []), ...on0])];
  const prio = (t) => (t.box && speakers.includes(t.box) ? 0 : (t.prop && named.includes(t.prop)) || (t.box === 'cat' && named.includes('box_cat') && t.inBox) || (t.box === 'cat' && catNamed) ? 1 : 2);
  return { on, prio, speaker, speakers, named };
}

// fix20: the aim of one cut segment (shared by multi-segment beats and single-segment beats). A preset medium/close aims at
// its `on` targets, and (speaker first) at its on-stage speaker even when the cut names no target.
export function aimSegment(episode, beat, g, segCrop, stepCropOk, registry, setName, opts = {}) {
  const steps = beat.steps.slice(g.fromStep, g.toStep + 1);
  const segSays = steps.some((st) => st?.do === 'say' && st.who);
  if (stepCropOk || !(segCrop?.presetZoom > 1 || (opts.allowWide && segCrop)) || !((g.cutOn || g.cut?.on)?.length || segSays)) return segCrop;
  const w = worldAtBeat(episode, beat.id, registry, g.toStep);
  // fix23b item 4: a preset close frames its subject (relation-framing closeSubjectCamera)
  if (!isFrozenDay(episode?.day) && (g.cut?.shot === 'close') && (g.cutOn || g.cut?.on)?.length && !segSays) {
    const sid = w?.set || setName; const sz = registry?.marks?.[sid]?.stage || { w: 192, h: 144 };
    const cam = closeSubjectCamera(g.cutOn || g.cut.on, w, registry, sid, { w: sz.w || 192, h: sz.h || 144 });
    if (cam) return cam;
  }
  // fix18 (generic): a sub-shot that NAMES the cat in a line or has it ACT also frames the cat (whole sprite)
  const on0 = g.cutOn || g.cut?.on || [];
  const on1 = catFramedInSegment(steps, registry, w) && !aimTargets(on0, w, registry, w?.set || setName).some((t) => t.box === 'cat') ? [...on0, 'cat'] : on0;
  // fix19b (Réalisateur ruling 4): framing priority = the speaker, then every prop the line names (registry
  // fr_aliases), then the rest; each aim carries its prio and the player drops prio-2 aims when they don't fit
  const { on, prio } = aimPriority(steps, on1, w, registry);
  const aim = aimTargets(on, w, registry, w?.set || setName).map((t) => ({ ...t, prio: prio(t) })).sort((a, b) => a.prio - b.prio); // fix20 N: aims in priority order
  return aim.length ? { ...segCrop, aim } : segCrop;
}

export function compileEpisodeScene(episode, handoff, baseKitchen, registry = null, sceneBases = null) {
  const bases = {
    kitchen: baseKitchen,
    kitchen_table4: baseKitchen,
    stairwell: sceneBases?.stairwell || baseKitchen,
    rooftop: sceneBases?.rooftop || baseKitchen
  };
  const shots = [];
  const bubbles = [];
  const audio = [];
  let t = 0;
  const dt = 48;
  let lastSet = episode.scenes[0]?.set || 'kitchen';
  let lastLight = episode.scenes[0]?.light || 'day';

  let lastPhoneWho = null; // last phone_bubble sender (chat header partner, fix17)
  for (const scene of episode.scenes) {
    lastSet = scene.set;
    lastLight = scene.light || lastLight;
    let sceneFocus = null; // last set piece shown in this scene (voice-call rule framing, fix17)
    for (const beat of scene.beats) {
      const t0 = t;
      let crop = 'wide';
      let shotSize = 'wide';
      // An active screen insert lasts until the next cut_to (without an insert) or a cat_action; scene cuts clear it.
      let phoneInsert = null;
      let stepCrop = null;
      let stepCropOn = null;
      for (const step of beat.steps) {
        if (step.do === 'cat_action') phoneInsert = null;
        if (step.do === 'cut_to') {
          phoneInsert = null;
          shotSize = step.shot || 'wide';
          crop = shotSize;
          if (step.crop && [step.crop.k, step.crop.viewX, step.crop.viewY].every(Number.isFinite)) {
            stepCrop = step.crop;
            stepCropOn = step.shot === 'close' ? (step.on || []) : null;
          }
          const ins = (step.on || []).find((id) => String(id).startsWith('insert_'));
          if (ins && registry?.props?.[ins]) {
            const pdef = registry.props[ins];
            const lk = lastLight === 'evening' || lastLight === 'night' ? lastLight : 'day';
            const logical = pdef.asset || pdef.assets?.[lk] || pdef.assets?.day;
            phoneInsert = {
              mode: 'closeInsert',
              insertId: ins,
              logical,
              fullBleed: true,
              skipVeil: true,
              ungraded: pdef.graded === false || pdef.self_lit === true
            };
          }
        }
      }
      const setName = handoffSetForEpisodeSet(scene.set);
      const cropDef = cameraFromHandoff(handoff, setName, shotSize) || cameraFromHandoff(handoff, 'kitchen', 'wide');
      const setScene = sceneBaseForSet(scene.set, bases);
      const templateShot = (setScene?.shots || []).find((s) => s.id === beat.id);
      const beatCrop = beat.crop && [beat.crop.k, beat.crop.viewX, beat.crop.viewY].every(Number.isFinite)
        ? beat.crop : null;
      const cropFinal = stepCrop || beatCrop || (templateShot?.crop
        ? resolveCompiledCrop(setScene, templateShot.crop, handoff, setName, cropDef)
        : cropDef);
      const tplStage = beat.stage === 'world' ? null : templateShot?.stage;
      const recStage0 = stageRecordFor(sceneBases?.stageRecords, episode.day, scene.set);
      const recOverride = recStage0 && stageRecordBeatOverride(sceneBases?.stageRecords, episode.day, scene.set, beat.id);
      const recStage = recStage0 && recOverride
        ? { ...recStage0, propStates: { ...(recStage0.propStates || {}), ...(recOverride.propStates || {}) } }
        : recStage0;
      const baseStage = (recStage && { ...recStage, stageRecord: true })
        || setScene?.shots?.[0]?.stage || setScene?.defaultStage || { props: [], actors: {} };
      const makeStage = (stepLimit) => {
      let stage;
      let world = null;
      if (tplStage) {
        stage = structuredClone(tplStage);
      } else {
        stage = {
          ...structuredClone(baseStage),
          actors: {}
        };
      }
      if (registry) {
        world = worldAtBeat(episode, beat.id, registry, stepLimit);
        if (!tplStage) {
          const overlay = buildSitcomStageOverlay(world, registry, {
            propStates: stage.propStates || null,
            deskSlots: stage.deskSlots || null,
            deskDef: stage.propPlacement?.desk || null,
            deskBareAsset: stage.deskBareAsset || null
          });
          stage = applySitcomOverlayToStage(stage, overlay);
          const worldActorKeys = new Set(Object.keys(world.actors || {}));
          if (world.cat?.action && !catHidden(world)) worldActorKeys.add('cat');
          stage.actors = {
            ...buildStageActorsFromWorld(world, registry),
            ...(overlay.actors || {})
          };
          if (stage.actors.cat && overlay.catPlacement) stage.actors.cat = { ...stage.actors.cat, ...overlay.catPlacement };
          // One owner per actor per beat: when the cat is a stage actor (graded as an actor), the overlay's cat draw is
          // metadata only (position, action, bowl ripple) and is never painted. Otherwise he was drawn twice.
          if (stage.actors.cat) {
            for (const d of stage.sitcomOverlay?.draws || []) if (d.kind === 'cat') d.ownedBy = 'actor';
          }
          for (const key of Object.keys(stage.actors)) {
            if (!stage.actors[key] || !worldActorKeys.has(key)) delete stage.actors[key];
          }
          for (const key of Object.keys(baseStage.actors || {})) {
            if (!worldActorKeys.has(key)) stage.actors[key] = null;
          }
        }
      }
      return { stage, world };
      };
      let { stage, world } = makeStage(null);
      const cropAimed = (stepCrop && stepCropOn && registry) ? closeFrameCrop(cropFinal, stepCropOn, world, registry, world?.set || scene.set).crop : cropFinal;
      const lightVariant = templateShot?.lightVariant
        || (lastLight === 'evening' ? 'evening' : lastLight === 'night' ? 'night' : 'day');
      shots.push({
        id: beat.id,
        t0,
        t1: t + dt,
        crop: cropAimed,
        lightVariant,
        stage,
        ...(templateShot?.floorBandFracTarget != null
          ? { floorBandFracTarget: templateShot.floorBandFracTarget }
          : {}),
        ...(templateShot?.bubbleAnchors && beat.stage !== 'world' ? { bubbleAnchors: templateShot.bubbleAnchors } : {}),
        ...(templateShot?.excludeProps ? { excludeProps: templateShot.excludeProps } : {}),
        ...(templateShot?.phoneInsert || phoneInsert
          ? { phoneInsert: templateShot?.phoneInsert || phoneInsert }
          : {}),
        ...(templateShot?.soirKitchen ? { soirKitchen: true } : {}),
        ...(templateShot?.warmTint === false ? { warmTint: false } : {}),
        ...(SET_FLAGS[scene.set] || SET_FLAGS.kitchen)
      });
      // subshots: a beat with more than one cut_to sub-shot becomes one shot per sub-shot (last keeps the beat id).
      const segs = registry ? splitBeat(beat, registry, { callFocus: sceneFocus }) : [];
      const segOfStep = (i) => segs.findIndex((g) => i >= g.fromStep && i <= g.toStep);
      if (segs.length > 1 || segs.some((g) => g.insertId)) {
        const beatShot = shots.pop();
        const span = dt / segs.length;
        segs.forEach((g, k) => {
          const last = k === segs.length - 1;
          const { stage: sStage } = last ? { stage: beatShot.stage } : makeStage(g.toStep);
          const size = g.cut?.shot || 'wide';
          const stepCropOk = g.cut?.crop && [g.cut.crop.k, g.cut.crop.viewX, g.cut.crop.viewY].every(Number.isFinite);
          const segCrop = stepCropOk ? g.cut.crop
            : (last || !g.cut) ? beatShot.crop
              : (cameraFromHandoff(handoff, setName, size) || beatShot.crop);
          // a preset medium/close cut aims at its `on` targets (the preset alone frames a fixed spot of the set)
          let segCropAimed = segCrop;
          // fix18: every sub-shot that names / acts the cat is flagged; the player keeps the drawn cat inside its view
          if (!stepCropOk && catFramedInSegment(beat.steps.slice(g.fromStep, g.toStep + 1), registry, worldAtBeat(episode, beat.id, registry, g.toStep))) g.catFramed = true;
          segCropAimed = aimSegment(episode, beat, g, segCrop, stepCropOk, registry, scene.set, { allowWide: true });
          let ins = null;
          if (g.insertId && registry?.props?.[g.insertId]) {
            const pdef = registry.props[g.insertId];
            // a hand prop's screen art is its own registry prop (insert_prop): its self_lit / graded flags rule the grade
            const idef = (pdef.insert_prop && registry.props[pdef.insert_prop]) || pdef;
            const lk = lastLight === 'evening' || lastLight === 'night' ? lastLight : 'day';
            // insert art: registry insert_asset (screen-size art for a hand prop) else the prop asset; resolved by prefix in the player
            ins = { mode: 'closeInsert', insertId: g.insertId, insertKind: g.insertKind,
              logical: pdef.insert_asset || pdef.asset || pdef.assets?.[lk] || pdef.assets?.day,
              fullBleed: true, skipVeil: true, backdropDim: SUBSHOT_RULES.INSERT_BACKDROP_DIM,
              ungraded: idef.graded === false || idef.self_lit === true };
            // text the insert art carries in its textRect: the beat's next written answer (learning_module written, correct option);
            // otherwise the player writes the active line (phone_bubble / narrator) there, one per tap
            const written = beat.steps.slice(g.fromStep).find((st) => st.do === 'learning_module' && st.mode === 'written');
            const answer = written?.options?.find((o) => o.correct) || null;
            if (answer?.fr) ins.staticText = answer.fr;
            // fix17: the chat header always names the conversation partner; for an outgoing reply that is the last sender
            // of a phone_bubble so far (this sub-shot's own sender first, else earlier in the episode)
            const ownWho = beat.steps.slice(g.fromStep, g.toStep + 1).find((st) => st.do === 'phone_bubble' && st.who)?.who;
            const partner = ownWho || lastPhoneWho;
            if (partner) ins.partner = partner;
          }
          const { phoneInsert: _drop, ...rest } = beatShot;
          shots.push({
            ...rest,
            id: last ? beat.id : `${beat.id}~${k + 1}`,
            t0: t0 + k * span,
            t1: t0 + (k + 1) * span,
            crop: segCropAimed,
            stage: sStage,
            ...(ins ? { phoneInsert: ins } : {}),
            subshot: { beat: beat.id, index: k, count: segs.length, fromStep: g.fromStep, toStep: g.toStep,
              insertId: g.insertId, insertKind: g.insertKind || null, cutBack: !!g.cutBack, ...(g.voiceCall ? { voiceCall: g.voiceCall } : {}), ...(g.catFramed ? { catFramed: true } : {}), caption: g.caption, lines: g.lines.length, hasAction: g.hasAction, hold: holdPlan(g) }
          });
        });
      }
      else if (segs.length === 1 && segs[0].cut) {
        // fix20 (generic): a single-segment beat (one preset cut) aims like a sub-shot: its speaker first
        const g = segs[0]; const bs = shots[shots.length - 1];
        const stepCropOk = g.cut?.crop && [g.cut.crop.k, g.cut.crop.viewX, g.cut.crop.viewY].every(Number.isFinite);
        const base0 = stepCropOk ? g.cut.crop : (g.cut.shot && g.cut.shot !== 'wide' ? cameraFromHandoff(handoff, setName, g.cut.shot) : null) || bs?.crop;
        // fix22 E (generic): an authored BEAT crop ({k,viewX,viewY}) is aimed too, so the player's minimal pan keeps its
        // speaker, then every prop its lines name, whole (d1 b_payoff « La plante ! » cut the pot at the frame edge)
        if (bs && beat.crop && !stepCropOk && [beat.crop.k, beat.crop.viewX, beat.crop.viewY].every(Number.isFinite)) {
          bs.crop = aimSegment(episode, beat, g, bs.crop, false, registry, scene.set, { allowWide: true });
          // an authored crop keeps its framing: a speaker wholly outside it is OFF-SCREEN (ruling: n/a), flagged, not a must-fit target
          const vw = Math.floor(CLOSE_FRAME_BAND.w / bs.crop.k);
          if (bs.crop.aim) bs.crop.aim = bs.crop.aim.map((a) => (a.prio === 0 && !a.rect && (a.x + 8 < bs.crop.viewX || a.x - 8 > bs.crop.viewX + vw) ? { ...a, offscreen: true } : a));
          // per LINE: a named prop is kept only while a line naming it is up (its fr_aliases), so a later line of the beat keeps the authored framing
          if (bs.crop.aim) bs.crop.aim = bs.crop.aim.map((a) => (a.prop && a.prio === 1 && registry?.props?.[a.prop]?.fr_aliases?.length ? { ...a, aliases: registry.props[a.prop].fr_aliases } : a));
        }
        else if (bs && !beat.crop && !stepCropOk) bs.crop = aimSegment(episode, beat, g, base0, stepCropOk, registry, scene.set, { allowWide: true }); // fix20: a wide band view is portrait-cropped too: aim it
      }
      // fix23 (Réalisateur 21:05 MT, generic): spatial-relation lines (« sur / sous la table ») get ONE relation camera per
      // run of consecutive lines on the same reference; the player uses it while such a line is up (scene-player relationCropAt)
      if (registry) {
        const sc0 = (bases[scene.set] || baseKitchen)?.scene || { width: 192, height: 144 };
        const groups = relationGroups(beat, registry, scene.set, (i) => worldAtBeat(episode, beat.id, registry, i), { w: sc0.width, h: sc0.height });
        for (const sh of shots.filter((x) => (x.subshot ? x.subshot.beat === beat.id : x.id === beat.id))) {
          if (sh.subshot?.insertId) continue; // an insert shows its art, not the stage
          const mine = groups.filter((g) => g.steps.every((i) => !sh.subshot || (i >= sh.subshot.fromStep && i <= sh.subshot.toStep)));
          if (mine.length) sh.relationCrops = mine;
        }
      }
      for (const st of beat.steps) {
        if (st.do === 'phone_bubble' && st.who) lastPhoneWho = st.who;
        if (st.do === 'prop' && st.action === 'show' && !registry?.props?.[st.id]?.insert_prop) sceneFocus = st.id;
      }
      beat.steps.forEach((step, si) => {
        const line = lineFromStep(step);
        let bt0 = t + 0.8;
        let bt1 = t + dt - 1;
        if (segs.length > 1 || segs.some((g) => g.insertId)) {
          const k = Math.max(0, segOfStep(si));
          const span = dt / segs.length;
          const a = t + k * span + 0.8 + (holdPlan(segs[k]).bubbleDelayMs || 0) / 1000;
          const z = t + (k + 1) * span - 1;
          // lines of one sub-shot take turns in its window (they used to share one window and overlap)
          const own = segs[k].lines; const j = Math.max(0, own.indexOf(step)); const w = (z - a) / Math.max(1, own.length);
          bt0 = a + j * w;
          bt1 = j === own.length - 1 ? z : a + (j + 1) * w - 0.05;
        } else {
          // single-segment beat: its lines take turns in the beat window too (a shared window drew only the last line,
          // so earlier lines never showed their bubble while active)
          const own = beat.steps.filter((st) => lineFromStep(st)); const j = own.indexOf(step);
          if (own.length > 1 && j >= 0) {
            const w = (bt1 - bt0) / own.length; const a = bt0;
            bt0 = a + j * w;
            bt1 = j === own.length - 1 ? bt1 : a + (j + 1) * w - 0.05;
          }
        }
        if (line) {
          bubbles.push({
            t0: bt0,
            t1: bt1,
            text: line.text,
            gloss: line.gloss,
            actor: line.who === 'narrator' ? undefined : line.who,
            anchor: line.anchor,
            kind: line.kind === 'narrator' ? 'narrator' : line.kind,
            ...(line.rect ? { rect: line.rect } : {}),
            ...(line.tail === false ? { tail: false } : {}),
            beat: beat.id, step: si // every line carries its authored step index (capture/seek by step, not 'last line')
          });
          if (step.audio) audio.push({ t: bt0, id: step.audio });
        }
      });
      t += dt;
    }
  }

  return {
    version: 1,
    useHandoffCameras: true,
    title: episode.title,
    day: episode.day,
    audioBase: '../audio/w1/',
    scene: baseKitchen?.scene || { width: 192, height: 144 },
    room: baseKitchen?.room,
    cropLibrary: baseKitchen?.cropLibrary,
    shots,
    bubbles,
    audio,
    startCrop: 'wide',
    taps: [],
    tapAdvance: true,
    timing: { sceneEnd: t },
    assetPack: 'b',
    layout: baseKitchen?.layout,
    kitchen: true,
    overlay: { label: 'Touchez pour commencer' },
    hudContinue: 'Touchez pour continuer…'
  };
}
