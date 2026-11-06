/** MODULES_V1 binding defaults (registry/learning.json is source of truth at runtime). */
export const ON_WRONG = 'recast_continue';
export const REVIEW_ALWAYS_OPTIONAL = true;
export const ASR_PLAYTEST = 'off';
export const LADDER_DAYS = Object.freeze([1, 3, 7, 16, 35, 80]);
export const LAPSE_STEPS_BACK = 2;
export const MODULE_IDS = Object.freeze([
  'learn_words',
  'review',
  'listening',
  'dictation',
  'output'
]);
