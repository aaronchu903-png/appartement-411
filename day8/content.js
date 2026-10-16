/* Day 8 content compiler. Load language.js and data/inherited.js first; no network or build step at runtime.
 * Canon: docs/refs/DAY08_FINAL_v2.md, with BRIEF_DAY8.md module adaptations.
 * French typography is normalized only for new scene presentation. Inherited records stay intact.
 */
(function (root) {
  'use strict';
  const A = root.A411;
  if (!A || !A.INHERITED) throw new Error('Load data/inherited.js before content.js');
  const I = A.INHERITED;
  const L = root.Day8Language || (typeof module !== 'undefined' && module.exports ? require('./language.js') : null);
  if (!L) throw new Error('Load language.js before content.js');
  const fr = L.typography;
  const normalize = L.normalize;
  const slug = text => normalize(text).replace(/ /g, '_');
  const audio = { ...I.audio };
  const sceneKinds = ['line', 'focus', 'pick', 'probe', 'chips', 'point', 'reply', 'choice', 'walk', 'voicemail', 'chat', 'cat', 'water', 'establishing', 'diary', 'ritual', 'end'];
  const moduleForKind = kind => kind === 'cat' ? null : kind === 'water' ? 'M2' : kind === 'voicemail' ? 'M3' : ['reply', 'choice', 'chat'].includes(kind) ? 'M4' : 'M1';
  const sceneNames = ['kitchen', 'doorway', 'stairs', 'lefevre', 'roof', 'facade'];
  const newFrench = [];
  function translated(id, text, zh, en, extra) {
    return { id, text: fr(text), zh, en, ...extra };
  }
  function proposed(id, text, zh, en, extra) {
    const value = translated(id, text, zh, en, { neng: true, ...extra });
    newFrench.push(value);
    return value;
  }
  function approved(id, text, zh, en, extra) {
    const value = translated(id, text, zh, en, { approved: true, ...extra });
    newFrench.push(value);
    return value;
  }
  function line(id, scene, extra) {
    const source = I.canonical[id] || I.lines[id] || I.narr[id];
    if (!source) throw new Error('Missing canonical line: ' + id);
    return { id, scene, speaker: I.lines[id]?.speaker || 'neutral', text: fr(source.fr), zh: source.zh, en: source.en,
      kind: 'line', clip: id, audioId: id, source: source.source || 'js/week1.js', ...extra };
  }
  function beat(id, scene, kind, extra) {
    return { id, scene, kind, speaker: 'neutral', text: '', zh: '', en: '', ...extra };
  }
  // Focus text is its source sentence, not a word list. Only reveal shows the headword/gloss.
  function focus(id, scene, wordIds, hotspot, sourceId) {
    const source = line(sourceId, scene);
    return beat(id, scene, 'focus', { text: source.text, sentence: source.text, sourceSentence: source.text, sourceId, source: source.source,
      zh: source.zh, en: source.en, speaker: source.speaker, audioId: sourceId, clip: sourceId,
      wordIds, hotspot, clips: wordIds.map(w => 'w_' + w), comprehensionOnly: true, graded: false,
      encounter: 'comprehension', visualCue: true });
  }
  const lessonInstructions = {
    pick: fr('Écoute, puis choisis.'), chips: fr('Mets les mots dans l’ordre.'), diary: fr('Aujourd’hui…')
  };
  // cue is an audio ID, never visible text. Options are text-only; wordIds names targets, not distractors.
  function pick(id, scene, answer, alternatives, kind = 'pick') {
    return beat(id, scene, kind, { prompt: lessonInstructions.pick, cue: 'w_' + answer, answer,
      options: alternatives.map(id => ({ id, text: fr(I.words[id].fr) })), wordIds: [answer],
      encounter: 'recall', visualCue: false, revealAfterAnswer: true, evidenceOnly: true });
  }
  function chips(id, scene, answer, chunks, wordIds, sourceId) {
    return beat(id, scene, 'chips', { prompt: lessonInstructions.chips, answer: fr(answer),
      // sourceId is provenance only: a reply option/excerpt needs its own exact-answer recording.
      chunks: chunks.map(fr), wordIds, sourceId, audioId: id, encounter: 'recall', visualCue: false,
      revealAfterAnswer: true, evidenceOnly: true });
  }
  const replyGlosses = {
    d8_merci: [['谢谢您，夫人。', 'Thank you, Madame.'], ['您真好，Lefèvre 太太。', 'That is kind of you, Madame Lefèvre.'], ['您要进来吗？', 'Would you like to come in?']],
    d9_soupe: [['好的，谢谢您。', 'Yes, thank you, Madame.'], ['我想要一点面包，劳驾。', 'I would like some bread, please.'], ['一点点就好，劳驾。', 'A little, please.']],
    d10_pourmoi: [['给我的？', 'Is it for me?'], ['谢谢您，夫人。', 'Thank you, Madame.'], ['这是什么？', 'What is it?']]
  };
  function reply(id, scene, extra) {
    const old = I.choices[id];
    const options = old.opts.map((o, i) => ({ id: o.id, text: fr(o.fr), zh: o.zh || replyGlosses[id]?.[i][0], en: o.en || replyGlosses[id]?.[i][1],
      chunks: fr(o.fr).split(/ +/), ...(o.after ? { after: translated(id + '_' + o.id + '_after', o.after.fr, o.after.zh, o.after.en) } : {}) }));
    return beat(id, scene, id === 'd9_jeudi' ? 'choice' : 'reply', { text: fr(old.fr), zh: old.zh, en: old.en,
      speaker: 'player', options, accepted: options.map(o => o.text), defaultOption: options[0].id,
      feedback: [feedback.puzzled, { text: options[0].chunks.slice(0, 2).join(' ') + '…' }, options[0]], ...extra });
  }
  const voicemailLines = [
    approved('d8_vm_1', 'Salut, c’est Noé !', '嗨，我是 Noé！', 'Hi, it is Noé!'),
    approved('d8_vm_2', 'Je suis au travail.', '我在上班。', 'I am at work.'),
    approved('d8_vm_3', 'Ce soir, chez Madame Lefèvre ?', '今晚去 Lefèvre 太太家？', 'Tonight, at Madame Lefèvre’s?'),
    approved('d8_vm_4', 'À six heures, en bas.', '六点，在楼下。', 'At six, downstairs.'),
    approved('d8_vm_5', 'Six heures, d’accord ? À ce soir !', '六点，好吗？晚上见！', 'Six o’clock, all right? See you tonight!')
  ];
  const timeAnswers = ['À six heures.', 'six heures', '6 heures', 'À 6 heures', 'À 18 h'];
  const voicemail = beat('d8_voicemail', 'kitchen', 'voicemail', {
    speaker: 'noe', approved: true, time: '12:30', lines: voicemailLines,
    text: voicemailLines.map(l => l.text).join(' '), zh: voicemailLines.map(l => l.zh).join(''), en: voicemailLines.map(l => l.en).join(' '),
    target: 'six heures', answer: 'six heures', canonical: 'À six heures.', accepted: timeAnswers.slice(), chunks: ['six', 'heures'], ipa: '[si.zœʁ]',
    cloze: fr('À …, en bas.'), clip: 'd8_voicemail', audioId: 'd8_voicemail', listeningOnly: ['travail', 'en bas'], revealAfterAnswer: true
  });
  const feedback = {
    puzzled: translated('d8_reply_puzzled', 'Hein ?', '嗯？', 'Huh?'),
    place: translated('d8_reply_place_hint', 'Dans la cuisine… ou sur la table ?', '放厨房里……还是桌上？', 'In the kitchen… or on the table?'),
    time: translated('d8_reply_time_hint', 'À six…', '六点……', 'At six…'),
    basil: translated('d8_reply_basil_hint', 'Un peu de…', '一点……', 'A little…'),
    yes: translated('d8_reply_yes', 'D’accord !', '好！', 'All right!')
  };
  newFrench.push(...Object.values(feedback));
  function chat(id, speaker, text, zh, en, answers, hint, extra) {
    const prompt = approved(id, text, zh, en);
    const options = answers.map((a, i) => approved(id + '_answer_' + (i + 1), a[0], a[1], a[2], { chunks: fr(a[0]).split(/ +/) }));
    return beat(id, 'kitchen', 'chat', { ...prompt, speaker, group: 'Coloc 411', options, accepted: options.map(o => o.text),
      answer: options[0].text, canonical: options[0].text, chunks: options[0].chunks,
      feedback: [feedback.puzzled, hint, options[0]], success: feedback.yes, ...extra });
  }
  const chats = [
    chat('d8_chat_place', 'camille', 'Le basilic, on le met où ?', '罗勒放哪儿？', 'Where shall we put the basil?', [
      ['Dans la cuisine.', '放厨房里。', 'In the kitchen.'], ['Sur la table.', '放桌上。', 'On the table.']
    ], feedback.place, { canonicalAnswers: { default: 'Dans la cuisine.', 'sur la table': 'Sur la table.' } }),
    chat('d8_chat_time', 'noe', 'On descend à quelle heure ?', '我们几点下楼？', 'What time are we going downstairs?', [
      ['À six heures.', '六点。', 'At six o’clock.']
    ], feedback.time, { accepted: timeAnswers.slice() }),
    chat('d8_chat_basil', 'camille', 'On apporte quelque chose ?', '我们带点什么吗？', 'Shall we bring something?', [
      ['Un peu de basilic.', '一点罗勒。', 'A little basil.']
    ], feedback.basil, { accepted: ['Un peu de basilic.', 'Du basilic.'] }),
    chat('d8_chat_thursday', 'noe', 'Le jeudi, chez elle… tu veux ?', '每周四去她家……你愿意吗？', 'Thursdays at her place… would you like to?', [
      ['Oui, je veux bien.', '好啊，我愿意。', 'Yes, I would like to.'], ['Oui, d’accord.', '好，没问题。', 'Yes, all right.']
    ], feedback.yes, { scene: 'stairs', time: '21:08', optional: true, accepted: ['Oui, je veux bien.', 'Oui, d’accord.', 'Oui.'],
      canonicalAnswers: { default: 'Oui, je veux bien.', 'oui d accord': 'Oui, d’accord.' } })
  ];
  const hotspots = [
    proposed('lfd_fenetre', 'À la fenêtre, une plante. Elle a soif.', '窗边有一盆植物。它渴了。', 'At the window, a plant. It is thirsty.', { hotspot: 'windowPlant', wordIds: ['fenetre', 'plante', 'soif'] }),
    proposed('lfd_chaises', 'À côté de la table, une chaise vide.', '桌子旁边，一把空椅子。', 'Next to the table, an empty chair.', { hotspot: 'emptyChair', wordIds: ['table', 'chaise', 'vide'] })
  ];
  const hook = approved('d8_hook', 'Sur le toit, un jardin qui se réveille. En bas, une lampe qui reste allumée.',
    '楼顶上，一个花园醒了。楼下，一盏灯一直亮着。', 'On the roof, a garden waking up. Downstairs, a lamp that stays on.');
  const carry = approved('d8_noe_carry', 'Et ta plante ? Je la monte aussi !',
    '那你的植物呢？我也把它搬上去！', 'And your plant? I will bring it up too!',
    { speaker: 'noe', listenOnly: true, reviewed: false, audioId: 'd8_noe_carry', clip: 'd8_noe_carry', action: 'carryMartinPlant', carries: 'martinPlant' });
  const bandVariants = Object.fromEntries(['A', 'B', 'C', 'null'].map(b => [b, line('d9_cam_' + b.toLowerCase(), 'stairs')]));
  const scenes = [
    line('n_d8_matin', 'kitchen', { lighting: 'morning', sfx: 'meow', props: ['martinPlant', 'martinCan'], cat: 'watch' }),
    line('d8_cam_depuis', 'kitchen', { grammarIds: ['depuis_present'] }),
    line('d8_noe_matin', 'kitchen', { hotspot: 'plant' }),
    focus('d8_focus_plante', 'kitchen', ['plante'], 'plant', 'd8_noe_matin'),
    line('d8_mg_non', 'kitchen', { id: 'd8_cat', kind: 'cat', durationMs: 16000, interaction: 'touch',
      reactions: ['freeze', 'offended', 'sit', 'lick', 'lookAway', 'sleep'], catchLine: line('d8_mg_attention', 'kitchen'), finishAction: 'camilleLiftsCat', neverBreaks: true }),
    line('n_d8_boum', 'kitchen', { sfx: 'click', action: 'cupFalls', cat: 'blink' }),
    line('d8_noe_plante', 'kitchen', { silenceAfterMs: 1000 }),
    line('n_d8_toc', 'doorway', { sfx: 'knock', door: 'closed' }),
    line('n_d8_porte', 'doorway', { sfx: 'door', door: 'open', silent: true }),
    pick('d8_pick_plante', 'doorway', 'plante', ['plante', 'table', 'chaise']),
    line('d8_gag_bonjour', 'doorway'),
    line('d8_gag_basilic', 'doorway', { wordIds: ['cest_du_basilic'], action: 'catTurnsHead', grammarIds: ['partitif'] }),
    focus('d8_focus_basilic', 'doorway', ['basilic'], 'basil', 'd8_gag_basilic'),
    pick('d8_pot', 'doorway', 'basilic', ['pain', 'basilic', 'beurre']),
    reply('d8_merci', 'doorway'),
    line('d8_gag_venez', 'doorway', { wordIds: ['venez_a_six_heures'], action: 'pointDownAndClock', grammarIds: ['imperatif_vous'] }),
    voicemail,
    ...chats.slice(0, 3),
    beat('d8_dusk', 'facade', 'establishing', { durationMs: 4000, characters: [], lighting: 'dusk',
      transition: 'dayToNight', action: 'windowsLightUp', silent: true }),
    line('n_d8_cinq', 'kitchen', { time: '17:55', timeLabel: '17 h 55', lighting: 'evening', props: ['martinPlant', 'basil'], cat: 'sleepBetweenPots' }),
    line('n_d9_soir', 'stairs', { lighting: 'night', sfx: 'steps' }),
    line('d8_cam_descend', 'stairs', { kind: 'walk', direction: 'down', tiles: 8, hotspot: 'lefevreDoor', steam: true, roofDoorLocked: true, lockedFeedback: 'rattle', lockedText: '' }),
    line('d9_noe_chat', 'stairs'),
    line('d9_cam_basilic', 'stairs', { carries: 'basil', wordIds: ['basilic'] }),
    line('d9_cam_null', 'stairs', { bandFlag: 'd7_band', variants: bandVariants }),
    pick('d8_pick_plante_stairs', 'stairs', 'plante', ['chaise', 'table', 'plante']),
    line('d9_lef_bonsoir', 'lefevre', { location: 'doorway', door: 'open' }),
    line('d9_lef_asseyez', 'lefevre', { location: 'table', chairs: 4, plates: 4, wordIds: ['asseyez_vous'], grammarIds: ['pronominaux'] }),
    line('d9_lef_soupe', 'lefevre', { wordIds: ['vous_voulez_de_la_soupe'], recognitionOnly: true }),
    focus('d8_focus_soupe', 'lefevre', ['soupe'], 'soup', 'd9_lef_soupe'),
    line('n_d9_croissant', 'lefevre', { kind: 'point', hotspot: 'catChair', silenceAfterMs: 1000, sfx: 'meow' }),
    line('d9_lef_place', 'lefevre', { action: 'firstLaugh' }),
    pick('d8_pick_soupe', 'lefevre', 'soupe', ['soupe', 'eau', 'plante']),
    reply('d9_soupe', 'lefevre'),
    line('d9_noe_pain', 'lefevre'),
    focus('d8_focus_pain', 'lefevre', ['pain'], 'bread', 'd9_noe_pain'),
    line('d9_lef_question', 'lefevre', { silenceBeforeMs: 1000 }),
    chips('d8_chips_pain', 'lefevre', 'Je voudrais du pain, s’il vous plaît.', ['vous', 'pain,', 'Je', 'plaît.', 'du', 's’il', 'voudrais'], ['pain'], 'd9_soupe'),
    line('d9_lef_jeudi', 'lefevre', { wordIds: ['vous_voulez_venir_le_jeudi'], hotspot: 'calendar', grammarIds: ['le_jour'] }),
    focus('d8_focus_jeudi', 'lefevre', ['jeudi'], 'calendar', 'd9_lef_jeudi'),
    line('d9_lef_seule', 'lefevre'),
    reply('d9_jeudi', 'lefevre', { flag: 'd9_jeudi', storyChoice: true, graded: false }),
    pick('d8_pick_jeudi', 'lefevre', 'jeudi', ['samedi', 'jeudi', 'nuit']),
    line('n_d9_cle', 'lefevre', { sfx: 'click', hotspot: 'key', silent: true }),
    line('d9_lef_cle', 'lefevre', { action: 'coverKey', wordClip: 'w_cle' }),
    focus('d8_focus_cle', 'lefevre', ['cle'], 'key', 'd9_lef_cle'),
    line('d8_noe_danger', 'lefevre', { wordIds: ['plante'], action: 'moveBasilAndLaugh', silenceAfterMs: 1500, silentLook: ['key', 'basil', 'emptyChair'] }),
    pick('d8_pick_pain', 'lefevre', 'pain', ['beurre', 'pain', 'basilic']),
    pick('d8_pick_cle', 'lefevre', 'cle', ['porte', 'chaise', 'cle']),
    line('n_d10_cle', 'lefevre', { location: 'doorway', action: 'openHand', hotspots, optionalHotspots: true, continueHotspot: 'lefevre', nengLightCheck: true, silent: true }),
    line('d10_lef_jardin', 'lefevre', { location: 'doorway', flags: { has_key: true }, action: 'giveKey', closesHotspots: true, wordIds: ['cle'] }),
    focus('d8_focus_toit', 'lefevre', ['toit'], 'key', 'd10_lef_jardin'),
    focus('d8_focus_jardin', 'lefevre', ['jardin'], 'key', 'd10_lef_jardin'),
    reply('d10_pourmoi', 'lefevre', { location: 'doorway', wordIds: ['cest_pour_moi'], anyAttemptCounts: true }),
    chips('d8_chips_pourmoi', 'lefevre', 'C’est pour moi ?', ['moi ?', 'C’est', 'pour'], ['cest_pour_moi'], 'd10_pourmoi'),
    pick('d8_pick_toit', 'lefevre', 'toit', ['jardin', 'toit', 'salon']),
    pick('d8_pick_jardin', 'lefevre', 'jardin', ['jardin', 'salon', 'toit']),
    line('d10_lef_allez', 'lefevre', { location: 'doorway', action: 'closeDoor', sfx: 'door', lightUnderDoor: true }),
    chats[3],
    line('d10_noe_porte', 'stairs', { kind: 'walk', direction: 'up', tiles: 8, flights: 2, hotspot: 'roofDoor', requiresFlag: 'has_key', cat: 'runAhead' }),
    pick('d8_pick_soupe_stairs', 'stairs', 'soupe', ['eau', 'soupe', 'plante']),
    pick('d8_pick_pain_stairs', 'stairs', 'pain', ['pain', 'beurre', 'basilic']),
    chips('d8_chips_jeudi', 'stairs', 'Vous voulez venir manger le jeudi ?', ['jeudi ?', 'venir', 'Vous', 'le', 'manger', 'voulez'], ['jeudi'], 'd9_lef_jeudi'),
    line('n_d10_monte', 'stairs', { flags: { rooftop: true }, action: 'keyTurns', sfx: 'door', silent: true }),
    pick('d8_focus_roof', 'roof', 'toit', ['salon', 'jardin', 'toit']),
    pick('d8_pick_jardin_roof', 'roof', 'jardin', ['toit', 'jardin', 'salon']),
    chips('d8_chips_jardin', 'roof', 'Il y a un jardin, là-haut.', ['jardin,', 'un', 'Il', 'là-haut.', 'a', 'y'], ['jardin'], 'd10_lef_jardin'),
    line('d10_noe_ici', 'roof', { kind: 'point', hotspot: 'emptyPot', lighting: 'night' }),
    pick('d8_probe_basilic', 'roof', 'basilic', ['beurre', 'basilic', 'pain'], 'probe'),
    pick('d8_probe_soupe', 'roof', 'soupe', ['plante', 'eau', 'soupe'], 'probe'),
    pick('d8_probe_cle', 'roof', 'cle', ['cle', 'chaise', 'porte'], 'probe'),
    pick('d8_probe_toit', 'roof', 'toit', ['jardin', 'toit', 'salon'], 'probe'),
    beat('d8_noe_carry', 'roof', 'line', carry),
    line('n_d10_plante', 'roof', { action: 'plantBasil', flags: { basil_planted: true }, pot: 2, cat: 'dig', silent: true }),
    beat('d8_first_watering', 'roof', 'water', { mode: 'first', lighting: 'night', holdMs: 3000, pot: 2, potId: 2, firstWordId: 'basilic', duePotId: 1,
      firstSentence: fr('C’est du basilic, pour la cuisine.'), can: 'martin', underlay: line('d8_noe_eau', 'roof'), noTextDuringHold: true, flags: { garden_open: true } }),
    line('n_d10_arrose', 'roof', { action: 'leafLifts', silent: true }),
    beat('d8_diary', 'roof', 'diary', { prompt: lessonInstructions.diary, optional: true, graded: false, saveKey: 'day8', wordIds: [] }),
    beat('d8_ritual', 'facade', 'ritual', { durationMs: 4000, action: 'lightsOut', lamp: true, preserveLamp: 'lefevre', silent: true }),
    beat('d8_end', 'facade', 'end', { ...hook, id: 'd8_end', clip: 'd8_hook', action: 'tiltToWindow', lamp: true, hand: 'empty', flags: { day8_done: true }, pots: [1, 2] })
  ];
  chats[3].wordIds = ['jeudi'];

  const words = [];
  const wordById = {};
  const oldIdToWordId = {};
  const lexicon = A.LEXICON_FIELDS.items;
  const fieldGroups = {
    drink: ['eau', 'the', 'cafe', 'lait'], food: ['basilic', 'pain', 'beurre', 'croquettes', 'jambon', 'croissants', 'soupe'],
    garden: ['plante', 'arrosoir', 'jardin', 'feuille'], furniture: ['porte', 'table', 'chaise', 'canape', 'lit', 'fenetre', 'placard'],
    place: ['appartement', 'chambre', 'cuisine', 'salon', 'sdb', 'balcon', 'rue', 'toit', 'superette'],
    person: ['proprietaire', 'voisine', 'niece'], time: ['samedi', 'jeudi', 'nuit', 'calendrier'],
    item: ['cle', 'veste', 'valise', 'sac', 'colis', 'boite', 'lettre', 'telephone', 'tasse', 'bol']
  };
  function addWord(record) {
    if (wordById[record.id]) return wordById[record.id];
    record.potId = record.pot;
    record.week = record.pot;
    record.clip = record.audioId;
    record.recorded = !!I.audio[record.audioId];
    record.legacyIds = [...new Set([record.id, ...(record.legacyIds || [])])];
    record.legacyIds.forEach(id => { if (!oldIdToWordId[id]) oldIdToWordId[id] = record.id; });
    words.push(record);
    wordById[record.id] = record;
    return record;
  }
  for (const [id, w] of Object.entries(I.words)) {
    const lex = lexicon.find(l => l.fr_def && normalize(l.fr_def) === normalize(w.fr));
    const met = I.firstMeet[id];
    const entry = (met && (I.lines[met.id] || I.narr[met.id])) || null;
    const focusScene = scenes.find(s => s.kind === 'focus' && s.wordIds.includes(id));
    const sceneLine = focusScene ? scenes.find(s => s.id === focusScene.sourceId) || focusScene : scenes.find(s => s.wordIds?.includes(id) && s.kind === 'line');
    // Week 1 review must not reveal tonight's dialogue before it happens.
    const sentence = met ? (/^w_/.test(met.id) ? w.say?.tts || met.fr : met.fr) : sceneLine?.text || w.para;
    const clip = met?.id || sceneLine?.audioId || 'w_' + id;
    const gender = lex?.gender || (/^(la |une )/.test(w.fr) || ['eau', 'croquettes', 'chaussettes'].includes(id) ? 'f' : /^(le |un |l’)/.test(w.fr) || ['samedi', 'jeudi', 'animaux', 'croissants'].includes(id) ? 'm' : null);
    const pos = /^(le |la |les |l’|un |une |des )/.test(w.fr) || ['jeudi', 'samedi'].includes(id) ? 'noun' : ['roux', 'vide'].includes(id) ? 'adj' : id === 'cacher' ? 'verb' : 'chunk';
    const form = (w.forms || []).find(f => sentence.toLowerCase().includes(f.toLowerCase())) || w.forms[0];
    const re = new RegExp(form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    addWord({ ...w, id, gender, pos, field: Object.keys(fieldGroups).find(k => fieldGroups[k].includes(id)) || 'home',
      pot: met ? 1 : 2, seen: !!met, metDay: met?.day || 8, sentence, sentenceZh: met ? entry?.zh || w.zh : sceneLine?.zh || w.zh,
      sentenceEn: met ? entry?.en || w.en : sceneLine?.en || w.en, scene: met?.scene || sceneLine?.scene || 'roof', audioId: clip,
      wordClip: 'w_' + id, answer: form, cloze: sentence.replace(re, '…'), chunks: sentence.split(/\s+/),
      recognitionOnly: ['basilic', 'arrosoir', 'roux', 'balcon', 'croquettes'].includes(id), lexicon: lex || null,
      legacyIds: ['w_' + id, 'cw_' + id, ...w.forms.map(f => 'cw_' + slug(f)), 'cw_' + slug(w.fr), ...(lex ? [lex.id] : [])],
      encounters: met ? [{ ...met, text: met.fr, zh: entry?.zh || '', en: entry?.en || '' }] : [], source: 'js/words.js' });
  }
  for (const d of I.deck) {
    const lex = lexicon.find(l => l.deckIds?.includes(d.id));
    const met = I.firstMeet[d.id];
    const sceneLine = scenes.find(s => s.wordIds?.includes(d.id));
    // A deck's sentence and translations are retained as authored, not regenerated from its title.
    addWord({ ...d, id: d.id, pos: 'chunk', gender: null, field: lex?.tags?.find(t => !['phrase', 'verb_chunk', 'noun'].includes(t)) || d.grammar || 'expression',
      pot: met ? 1 : 2, seen: !!met, metDay: met?.day || (sceneLine ? 8 : 9), sentence: d.fr, sentenceZh: d.zh, sentenceEn: d.en,
      scene: sceneLine?.scene || met?.scene || 'kitchen', audioId: d.id, wordClip: d.id,
      answer: d.cloze?.accept?.[0] || d.produce?.accept?.[0] || d.fr, accepted: d.produce?.accept || [d.fr],
      cloze: typeof d.cloze === 'string' ? d.cloze : d.cloze?.fr || '…', chunks: d.fr.split(/\s+/),
      recognitionOnly: !!d.rare || !!d.mcOnly || d.id === 'vous_voulez_de_la_soupe',
      legacyIds: lex ? [lex.id] : [], lexicon: lex || null, source: 'js/deck.js', encounters: met ? [met] : [] });
  }
  // Add word-list records absent from legacy focus/deck data, without retranslation.
  for (const item of I.wordlist.filter(w => w.day <= 8)) {
    const base = item.fr.replace(/ \([mf]\.?\)/g, '').replace(/…/g, '').trim();
    const existing = words.find(w => normalize(w.fr) === normalize(base) || w.forms?.some(f => normalize(f) === normalize(base)));
    if (existing) continue;
    const tag = I.tagmap.find(t => normalize(t.fr) === normalize(item.fr));
    let reference = tag?.reference.match(/`([^`]+)`/)?.[1];
    let first = I.lines[reference] || I.narr[reference];
    if (!first && item.day <= 7 && !/[()/…]/.test(base)) {
      const pattern = new RegExp('(?:^|[^\\p{L}])' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$|[^\\p{L}])', 'iu');
      const found = Object.entries(I.lines).find(([key, value]) => !/^(?:pr|bl|d(?:8|9|1[0-4]))/.test(key) && pattern.test(value.fr));
      if (found) [reference, first] = found;
    }
    const id = 'v_' + slug(base);
    const literal = first?.fr?.toLowerCase().includes(base.toLowerCase());
    const answer = literal ? first.fr.slice(first.fr.toLowerCase().indexOf(base.toLowerCase()), first.fr.toLowerCase().indexOf(base.toLowerCase()) + base.length) : first?.fr || item.fr;
    addWord({ ...item, id, gender: item.gender.startsWith('f') ? 'f' : item.gender.startsWith('m') ? 'm' : null,
      field: item.pos === 'prep' ? 'position' : item.pos === 'noun' ? 'home' : 'expression', pot: item.day <= 7 ? 1 : 2,
      seen: !!first && item.day <= 7, metDay: item.day, sentence: first?.fr || item.fr, sentenceZh: first?.zh || item.zh,
      sentenceEn: first?.en || item.en, scene: 'kitchen', audioId: first ? reference : id, answer,
      cloze: literal ? first.fr.replace(answer, '…') : '…', chunks: (first?.fr || item.fr).split(/\s+/),
      recognitionOnly: !first || item.frequency.startsWith('scene'), legacyIds: ['cw_' + slug(base)],
      source: 'app/docs/refs/WORDLIST_W1-2_DRAFT.md', tagmap: tag || null, encounters: first ? [{ id: reference, day: item.day, fr: first.fr }] : [] });
  }
  // Metadata only: semantic pools, not rewritten French or invented distractors.
  const drawableWords = new Set(['plante', 'basilic', 'bol', 'soupe', 'pain', 'cle', 'toit', 'heure', 'sept_heures', 'porte', 'fenetre', 'table', 'tasse', 'chaise', 'fromage']);
  for (const word of words) {
    if (drawableWords.has(word.id)) word.picture = word.id === 'sept_heures' ? 'heure' : word.id;
    if (['drink', 'food', 'shop'].includes(word.field) || ['tasse', 'bol', 'soif', 'faim'].includes(word.id)) word.field = 'kitchen';
    if (word.id === 'arrosoir') word.field = 'item';
    if (['nuit', 'pluie'].includes(word.id)) word.field = 'atmosphere';
    if (word.pos === 'adj') word.field = 'description';
    if (word.pos === 'adv') word.field = 'orientation';
    if (word.pos === 'verb') word.field = 'home_actions';
    if (word.pos === 'chunk') {
      if (['greeting', 'intro', 'politeness', 'classroom', 'conditionnel'].includes(word.field)) word.field = 'conversation';
      if (['location', 'search', 'pronoms_cod', 'position'].includes(word.field)) word.field = 'position';
      if (['present', 'imparfait', 'passe_compose_etre'].includes(word.field)) word.field = 'time';
      if (['subjonctif', 'futur-proche', 'home'].includes(word.field)) word.field = 'house_rules';
      if (word.field === 'adjective') word.field = 'person';
    }
    word.growthEligible = word.seen || scenes.some(s => s.wordIds?.includes(word.id)) || (word.source === 'app/docs/refs/WORDLIST_W1-2_DRAFT.md' && word.day <= 8);
  }
  // Story IDs map to the canonical chunk when the old line explicitly names a target.
  Object.entries(I.lines).forEach(([id, l]) => { if (wordById[l.target]) oldIdToWordId[id] = l.target; });
  const lineWordIds = {};
  for (const tag of I.tagmap) {
    const base = tag.fr.replace(/ \([mf]\.?\)/g, '').replace(/…/g, '').trim();
    const word = words.find(w => normalize(w.fr) === normalize(base) || w.forms?.some(f => normalize(f) === normalize(base)));
    const ref = tag.reference.match(/`([^`]+)`/)?.[1];
    if (!word || !ref) continue;
    (lineWordIds[ref] ||= []).push(word.id);
    oldIdToWordId[ref] ||= word.id;
  }
  // One legacy key has one owner. Exact deck IDs are never collapsed into noun cards.
  words.forEach(w => { w.legacyIds = w.legacyIds.filter(id => oldIdToWordId[id] === w.id); });
  Object.entries(oldIdToWordId).forEach(([old, id]) => {
    if (!wordById[id].legacyIds.includes(old)) wordById[id].legacyIds.push(old);
  });
  scenes.forEach(s => {
    s.module = moduleForKind(s.kind);
    (s.wordIds || []).forEach(id => {
      const w = wordById[id];
      if (w && !w.encounters.some(e => e.id === s.id)) w.encounters.push({ id: s.id, day: 8, scene: s.scene, text: s.text, zh: s.zh, en: s.en });
    });
    if (s.audioId && !audio[s.audioId]) audio[s.audioId] = '../audio/w1/' + s.audioId + '.mp3';
  });
  for (const v of [...voicemailLines, ...hotspots, hook, ...Object.values(feedback)]) audio[v.id] ||= '../audio/w1/' + v.id + '.mp3';
  for (const w of words) audio[w.wordClip] ||= '../audio/w1/' + w.wordClip + '.mp3';

  function lookup(text) {
    const surface = String(text || '').toLowerCase().replace(/'/g, '’').replace(/^[«\s]+|[».,?!;:\s]+$/g, '');
    const bare = surface.replace(/^(?:l’|d’|j’|qu’|n’|c’)/, '');
    const word = words.find(w => normalize(w.fr) === normalize(surface) || w.forms?.some(f => normalize(f) === normalize(bare)));
    if (word) return { ...word, surface, lemma: word.forms ? word.fr.replace(/^(le |la |les |un |une |des |l’)/, '') : word.fr };
    const conjugated = A.Conj?.lemmaOf(bare, { verbOnly: true });
    const irregular = A.GLOSSARY_DATA.F[bare];
    const candidates = [bare, conjugated?.infinitive, irregular?.[0], bare.replace(/s$/, ''), bare.replace(/x$/, '')].filter(Boolean);
    for (const lemma of candidates) {
      const entry = A.GLOSSARY_DATA.E[lemma];
      if (!entry) continue;
      return { id: 'cw_' + slug(lemma), fr: lemma, lemma, surface, zh: entry[0], en: entry[1], para: entry[2], frequency: entry[3],
        pos: entry[5].includes('v') ? 'verb' : entry[5].includes('n') ? 'noun' : entry[5].includes('a') ? 'adj' : 'other',
        gender: irregular?.[1]?.[0] || null, number: irregular?.[1]?.[1] || null, conjugated,
        recognitionOnly: entry[3] < 5, pot: 2, potId: 2, seen: false, source: 'js/glossary-data.js' };
    }
    return null;
  }
  // Preserve every approved story/save anchor in order; lesson inserts need not freeze a scene count.
  const orderedIds = ('n_d8_matin d8_cam_depuis d8_noe_matin d8_focus_plante d8_cat n_d8_boum d8_noe_plante ' +
    'n_d8_toc n_d8_porte d8_gag_bonjour d8_gag_basilic d8_focus_basilic d8_pot d8_merci d8_gag_venez d8_voicemail ' +
    'd8_chat_place d8_chat_time d8_chat_basil n_d8_cinq n_d9_soir d8_cam_descend d9_noe_chat d9_cam_basilic d9_cam_null ' +
    'd9_lef_bonsoir d9_lef_asseyez d9_lef_soupe n_d9_croissant d9_lef_place d9_soupe d9_noe_pain d9_lef_question ' +
    'd9_lef_jeudi d9_lef_seule d9_jeudi n_d9_cle d9_lef_cle d8_noe_danger n_d10_cle d10_lef_jardin d10_pourmoi ' +
    'd10_lef_allez d8_chat_thursday d10_noe_porte n_d10_monte d8_focus_roof d10_noe_ici d8_noe_carry n_d10_plante d8_first_watering n_d10_arrose d8_end').split(' ');
  const recallKinds = ['pick', 'probe', 'chips'];
  const passiveKinds = ['line', 'establishing', 'ritual', 'end'];
  function auditLesson(list = scenes) {
    const counts = Object.fromEntries(sceneKinds.map(kind => [kind, list.filter(s => s.kind === kind).length]));
    let run = [], longest = [];
    for (const scene of list) {
      run = passiveKinds.includes(scene.kind) ? [...run, scene.id] : [];
      if (run.length > longest.length) longest = run;
    }
    const waterIndex = list.findIndex(s => s.kind === 'water');
    const beforeReview = list.slice(0, waterIndex < 0 ? list.length : waterIndex);
    // Count guaranteed target encounters only, not distractor options or optional hotspot visits.
    const targets = [...new Set(list.filter(s => s.kind === 'focus').flatMap(s => s.wordIds || []))].map(id => {
      const encounters = beforeReview.filter(s => s.wordIds?.includes(id));
      return { id, encounters: encounters.map(s => s.id), locations: [...new Set(encounters.map(s => s.scene))],
        first: encounters[0]?.kind, next: encounters[1]?.kind,
        nextWithoutCue: encounters[1]?.visualCue === false,
        active: encounters.filter(s => recallKinds.includes(s.kind)).map(s => s.id) };
    });
    // These are recording requests, NOT claims that the files exist. The Node QA tool checks disk.
    const requests = new Map();
    function request(id, scene) {
      if (!id) return;
      if (!requests.has(id)) requests.set(id, { id, scenes: [] });
      if (!requests.get(id).scenes.includes(scene)) requests.get(id).scenes.push(scene);
    }
    for (const s of list) {
      if (!s.silent) request(s.audioId || s.clip || (s.text ? s.id : null), s.id);
      if (recallKinds.includes(s.kind)) request(s.cue, s.id);
      if (s.kind === 'chips') request(s.id, s.id);
      (s.clips || []).forEach(id => request(id, s.id));
      for (const child of [...(s.lines || []), ...(s.hotspots || []), ...Object.values(s.variants || {}),
        ...(['reply', 'choice', 'chat'].includes(s.kind) ? s.options || [] : []), s.underlay, s.catchLine].filter(Boolean)) {
        const optionId = s.options?.includes(child) && !child.id.startsWith(s.id) ? s.id + '_' + child.id : child.id;
        request(child.audioId || child.clip || optionId, s.id);
        if (child.after) request(child.after.id, s.id);
      }
    }
    return { scenes: list.length, counts, focusItems: targets.length, maxPassiveBeats: longest.length,
      longestPassiveRun: longest, targets, audioRequests: [...requests.values()] };
  }
  function compile(input) {
    const list = input || scenes;
    const seen = new Set();
    list.forEach(s => {
      if (!s.id || seen.has(s.id)) throw new Error('Duplicate or absent scene id: ' + s.id);
      seen.add(s.id);
      if (!sceneKinds.includes(s.kind) || !sceneNames.includes(s.scene)) throw new Error('Invalid scene type: ' + s.id);
      if (s.module !== moduleForKind(s.kind)) throw new Error('Invalid scene module: ' + s.id);
      for (const key of ['text', 'zh', 'en', 'speaker']) if (typeof s[key] !== 'string') throw new Error('Missing ' + key + ': ' + s.id);
      if (s.text !== fr(s.text)) throw new Error('French typography: ' + s.id);
      for (const child of [...(['pick', 'probe'].includes(s.kind) ? [] : s.options || []), ...(s.hotspots || []), ...(s.lines || [])]) {
        if (child.text !== fr(child.text) || typeof child.zh !== 'string' || typeof child.en !== 'string') throw new Error('Invalid translated child: ' + child.id);
        if (child.after && child.after.text !== fr(child.after.text)) throw new Error('French follow-up typography: ' + child.id);
      }
      for (const id of s.wordIds || []) if (!wordById[id]) throw new Error('Unknown word ' + id + ': ' + s.id);
      for (const id of s.grammarIds || []) if (!A.GRAMMAR_DATA.some(g => g.id === id)) throw new Error('Unknown grammar ' + id + ': ' + s.id);
      if (I.canonical[s.id] && s.text !== fr(I.canonical[s.id].fr)) throw new Error('Canonical text changed: ' + s.id);
      if (['reply', 'choice', 'chat'].includes(s.kind) && !s.options?.length) throw new Error('Missing answers: ' + s.id);
      if (s.kind === 'focus') {
        const source = I.canonical[s.sourceId] || I.lines[s.sourceId] || I.narr[s.sourceId];
        if (!source || !s.wordIds?.length || !s.hotspot || s.text !== fr(source.fr) || s.sentence !== s.text || s.sourceSentence !== s.text || s.audioId !== s.sourceId) throw new Error('Invalid focus source: ' + s.id);
        if (s.comprehensionOnly !== true || s.graded !== false || s.encounter !== 'comprehension' || s.options || s.answer) throw new Error('First focus is comprehension only: ' + s.id);
      }
      if (recallKinds.includes(s.kind)) {
        if (!s.prompt || s.prompt !== fr(s.prompt) || !s.wordIds?.length || s.text || s.hotspot || s.visualCue !== false || s.encounter !== 'recall' || s.revealAfterAnswer !== true || s.evidenceOnly !== true) throw new Error('Recall contract or visual cue: ' + s.id);
        if (['pick', 'probe'].includes(s.kind)) {
          if (!wordById[s.answer] || !s.wordIds.includes(s.answer) || s.cue !== wordById[s.answer].wordClip || s.options?.length < 3 || !s.options) throw new Error('Invalid pick/probe answer or cue: ' + s.id);
          const ids = s.options.map(o => o.id);
          if (new Set(ids).size !== ids.length || !ids.includes(s.answer)) throw new Error('Invalid pick/probe options: ' + s.id);
          for (const option of s.options) {
            if (Object.keys(option).sort().join('|') !== 'id|text' || !wordById[option.id] || option.text !== fr(wordById[option.id].fr)) throw new Error('Text-only pick/probe options required: ' + s.id);
          }
        } else {
          if (s.audioId !== s.id || s.cue) throw new Error('Chips require an exact-answer audio ID: ' + s.id);
          const tokens = typeof s.answer === 'string' ? s.answer.split(/ +/) : [];
          if (!tokens.length || !Array.isArray(s.chunks) || s.chunks.some(c => typeof c !== 'string' || !c || c !== fr(c)) ||
              s.chunks.join(' ') === s.answer || [...s.chunks].sort().join('|') !== tokens.sort().join('|')) throw new Error('Chips must be a scrambled answer: ' + s.id);
          const source = I.canonical[s.sourceId] || I.lines[s.sourceId];
          if (!(source && fr(source.fr).includes(s.answer)) && !I.choices[s.sourceId]?.opts.some(o => fr(o.fr) === s.answer)) throw new Error('Chips answer must preserve source French: ' + s.id);
        }
      }
    });
    if (list.filter(s => orderedIds.includes(s.id)).map(s => s.id).join('|') !== orderedIds.join('|') || list[0].id !== 'n_d8_matin') throw new Error('Day 8 canonical sequence changed');
    if (list.filter(s => s.kind === 'walk').length !== 2) throw new Error('Only two stairwell walking beats are permitted');
    if (list.filter(s => s.id === 'd10_noe_ici').length !== 1) throw new Error('Empty pot beat must appear once');
    const water = list.find(s => s.id === 'd8_first_watering');
    if (water.holdMs !== 3000 || water.underlay.id !== 'd8_noe_eau' || water.can !== 'martin') throw new Error('First watering continuity changed');
    if (list.filter(s => s.kind === 'water').length !== 1 || water.scene !== 'roof' || water.lighting !== 'night' || water.pot !== 2 || water.potId !== 2 || water.firstWordId !== 'basilic' || water.duePotId !== 1) throw new Error('Review must be one night roof session, basil then Martin');
    const carried = list.find(s => s.id === 'd8_noe_carry');
    if (carried.text !== carry.text || !carried.listenOnly || carried.reviewed !== false) throw new Error('Approved listen-only carry changed');
    if (list[list.indexOf(carried) + 1]?.id !== 'n_d10_plante' || list[list.indexOf(carried) + 2] !== water) throw new Error('Carry, planting, watering continuity changed');
    const cat = list.find(s => s.kind === 'cat');
    if (cat.module || cat.durationMs !== 16000 || ['budget', 'mode', 'seenOnly', 'potId'].some(key => key in cat)) throw new Error('Cat is a touch interaction, not review');
    if (list.some(s => s.id === 'd8_noe_eau')) throw new Error('Water recognition line is an underlay, not a separate step');
    if (list.filter(s => s.kind === 'chat').length !== 4) throw new Error('Four approved Coloc 411 exchanges are required');
    if (list[list.length - 1].text !== hook.text) throw new Error('Approved ending changed');
    const keyIndex = list.findIndex(s => s.id === 'd10_lef_jardin');
    if (list[keyIndex].flags?.has_key !== true || list.find(s => s.id === 'd10_noe_porte').requiresFlag !== 'has_key' ||
        list.find(s => s.id === 'd8_cam_descend').roofDoorLocked !== true || list.some((s, i) => i < keyIndex && (s.scene === 'roof' || s.flags?.has_key || s.flags?.rooftop || s.flags?.garden_open))) throw new Error('Key gating changed');
    const dusk = list.filter(s => s.kind === 'establishing');
    if (dusk.length !== 1 || dusk[0].scene !== 'facade' || dusk[0].durationMs !== 4000 || dusk[0].text || dusk[0].characters?.length !== 0 ||
        list.indexOf(dusk[0]) + 1 !== list.findIndex(s => s.id === 'n_d8_cinq')) throw new Error('Empty dusk establishing contract changed');
    const diary = list.find(s => s.kind === 'diary'), ritual = list.find(s => s.kind === 'ritual');
    if (!diary || !ritual || diary.optional !== true || diary.graded !== false || !diary.prompt || ritual.scene !== 'facade' || ritual.preserveLamp !== 'lefevre' || ritual.lamp !== true ||
        list.indexOf(diary) <= list.indexOf(water) || list.indexOf(ritual) <= list.indexOf(diary) || list.indexOf(ritual) >= list.length - 1) throw new Error('Diary/ritual ending changed');
    const audit = auditLesson(list);
    if (audit.focusItems < 8 || audit.counts.pick < 3 || audit.counts.chips < 2 || audit.counts.probe < 3 || audit.counts.probe > 4) throw new Error('Lesson interaction quota changed');
    if (audit.maxPassiveBeats > 4) throw new Error('Passive run exceeds four beats');
    for (const target of audit.targets) {
      if (target.first !== 'focus' || !recallKinds.includes(target.next) || !target.nextWithoutCue) throw new Error('Focus then uncued recall required: ' + target.id);
      if (target.encounters.length < 4 || target.locations.length < 2 || !target.active.length) throw new Error('Insufficient spaced story encounters: ' + target.id);
    }
    const probes = list.filter(s => s.kind === 'probe');
    if (probes.some((s, i) => list.indexOf(s) !== list.indexOf(probes[0]) + i) || list.indexOf(probes[0]) <= keyIndex || list.indexOf(probes.at(-1)) >= list.indexOf(water)) throw new Error('End probe must be a single pre-review block');
    return list;
  }
  const api = { version: 3, day: 8, title: 'Le basilic', legacySceneIds: orderedIds.slice(), scenes: compile(), words, wordById,
    sceneById: Object.fromEntries(scenes.map(s => [s.id, s])), oldIdToWordId, lineWordIds, audio, voicemail, chats, hotspots, newFrench,
    pots: [{ id: 1, name: 'Chez nous', location: 'roof', plant: 'martin' }, { id: 2, name: 'À table', location: 'roof', plant: 'basilic', unlock: 'basil_planted' }],
    requiredChunks: ['cest_du_basilic', 'venez_a_six_heures', 'asseyez_vous', 'vous_voulez_venir_le_jeudi', 'cest_pour_moi'],
    glossary: A.GLOSSARY_DATA, grammar: A.GRAMMAR_DATA, compile, auditLesson, lessonInstructions, lookup, normalize, french: fr,
    resolveBand: (scene, flags) => scene.variants?.[flags?.d7_band || 'null'] || scene,
    accepts: (scene, answer) => L.gradeAnswer(answer, scene.accepted || [], scene.canonical || scene.answer).correct,
    clipPath: id => audio[id] || '../audio/w1/' + id + '.mp3' };
  root.Day8Content = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
