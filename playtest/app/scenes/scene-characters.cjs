'use strict';

const { resolveAsset } = require('./sprite-manifest.cjs');

const HUMAN_SIZE = { w: 16, h: 24 };
const CAT_SIZE = { w: 14, h: 12 };

const ACTOR_ALIASES = {
  martin: 'madame_martin',
  madame_martin: 'madame_martin',
  lefevre: 'lefevre',
  camille: 'camille',
  noe: 'noe',
  croissant: 'croissant',
  cat: 'croissant'
};

function assetExists(manifest, id) {
  return id && (manifest.assets?.[id] || manifest.aliases?.[id]);
}

function pickFirst(manifest, ids) {
  for (const id of ids) if (assetExists(manifest, id)) return id;
  return null;
}

function actorId(id) {
  return ACTOR_ALIASES[id] || id;
}

function actorIsTalking(name, def, bubbles, time) {
  const ids = [name, def?.character, def?.actor].filter(Boolean).map(actorId);
  return (bubbles || []).some((bubble) =>
    bubble.kind !== 'narrator' && bubble.anchor !== 'narrator' &&
    time >= bubble.t0 && time < bubble.t1 &&
    ids.includes(actorId(bubble.actor || bubble.anchor))
  );
}

function frameAtTime(time, fps, count) {
  return count > 0 ? Math.floor(Math.max(0, time) * fps) % count : 0;
}

function assetTarget(manifest, name) {
  const seen = new Set();
  while (!manifest.assets?.[name] && typeof manifest.aliases?.[name] === 'string' && !seen.has(name)) {
    seen.add(name);
    name = manifest.aliases[name];
  }
  return name;
}

function assetFrameIndex(manifest, name, time, explicitFrame) {
  name = assetTarget(manifest, name);
  const entry = manifest.assets?.[name];
  const fps = /\.idle$/.test(name) ? 2 : (entry?.fps ?? 6);
  return explicitFrame ?? frameAtTime(time, fps, entry?.frames?.length || 1);
}

class HumanC {
  constructor(actorId, manifest) {
    this.actorId = ACTOR_ALIASES[actorId] || actorId;
    this.manifest = manifest;
    this.size = HUMAN_SIZE;
    this.meta = manifest.characters?.[this.actorId] || { kind: 'human' };
    this.prefix = this.actorId === 'madame_martin' ? 'martin' : this.actorId;
  }

  standAsset(face = 'neutral') {
    const faces = this.meta.faces || {};
    const faceKey = face === 'talk' ? 'talk_0' : face;
    if (faces[face]) return faces[face];
    if (faces[faceKey]) return faces[faceKey];
    const stand = this.meta.stand || {};
    if (stand[face]) return stand[face];
    if (face === 'neutral' && this.meta.idle) return this.meta.idle;
    const tries = [
      `${this.prefix}.face.${faceKey}`,
      `${this.prefix}.stand.${faceKey}`,
      `${this.actorId}.stand.${faceKey}`,
      `${this.actorId}.stand.${face}`,
      `${this.actorId}.face.${faceKey}`,
      `${this.actorId}.${faceKey}`,
      this.meta.idle,
      `${this.prefix}.idle`,
      `${this.actorId}.stand.neutral`
    ];
    const hit = pickFirst(this.manifest, tries);
    if (hit) return hit;
    return `${this.actorId}.stand`;
  }

  poseAsset(pose, frameIndex = 0) {
    const tries = [
      `${this.prefix}.${pose}`,
      `${this.prefix}.${pose}.${frameIndex}`,
      `${this.actorId}.${pose}`,
      `${this.actorId}.${pose}.${frameIndex}`,
      `${this.actorId}.pose.${pose}`,
      `${this.actorId}.pose.${pose}.${frameIndex}`,
      `${this.actorId}.back.${pose}.${frameIndex}`,
      `${this.actorId}.back_${pose}.${frameIndex}`,
      `back/${this.actorId}.${pose}.${frameIndex}`
    ];
    if (pose === 'back_walk') {
      tries.unshift(
        `${this.actorId}.back_walk.${frameIndex}`,
        `${this.actorId}.back.back_walk.${frameIndex}`
      );
    }
    return pickFirst(this.manifest, tries);
  }

  resolve(face, options = {}) {
    return resolveAsset(this.manifest, this.standAsset(face), options);
  }
}

class CatC {
  constructor(actorId = 'croissant', manifest) {
    this.actorId = ACTOR_ALIASES[actorId] || actorId;
    this.manifest = manifest;
    this.size = CAT_SIZE;
    this.meta = manifest.characters?.[this.actorId] || { kind: 'cat' };
    this.prefix = this.actorId;
  }

  standAsset(face = 'neutral') {
    const faces = this.meta.faces || {};
    if (faces[face]) return faces[face];
    const tries = [
      `${this.actorId}.face.${face === 'talk' ? 'talk_0' : face}`,
      `${this.actorId}.stand.${face}`,
      this.meta.idle,
      `${this.actorId}.stand.neutral`,
      `${this.actorId}.idle`
    ];
    return pickFirst(this.manifest, tries) || `${this.actorId}.stand`;
  }

