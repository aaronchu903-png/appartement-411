/** Whitelisted sitcom engine commands (schema v0.3c). */
export const COMMAND_IDS = Object.freeze([
  'enter',
  'walk_to',
  'sit',
  'say',
  'phone_bubble',
  'cut_to',
  'set_light',
  'prop',
  'cat_action',
  'learning_module',
  'leave'
]);

const WHO_ALIASES = Object.freeze({
  croissant: 'cat',
  cat: 'croissant'
});

export function normalizeWho(who) {
  if (!who) return who;
  return WHO_ALIASES[who] || who;
}

export function isCommand(step) {
  return step && COMMAND_IDS.includes(step.do);
}

/** Apply one step to mutable world state (registry-aware). */
export function applyStep(world, step, ctx) {
  if (!isCommand(step)) throw new Error(`Unknown command: ${step?.do}`);
  if (step.if && !ctx.flagsMatch(step.if)) return { skipped: true };

  switch (step.do) {
    case 'enter': {
      const who = normalizeWho(step.who);
      world.actors[who] = {
        who,
        at: step.at,
        pose: step.pose || 'stand',
        from: step.from || 'none',
        face: 'neutral',
        gesture: null
      };
      break;
    }
    case 'walk_to': {
      const who = normalizeWho(step.who);
      const actor = world.actors[who] || { who };
      actor.at = step.to;
      actor.pose = 'stand';
      if (step.face && step.face !== 'auto') actor.facing = step.face;
      if (step.gesture) actor.gesture = step.gesture;
      world.actors[who] = actor;
      break;
    }
    case 'sit': {
      const who = normalizeWho(step.who);
      const actor = world.actors[who] || { who };
      actor.at = step.seat;
      actor.pose = 'sit';
      if (step.gesture) actor.gesture = step.gesture;
      world.actors[who] = actor;
      break;
    }
    case 'say':
    case 'phone_bubble': {
      world.pendingLine = {
        kind: step.do === 'phone_bubble' ? 'phone' : 'say',
        who: step.who,
        fr: step.fr,
        zh: step.zh,
        audio: step.audio,
        icon: step.icon || 'phone',
        panel: step.panel !== false,
        face: step.face || 'talk',
        gesture: step.gesture || null
      };
      if (step.gesture && step.who && step.who !== 'narrator') {
        const who = normalizeWho(step.who);
        const actor = world.actors[who] || { who };
        actor.gesture = step.gesture;
        world.actors[who] = actor;
      }
      break;
    }
    case 'cut_to': {
      world.camera = {
        shot: step.shot,
        on: step.on || null
      };
      if (step.caption) world.caption = { ...step.caption };
      break;
    }
    case 'set_light':
      world.light = step.preset;
      world.lightFadeMs = step.fade_ms ?? 600;
      break;
    case 'prop': {
      const id = step.id;
      const key = step.instance ?? id;
      const action = step.action;
      if (action === 'show')
        world.props[key] = { id, instance: step.instance, at: step.at, visible: true };
      else if (action === 'hide') delete world.props[key];
      else if (action === 'swap')
        world.props[key] = { id: step.to, instance: step.instance, at: step.at, visible: true };
      else if (action === 'hold' || action === 'wear')
        world.props[key] = {
          id,
          instance: step.instance,
          who: step.who,
          overlay: step.overlay,
          at: step.at,
          visible: true
        };
      else if (action === 'drop' || action === 'remove') delete world.props[key];
      // subshots: a caption authored on the prop step (e.g. « Samedi : Madame Martin » on insert_calendar) was dropped;
      // only cut_to carried captions. Hiding the captioned prop clears it.
      if (step.caption && (action === 'show' || action === 'swap')) world.caption = { on: step.to || id, ...step.caption };
      if ((action === 'hide' || action === 'drop' || action === 'remove') && world.caption?.on === id) world.caption = null;
      break;
    }
    case 'cat_action': {
      const prev = world.cat?.action ? { action: world.cat.action, at: world.cat.at, look_at: world.cat.look_at || null } : null;
      world.cat = {
        action: step.action,
        at: step.at || (prev && !step.at ? prev.at : undefined),
        look_at: step.look_at || null,
        prev
      };
      break;
    }
    case 'learning_module':
      world.pendingModule = {
        module: step.module,
        items: step.items,
        prompt: step.prompt,
        options: step.options,
        choices: step.choices,
        mode: step.mode,
        watering_lines: step.watering_lines,
        optional: step.optional !== false
      };
      break;
    case 'leave': {
      const who = normalizeWho(step.who);
      delete world.actors[who];
      break;
    }
    default:
      break;
  }

  if (step.cost && ctx?.applyCost) ctx.applyCost(step.cost);
  if (step.sfx) world.lastSfx = step.sfx;
  return { skipped: false };
}

export function createWorld(episode) {
  return {
    episodeId: episode.id,
    day: episode.day,
    set: episode.scenes[0]?.set || 'kitchen',
    light: episode.scenes[0]?.light || 'day',
    lightFadeMs: 600,
    actors: {},
    props: {},
    cat: null,
    camera: { shot: 'wide', on: null },
    caption: null,
    flags: {},
    cagnotte_eur: 0,
    pendingLine: null,
    pendingModule: null,
    lastSfx: null
  };
}
