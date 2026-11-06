#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const scenePath = path.resolve(__dirname, '../../scenes/day10-kitchen/scene.json');
const outPath = path.resolve(__dirname, '../../../episodes/day10.json');
const excerptPath = path.resolve(__dirname, '../../../tech/sitcom_engine/example_day10_excerpt.json');

const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
const excerpt = JSON.parse(fs.readFileSync(excerptPath, 'utf8'));

const shotIds = scene.shots.map((s) => s.id);
const bubbleByShot = new Map();
for (const b of scene.bubbles) {
  const audioCue = (scene.audio || []).find((a) => Math.abs(a.t - b.t0) < 2);
  const shot = scene.shots.find((s) => audioCue && s.id === audioCue.id)
    || scene.shots.find((s) => b.t0 >= s.t0 && b.t0 < s.t1);
  if (shot) bubbleByShot.set(shot.id, b);
}

function stepsForShot(shotId, bubble) {
  const steps = [];
  const sh = scene.shots.find((s) => s.id === shotId);
  if (!sh) return steps;
  if (sh.crop) steps.push({ do: 'cut_to', shot: typeof sh.crop === 'string' ? sh.crop : 'wide' });
  if (!bubble) return steps;
  const isScreen = bubble.kind === 'screen';
  const audio = (scene.audio || []).find((a) => a.id === shotId);
  if (isScreen) {
    steps.push({
      do: 'phone_bubble',
      who: 'martin',
      icon: 'laptop',
      fr: bubble.text,
      zh: bubble.gloss,
      audio: audio?.id || shotId
    });
  } else {
    let fr = bubble.text;
    let zh = bubble.gloss;
    if (fr.length > 90) {
      const cut = fr.lastIndexOf('. ', 88);
      const splitAt = cut > 40 ? cut + 1 : 88;
      steps.push({
        do: 'say',
        who: bubble.anchor === 'narrator' ? 'narrator' : (bubble.actor || bubble.kind || 'narrator'),
        fr: fr.slice(0, splitAt).trim(),
        zh: zh,
        audio: audio?.id || shotId
      });
      fr = fr.slice(splitAt).trim();
      zh = zh;
    }
    steps.push({
      do: 'say',
      who: bubble.anchor === 'narrator' ? 'narrator' : (bubble.actor || bubble.kind || 'narrator'),
      fr,
      zh,
      audio: audio?.id || shotId
    });
  }
  return steps;
}

const beats = [];
for (const shotId of shotIds) {
  if (shotId === 'done' || shotId === 'stash_back') continue;
  const bubble = bubbleByShot.get(shotId) || scene.bubbles.find((b) => {
    const a = (scene.audio || []).find((x) => x.id === shotId);
    return a && Math.abs(a.t - b.t0) < 1;
  });
  const steps = stepsForShot(shotId, bubble);
  if (!steps.length) continue;
  beats.push({ id: shotId, steps });
}

const episode = {
  ...excerpt,
  id: 'd10_le_message',
  day: 10,
  title: 'Le message',
  version: 5,
  sets: ['kitchen', 'kitchen_table4', 'rooftop', 'stairwell'],
  scenes: [
    {
      id: 'day10',
      plot: 'A',
      set: 'kitchen_table4',
      light: 'day',
      title: 'Le message',
      beats
    }
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(episode, null, 1) + '\n');
console.log('wrote', outPath, 'beats', beats.length);
