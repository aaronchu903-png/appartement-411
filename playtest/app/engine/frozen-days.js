// fix23c: signed-off days render byte-identical to their frozen baseline; later-fix features are gated off on them.
export const FROZEN_DAYS = Object.freeze([6]);
export const isFrozenDay = (day) => FROZEN_DAYS.includes(Number(day));
