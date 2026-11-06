/* Standalone Day 10 compiler. Load language.js and data/inherited.js first.
 * DAY10_BEATS section 8 and DAY10_ASSET_LIST resolved decisions override the body.
 * No storage, network access, or compilation of another day's story.
 */
(function (root) {
  'use strict';
  const A = root.A411;
  if (!A?.INHERITED) throw new Error('Load data/inherited.js before content-day10.js');
  const I = A.INHERITED;
  const L = root.Day8Language || (typeof module !== 'undefined' && module.exports ? require('./language.js') : null);
  if (!L) throw new Error('Load language.js before content-day10.js');
  const fr = L.typography, normalize = L.normalize;
  const slug = text => normalize(text).replace(/ /g, '_');
  const source = 'app/docs/day10/DAY10_BEATS.md';
  const audio = { ...I.audio }, newFrench = [];
  const kinds = ['line', 'focus', 'reply', 'choice', 'pick', 'voicemail', 'water', 'hub', 'letter', 'end'];
  const moduleFor = scene => scene.kind === 'water' ? 'M2' : scene.kind === 'voicemail' || scene.listening ? 'M3' : ['reply', 'choice'].includes(scene.kind) ? 'M4' : 'M1';
  function voiced(id, text, zh, en, speaker = 'neutral', audioId = id) {
    audio[audioId] = '../audio/w1/' + audioId + '.mp3';
    return { id, text: fr(text), zh, en, speaker, audioId, clip: audioId, source, approved: true };
  }
  function beat(id, section, scene, shot, target, extra = {}) {
    const phase = section[0] === 'E' ? 'night' : section[0] === 'H' ? 'afternoon' : 'morning';
    return { id, beat: section, scene, kind: 'line', text: '', zh: '', en: '', speaker: 'neutral',
      shot: { type: shot, target }, staging: { day: 10, beat: id, phase, thirdPot: 'edge',
        tailInLiveView: false, props: [], delayMs: 800, panelFraming: 'subject-above-panel', floorVisible: true },
      lighting: phase, source, ...extra };
  }
  function line(id, section, scene, shot, target, text, zh, en, speaker, extra = {}) {
    return beat(id, section, scene, shot, target, { ...voiced(id, text, zh, en, speaker), ...extra });
  }
  function art(id, section, scene, shot, target, extra = {}) {
    return beat(id, section, scene, shot, target, { silent: true, durationMs: 1000, ...extra });
  }
  function option(id, audioId, text, zh, en, action) {
    const base = { id, text: fr(text), zh, en, speaker: 'player', chunks: fr(text).split(/ +/), ...(action ? { action } : {}) };
    if (audioId == null) return base;
    const value = voiced(id, text, zh, en, 'player', audioId);
    return { ...value, chunks: value.text.split(/ +/), ...(action ? { action } : {}) };
  }
  function reply(id, section, scene, options, extra = {}) {
    return beat(id, section, scene, 'medium', 'group', { kind: 'reply', speaker: 'player', options,
      accepted: options.map(o => o.text), defaultOption: options[0].id, anyAttemptCounts: true,
      graded: false, feedback: [options[0]], ...extra });
  }
  const letter = { id: 'letter10', number: 10, kind: 'Réponse', title: 'Réponse', to: 'Madame Martin',
    source: 'js/letters.js:542-567', sourceAvailable: true, grammar: 'futur_simple', band: 'A2',
    optional: true, graded: false, sent: false, delivery: 'draft', saveKey: 'day10_letter',
    chunks: [fr('Nous enverrons une photo de la plante demain.'), fr('La plante sera belle, promis !')] };
  const messagePhoto = voiced('d11_mar_photo', 'Une photo de la plante, s’il vous plaît.', '请拍一张植物的照片。', 'A photo of the plant, please.', 'martin');
  const scenes = [
    line('n_d11_matin2', 'A1', 'kitchen', 'wide', 'group', 'Mercredi matin. Le message est là.', '星期三早上。那封消息还在那儿。', 'Wednesday morning. The message is there.', 'neutral', { time: '08:00', wordIds: ['message'] }),
    art('stash_back', 'A2', 'kitchen', 'close', 'spoon', { durationMs: 2600 }),
    line('d11_cam_lit', 'A3', 'kitchen', 'close', 'laptop', 'Bon. Je lis le message.', '好。我来读消息。', 'Right. I will read the message.', 'camille'),
    line('n_d11_ecran', 'A4', 'kitchen', 'close', 'laptop', 'Sur l’écran, il y a le message.', '屏幕上是那封消息。', 'The message is on the screen.', 'neutral', { kind: 'focus', focusWords: ['ecran'], wordIds: ['ecran'], hotspot: 'laptop', comprehensionOnly: true, graded: false }),
    line('d11_mar_bonjour', 'A5', 'kitchen', 'close', 'laptop', 'Bonjour à vous trois. J’espère que tout va bien.', '你们三位好。希望一切都好。', 'Hello to the three of you. I hope everything is well.', 'martin', { listening: true, wordIds: ['jespere_que'] }),
    line('d11_mar_photo', 'A6', 'kitchen', 'medium', 'group', messagePhoto.text, messagePhoto.zh, messagePhoto.en, 'martin', { listening: true, wordIds: ['une_photo_de_la_plante'] }),
    line('d11_mar_chat', 'A7', 'kitchen', 'close', 'croissant', 'De la plante. Pas du chat.', '是植物。不是猫。', 'Of the plant. Not of the cat.', 'martin', { listening: true, critical: true, hintPulse: true }),
    art('keyboard_cat', 'A8', 'kitchen', 'close', 'keyboard', { durationMs: 2000, uiText: 'pppppp' }),
    line('d11_mar_futur', 'A9', 'kitchen', 'close', 'calendar', 'Je reviendrai à la fin du mois. Nous parlerons de la plante.', '我月底会回来。我们会聊聊这盆植物。', 'I will come back at the end of the month. We will talk about the plant.', 'martin', { listening: true, recognitionOnly: true, wordIds: ['a_la_fin_du_mois', 'je_reviendrai', 'nous_parlerons'], listeningOnly: ['fin du mois'] }),
    beat('d11_dictee', 'A10', 'kitchen', 'close', 'laptop', { kind: 'voicemail', speaker: 'martin', lines: [messagePhoto], text: messagePhoto.text, zh: messagePhoto.zh, en: messagePhoto.en,
      target: 'photo', answer: 'photo', canonical: 'photo', accepted: ['photo'], chunks: ['photo'], ipa: '[fɔ.to]', answerAudioId: 'w_photo', feedback: [messagePhoto],
      cloze: fr('Une … de la plante, s’il vous plaît.'), audioId: 'd11_mar_photo', clip: 'd11_mar_photo',
      wordIds: ['photo'], revealAfterAnswer: true, spellingAfterCorrect: true, listeningOnly: ['fin du mois'], dictation: true }),
    line('d11_noe_court', 'A11', 'kitchen', 'close', 'laptop', 'C’est tout ? C’est un petit message.', '就这些？好短的消息。', 'Is that all? It is a short message.', 'noe', { wordIds: ['cest_tout'] }),
    line('d11_cam_court', 'A12', 'kitchen', 'close', 'camille', 'Un petit message. Un grand problème.', '消息很短。问题很大。', 'A short message. A big problem.', 'camille'),
    line('d11_photo', 'A13', 'kitchen', 'medium', 'group', 'Écoute. Madame Martin voudrait une photo de quoi ?', '听。Martin 太太想要什么的照片？', 'Listen. Madame Martin would like a photo of what?', 'neutral', { kind: 'pick', answer: 'plante', cue: 'd11_mar_photo', wrongReplay: 'd11_mar_photo', answerAudioId: 'une_photo_de_la_plante', nonBlocking: true, graded: false, wordIds: ['une_photo_de_la_plante'], options: [
      option('plante', null, 'la plante', '植物', 'the plant'), option('chat', null, 'le chat', '猫', 'the cat'),
      option('canape', null, 'le canapé', '沙发', 'the sofa'), option('unknown', null, 'Je ne sais pas', '我不知道', 'I do not know') ] }),

    art('n_d11_matin', 'B1', 'kitchen', 'medium', 'fridge'),
    line('d11_noe_lait', 'B2', 'kitchen', 'close', 'milk', 'Il n’y a plus de lait.', '牛奶没了。', 'There is no milk left.', 'noe', { wordIds: ['il_ny_a_plus_de_lait', 'il_ny_a_plus_de'] }),
    line('d11_cam_lait', 'B3', 'kitchen', 'medium', 'group', 'Règle numéro trois : le lait, ça va dans le frigo. Pas dans ton ventre.', '第三条：牛奶放冰箱里。不是放你肚子里。', 'Rule number three: milk goes in the fridge. Not in your stomach.', 'camille'),
    line('d11_noe_faim', 'B4', 'kitchen', 'close', 'noe', 'J’ai faim ! Et pas de lait.', '我饿了！还没有牛奶。', 'I am hungry! And there is no milk.', 'noe', { wordIds: ['jai_faim'], sfx: 'growl' }),
    line('d11_cam_cafe', 'B5', 'kitchen', 'medium', 'camille', 'Tu veux du café ? Sans lait.', '你要喝咖啡吗？不加奶的。', 'Do you want coffee? Without milk.', 'camille', { wordIds: ['tu_veux_du_cafe'] }),
    reply('d11_cafe', 'B6', 'kitchen', [
      option('oui', 'd11_cafe_oui', 'Oui, merci !', '好，谢谢！', 'Yes, please!', 'serveCoffee'),
      option('the', 'd11_cafe_the', 'Non, merci. Je voudrais du thé.', '不用，谢谢。我想喝茶。', 'No, thank you. I would like tea.', 'serveTea'),
      option('pain', 'd11_cafe_pain', 'J’ai faim ! Il y a du pain ?', '我饿了！有面包吗？', 'I am hungry! Is there bread?', 'passBread')
    ], { text: fr('Camille te regarde. Elle a le café. Tu dis quoi ?'), zh: 'Camille 看着你。她拿着咖啡。你说什么？', en: 'Camille looks at you. She has the coffee. What do you say?', speaker: 'neutral', source, approved: true, kind: 'reply' }),

    line('n_d11_phone', 'C1', 'roof', 'wide', 'group', 'Sur le toit, Noé prend son téléphone. Il veut prendre la photo.', '在楼顶上，Noé 拿起手机。他想拍照。', 'On the roof, Noé takes his phone. He wants to take the photo.', 'neutral'),
    art('pot_wiggle', 'C2', 'roof', 'medium', 'pot', { kind: 'water', mode: 'optional', optional: true, pot: 1, potId: 1, duePotId: 1, pots: [1, 2], allDue: true,
      checkpointEvery: 8, exitAnytime: true, oncePerDay: true, budget: null, invitation: 'wiggle', marker: false, skipAction: 'noeWaters', skipActions: ['noeWaters', 'wipeLeaf'], persistInviteOnHub: true,
      checkpoint: voiced('d11_noe_belle', 'Elle doit être belle !', '它得漂漂亮亮的！', 'It must look beautiful!', 'noe') }),
    line('d11_focus_photo', 'C3', 'roof', 'close', 'phone', 'une photo', '一张照片', 'a photo', 'neutral', { kind: 'focus', audioId: 'w_photo', clip: 'w_photo', wordIds: ['photo'], focusWords: ['photo'], hotspot: 'phone', comprehensionOnly: true, graded: false }),
    line('d11_noe_photo', 'C4', 'roof', 'medium', 'noe', 'Une photo de la plante. Facile ! Je suis un artiste.', '拍一张植物的照片。简单！我可是艺术家。', 'A photo of the plant. Easy! I am an artist.', 'noe', { wordIds: ['facile'] }),
    line('d11_noe_pres', 'C5', 'roof', 'close', 'phone', 'Plus près… plus près !', '再近一点……再近一点！', 'Closer… closer!', 'noe', { wordIds: ['plus_pres'], recognitionOnly: true, neng: true }),
    line('d11_noe_souriez', 'C6', 'roof', 'close', 'noe', 'Souriez !', '笑一个！', 'Smile!', 'noe', { wordIds: ['souriez'] }),
    line('d11_cam_souriez', 'C7', 'roof', 'medium', 'camille', 'Noé. C’est une plante.', 'Noé。那是一盆植物。', 'Noé. It is a plant.', 'camille'),
    reply('d11_souriez_vous', 'C8', 'roof', [
      option('souriez', 'd11_souriez_vous', 'Souriez !', '笑一个！', 'Smile!'),
      option('trois', 'd11_souriez_123', 'Un, deux, trois…', '一、二、三……', 'One, two, three…'),
      option('pres', 'd11_souriez_pres', 'Plus près !', '再近一点！', 'Closer!')
    ], { ...voiced('d11_noe_123', 'Un, deux, trois…', '一、二、三……', 'One, two, three…', 'noe'), id: 'd11_souriez_vous', kind: 'reply', wordIds: ['souriez', 'plus_pres'] }),
    line('d11_cam_souriez2', 'C9', 'roof', 'close', 'camille', '…Souriez.', '……笑一个。', '…Smile.', 'camille', { highPoint: true }),
    art('polaroid_freeze', 'C9', 'roof', 'close', 'photo', { durationMs: 4460, holdMs: 3000, holdStartMs: 1460,
      timeline: { thumbMs: 300, flashMs: 380, flashDurationMs: 200, shrinkMs: 580, developMs: 860, holdMs: 1460, cutMs: 4460 } }),
    line('n_d11_clic', 'C10', 'roof', 'medium', 'group', 'Clic. Voilà la photo.', '咔嚓。照片拍好了。', 'Click. There is the photo.', 'neutral'),
    line('d11_noe_encore', 'C11', 'roof', 'medium', 'group', 'Encore une photo !', '再拍一张！', 'Another photo!', 'noe', { wordIds: ['encore_une_photo'], recognitionOnly: true, neng: true }),

    line('n_d11_escalier', 'D1', 'stairs', 'wide', 'group', 'Dans l’escalier, Noé voit Madame Lefèvre.', '在楼梯上，Noé 遇见 Lefèvre 太太。', 'On the stairs, Noé sees Madame Lefèvre.', 'neutral'),
    line('d11_noe_montre', 'D2', 'stairs', 'medium', 'group', 'Bonjour, Madame ! Regardez ma photo !', '您好，夫人！看看我拍的照片！', 'Hello, Madame! Look at my photo!', 'noe'),
    line('d11_lef_photo', 'D3', 'stairs', 'close', 'lefevre', 'Oh… C’est une belle photo.', '哦……这是一张很美的照片。', 'Oh… It is a beautiful photo.', 'lefevre'),
    line('n_d11_regard', 'D4', 'stairs', 'close', 'lefevre', 'Elle regarde la photo. Longtemps. Elle sourit.', '她看着照片。看了很久。她笑了。', 'She looks at the photo. For a long time. She smiles.', 'neutral'),
    art('d11_afternoon', 'H1', 'kitchen', 'wide', 'group', { kind: 'hub', time: '14:00', chores: ['fridge', 'list', 'coffee', 'album', 'message', 'letter10'],
      nextSceneId: 'n_d11_queue', wateringSceneId: 'pot_wiggle', optionalWatering: true, letter }),

    line('n_d11_queue', 'E1', 'kitchen', 'close', 'phone', 'Plus tard, à l’appartement. Camille regarde la photo. Derrière la plante… une queue orange.', '后来，回到家里，Camille 看着照片。植物后面……有一条橘色的尾巴。', 'Later, at the apartment. Camille looks at the photo. Behind the plant… an orange tail.', 'neutral', { time: '20:00' }),
    line('d11_cam_queue', 'E2', 'kitchen', 'close', 'camille', 'Noé. C’est quoi, ça ?', 'Noé。这是什么？', 'Noé. What is that?', 'camille', { wordIds: ['cest_quoi_ca'] }),
    line('d11_noe_pasmoi', 'E3', 'kitchen', 'medium', 'group', 'Ce n’est pas moi !', '不是我！', 'It is not me!', 'noe', { wordIds: ['ce_nest_pas_moi'] }),
    reply('d11_queue_reply', 'E3', 'kitchen', [
      option('chat', 'd11_qui_chat', 'C’est Croissant !', '是 Croissant！', 'It is Croissant!'),
      option('pasmoi', 'd11_qui_pasmoi', 'Ce n’est pas moi !', '不是我！', 'It is not me!'),
      option('quoi', 'd11_qui_quoi', 'C’est quoi, ça ?', '这是什么？', 'What is that?')
    ], { wordIds: ['ce_nest_pas_moi', 'cest_quoi_ca'] }),
    art('n_d11_souvenir', 'E4', 'kitchen', 'close', 'noe', { durationMs: 1660, flashHoldMs: 1000,
      timeline: { smileDropMs: 0, flashMs: 200, flashCutInMs: 60, flashHoldMs: 1000, returnMs: 1260, cutMs: 1660 } }),
    line('done', 'E5', 'roof', 'close', 'photo', 'Une photo de la plante. Pas du chat. Mais le chat est sur la photo.', '一张植物的照片。不是猫的。可是猫在照片里。', 'A photo of the plant. Not of the cat. But the cat is in the photo.', 'neutral', { kind: 'end', audioId: 'd11_hook', clip: 'd11_hook', flags: { day10_done: true } })
  ];
  const direction = {
    n_d11_matin2: { props: ['pen', 'sock', 'spoon', 'laptop'], cat: 'table', laptop: 'closed' },
    stash_back: { props: ['pen', 'sock', 'spoon', 'cleanSpoon', 'coffee'], pose: 'returnStash' },
    d11_cam_lit: { laptop: 'open', pose: 'openLaptop' }, n_d11_ecran: { insert: 'laptop_message' },
    d11_mar_bonjour: { insert: 'laptop_message', martinSmile: true }, d11_mar_photo: { pose: 'pointUp', thoughtPot: true },
    d11_mar_chat: { cat: 'table', pose: 'lookAtCat' }, keyboard_cat: { insert: 'keyboard_cat', uiText: 'pppppp', clearTextAtMs: 1360 },
    d11_mar_futur: { insert: 'calendar_month' }, d11_dictee: { insert: 'laptop_lean' },
    d11_noe_court: { insert: 'laptop_message', laptop: 'scrolled' }, d11_cam_court: { laptop: 'closed' },
    n_d11_matin: { fridge: 'open', pose: 'openFridge' }, d11_noe_lait: { milk: 'inverted', pose: 'milkDrop' },
    d11_cam_lait: { pose: 'pointTap' }, d11_noe_faim: { pose: 'handBelly' },
    d11_cam_cafe: { pose: 'holdCoffee' }, d11_cafe: { pose: 'holdCoffee', props: ['coffee', 'cup', 'bread'] },
    n_d11_phone: { pose: 'phoneUp', cat: 'wall' }, pot_wiggle: { pose: 'phoneUp', optionalWatering: true },
    d11_focus_photo: { insert: 'phone_live' }, d11_noe_photo: { pose: 'kneelWink' }, d11_noe_pres: { pose: 'kneeShuffle', delayMs: 1920 },
    d11_noe_souriez: { pose: 'kneelWink' }, d11_cam_souriez: { pose: 'armsCrossed' }, d11_souriez_vous: { pose: 'groupCrouch', cat: 'none' },
    d11_cam_souriez2: { pose: 'uncrossWhisper', cat: 'none' }, polaroid_freeze: { insert: 'polaroid', cat: 'none', photoTail: 'subtle', holdMs: 3000 },
    n_d11_clic: { pose: 'showPhoto' }, d11_noe_encore: { pose: 'scarfTug', placeholderPose: 'phoneUp', futureAsset: '../day10/characters/camille_tug_scarf_0.png' },
    n_d11_escalier: { props: ['newspaper'], pose: 'landing' }, d11_noe_montre: { pose: 'showPhoto', camillePose: 'halfRaise' },
    d11_lef_photo: { insert: 'lefevre_look' }, n_d11_regard: { insert: 'lefevre_look', delayMs: 2400, smileAtMs: 2400 },
    d11_afternoon: { optionalWatering: true, cat: 'sofa' },
    n_d11_queue: { insert: 'phone_hands', zoomSteps: 1, zoomAtMs: 360, photoTail: 'revealed' },
    d11_cam_queue: { pose: 'turnScreen' }, d11_noe_pasmoi: { pose: 'handsUp', cat: 'sofaLick' }, d11_queue_reply: { pose: 'handsUp', cat: 'sofaLick' },
    n_d11_souvenir: { pose: 'smileDrop', flashInsert: 'lefevre_look', flashAtMs: 200, flashHoldMs: 1000, flashReturnMs: 1260, desaturate: .15 },
    done: { splitEnd: true, photoTail: 'revealed', cat: 'betweenPots', phase: 'sunset' }
  };
  const actions = {
    stash_back: { type: 'object', object: 'spoon', state: 'swap' }, d11_cam_lit: { type: 'object', object: 'laptop', state: 'open' },
    keyboard_cat: { type: 'object', object: 'keyboard', state: 'walkAndDelete' }, d11_mar_futur: { type: 'object', object: 'calendar', state: 'lastSquare' },
    n_d11_matin: { type: 'door', at: 'fridge', state: 'open' }, d11_noe_lait: { type: 'object', object: 'milk', state: 'drop' },
    pot_wiggle: { type: 'object', object: 'pot', state: 'wiggle' }, d11_noe_pres: { type: 'object', object: 'phone', state: 'closer' },
    polaroid_freeze: { type: 'object', object: 'photo', state: 'develop' }, n_d11_queue: { type: 'object', object: 'phone', state: 'zoom', steps: 1 },
    n_d11_souvenir: { type: 'object', object: 'memory', state: 'flash', duration: 1000 }
  };
  for (const scene of scenes) {
    if (scene.scene === 'kitchen') scene.staging.props = ['laptop', 'list', 'coffee', 'milk'];
    Object.assign(scene.staging, direction[scene.id] || {});
    scene.action = actions[scene.id] || { type: 'object', object: scene.shot.target, state: 'stage' };
    scene.module = moduleFor(scene);
    if (scene.audioId) audio[scene.audioId] = '../audio/w1/' + scene.audioId + '.mp3';
    if (scene.text) newFrench.push(scene);
  }

  const requiredChunks = ['il_ny_a_plus_de_lait', 'tu_veux_du_cafe', 'jai_faim', 'une_photo_de_la_plante', 'souriez'];
  const day10WordIds = ['jai_faim', 'il_ny_a_plus_de', 'message', 'photo', 'jespere_que', 'a_la_fin_du_mois', 'cest_tout', 'cest_quoi_ca', 'facile', 'souriez'];
  const words = [], wordById = {}, oldIdToWordId = {}, lineWordIds = {};
  function addWord(record) {
    if (wordById[record.id]) return wordById[record.id];
    const met = I.firstMeet[record.id], encounter = scenes.find(s => s.wordIds?.includes(record.id));
    const forms = record.forms || [record.fr.replace(/^(?:le |la |les |l’|un |une )/, '')];
    const sentence = fr(met?.fr || record.sentence || encounter?.text || record.fr);
    const answer = record.answer || forms.find(form => normalize(sentence).includes(normalize(form))) || forms[0];
    const audioId = record.audioId || met?.id || encounter?.audioId || 'w_' + record.id;
    const pot = met || record.day <= 7 ? 1 : 2;
    const value = { ...record, fr: fr(record.fr), forms: forms.slice(), sentence,
      sentenceZh: record.sentenceZh || (met && (I.lines[met.id] || I.narr[met.id])?.zh) || encounter?.zh || record.zh,
      sentenceEn: record.sentenceEn || (met && (I.lines[met.id] || I.narr[met.id])?.en) || encounter?.en || record.en,
      answer, accepted: record.accepted || [record.fr], chunks: sentence.split(/ +/),
      cloze: typeof record.cloze === 'string' ? fr(record.cloze) : sentence.includes(answer) ? sentence.replace(answer, '…') : '…',
      audioId, clip: audioId, wordClip: record.wordClip || 'w_' + record.id,
      scene: met?.scene || encounter?.scene || 'kitchen', pot, potId: pot, week: pot, metDay: met?.day || record.day || 10,
      seen: !!met || record.day <= 7, field: record.field || (record.pos === 'chunk' ? 'daily_life' : 'home'),
      gender: ['m', 'f'].includes(record.gender) ? record.gender : /^la |^une /.test(record.fr) ? 'f' : /^le |^un /.test(record.fr) ? 'm' : null,
      pos: record.pos || (/^(?:le |la |les |l’)/.test(record.fr) ? 'noun' : 'chunk'),
      growthEligible: !!met || record.day <= 10 || !!encounter, recognitionOnly: !!record.recognitionOnly,
      legacyIds: [...new Set([record.id, 'w_' + record.id, 'cw_' + record.id, 'cw_' + slug(record.fr), ...forms.map(form => 'cw_' + slug(form)), ...(record.legacyIds || [])])],
      encounters: met ? [{ ...met, text: met.fr }] : [], recorded: !!I.audio[audioId], source: record.source || 'data/inherited.js' };
    words.push(value); wordById[value.id] = value;
    for (const old of value.legacyIds) oldIdToWordId[old] ||= value.id;
    audio[value.wordClip] ||= '../audio/w1/' + value.wordClip + '.mp3';
    return value;
  }
  for (const [id, word] of Object.entries(I.words)) addWord({ ...word, id });
  for (const deck of I.deck) addWord({ ...deck, pos: 'chunk', audioId: deck.id, wordClip: deck.id,
    sentence: deck.fr, sentenceZh: deck.zh, sentenceEn: deck.en, accepted: deck.produce?.accept || [deck.fr],
    answer: deck.cloze?.accept?.[0] || deck.produce?.accept?.[0] || deck.fr, cloze: deck.cloze?.fr, recognitionOnly: !!deck.rare || !!deck.mcOnly });
  const wordlist = I.wordlist.filter(w => w.day === 10).map((item, index) => ({ ...item, id: day10WordIds[index], fr: fr(item.fr) }));
  for (const item of wordlist) addWord(item);
  for (const item of I.wordlist.filter(w => w.day <= 9)) {
    const base = item.fr.replace(/ \([mf]\.?\)/g, '').replace(/…/g, '').trim();
    if (!words.some(w => normalize(w.fr) === normalize(base) || w.forms.some(f => normalize(f) === normalize(base)))) addWord({ ...item, fr: base, id: 'v_' + slug(base), recognitionOnly: item.frequency.startsWith('scene') });
  }
  for (const item of [
    { id: 'ce_nest_pas_moi', fr: 'Ce n’est pas moi !', zh: '不是我！', en: 'It is not me!', day: 9, audioId: 'd11_noe_pasmoi', wordClip: 'ce_nest_pas_moi', module: 'week2', story: 'd10' },
    { id: 'plus_pres', fr: 'Plus près !', zh: '再近一点！', en: 'Closer!', recognitionOnly: true },
    { id: 'encore_une_photo', fr: 'Encore une photo !', zh: '再拍一张！', en: 'Another photo!', recognitionOnly: true },
    { id: 'je_reviendrai', fr: 'Je reviendrai', zh: '我会回来', en: 'I will come back', recognitionOnly: true },
    { id: 'nous_parlerons', fr: 'Nous parlerons', zh: '我们会聊聊', en: 'We will talk', recognitionOnly: true },
    { id: 'ecran', fr: 'l’écran', zh: '屏幕', en: 'screen', forms: ['écran', 'écrans'], gender: 'm', pos: 'noun', recognitionOnly: true, audioId: 'w_ecran', wordClip: 'w_ecran' }
  ]) addWord({ day: 10, pos: 'chunk', ...item });
  for (const scene of scenes) for (const id of scene.wordIds || []) {
    if (!wordById[id]) throw new Error('Unknown word ' + id);
    wordById[id].encounters.push({ id: scene.id, day: 10, scene: scene.scene, text: scene.text, zh: scene.zh, en: scene.en });
    (lineWordIds[scene.id] ||= []).push(id);
  }
  for (const [id, value] of Object.entries(I.lines)) if (wordById[value.target]) oldIdToWordId[id] = value.target;
  for (const lex of A.LEXICON_FIELDS?.items || []) {
    const word = words.find(w => lex.deckIds?.includes(w.id) || normalize(lex.fr_def) === normalize(w.fr));
    if (word) { oldIdToWordId[lex.id] ||= word.id; word.lexicon ||= lex; }
  }
  for (const word of words) word.legacyIds = Object.keys(oldIdToWordId).filter(id => oldIdToWordId[id] === word.id);
  const glossAdditions = {
    camille: ['Camille（室友）', 'Camille (a housemate)', 'une colocataire', 0, 1, 'n'],
    'noé': ['Noé（室友）', 'Noé (a housemate)', 'un colocataire', 0, 1, 'n'],
    'lefèvre': ['Lefèvre 太太', 'Madame Lefèvre', 'la voisine', 0, 1, 'n'],
    martin: ['Martin 太太', 'Madame Martin', 'la propriétaire', 0, 1, 'n'],
    longtemps: ['很久', 'for a long time', 'pendant beaucoup de temps', 0, 1, 'x']
  };
  const glossary = { ...A.GLOSSARY_DATA, E: { ...A.GLOSSARY_DATA?.E, ...glossAdditions }, F: { ...A.GLOSSARY_DATA?.F } };
  function lookup(text) {
    const surface = String(text || '').toLowerCase().replace(/'/g, '’').replace(/^[«\s]+|[».,?!;:\s]+$/g, '');
    const bare = surface.replace(/^(?:l’|d’|j’|qu’|n’|c’)/, '');
    const word = words.find(w => normalize(w.fr) === normalize(surface) || w.forms.some(f => normalize(f) === normalize(bare)));
    if (word && !glossAdditions[bare]) return { ...word, surface, lemma: word.fr.replace(/^(?:le |la |les |un |une |des |l’)/, '') };
    const conjugated = A.Conj?.lemmaOf(bare, { verbOnly: true }), irregular = glossary.F[bare];
    const candidates = [bare, conjugated?.infinitive, irregular?.[0], bare.replace(/s$/, ''), bare.replace(/x$/, '')].filter(Boolean);
    const feminine = bare.replace(/es?$/, ''), regular = bare.replace(/(?:ent|ons|ez|es|e)$/, 'er');
    if (feminine !== bare && glossary.E[feminine]?.[5].includes('a')) candidates.push(feminine);
    if (regular !== bare && glossary.E[regular]?.[5].includes('v')) candidates.push(regular);
    for (const lemma of candidates) {
      const entry = glossary.E[lemma];
      if (!entry) continue;
      return { id: 'cw_' + slug(lemma), fr: lemma, lemma, surface, zh: entry[0], en: entry[1], para: entry[2], frequency: entry[3],
        pos: entry[5].includes('v') ? 'verb' : entry[5].includes('n') ? 'noun' : entry[5].includes('a') ? 'adj' : 'other',
        gender: irregular?.[1]?.[0] || null, number: irregular?.[1]?.[1] || null, conjugated,
        recognitionOnly: entry[3] < 5, pot: 2, potId: 2, seen: false, source: glossAdditions[bare] ? 'content-day10.js' : 'js/glossary-data.js' };
    }
    return null;
  }
  const orderedIds = scenes.map(s => s.id);
  const approvedText = Object.fromEntries(scenes.map(s => [s.id, JSON.stringify([s.text, s.zh, s.en, s.options, s.checkpoint])]));
  function resolveBand(scene, flags = {}) {
    const variant = scene.variants?.[flags[scene.bandFlag || 'd7_band'] || 'null'];
    return variant ? { ...scene, ...variant, id: scene.id } : scene;
  }
  function auditLesson(list = scenes) {
    const requests = new Map();
    function request(record, owner) {
      if (!record) return;
      const id = record.audioId || record.clip;
      if (id && record.text && !record.silent) {
        if (!requests.has(id)) requests.set(id, { id, text: record.text, speaker: record.speaker, scenes: [] });
        if (!requests.get(id).scenes.includes(owner)) requests.get(id).scenes.push(owner);
      }
      request(record.after, owner);
    }
    for (const scene of list) {
      request(scene, scene.id);
      for (const child of [...(scene.options || []), ...(scene.lines || []), ...Object.values(scene.variants || {}), scene.checkpoint]) request(child, scene.id);
    }
    return { scenes: list.length, counts: Object.fromEntries(kinds.map(kind => [kind, list.filter(s => s.kind === kind).length])), audioRequests: [...requests.values()] };
  }
  function compile(list = scenes) {
    if (list.map(s => s.id).join('|') !== orderedIds.join('|')) throw new Error('Day 10 canonical sequence changed');
    for (const scene of list) {
      if (!kinds.includes(scene.kind) || !['kitchen', 'roof', 'stairs'].includes(scene.scene) || scene.module !== moduleFor(scene)) throw new Error('Invalid scene: ' + scene.id);
      if (JSON.stringify([scene.text, scene.zh, scene.en, scene.options, scene.checkpoint]) !== approvedText[scene.id]) throw new Error('Approved text changed: ' + scene.id);
      for (const record of [scene, ...(scene.options || []), ...(scene.lines || []), ...(scene.checkpoint ? [scene.checkpoint] : [])]) {
        for (const key of ['text', 'zh', 'en']) if (typeof record[key] !== 'string') throw new Error('Missing ' + key + ': ' + scene.id);
        if (record.text !== fr(record.text)) throw new Error('French typography: ' + scene.id);
      }
      if (!['wide', 'medium', 'close'].includes(scene.shot?.type) || !scene.shot.target || scene.staging?.day !== 10 || scene.staging.delayMs < 800 || !scene.staging.floorVisible || scene.staging.panelFraming !== 'subject-above-panel') throw new Error('Missing staging: ' + scene.id);
      if (scene.staging.tailInLiveView !== false) throw new Error('Live-view tail is forbidden');
      for (const id of scene.wordIds || []) if (!wordById[id]) throw new Error('Unknown word ' + id);
      if (scene.kind === 'reply' && (!scene.anyAttemptCounts || scene.graded !== false || !scene.options?.length)) throw new Error('Reply contract');
    }
    const byId = Object.fromEntries(list.map(s => [s.id, s]));
    const water = byId.pot_wiggle;
    if (list.filter(s => s.kind === 'water').length !== 1 || water.mode !== 'optional' || !water.allDue || !water.exitAnytime || water.checkpointEvery !== 8 || !water.oncePerDay) throw new Error('Optional watering contract');
    if (!byId.n_d11_matin.silent || byId.n_d11_matin.text) throw new Error('B1 is art only');
    if (!byId.polaroid_freeze.silent || byId.polaroid_freeze.durationMs !== 4460 || byId.polaroid_freeze.holdMs !== 3000 || byId.polaroid_freeze.holdStartMs !== 1460) throw new Error('Polaroid hold contract');
    if (!byId.n_d11_souvenir.silent || byId.n_d11_souvenir.flashHoldMs !== 1000) throw new Error('Silent hook contract');
    if (list.filter(s => s.highPoint).length !== 1 || !byId.d11_cam_souriez2.highPoint) throw new Error('Warm high point contract');
    if (byId.n_d11_queue.staging.zoomSteps !== 1) throw new Error('Single-step zoom contract');
    if (list.filter(s => s.speaker === 'lefevre').length !== 1) throw new Error('Lefevre has one line');
    if (byId.d11_dictee.answer !== 'photo' || byId.d11_dictee.accepted.join('|') !== 'photo') throw new Error('Photo-only dictation contract');
    if (byId.d11_afternoon.nextSceneId !== 'n_d11_queue' || byId.d11_afternoon.chores.join('|') !== 'fridge|list|coffee|album|message|letter10' || byId.d11_afternoon.letter.delivery !== 'draft') throw new Error('Afternoon chore contract');
    return list;
  }
  const api = { version: 5, day: 10, title: 'Le message', story: 'd11', scenes: compile(),
    sceneById: Object.fromEntries(scenes.map(s => [s.id, s])), legacySceneIds: orderedIds.slice(), v3SceneIds: [],
    words, wordById, wordlist, day10WordIds, requiredChunks, oldIdToWordId, lineWordIds, audio, newFrench,
    glossary, grammar: A.GRAMMAR_DATA || [], voicemail: scenes.find(s => s.kind === 'voicemail'), chats: [], hotspots: [], letter,
    pots: [{ id: 1, name: 'Chez nous', location: 'roof', plant: 'martin' }, { id: 2, name: 'À table', location: 'roof', plant: 'basilic' }],
    evening: { id: 'eve_d11', scene: 'roof', silent: true, staging: { day: 10, beat: 'eve_d11', phase: 'night', evening: true,
      thirdPot: 'edge', cat: 'behindPot', lefevreWindow: true, handOnClosedDrawer: true, drawer: 'closed', phoneInset: false, tailInLiveView: false } },
    lessonInstructions: { pick: fr('Écoute, puis choisis.'), chips: fr('Mets les mots dans l’ordre.'), diary: fr('Aujourd’hui…') },
    compile, auditLesson, resolveBand, resolveScene: resolveBand, lookup, normalize, french: fr,
    accepts: (scene, answer) => L.gradeAnswer(answer, scene.accepted || [], scene.canonical || scene.answer).correct,
    clipPath: id => audio[id] || '../audio/w1/' + id + '.mp3' };
  root.Day10Content = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
