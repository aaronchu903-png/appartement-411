'use strict';

const { applyStep, createWorld } = require('./commands.cjs');

function flattenEpisode(episode) {
  const items = [];
  for (const scene of episode.scenes) {
    for (const beat of scene.beats) {
      for (let i = 0; i < (beat.steps || []).length; i++) {
        items.push({
          sceneId: scene.id,
          set: scene.set,
          beatId: beat.id,
          stepIndex: i,
          step: beat.steps[i]
        });
      }
    }
  }
  return items;
}

class EpisodeRuntime {
  constructor(episode, options = {}) {
    this.episode = episode;
    this.items = flattenEpisode(episode);
    this.index = options.startIndex ?? 0;
    this.world = createWorld(episode);
    this.done = false;
    this._ctx = { flagsMatch: () => true };
  }
  snapshot() {
    const item = this.items[this.index];
    return {
      index: this.index,
      beatId: item?.beatId,
      pendingLine: this.world.pendingLine,
      done: this.done
    };
  }
  advance() {
    if (this.done) return this.snapshot();
    while (this.index < this.items.length) {
      const item = this.items[this.index];
      applyStep(this.world, item.step, this._ctx);
      this.index += 1;
      if (this.world.pendingLine) return this.snapshot();
      if (item.step.wait !== false) return this.snapshot();
    }
    this.done = true;
    return this.snapshot();
  }
  clearPending() {
    this.world.pendingLine = null;
    return this.advance();
  }
}

module.exports = { flattenEpisode, EpisodeRuntime };
