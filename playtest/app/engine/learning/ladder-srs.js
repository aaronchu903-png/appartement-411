import { LADDER_DAYS, LAPSE_STEPS_BACK } from './constants.js';

export function ladderIndexForDays(days) {
  const i = LADDER_DAYS.indexOf(days);
  if (i >= 0) return i;
  let best = 0;
  for (let j = 0; j < LADDER_DAYS.length; j++) {
    if (LADDER_DAYS[j] <= days) best = j;
  }
  return best;
}

export function daysAtIndex(idx) {
  return LADDER_DAYS[Math.max(0, Math.min(idx, LADDER_DAYS.length - 1))];
}

/**
 * @param {{ stepIndex: number, successes: number, lapses: number }} card
 * @param {'ok'|'near'|'miss'|'idk'} result
 */
export function applyLadderReview(card, result, nowMs = Date.now()) {
  const beforeDays = daysAtIndex(card.stepIndex ?? 0);
  let stepIndex = card.stepIndex ?? 0;
  let successes = card.successes ?? 0;
  let lapses = card.lapses ?? 0;
  const lapse = result === 'miss' || result === 'idk';
  if (lapse) {
    lapses += 1;
    stepIndex = Math.max(0, stepIndex - LAPSE_STEPS_BACK);
  } else {
    successes += 1;
    stepIndex = Math.min(LADDER_DAYS.length - 1, stepIndex + 1);
  }
  const afterDays = daysAtIndex(stepIndex);
  const grade = lapse ? 1 : result === 'near' ? 2 : 3;
  const log = {
    item: card.item,
    timestamp: new Date(nowMs).toISOString(),
    grade,
    elapsed_days: card.elapsedDays ?? 0,
    S_before: beforeDays,
    S_after: afterDays,
    scheduler: 'ladder',
    result,
    type: card.reviewType || 'recog'
  };
  return {
    card: { ...card, stepIndex, successes, lapses, dueDays: afterDays, lastReviewMs: nowMs },
    log
  };
}

export function isGrown(card) {
  const days = daysAtIndex(card.stepIndex ?? 0);
  return days >= 7 && (card.successes ?? 0) >= 2;
}
