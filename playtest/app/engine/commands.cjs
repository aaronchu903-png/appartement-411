'use strict';

const COMMAND_IDS = Object.freeze([
  'enter', 'walk_to', 'sit', 'say', 'phone_bubble', 'cut_to', 'set_light', 'prop', 'cat_action', 'learning_module'
]);

function normalizeWho(who) {
  if (who === 'croissant') return 'cat';
  if (who === 'cat') return 'croissant';
  return who;
}

function applyStep(world, step, ctx) {
  if (!step || !COMMAND_IDS.includes(step.do)) throw new Error(`Unknown command: ${step?.do}`);
  if (step.if && !ctx.flagsMatch(step.if)) return { skipped: true };
  switch (step.do) {
    case 'cut_to':
      world.camera = { shot: step.shot, on: step.on || null };
      break;
    case 'say':
    case 'phone_bubble':
      world.pendingLine = { who: step.who, fr: step.fr, zh: step.zh };
      break;
    case 'prop': {
      const id = step.id;
      const instance = step.instance ?? id;
      const storeKey = `${id}::${instance}`;
      const action = step.action;
      world.props = world.props || {};
      if (action === 'show') world.props[storeKey] = { id, instance, at: step.at, visible: true };
      else if (action === 'hide') delete world.props[storeKey];
      else if (action === 'swap') world.props[storeKey] = { id: step.to || id, instance, at: step.at, visible: true };
      else if (action === 'hold' || action === 'wear')
        world.props[storeKey] = { id, instance, who: step.who, overlay: step.overlay, at: step.at, visible: true };
      else if (action === 'drop' || action === 'remove') delete world.props[storeKey];
      break;
    }
    default:
      break;
  }
  return { skipped: false };
}

function createWorld(episode) {
  return {
    episodeId: episode.id,
    day: episode.day,
    set: episode.scenes[0]?.set || 'kitchen',
    camera: { shot: 'wide' },
    pendingLine: null,
    pendingModule: null,
    props: {}
  };
}

module.exports = { COMMAND_IDS, applyStep, createWorld };
