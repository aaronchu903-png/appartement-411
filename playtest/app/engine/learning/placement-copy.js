/**
 * Placement result copy — EN/ZH (and FR fallback) for the time-goal card.
 * Numbers and year ranges are computed in placement.js.
 */
const EN = Object.freeze({
  headlineDay: (startDay) => `You start here: Day ${startDay}`,
  levelHeading: 'Target level',
  levelValue: 'B2',
  minutesLabel: 'Minutes per day',
  hoursRemaining: (low, high) => `About ${low}–${high} hours of practice to reach B2`,
  yearsAtPace: (lowY, highY, minutesPerDay, label) => {
    const span = label || (lowY === highY ? String(lowY) : `${lowY}–${highY}`);
    const yearWord = lowY === highY && highY === 1 ? 'year' : 'years';
    const about = lowY === highY && highY === 1 ? 'about 1 year' : span;
    const tail = lowY === highY && highY === 1 ? about : `${span} ${yearWord}`;
    return `At about ${minutesPerDay} min a day, that’s roughly ${tail} for most learners`;
  },
  estimateWord: 'estimate',
  weeklyNote:
    'Updated weekly from how you actually play and review.',
  bodyAtPace: (minutesPerDay, lowY, highY, lowH, highH) => {
    const h = `about ${lowH}–${highH} hours of practice`;
    if (minutesPerDay >= 120) {
      return `At about 2 hours a day, B2 is about ${lowY === highY ? lowY : `${lowY}–${highY}`} year${lowY > 1 ? 's' : ''} away for most learners (${h}).`;
    }
    if (minutesPerDay === 30) {
      return `At about 30 min a day, B2 is roughly 3–4 years away for most learners (${h}). At 2 hours a day it’s about a year.`;
    }
    return `At about ${minutesPerDay} min a day, B2 is roughly ${lowY}–${highY} years away for most learners (${h}).`;
  },
  startEarlier: 'Start earlier',
  startNow: 'Start'
});

const ZH = Object.freeze({
  headlineDay: (startDay) => `从这里开始：第 ${startDay} 天`,
  levelHeading: '目标等级',
  levelValue: 'B2',
  minutesLabel: '每天学习（分钟）',
  hoursRemaining: (low, high) => `达到 B2 大约还需 ${low}–${high} 小时练习`,
  yearsAtPace: (lowY, highY, minutesPerDay, label) => {
    const span = label || (lowY === highY ? String(lowY) : `${lowY}–${highY}`);
    const tail = lowY === highY && highY === 1 ? '约 1 年' : `${span} 年`;
    return `每天约 ${minutesPerDay} 分钟，大多数学习者大约还需 ${tail}`;
  },
  estimateWord: '预估',
  weeklyNote: '会根据你实际的游玩与复习情况，每周更新。',
  bodyAtPace: (minutesPerDay, lowY, highY, lowH, highH) => {
    const h = `约 ${lowH}–${highH} 小时练习`;
    if (minutesPerDay >= 120) {
      return `每天约 2 小时，大多数学习者距离 B2 大约 ${lowY === highY ? lowY : `${lowY}–${highY}`} 年（${h}）。`;
    }
    if (minutesPerDay === 30) {
      return `每天约 30 分钟，大多数学习者距离 B2 大约 3–4 年（${h}）。每天 2 小时则大约一年。`;
    }
    return `每天约 ${minutesPerDay} 分钟，大多数学习者距离 B2 大约 ${lowY}–${highY} 年（${h}）。`;
  },
  startEarlier: '更早开始',
  startNow: '开始'
});

const FR = Object.freeze({
  headlineDay: (startDay) => `Tu commences ici : Jour ${startDay}`,
  levelHeading: 'Niveau visé',
  levelValue: 'B2',
  minutesLabel: 'Minutes par jour',
  hoursRemaining: (low, high) => `Environ ${low}–${high} h de pratique pour viser le B2`,
  yearsAtPace: (lowY, highY, minutesPerDay, label) =>
    `À ${minutesPerDay} min/jour, environ ${label || `${lowY}–${highY}`} ans pour la plupart des apprenants`,
  estimateWord: 'estimation',
  weeklyNote: 'Mise à jour chaque semaine selon ta façon de jouer et de réviser.',
  bodyAtPace: (minutesPerDay, lowY, highY, lowH, highH) => {
    const h = `environ ${lowH}–${highH} h de pratique`;
    if (minutesPerDay >= 120) {
      return `À environ 2 h par jour, le B2 est à environ ${lowY === highY ? lowY : `${lowY}–${highY}`} an${lowY > 1 ? 's' : ''} pour la plupart (${h}).`;
    }
    if (minutesPerDay === 30) {
      return `À environ 30 min par jour, le B2 est à environ 3–4 ans pour la plupart (${h}). À 2 h par jour, environ un an.`;
    }
    return `À environ ${minutesPerDay} min par jour, le B2 est à environ ${lowY}–${highY} ans pour la plupart (${h}).`;
  },
  startEarlier: 'Commencer plus tôt',
  startNow: 'Commencer'
});

export const PLACEMENT_COPY = Object.freeze({ en: EN, zh: ZH, fr: FR });

export function placementCopy(lang = 'en') {
  const key = String(lang || 'en').toLowerCase().slice(0, 2);
  return PLACEMENT_COPY[key] || PLACEMENT_COPY.en;
}
