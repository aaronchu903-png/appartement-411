/**
 * Placement + start path (MODULES_V1 §6). Croissant: max day 18, minutes selector, hours + year ETA (estimate).
 * Item bank: data/act1_testout_items.json (see docs/PLACEMENT_TESTOUT_ACT1.md).
 */
import { placementCopy } from './placement-copy.js';

export const PLACEMENT_MAX_START_DAY = 18;
export const PLACEMENT_MINUTE_PRESETS = [15, 30, 60, 120];

const B2_HOURS_LOW = 500;
const B2_HOURS_HIGH = 700;
const B2_HOURS_MID = 600;

/** Hours already credited from placement start day (Act 1 bands). */
export function placementHoursDone(startDay) {
  const d = Number(startDay) || 1;
  if (d >= 15) return 400;
  if (d >= 12) return 200;
  if (d >= 8) return 100;
  return 0;
}

function yearsFromHours(hoursLow, hoursHigh, minutesPerDay) {
  const hpy = (minutesPerDay / 60) * 365;
  if (hpy <= 0) return { low: 0, high: 0, label: '0' };
  const yLo = hoursLow / hpy;
  const yHi = hoursHigh / hpy;
  const low = Math.max(1, yLo < 1.25 ? 1 : Math.floor(yLo));
  const high = Math.max(low, Math.ceil(yHi));
  const label = low === high ? String(low) : `${low}–${high}`;
  return { low, high, label };
}

export function placementResultFromAnswers(answers, registryPlacement) {
  const cfg = registryPlacement || {};
  const maxDay = cfg.max_start_day ?? 18;
  const germPass = cfg.germ_pass ?? 0.8;
  let startDay = 1;
  const germ = answers.filter((a) => a.stage === 'germ');
  if (germ.length >= 6) {
    const correct = germ.filter((a) => a.correct).length;
    if (correct / germ.length >= germPass) startDay = 8;
  }
  const unitStartDay = { U1U2: 8, U3: 12, U4: 15 };
  const placementUnits = cfg.units || ['U1U2', 'U3', 'U4'];
  for (const u of placementUnits) {
    const unit = answers.filter((a) => a.unit === u);
    if (!unit.length) continue;
    const failed = unit.some((a) => !a.correct && a.kind !== 'freq');
    if (failed) {
      startDay = Math.max(startDay, unitStartDay[u] ?? 1);
      break;
    }
  }
  startDay = Math.min(startDay, maxDay);
  return { startDay, masterySeed: answers.filter((a) => a.kind === 'freq').length };
}

/** Hours + year range to B2 (ROADMAP §9; labelled estimate in copy). */
export function placementTimeGoal(startDay = 8, minutesPerDay = 30, lang = 'en') {
  const copy = placementCopy(lang);
  const done = placementHoursDone(startDay);
  const remainLow = Math.max(0, B2_HOURS_LOW - done);
  const remainHigh = Math.max(remainLow, B2_HOURS_HIGH - done);
  const years = yearsFromHours(remainLow, remainHigh, minutesPerDay);
  const primary = copy.hoursRemaining(remainLow, remainHigh);
  const secondary = copy.yearsAtPace(years.low, years.high, minutesPerDay, years.label);
  const body = copy.bodyAtPace(minutesPerDay, years.low, years.high, remainLow, remainHigh);
  const disclaimer = `${copy.estimateWord} — ${copy.weeklyNote}`;
  return {
    level: copy.levelValue,
    primary,
    secondary,
    body,
    disclaimer,
    estimateWord: copy.estimateWord,
    weeklyNote: copy.weeklyNote,
    minutesPerDay,
    hoursRemaining: { low: remainLow, high: remainHigh, mid: B2_HOURS_MID - done },
    years,
    minutesPresets: PLACEMENT_MINUTE_PRESETS
  };
}

/** Prose ETA for legacy callers. */
export function etaCopy(startDay = 8, minutesPerDay = 30, lang = 'en') {
  const goal = placementTimeGoal(startDay, minutesPerDay, lang);
  const copy = placementCopy(lang);
  const text = `${copy.estimateWord}: ${goal.body} ${copy.weeklyNote}`;
  return { text, isEstimate: true };
}

export function formatPlacementScreen(startDay, minutesPerDay, lang = 'en') {
  const copy = placementCopy(lang);
  const goal = placementTimeGoal(startDay, minutesPerDay, lang);
  const eta = etaCopy(startDay, minutesPerDay, lang);
  return {
    headline: copy.headlineDay(startDay),
    earlier: copy.startEarlier,
    startCta: copy.startNow,
    minutesLabel: copy.minutesLabel,
    eta: eta.text,
    etaDisclaimer: copy.estimateWord,
    timeGoal: goal,
    lang
  };
}
