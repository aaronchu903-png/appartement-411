/* L’Appartement 411 — Day 1 authored content.
 * French text follows CURRICULUM_WEEK_01.md (Day 1). Reviewed in the Experience pass
 * (AI review, not native-expert certification) — see docs/CONTENT_REVIEW.md.
 * NBSP (\u00A0) before ! and ? follows French typography and prevents orphaned marks. */
(function (root) {
  'use strict';
  var NB = '\u00A0';
  // 08b (2026-10-08): project renamed to L’Appartement 411 — only the apartment number in the Chinese
  // narration (404 -> 411) changed. French lines, targets, probe items and help are identical to 08a,
  // so learning evidence recorded under 08a stays comparable.
  // 08c (2026-10-08, app v0.1.3): audio presentation changed — Day 1 lines now play fixed Qwen3-TTS recordings
  // (device voice / reading only as fallback). French text, targets, probe items and help are unchanged; each
  // attempt records audioSource so recording vs device-voice evidence can be separated.
  var CONTENT_VERSION = 'd1-2026-10-08c';

  // label: understand | atmosphere | baseline
  var LINES = {
    cam_bonjour: { speaker: 'camille', fr: 'Bonjour' + NB + '!', zh: '你好！（通用、礼貌的招呼）', target: 'bonjour', label: 'understand' },
    cam_intro: { speaker: 'camille', fr: 'Salut' + NB + '! Je m\u2019appelle Camille.', zh: '嗨！我叫 Camille。（她指着自己）', target: 'je_mappelle', also: ['salut'], label: 'understand' },
    noe_intro: { speaker: 'noe', fr: 'Salut' + NB + '! Je m\u2019appelle Noé.', zh: '嗨！我叫 Noé。', target: 'je_mappelle', also: ['salut'], label: 'understand' },
    noe_moi: { speaker: 'noe', fr: 'Moi, c\u2019est Noé.', zh: '我嘛，我是 Noé。（另一种自我介绍，氛围句，不考）', target: null, label: 'atmosphere' },
    cam_ask: { speaker: 'camille', fr: 'Tu t\u2019appelles comment' + NB + '?', zh: '你叫什么名字？', target: 'tu_tappelles_comment', label: 'understand' },
    cam_plante: { speaker: 'camille', fr: 'C\u2019est ta plante.', zh: '这是你的植物。（氛围句，不考）', target: null, label: 'atmosphere' },
    cam_soif: { speaker: 'camille', fr: 'Ta plante a soif.', zh: '你的植物渴了。（氛围句，不考）', target: null, label: 'atmosphere' },
    cam_bye: { speaker: 'camille', fr: 'Salut' + NB + '!', zh: '拜拜！（Salut 也可以用来告别）', target: 'salut', label: 'understand' },
    noe_croissant: { speaker: 'noe', fr: 'C\u2019est Croissant.', zh: '这是 Croissant。（猫的名字，“可颂”）（氛围句，不考）', target: null, label: 'atmosphere' },
    noe_secret: { speaker: 'noe', fr: 'Un secret' + NB + '?', zh: '保密，好吗？（字面：一个秘密？）（氛围句，不考）', target: null, label: 'atmosphere' },
    // Probe stimuli (familiar language; one variant per item; speakers varied)
    pr_cam_ask: { speaker: 'camille', fr: 'Tu t\u2019appelles comment' + NB + '?', zh: '你叫什么名字？', target: 'tu_tappelles_comment', label: 'probe', func: 'asks' },
    pr_noe_ask: { speaker: 'noe', fr: 'Tu t\u2019appelles comment' + NB + '?', zh: '你叫什么名字？', target: 'tu_tappelles_comment', label: 'probe', func: 'asks' },
    pr_noe_intro: { speaker: 'noe', fr: 'Salut' + NB + '! Je m\u2019appelle Noé.', zh: '嗨！我叫 Noé。', target: 'je_mappelle', label: 'probe', func: 'tells' },
    pr_cam_intro: { speaker: 'camille', fr: 'Je m\u2019appelle Camille.', zh: '我叫 Camille。', target: 'je_mappelle', label: 'probe', func: 'tells' },
    // Baseline items (neutral voice, a name not used in the story)
    bl_bonjour: { speaker: 'neutral', fr: 'Bonjour' + NB + '!', zh: '你好！', target: 'bonjour', label: 'baseline' },
    bl_lea: { speaker: 'neutral', fr: 'Je m\u2019appelle Léa.', zh: '我叫 Léa。', target: 'je_mappelle', label: 'baseline' },
    bl_ask: { speaker: 'neutral', fr: 'Tu t\u2019appelles comment' + NB + '?', zh: '你叫什么名字？', target: 'tu_tappelles_comment', label: 'baseline' }
  };

  var SPEAKERS = {
    camille: { name: 'Camille', color: '#2f7d5b', pitch: 1.12 },
    noe: { name: 'Noé', color: '#c0602a', pitch: 0.88 },
    neutral: { name: '🔊', color: '#555', pitch: 1.0 }
  };

  var BASELINE = [
    { line: 'bl_bonjour', answer: 'greet', options: [
      { id: 'greet', zh: '打招呼' }, { id: 'thanks', zh: '道谢' }, { id: 'askname', zh: '问我的名字' } ] },
    { line: 'bl_lea', answer: 'tells', options: [
      { id: 'tells', zh: '她在说自己的名字' }, { id: 'asks', zh: '她在问我的名字' }, { id: 'bye', zh: '她在说再见' } ] },
    { line: 'bl_ask', answer: 'asks', options: [
      { id: 'asks', zh: '在问我的名字' }, { id: 'tells', zh: '在说自己的名字' }, { id: 'thanks', zh: '在道谢' } ] }
  ];

  var PROBE = {
    task: 'd1.probe.tell_vs_ask',
    items: ['pr_cam_ask', 'pr_noe_ask', 'pr_noe_intro', 'pr_cam_intro'],
    options: [
      { id: 'tells', zh: '对方在告诉我他/她的名字' },
      { id: 'asks', zh: '对方在问我的名字' }
    ]
  };

  // Chronicle templates: rendered only from events that actually happened.
  var CHRONICLE = {
    arrived: function () { return '你来到了 411 号公寓门口，敲了门。'; },
    greeted: function (p) { return p && p.choice === 'wave' ? '你向开门的人挥了挥手。' : '你回应了招呼：«' + (p && p.fr || '') + '»'; },
    met_camille: function () { return 'Camille 开了门：« Salut' + NB + '! Je m\u2019appelle Camille. »'; },
    met_noe: function () { return 'Noé 出现了：« Salut' + NB + '! Je m\u2019appelle Noé. »'; },
    introduced: function (p) {
      if (!p || p.kind === 'skipped') return 'Camille 问了你的名字，你选择暂时不说。';
      return 'Camille 问了你的名字，你回答：«' + p.original + '»';
    },
    plant_shown: function () { return 'Camille 给你看了你的植物：« C\u2019est ta plante. »'; },
    plant_watered: function () { return '你给植物浇了水。'; },
    plant_later: function () { return '你决定稍后再给植物浇水。'; },
    camille_left: function () { return 'Camille 说了« Salut' + NB + '! »，出门了。'; },
    met_croissant: function () { return 'Camille 走后，Noé 介绍了一只橘猫：« C\u2019est Croissant. »'; },
    secret_kept: function () { return 'Noé 请你为猫保密。你答应了。'; },
    secret_declined: function () { return 'Noé 请你为猫保密。你没有答应。'; },
    probe_done: function () { return '你完成了一个小小的听力/理解练习。'; },
    day1_complete: function () { return '第一天结束了。'; }
  };

  var DAYS = [
    { n: 1, title: 'Bienvenue chez nous', zh: '欢迎来我们家', available: true },
    { n: 2, title: 'Le petit-déjeuner', zh: '早餐', available: false },
    { n: 3, title: 'Le colis mystérieux', zh: '神秘包裹', available: false },
    { n: 4, title: 'La voisine en colère', zh: '生气的邻居', available: false },
    { n: 5, title: 'Les clés perdues', zh: '丢失的钥匙', available: false },
    { n: 6, title: 'Où est Croissant\u00A0?', zh: 'Croissant 在哪里？', available: false },
    { n: 7, title: 'L\u2019inspection', zh: '房东来检查', available: false }
  ];

  // Scene scripts. Each step is resumable by (scene, step).
  var SCENES = {
    baseline: [{ type: 'baselineIntro' }, { type: 'baseline' }],
    doorway: [
      { type: 'knock', art: { door: 'closed' } },
      { type: 'line', line: 'cam_bonjour', art: { door: 'open', camille: 'idle' } },
      { type: 'greet', art: { door: 'open', camille: 'idle' } },
      { type: 'line', line: 'cam_intro', event: 'met_camille', art: { door: 'open', camille: 'point' } },
      { type: 'line', line: 'noe_intro', event: 'met_noe', art: { door: 'open', camille: 'idle', noe: 'point' } },
      { type: 'line', line: 'noe_moi', art: { door: 'open', camille: 'idle', noe: 'wave' } }
    ],
    name: [
      { type: 'line', line: 'cam_ask', art: { camille: 'ask', noe: 'idle' } },
      { type: 'nameInput', art: { camille: 'ask', noe: 'idle' } },
      { type: 'nameReaction', art: { camille: 'happy', noe: 'wave' } }
    ],
    plant: [
      { type: 'line', line: 'cam_plante', event: 'plant_shown', art: { camille: 'pointPlant' } },
      { type: 'line', line: 'cam_soif', art: { camille: 'can' } },
      { type: 'water', art: { camille: 'idle' } }
    ],
    cat: [
      { type: 'line', line: 'cam_bye', event: 'camille_left', art: { camille: 'wave', noe: 'idle', door: 'open' } },
      { type: 'beat', art: { noe: 'idle', cat: 'peek', door: 'closed' } },
      { type: 'line', line: 'noe_croissant', event: 'met_croissant', art: { noe: 'point', cat: 'sit', door: 'closed' } },
      { type: 'line', line: 'noe_secret', art: { noe: 'shh', cat: 'sit', door: 'closed' } },
      { type: 'secret', art: { noe: 'shh', cat: 'sit', door: 'closed' } },
      { type: 'secretReaction', art: { noe: 'auto', cat: 'sit', door: 'closed' } }
    ],
    probe: [{ type: 'probeIntro' }, { type: 'probe' }, { type: 'probeDone' }],
    diary: [{ type: 'diary' }],
    end: [{ type: 'end' }]
  };
  var ORDER = ['baseline', 'doorway', 'name', 'plant', 'cat', 'probe', 'diary', 'end'];
  var SCENE_ZH = { baseline: '开始前小测', doorway: '门口', name: '自我介绍', plant: '植物角', cat: '猫', probe: '小练习', diary: '日记', end: '第一天完成' };

  var TARGETS = {
    salut: { fr: 'Salut\u00A0!', zh: '嗨/拜拜' },
    bonjour: { fr: 'Bonjour\u00A0!', zh: '你好' },
    je_mappelle: { fr: 'Je m\u2019appelle…', zh: '我叫……' },
    tu_tappelles_comment: { fr: 'Tu t\u2019appelles comment\u00A0?', zh: '你叫什么名字？' },
    try_je_mappelle: { fr: 'Je m\u2019appelle [昵称].', zh: '（尝试）说出自己的名字' },
    greeting_reply: { fr: 'Bonjour\u00A0! / Salut\u00A0!', zh: '（尝试）回应招呼' }
  };

  var api = { CONTENT_VERSION: CONTENT_VERSION, LINES: LINES, SPEAKERS: SPEAKERS, BASELINE: BASELINE, PROBE: PROBE,
    CHRONICLE: CHRONICLE, DAYS: DAYS, SCENES: SCENES, ORDER: ORDER, SCENE_ZH: SCENE_ZH, TARGETS: TARGETS };
  root.A411 = root.A411 || {};
  root.A411.Content = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
