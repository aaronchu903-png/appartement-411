import { applyStep, createWorld, isCommand } from './commands.js';

export function flattenEpisode(episode) {
  const items = [];
  for (const scene of episode.scenes) {
    for (const beat of scene.beats) {
      const steps = beat.steps || [];
      for (let i = 0; i < steps.length; i++) {
        items.push({
          sceneId: scene.id,
          set: scene.set,
          light: scene.light || 'day',
          plot: scene.plot || 'A',
          beatId: beat.id,
          beatRef: beat.ref,
          stepIndex: i,
          step: steps[i],
          stagingSwap: beat._stagingSwap || null
        });
      }
    }
  }
  return items;
}

export class EpisodeRuntime {
  constructor(episode, options = {}) {
    this.episode = episode;
    this.items = flattenEpisode(episode);
    this.index = Math.min(options.startIndex ?? 0, this.items.length);
    this.world = createWorld(episode);
    this.flags = { ...(options.flags || {}) };
    this.cagnotte_eur = options.cagnotte_eur ?? 0;
    this.done = false;
    this._ctx = {
      flagsMatch: (cond) => {
        if (!cond?.flag) return true;
        const val = this.flags[cond.flag];
        if (cond.equals === undefined) return val != null;
        return val === cond.equals;
      },
      applyCost: (cost) => this._applyCost(cost)
    };
  }

  _applyCost(cost) {
    const amount = cost?.amount_eur ?? 0;
    if (amount <= 0) return;
    if (this.cagnotte_eur >= amount) {
      this.cagnotte_eur -= amount;
      return;
    }
    const mode = cost.on_short || 'housemates_chip_in';
    if (mode === 'jar_to_zero') this.cagnotte_eur = 0;
    if (cost.short_flag) this.flags[cost.short_flag] = true;
  }

  snapshot() {
    const item = this.items[this.index];
    return {
      index: this.index,
      total: this.items.length,
      beatId: item?.beatId ?? null,
      sceneId: item?.sceneId ?? null,
      world: structuredClone(this.world),
      flags: { ...this.flags },
      cagnotte_eur: this.cagnotte_eur,
      done: this.done,
      pendingLine: this.world.pendingLine,
      pendingModule: this.world.pendingModule
    };
  }

  restore(saved) {
    if (!saved || saved.index == null) return;
    this.index = Math.min(saved.index, this.items.length);
    this.flags = { ...(saved.flags || {}) };
    this.cagnotte_eur = saved.cagnotte_eur ?? 0;
    this.world = saved.world ? structuredClone(saved.world) : createWorld(this.episode);
    this.done = !!saved.done;
  }

  /** Run steps until wait boundary or line/module pending. */
  advance() {
    if (this.done) return this.snapshot();
    while (this.index < this.items.length) {
      const item = this.items[this.index];
      this.world.set = item.set;
      this.world.light = item.light;
      if (item.stagingSwap && item.stepIndex === 0) {
        const sw = item.stagingSwap;
        this.world.props[sw.mark] = { id: sw.to, at: sw.mark, visible: true, swappedFrom: sw.from };
      }
      const step = item.step;
      if (!isCommand(step)) {
        this.index += 1;
        continue;
      }
      applyStep(this.world, step, this._ctx);
      this.index += 1;
      const wait = step.wait !== false;
      if (this.world.pendingLine || this.world.pendingModule) return this.snapshot();
      if (wait) return this.snapshot();
    }
    this.done = true;
    this.world.pendingLine = null;
    this.world.pendingModule = null;
    return this.snapshot();
  }

  /** After player dismisses line or skips module. */
  clearPending() {
    this.world.pendingLine = null;
    this.world.pendingModule = null;
    return this.advance();
  }

  rewindToIndex(index) {
    this.index = Math.max(0, Math.min(index, this.items.length));
    this.done = false;
    this.world = createWorld(this.episode);
    this.flags = {};
    this.cagnotte_eur = 0;
    let i = 0;
    while (i < this.index) {
      const saved = this.index;
      this.index = i;
      const item = this.items[i];
      applyStep(this.world, item.step, this._ctx);
      this.world.pendingLine = null;
      this.world.pendingModule = null;
      i += 1;
      this.index = saved;
    }
    this.index = index;
  }
}
