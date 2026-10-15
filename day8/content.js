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
  const sceneKinds = ['line', 'focus', 'point', 'reply', 'choice', 'walk', 'voicemail', 'chat', 'cat', 'water', 'end'];
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
  function focus(id, scene, wordIds, hotspot) {
    const records = wordIds.map(w => I.words[w]);
    return beat(id, scene, 'focus', { text: records.map(w => w.fr).join(' · '), zh: records.map(w => w.zh).join(' · '), en: records.map(w => w.en).join(' · '), wordIds, hotspot, clips: wordIds.map(w => 'w_' + w) });
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
      speaker: 'player', options, accepted: options.map(o => o.text), defaultOption: options[0].id, ...extra });
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
  const bandVariants = Object.fromEntries(['A', 'B', 'C', 'null'].map(b => [b, line('d9_cam_' + b.toLowerCase(), 'stairs')]));
  const scenes = [
    beat('d8_morning_review', 'kitchen', 'water', { mode: 'morning', pot: 1, potId: 1, budget: 8, can: 'martin', lighting: 'morning', settleGrowth: true }),
    line('n_d8_matin', 'kitchen', { lighting: 'morning', sfx: 'meow', props: ['martinPlant', 'martinCan'], cat: 'watch' }),
    line('d8_cam_depuis', 'kitchen', { grammarIds: ['depuis_present'] }),
    line('d8_noe_matin', 'kitchen', { hotspot: 'plant' }),
    focus('d8_focus_plante', 'kitchen', ['plante'], 'plant'),
    line('d8_mg_non', 'kitchen', { id: 'd8_cat', kind: 'cat', budget: 6, pot: 1, potId: 1, mode: 'cat', seenOnly: true,
      reactions: ['freeze', 'offended', 'sit', 'lick', 'lookAway', 'sleep'], catchLine: line('d8_mg_attention', 'kitchen'), finishAction: 'camilleLiftsCat', neverBreaks: true }),
    line('n_d8_boum', 'kitchen', { sfx: 'click', action: 'cupFalls', cat: 'blink' }),
    line('d8_noe_plante', 'kitchen', { silenceAfterMs: 1000 }),
    line('n_d8_toc', 'doorway', { sfx: 'knock', door: 'closed' }),
    line('n_d8_porte', 'doorway', { sfx: 'door', door: 'open' }),
    line('d8_gag_bonjour', 'doorway'),
    line('d8_gag_basilic', 'doorway', { wordIds: ['basilic', 'cest_du_basilic'], action: 'catTurnsHead', grammarIds: ['partitif'] }),
    focus('d8_focus_basilic', 'doorway', ['basilic'], 'basil'),
    beat('d8_pot', 'doorway', 'point', { hotspot: 'basil', wordIds: ['basilic'], promptClip: 'd8_gag_basilic', noMenu: true }),
    reply('d8_merci', 'doorway'),
    line('d8_gag_venez', 'doorway', { wordIds: ['venez_a_six_heures'], action: 'pointDownAndClock', grammarIds: ['imperatif_vous'] }),
    voicemail,
    ...chats.slice(0, 3),
    line('n_d8_cinq', 'kitchen', { time: '17:55', timeLabel: '17 h 55', lighting: 'evening', props: ['martinPlant', 'basil'], cat: 'sleepBetweenPots' }),
    line('n_d9_soir', 'stairs', { lighting: 'night', sfx: 'steps' }),
    line('d8_cam_descend', 'stairs', { kind: 'walk', direction: 'down', tiles: 8, hotspot: 'lefevreDoor', steam: true, roofDoorLocked: true, lockedFeedback: 'rattle', lockedText: '' }),
    line('d9_noe_chat', 'stairs'),
    line('d9_cam_basilic', 'stairs', { carries: 'basil' }),
    line('d9_cam_null', 'stairs', { bandFlag: 'd7_band', variants: bandVariants }),
    line('d9_lef_bonsoir', 'lefevre', { location: 'doorway', door: 'open' }),
    line('d9_lef_asseyez', 'lefevre', { location: 'table', chairs: 4, plates: 4, wordIds: ['asseyez_vous'], grammarIds: ['pronominaux'] }),
    line('d9_lef_soupe', 'lefevre', { wordIds: ['soupe', 'vous_voulez_de_la_soupe'], recognitionOnly: true }),
    line('n_d9_croissant', 'lefevre', { kind: 'point', hotspot: 'catChair', silenceAfterMs: 1000, sfx: 'meow' }),
    line('d9_lef_place', 'lefevre', { action: 'firstLaugh' }),
    reply('d9_soupe', 'lefevre'),
    line('d9_noe_pain', 'lefevre'),
    line('d9_lef_question', 'lefevre', { silenceBeforeMs: 1000 }),
    line('d9_lef_jeudi', 'lefevre', { wordIds: ['vous_voulez_venir_le_jeudi', 'jeudi'], hotspot: 'calendar', grammarIds: ['le_jour'] }),
    line('d9_lef_seule', 'lefevre'),
    reply('d9_jeudi', 'lefevre', { flag: 'd9_jeudi', storyChoice: true, graded: false }),
    line('n_d9_cle', 'lefevre', { sfx: 'click', hotspot: 'key' }),
    line('d9_lef_cle', 'lefevre', { wordIds: ['cle'], action: 'coverKey', wordClip: 'w_cle' }),
    line('d8_noe_danger', 'lefevre', { action: 'moveBasilAndLaugh', silenceAfterMs: 1500, silentLook: ['key', 'basil', 'emptyChair'] }),
    line('n_d10_cle', 'lefevre', { location: 'doorway', action: 'openHand', hotspots, optionalHotspots: true, continueHotspot: 'lefevre', nengLightCheck: true }),
    line('d10_lef_jardin', 'lefevre', { location: 'doorway', flags: { has_key: true }, action: 'giveKey', closesHotspots: true, wordIds: ['toit', 'jardin'] }),
    reply('d10_pourmoi', 'lefevre', { location: 'doorway', wordIds: ['cest_pour_moi'], anyAttemptCounts: true }),
    line('d10_lef_allez', 'lefevre', { location: 'doorway', action: 'closeDoor', sfx: 'door', lightUnderDoor: true }),
    chats[3],
    line('d10_noe_porte', 'stairs', { kind: 'walk', direction: 'up', tiles: 8, flights: 2, hotspot: 'roofDoor', requiresFlag: 'has_key', cat: 'runAhead' }),
    line('n_d10_monte', 'stairs', { flags: { rooftop: true }, action: 'keyTurns', sfx: 'door' }),
    focus('d8_focus_roof', 'roof', ['toit', 'jardin'], 'garden'),
    line('d10_noe_ici', 'roof', { kind: 'point', hotspot: 'emptyPot', lighting: 'night' }),
    line('n_d10_plante', 'roof', { action: 'plantBasil', flags: { basil_planted: true }, pot: 2, cat: 'dig' }),
    beat('d8_first_watering', 'roof', 'water', { mode: 'first', holdMs: 3000, pot: 2, potId: 2, firstWordId: 'basilic', budget: 1,
      firstSentence: fr('C’est du basilic, pour la cuisine.'), can: 'martin', underlay: line('d8_noe_eau', 'roof'), noTextDuringHold: true, flags: { garden_open: true } }),
    line('n_d10_arrose', 'roof', { action: 'leafLifts' }),
    beat('d8_end', 'facade', 'end', { ...hook, id: 'd8_end', clip: 'd8_hook', action: 'tiltToWindow', lamp: true, hand: 'empty', flags: { day8_done: true }, pots: [1, 2] })
  ];

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
    const sceneLine = scenes.find(s => s.wordIds?.includes(id) && s.kind === 'line');
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
  for (const word of words) {
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
  // Independent approved module order, not inferred from the data being checked.
  const orderedIds = ('d8_morning_review n_d8_matin d8_cam_depuis d8_noe_matin d8_focus_plante d8_cat n_d8_boum d8_noe_plante ' +
    'n_d8_toc n_d8_porte d8_gag_bonjour d8_gag_basilic d8_focus_basilic d8_pot d8_merci d8_gag_venez d8_voicemail ' +
    'd8_chat_place d8_chat_time d8_chat_basil n_d8_cinq n_d9_soir d8_cam_descend d9_noe_chat d9_cam_basilic d9_cam_null ' +
    'd9_lef_bonsoir d9_lef_asseyez d9_lef_soupe n_d9_croissant d9_lef_place d9_soupe d9_noe_pain d9_lef_question ' +
    'd9_lef_jeudi d9_lef_seule d9_jeudi n_d9_cle d9_lef_cle d8_noe_danger n_d10_cle d10_lef_jardin d10_pourmoi ' +
    'd10_lef_allez d8_chat_thursday d10_noe_porte n_d10_monte d8_focus_roof d10_noe_ici n_d10_plante d8_first_watering n_d10_arrose d8_end').split(' ');
  function compile(input) {
    const list = input || scenes;
    const seen = new Set();
    list.forEach(s => {
      if (!s.id || seen.has(s.id)) throw new Error('Duplicate or absent scene id: ' + s.id);
      seen.add(s.id);
      if (!sceneKinds.includes(s.kind) || !sceneNames.includes(s.scene)) throw new Error('Invalid scene type: ' + s.id);
      for (const key of ['text', 'zh', 'en', 'speaker']) if (typeof s[key] !== 'string') throw new Error('Missing ' + key + ': ' + s.id);
      if (s.text !== fr(s.text)) throw new Error('French typography: ' + s.id);
      for (const child of [...(s.options || []), ...(s.hotspots || []), ...(s.lines || [])]) {
        if (child.text !== fr(child.text) || typeof child.zh !== 'string' || typeof child.en !== 'string') throw new Error('Invalid translated child: ' + child.id);
        if (child.after && child.after.text !== fr(child.after.text)) throw new Error('French follow-up typography: ' + child.id);
      }
      for (const id of s.wordIds || []) if (!wordById[id]) throw new Error('Unknown word ' + id + ': ' + s.id);
      for (const id of s.grammarIds || []) if (!A.GRAMMAR_DATA.some(g => g.id === id)) throw new Error('Unknown grammar ' + id + ': ' + s.id);
      if (I.canonical[s.id] && s.text !== fr(I.canonical[s.id].fr)) throw new Error('Canonical text changed: ' + s.id);
      if (['reply', 'choice', 'chat'].includes(s.kind) && !s.options?.length) throw new Error('Missing answers: ' + s.id);
    });
    if (list.map(s => s.id).join('|') !== orderedIds.join('|')) throw new Error('Day 8 canonical sequence changed');
    if (list.filter(s => s.kind === 'walk').length !== 2) throw new Error('Only two stairwell walking beats are permitted');
    if (list.filter(s => s.id === 'd10_noe_ici').length !== 1) throw new Error('Empty pot beat must appear once');
    const water = list.find(s => s.id === 'd8_first_watering');
    if (water.holdMs !== 3000 || water.underlay.id !== 'd8_noe_eau' || water.can !== 'martin') throw new Error('First watering continuity changed');
    if (list.some(s => s.id === 'd8_noe_eau')) throw new Error('Water recognition line is an underlay, not a separate step');
    if (list.filter(s => s.kind === 'chat').length !== 4) throw new Error('Four approved Coloc 411 exchanges are required');
    if (list[list.length - 1].text !== hook.text) throw new Error('Approved ending changed');
    return list;
  }
  const api = { version: 1, day: 8, title: 'Le basilic', scenes: compile(), words, wordById,
    sceneById: Object.fromEntries(scenes.map(s => [s.id, s])), oldIdToWordId, lineWordIds, audio, voicemail, chats, hotspots, newFrench,
    pots: [{ id: 1, name: 'Chez nous', location: 'kitchen', plant: 'martin' }, { id: 2, name: 'À table', location: 'roof', plant: 'basilic', unlock: 'basil_planted' }],
    requiredChunks: ['cest_du_basilic', 'venez_a_six_heures', 'asseyez_vous', 'vous_voulez_venir_le_jeudi', 'cest_pour_moi'],
    glossary: A.GLOSSARY_DATA, grammar: A.GRAMMAR_DATA, compile, lookup, normalize, french: fr,
    resolveBand: (scene, flags) => scene.variants?.[flags?.d7_band || 'null'] || scene,
    accepts: (scene, answer) => L.gradeAnswer(answer, scene.accepted || [], scene.canonical || scene.answer).correct,
    clipPath: id => audio[id] || '../audio/w1/' + id + '.mp3' };
  root.Day8Content = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