  poseAsset(pose, frameIndex = 0) {
    return pickFirst(this.manifest, [
      `${this.actorId}.${pose}`,
      `${this.actorId}.${pose}.${frameIndex}`,
      `${this.actorId}.back_walk.${frameIndex}`
    ]);
  }

  resolve(face, options = {}) {
    return resolveAsset(this.manifest, this.standAsset(face), options);
  }
}

function characterForActor(actorId, manifest) {
  const id = ACTOR_ALIASES[actorId] || actorId;
  const meta = manifest.characters?.[id];
  const kind = meta?.kind || (id === 'croissant' || id === 'cat' ? 'cat' : 'human');
  if (kind === 'cat') return new CatC(id, manifest);
  return new HumanC(id, manifest);
}

function resolveActorAsset(manifest, actorDef, { time = 0, talking = false } = {}) {
  if (!actorDef) return null;
  const who = actorDef.character || actorDef.actor;
  if (!who) return actorDef.asset || null;
  const chr = characterForActor(who, manifest);
  const face = actorDef.face || actorDef.expression || 'neutral';
  const target = assetTarget(manifest, actorDef.asset) || '';
  const front = (!actorDef.pose || /^(stand|idle)$/.test(actorDef.pose)) &&
    (!target || /\.(stand|idle|face)(\.|$)/.test(target));
  const backFacing = /(?:^|[./])back(?:[._/]|$)/.test(`${actorDef.pose || ''}/${target}`);
  if (talking && !backFacing) {
    const talk = `talk_${frameAtTime(time, 4, 2)}`;
    const asset = pickFirst(manifest, [
      chr.meta.faces?.[talk], `${chr.prefix}.face.${talk}`,
      `${chr.prefix}.stand.${talk}`, `${chr.actorId}.stand.${talk}`
    ]);
    if (asset) return asset;
  }
  const walk = actorDef.pose === 'walk' || /\.walk(?:\.\d+)?$/.test(target);
  if (walk) {
    const sequence = pickFirst(manifest, [`${chr.prefix}.walk`, `${chr.actorId}.walk`]);
    if (sequence) return sequence;
    const frames = Object.keys(manifest.assets || {})
      .filter((id) => id.startsWith(`${chr.prefix}.walk.`) && /\.\d+$/.test(id))
      .sort((a, b) => Number(a.split('.').pop()) - Number(b.split('.').pop()));
    if (frames.length) return frames[actorDef.frameIndex ?? frameAtTime(time, 6, frames.length)] || frames[0];
  }
  if (front && face === 'neutral' && (!target || /\.(stand|idle)(\.neutral)?$|\.face\.neutral$/.test(target))) {
    const idle = pickFirst(manifest, [chr.meta.idle, `${chr.prefix}.idle`]);
    if (idle) return idle;
  }
  // An explicit expression can accompany a generic stand asset in scene data.
  if (front && face !== 'neutral') return chr.standAsset(face);
  if (actorDef.asset) return actorDef.asset;
  if (actorDef.pose) {
    const posed = chr.poseAsset(actorDef.pose, actorDef.frameIndex ?? 0);
    if (posed) return posed;
  }
  return chr.standAsset(face);
}

function resolveActorLayers(manifest, actorDef, options = {}) {
  const selected = resolveActorAsset(manifest, actorDef, options);
  if (!selected) return [];
  const target = assetTarget(manifest, selected);
  const layer = manifest.assets?.[target]?.layer;
  // Legacy face assets are complete sprites; only explicitly marked layers compose.
  if (!['face', 'arm_l', 'arm_r', 'overlay'].includes(layer)) return [selected];
  const prefix = target.split('.')[0];
  const authored = resolveActorAsset(manifest, actorDef, { ...options, talking: false });
  const authoredLayer = manifest.assets?.[assetTarget(manifest, authored)]?.layer;
  const arm = layer.startsWith('arm_') ? selected
    : layer === 'face' && ['arm_l', 'arm_r'].includes(authoredLayer) ? authored : null;
  const armLayer = arm === selected ? layer : authoredLayer;
  const body = arm ? `${prefix}.base.noarms`
    : layer === 'face' && prefix === 'croissant' ? `${prefix}.base.noface`
    : pickFirst(manifest, [`${prefix}.stand`, `${prefix}.idle`]);
  const layers = [body];
  if (arm) layers.push(`${prefix}.${armLayer === 'arm_l' ? 'arm_r' : 'arm_l'}.down`, arm);
  if (selected !== arm) layers.push(selected);
  if (layer === 'face' && authoredLayer === 'overlay') layers.push(authored);
  return layers.filter((name) => assetExists(manifest, name));
}

module.exports = {
  HUMAN_SIZE,
  CAT_SIZE,
  actorId,
  actorIsTalking,
  frameAtTime,
  assetFrameIndex,
  HumanC,
  CatC,
  characterForActor,
  resolveActorAsset,
  resolveActorLayers
};
