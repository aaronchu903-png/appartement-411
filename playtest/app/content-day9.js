/* Standalone Day 9 compiler. Load language.js and data/inherited.js, NOT content.js.
 * Canon: docs/day9/DAY09_V3.md, including NENG_REVIEW; chore changes supersede CHORES_D9_D14.
 * No storage, fetch, Day 8 story compilation, or mutation of inherited records.
 */
(function (root) {
  'use strict';
  const A = root.A411;
  if (!A?.INHERITED) throw new Error('Load data/inherited.js before content-day9.js');
  const I = A.INHERITED;
  const L = root.Day8Language || (typeof module !== 'undefined' && module.exports ? require('./language.js') : null);
  if (!L) throw new Error('Load language.js before content-day9.js');
  const fr = L.typography, normalize = L.normalize;
  const slug = text => normalize(text).replace(/ /g, '_');
  const audio = { ...I.audio }, newFrench = [];
  const source = 'app/docs/day9/DAY09_V3.md';
  const kinds = ['line', 'focus', 'reply', 'choice', 'water', 'hub', 'search', 'walk', 'letter', 'end'];
  const moduleForKind = kind => kind === 'water' ? 'M2' : ['reply', 'choice'].includes(kind) ? 'M4' : 'M1';
  function voiced(id, text, zh, en, speaker = 'neutral', audioId = id) {
    audio[audioId] = '../audio/w1/' + audioId + '.mp3';
    return { id, text: fr(text), zh, en, speaker, clip: audioId, audioId, source, approved: true };
  }
  function option(id, audioId, text, zh, en, after) {
    const value = voiced(id, text, zh, en, 'player', audioId);
    return { ...value, chunks: value.text.split(/ +/), ...(after ? { after } : {}) };
  }
  function beat(id, section, scene, shot, target, extra = {}) {
    const phase = section === 'A' || section === 'B' ? 'morning' : section === 'C' ? 'afternoon' : 'sunset';
    return { id, beat: section, scene, kind: 'line', text: '', zh: '', en: '', speaker: 'neutral',
      shot: { type: shot, target }, staging: { day: 9, beat: id, phase, thirdPot: 'hidden', props: [], delayMs: 800,
        panelFraming: 'subject-above-panel', floorVisible: true }, lighting: phase, source, ...extra };
  }
  function line(id, section, scene, shot, target, text, zh, en, speaker, extra = {}) {
    return beat(id, section, scene, shot, target, { ...voiced(id, text, zh, en, speaker), ...extra });
  }
  function reply(id, section, scene, options, extra = {}) {
    return beat(id, section, scene, 'medium', 'group', { kind: 'reply', speaker: 'player', options,
      accepted: options.map(o => o.text), defaultOption: options[0].id, anyAttemptCounts: true, graded: false,
      feedback: [options[0]], ...extra });
  }
  function art(id, section, scene, shot, target, extra = {}) {
    return beat(id, section, scene, shot, target, { silent: true, durationMs: 1000, ...extra });
  }
  const coffeeAfter = voiced('d10_eau_pourmoi', 'Pour moi, oui.', '我是需要。', 'For me, yes.', 'noe');
  const goodIdea = voiced('d10_cam_idee', 'C’est une bonne idée.', '这是个好主意。', 'That is a good idea.', 'camille');
  const camDenial = voiced('d10_pasmoi', 'Ce n’est pas moi.', '不是我。', 'It is not me.', 'camille');
  const noeDenial = voiced('d10_pasmoi_c5', 'Ce n’est pas moi !', '不是我！', 'It is not me!', 'noe');
  const pockets = { ...voiced('d10_noe_poches', 'Il n’a pas de poches !', '它又没有口袋！', 'He has no pockets!', 'noe'),
    audioId: 'd5_noe_poche', clip: 'd5_noe_poche' };
  const right = voiced('d10_cam_raison', 'Tu avais raison.', '你说对了。', 'You were right.', 'camille');
  const bands = Object.fromEntries(['A', 'B', 'C', 'null'].map(band => {
    const id = 'd10_cam_' + band.toLowerCase(), value = I.lines[id];
    return [band, voiced(id, value.fr, value.zh, value.en, 'camille')];
  }));
  const scenes = [
    line('n_d10_monte', 'A1', 'stairs', 'close', 'roofDoor', 'La clé tourne. La porte s’ouvre.', '钥匙转动。门开了。', 'The key turns. The door opens.', 'neutral', { flags: { has_key: true, rooftop: true, garden_open: true, basil_planted: true } }),
    line('n_d10_jour', 'A2', 'roof', 'wide', 'group', 'Le toit, le matin. Il y a du soleil.', '早上的楼顶。有阳光。', 'The roof in the morning. There is sunshine.', 'neutral', { wordIds: ['toit'], focusWords: ['toit'], hotspot: 'roof' }),
    line('d10_noe_beau', 'A3', 'roof', 'medium', 'noe', 'Regarde ! C’est beau.', '你看！真美。', 'Look! It is beautiful.', 'noe'),
    reply('d10_beau', 'A3', 'roof', [
      option('oui', 'd10_beau', 'Oui, c’est beau.', '是啊，真美。', 'Yes, it is beautiful.'),
      option('chut', 'd10_beau_chut', 'Chut… tout le monde dort.', '嘘……大家都在睡。', 'Shh… everyone is asleep.')
    ]),
    line('d10_noe_sec', 'A4', 'roof', 'close', 'pot', 'Tout est sec. Le jardin dort.', '全都干了。花园在睡觉。', 'Everything is dry. The garden is asleep.', 'noe', { wordIds: ['jardin'], focusWords: ['jardin'], listeningOnly: ['sec'], hotspot: 'pot' }),
    line('n_d10_pose', 'A5', 'roof', 'medium', 'pot', 'Tu poses la plante à côté du basilic.', '你把那盆植物放在罗勒旁边。', 'You set the plant beside the basil.', 'neutral'),
    reply('d10_eau', 'A6', 'roof', [
      option('eau', 'd10_eau', 'Il faut de l’eau.', '得浇水。', 'It needs water.'),
      option('eau2', 'd10_eau2', 'Il faut de l’eau, non ?', '得浇水，对吧？', 'It needs water, right?'),
      option('cafe', 'd10_eau_cafe', 'Il faut du café.', '得来点咖啡。', 'It needs coffee.', { ...coffeeAfter, action: 'laugh' })
    ], { wordIds: ['il_faut_de_leau'] }),
    line('d10_noe_arrosoir', 'A7', 'roof', 'medium', 'pot', 'L’arrosoir… près de la chaise.', '喷壶……在椅子旁边。', 'The watering can… beside the chair.', 'noe', { wordIds: ['arrosoir'], focusWords: ['arrosoir'], hotspot: 'wateringCan' }),
    art('pot_wiggle', 'A8', 'roof', 'medium', 'pot', { kind: 'water', mode: 'optional', optional: true, pot: 1, potId: 1,
      duePotId: 1, pots: [1, 2], allDue: true, checkpointEvery: 8, exitAnytime: true, oncePerDay: true, budget: null,
      invitation: 'wiggle', marker: false, skipAction: 'noeWaters', persistInviteOnHub: true,
      checkpoint: voiced('d10_noe_encore', 'Encore un peu ?', '再来一点？', 'A little more?', 'noe') }),
    line('n_d10_arrose2', 'A8', 'roof', 'medium', 'pot', 'L’eau coule. Deux plantes, deux pots.', '水流下去。两株植物，两个盆。', 'The water flows. Two plants, two pots.', 'neutral'),
    line('n_d10_chat', 'A9', 'roof', 'medium', 'thirdPot', 'Dans le troisième pot… Croissant dort.', '第三个盆里……Croissant 在睡觉。', 'In the third pot… Croissant is asleep.', 'neutral', { silenceBeforeMs: 1500 }),
    art('lef_rideau', 'A10', 'facade', 'wide', 'curtain', { durationMs: 1500 }),
    art('porte_ouverte', 'A11', 'stairs', 'close', 'roofDoor', { sfx: 'door' }),

    line('d10_cam_ou', 'B1', 'kitchen', 'medium', 'camille', 'Vous étiez où ?', '你们刚才在哪儿？', 'Where were you?', 'camille', { neng: true }),
    reply('d10_cam_ou_reply', 'B1', 'kitchen', [
      option('toit', 'd10_cam_ou_toit', 'Sur le toit !', '在楼顶！', 'On the roof!'),
      option('lahaut', 'd10_cam_ou_lahaut', 'Là-haut !', '上面！', 'Up there!')
    ], { wordIds: ['toit', 'la_haut'] }),
    line('n_d10_matin', 'B2', 'kitchen', 'close', 'clock', 'Mardi matin. Huit heures. Camille a un stylo et une feuille.', '星期二早上。八点。Camille 拿着一支笔和一张纸。', 'Tuesday morning. Eight o’clock. Camille has a pen and a sheet of paper.', 'neutral', { time: '08:00' }),
    line('d10_cam_liste', 'B3', 'kitchen', 'close', 'list', 'C’est une liste. La liste de la maison.', '这是一张清单。家里的清单。', 'It is a list. The household list.', 'camille', { wordIds: ['liste', 'regle'], focusWords: ['liste'], hotspot: 'list' }),
    beat('d10_cam_null', 'B3', 'kitchen', 'close', 'list', { ...bands.null, bandFlag: 'd7_band', variants: bands }),
    line('d10_cam_frigo', 'B4', 'kitchen', 'medium', 'fridge', 'Le lait, ça va dans le frigo. Pas sur la table.', '牛奶放冰箱。不是放桌上。', 'The milk goes in the fridge. Not on the table.', 'camille', { wordIds: ['le_lait_dans_le_frigo', 'frigo'] }),
    line('d10_cam_vaisselle', 'B5', 'kitchen', 'medium', 'plates', 'Noé, tu pourrais faire la vaisselle ?', 'Noé，你能洗一下碗吗？', 'Noé, could you do the dishes?', 'camille', { wordIds: ['tu_pourrais_vaisselle', 'tu_pourrais', 'faire_la_vaisselle'] }),
    line('d10_noe_vaisselle', 'B6', 'kitchen', 'close', 'noe', 'Je pourrais… Mais je ne voudrais pas.', '我能……但我不想。', 'I could… But I would not want to.', 'noe'),
    reply('d10_regle', 'B7', 'kitchen', [
      option('frigo', 'd10_regle_frigo', 'Le lait, ça va dans le frigo.', '牛奶放冰箱。', 'The milk goes in the fridge.', goodIdea),
      option('nuit', 'd10_regle_nuit', 'La nuit, pas de bruit.', '晚上别出声。', 'At night, no noise.', goodIdea),
      option('chat', 'd10_regle_chat', 'Croissant dort sur le canapé.', 'Croissant 睡沙发。', 'Croissant sleeps on the sofa.', goodIdea)
    ], { kind: 'choice', flag: 'd10_regle', storyChoice: true, text: fr('Une règle pour la maison. Tu proposes quoi ?'),
      zh: '给家里定一条规矩。你提议什么？', en: 'A house rule. What do you suggest?', wordIds: ['regle'], source: 'js/act1days.js', clip: 'd10_regle', audioId: 'd10_regle' }),
    line('d10_cam_table', 'B8', 'kitchen', 'medium', 'camille', 'Et ça : on mange à table.', '还有这条：在桌上吃饭。', 'And this: we eat at the table.', 'camille', { wordIds: ['on_mange_a_table'] }),
    line('n_d10_noe_ecrit', 'B9', 'kitchen', 'close', 'list', 'Noé prend le stylo. Il écrit : « Jeudi : dîner en bas. »', 'Noé 拿起笔。他写：「星期四：楼下吃晚饭。」', 'Noé takes the pen. He writes: “Thursday: dinner downstairs.”', 'neutral'),
    line('d10_cam_chat', 'B10', 'kitchen', 'medium', 'list', 'Croissant. C’est une liste. Pas un lit.', 'Croissant。这是清单。不是床。', 'Croissant. It is a list. Not a bed.', 'camille'),
    line('d10_noe_stylo', 'B11', 'kitchen', 'close', 'list', 'Mon stylo a disparu !', '我的笔不见了！', 'My pen has disappeared!', 'noe', { neng: true, recognitionOnly: true }),
    line('d10_ou_stylo', 'B12', 'kitchen', 'medium', 'group', 'Où est le stylo ?', '笔在哪儿？', 'Where is the pen?', 'camille', { kind: 'search', graded: false, nonBlocking: true, answer: null,
      options: [
        { id: 'table', text: 'sous la table', zh: '桌子下面', en: 'under the table', hotspot: 'table', empty: true },
        { id: 'canape', text: 'derrière le canapé', zh: '沙发后面', en: 'behind the sofa', hotspot: 'canape', empty: true },
        { id: 'frigo', text: 'sur le frigo', zh: '冰箱上面', en: 'on the fridge', hotspot: 'fridge', empty: true }
      ] }),
    line('d10_cam_frigo2', 'B13', 'kitchen', 'medium', 'fridge', 'Le lait, ça va dans le frigo. Pas le stylo.', '牛奶放冰箱。笔不放冰箱。', 'The milk goes in the fridge. Not the pen.', 'camille'),

    line('n_d10_chaussette', 'C1', 'kitchen', 'wide', 'noe', 'À midi, Noé a une chaussette. Une seule.', '中午，Noé 只穿着一只袜子。就一只。', 'At noon, Noé has one sock. Just one.', 'neutral', { time: '12:00' }),
    line('d10_noe_manque', 'C2', 'kitchen', 'close', 'sock', 'Il manque une chaussette !', '少了一只袜子！', 'A sock is missing!', 'noe', { neng: true, recognitionOnly: true }),
    line('d10_noe_cam', 'C3', 'kitchen', 'medium', 'group', 'Camille… Mon stylo. Ma chaussette.', 'Camille……我的笔。我的袜子。', 'Camille… My pen. My sock.', 'noe'),
    line('d10_pasmoi', 'C4', 'kitchen', 'medium', 'group', 'Ce n’est pas moi.', '不是我。', 'It is not me.', 'camille', { wordIds: ['ce_nest_pas_moi'], neng: true }),
    line('d10_pasmoi_noe', 'C4', 'kitchen', 'medium', 'group', 'Ce n’est pas moi non plus !', '也不是我！', 'It is not me either!', 'noe'),
    reply('d10_qui', 'C5', 'kitchen', [
      option('noe', 'd10_qui_noe', 'C’est Noé !', '是 Noé！', 'It is Noé!', noeDenial),
      option('cam', 'd10_qui_cam', 'C’est Camille !', '是 Camille！', 'It is Camille!', camDenial),
      option('chat', 'd10_qui_chat', 'C’est Croissant !', '是 Croissant！', 'It is Croissant!', pockets)
    ], { flag: 'd10_qui', storyChoice: true, wordIds: ['ce_nest_pas_moi'] }),
    art('d10_afternoon', 'C5', 'kitchen', 'wide', 'group', { kind: 'hub', time: '14:00',
      chores: ['liste', 'vaisselle', 'table', 'cagnotte', 'cache_cache'], nextSceneId: 'n_d10_gouter',
      wateringSceneId: 'pot_wiggle', optionalWatering: true, thirdPotHidden: true,
      spoonVanish: { afterPlate: 6, action: { type: 'object', object: 'spoon', state: 'vanish' },
        line: voiced('d10_noe_cuillere', 'Ma cuillère ?!', '我的勺子？！', 'My spoon?!', 'noe') } }),

    line('n_d10_gouter', 'D1', 'kitchen', 'close', 'croissant', 'Mon croissant. Pour moi.', '我的可颂。给我自己的。', 'My croissant. For me.', 'noe', { time: '17:00' }),
    line('n_d10_miettes', 'D2', 'kitchen', 'close', 'crumbs', 'Il n’y a plus de croissant. Il y a des miettes.', '可颂没了。只剩下碎屑。', 'There is no croissant left. There are crumbs.', 'neutral', { focusWords: ['miettes'], wordIds: ['miettes'], recognitionOnly: true, hotspot: 'crumbs' }),
    line('d10_noe_croissant', 'D3', 'kitchen', 'medium', 'noe', 'Croissant !', 'Croissant！', 'Croissant!', 'noe'),
    line('d10_cam_suit', 'D4', 'kitchen', 'wide', 'crumbs', 'On suit les miettes.', '我们跟着碎屑走。', 'We follow the crumbs.', 'camille', { neng: true, recognitionOnly: true }),
    art('miettes_walk', 'D5', 'stairs', 'medium', 'crumbs', { kind: 'walk', direction: 'up', tiles: 5, hotspot: 'crumbs', storyOnly: true,
      labels: ['sur', 'sous', 'derrière', 'sur', 'sur'], wordIds: [], review: false }),
    art('lef_porte', 'D6', 'stairs', 'wide', 'group', { sfx: 'door', lightUnderDoor: true }),
    line('n_d10_porte_ouverte', 'D7', 'stairs', 'close', 'roofDoor', 'La petite porte est ouverte.', '那扇小门开着。', 'The little door is open.', 'neutral'),

    line('n_d10_coucher', 'E1', 'roof', 'wide', 'group', 'Le toit, le soir.', '傍晚的楼顶。', 'The roof in the evening.', 'neutral'),
    line('d10_ou', 'E2', 'roof', 'medium', 'group', 'Il est où ?', '它在哪儿？', 'Where is he?', 'noe', { kind: 'search', graded: false, nonBlocking: true, answer: 'pot',
      options: [
        { id: 'chaise', text: 'sur la chaise', zh: '椅子上面', en: 'on the chair', hotspot: 'chair', empty: true },
        { id: 'cheminee', text: 'derrière la cheminée', zh: '烟囱后面', en: 'behind the chimney', hotspot: 'chimney', empty: true },
        { id: 'pot', text: 'dans le pot', zh: '花盆里面', en: 'in the pot', hotspot: 'thirdPot', empty: false }
      ] }),
    line('n_d10_tresor', 'E3', 'roof', 'close', 'thirdPot', 'Dans le pot : le stylo, la chaussette, la cuillère… Et sur tout ça, Croissant.', '盆里有：笔、袜子、勺子……在这一切上面，是 Croissant。', 'In the pot: the pen, the sock, the spoon… And on top of it all, Croissant.', 'neutral', { silenceBeforeMs: 3000, holdMs: 3000, highPoint: true, wordIds: ['cuillere'] }),
    line('d10_noe_tout', 'E4', 'roof', 'close', 'sock', 'Tout est là !', '东西全在这儿！', 'Everything is here!', 'noe', { neng: true, recognitionOnly: true }),
    reply('d10_reponse', 'E5', 'roof', [
      option('chat', 'd10_reponse_chat', 'C’est Croissant !', '是 Croissant！', 'It is Croissant!'),
      option('pasmoi', 'd10_reponse_pasmoi', 'Ce n’est pas moi !', '不是我！', 'It is not me!'),
      option('chut', 'd10_reponse_chut', 'Chut… il dort.', '嘘……它在睡觉。', 'Shh… he is asleep.')
    ], { wordIds: ['ce_nest_pas_moi'], afterIf: { flag: 'd10_qui', equals: 'chat', line: right } }),
    line('d10_cam_pot', 'E6', 'roof', 'medium', 'group', 'Croissant. C’est un pot. Pas un lit.', 'Croissant。这是花盆。不是床。', 'Croissant. It is a pot. Not a bed.', 'camille', { silenceAfterMs: 1000, sharedLaugh: true }),
    art('noe_cle', 'E7', 'stairs', 'close', 'roofDoor', { durationMs: 2200, actor: 'noe', checks: 2, sfx: 'click' }),
    art('letter9', 'E7', 'stairs', 'medium', 'group', { kind: 'letter', optional: true, graded: false, saveKey: 'day9_letter',
      prompt: fr('Chère Madame Lefèvre,'), letter: { number: 9, kind: 'Mot', to: 'Madame Lefèvre',
        source: 'DAY10_BANDS_LETTER.md', sourceAvailable: false, delivery: 'under-door', grammar: 'conditionnel_politesse' },
      chunks: [fr('Il faut de l’eau.'), fr('On mange à table.')], wordIds: [] }),
    line('n_d10_ding', 'E8', 'kitchen', 'medium', 'laptop', 'Ding. L’ordinateur de Camille. Un nouveau message.', '叮。Camille 的电脑。一条新消息。', 'Ding. Camille’s computer. A new message.', 'neutral', { sfx: 'notif', time: '21:00' }),
    line('d10_cam_message', 'E9', 'kitchen', 'close', 'laptop', 'Un message… de Madame Martin.', '一条消息……是 Martin 太太发来的。', 'A message… from Madame Martin.', 'camille', { focusWords: ['message'], wordIds: ['message'], focusFolded: true, hotspot: 'laptop' }),
    line('done', 'E10', 'roof', 'close', 'thirdPot', 'Un message. De Madame Martin.', '一条消息。是 Martin 太太发来的。', 'A message. From Madame Martin.', 'neutral', { kind: 'end', clip: 'd10_hook', audioId: 'd10_hook', flags: { day9_done: true } })
  ];

  // Generic art actions are shared with Day 8; staging.beat identifies character-specific posing.
  const direction = {
    n_d10_monte: { action: { type: 'door', at: 'roofDoor', state: 'open', duration: 1800 }, staging: { phase: 'dawn', door: 'open', delayMs: 1800 } },
    n_d10_jour: { staging: { cat: 'none' } },
    d10_noe_beau: { staging: { pose: 'arms' } },
    d10_noe_sec: { action: { type: 'object', object: 'soil', state: 'dry' } },
    n_d10_pose: { action: { type: 'object', object: 'plant', state: 'move', to: 'pot' } },
    d10_noe_arrosoir: { action: { type: 'kitten', gag: 'sprinkle', at: 'spout', duration: 2400 }, staging: { cat: 'spout' } },
    pot_wiggle: { action: { type: 'object', object: 'pot', state: 'wiggle' } },
    n_d10_arrose2: { action: { type: 'object', object: 'soil', state: 'wet' } },
    n_d10_chat: { action: { type: 'kitten', gag: 'sleep', at: 'pot', duration: 1500 }, staging: { thirdPot: 'sleep', cat: 'pot' } },
    lef_rideau: { action: { type: 'object', object: 'curtain', state: 'sway' } },
    porte_ouverte: { action: { type: 'door', at: 'roofDoor', state: 'ajar', duration: 1000 }, staging: { door: 'ajar' } },
    n_d10_matin: { action: { type: 'time', gesture: 'clock', hour: 8 } },
    d10_cam_liste: { action: { type: 'object', object: 'list', state: 'write' } },
    d10_cam_frigo: { action: { type: 'object', object: 'milk', state: 'move', from: 'table', to: 'fridge' } },
    d10_cam_vaisselle: { action: { type: 'object', object: 'plates', state: 'wobble' } },
    d10_noe_vaisselle: { staging: { pose: 'heart' } },
    n_d10_noe_ecrit: { action: { type: 'object', object: 'list', state: 'write' }, staging: { listText: fr('Jeudi : dîner en bas.') } },
    d10_cam_chat: { action: { type: 'kitten', gag: 'sleep', at: 'list' }, staging: { cat: 'list' } },
    d10_noe_stylo: { action: { type: 'object', object: 'pen', state: 'vanish' }, staging: { tailTip: true, pose: 'pockets', delayMs: 3200, reaction: { actor: 'noe', atMs: 2500, gesture: 'pockets' } } },
    d10_cam_frigo2: { action: { type: 'door', at: 'fridge', state: 'open' } },
    n_d10_chaussette: { action: [{ type: 'time', gesture: 'clock', hour: 12 }, { type: 'kitten', gag: 'slip' }], staging: { oneSock: true, pose: 'oneSock' } },
    d10_noe_manque: { action: { type: 'object', object: 'sock', state: 'vanish' }, staging: { oneSock: true, pose: 'oneSock', tailTip: true, delayMs: 3200, reaction: { actor: 'noe', atMs: 2500, gesture: 'shrug' } } },
    n_d10_gouter: { action: { type: 'time', gesture: 'clock', hour: 17 }, staging: { props: ['croissant', 'list'] } },
    n_d10_miettes: { action: { type: 'object', object: 'croissant', state: 'vanish' }, staging: { props: ['crumbs', 'list'], tailTip: true, delayMs: 3200, reaction: { actor: 'camille', atMs: 2500, gesture: 'point' } } },
    d10_cam_suit: { action: { type: 'object', object: 'crumbs', state: 'reveal' } },
    lef_porte: { action: { type: 'door', at: 'lefevreDoor', state: 'closed' }, staging: { lightUnderDoor: true } },
    n_d10_porte_ouverte: { action: { type: 'door', at: 'roofDoor', state: 'ajar' }, staging: { door: 'ajar', pose: 'facepalm' } },
    n_d10_tresor: { action: { type: 'object', object: 'stash', state: 'reveal', duration: 2400 }, staging: { delayMs: 3000, holdMs: 3000, pushIn: { duration: 2400 } } },
    d10_noe_tout: { shot: { type: 'medium', target: 'group' }, staging: { sharedLaugh: true, pose: 'laugh' } },
    d10_cam_pot: { action: { type: 'kitten', gag: 'sleep', at: 'pot' }, staging: { sharedLaugh: true, pose: 'laugh' } },
    noe_cle: { action: { type: 'door', at: 'roofDoor', state: 'locked', actor: 'noe', checks: 2 }, staging: { door: 'locked' } },
    n_d10_ding: { action: { type: 'object', object: 'laptop', state: 'reveal' } },
    done: { staging: { splitEnd: true } }
  };
  for (const scene of scenes) {
    const section = scene.beat[0];
    const phase = ['A', 'B'].includes(section) ? 'morning' : section === 'C' ? 'afternoon' : 'sunset';
    const kitchenProps = section === 'B' ? ['list', 'pen', 'milk', 'plates'] : section === 'C' ? ['list', 'plates'] : ['list', 'crumbs'];
    if (scene.scene === 'kitchen') scene.staging.props = kitchenProps.slice();
    if (section === 'B' && Number(scene.beat.slice(1)) >= 11) scene.staging.props = ['list', 'plates'];
    if (section === 'C') { scene.staging.cat = 'sofa'; scene.staging.oneSock = true; }
    if (section === 'D') { scene.staging.props = ['crumbs', 'list']; scene.staging.cat = 'none'; scene.staging.door = 'ajar'; }
    if (section === 'E' && Number(scene.beat.slice(1)) < 3) scene.staging.thirdPot = 'tease';
    if (section === 'E' && Number(scene.beat.slice(1)) >= 3) {
      scene.staging.thirdPot = 'stash'; scene.staging.cat = 'pot'; scene.staging.props = ['pen', 'sock', 'spoon', 'crumbs'];
    }
    if (section === 'E' && Number(scene.beat.slice(1)) >= 8) {
      scene.staging.phase = 'night'; scene.staging.props.push('laptop'); scene.lighting = 'night';
      if (scene.scene === 'kitchen') scene.staging.cat = 'none';
    } else scene.staging.phase = phase;
    const directed = direction[scene.id] || {};
    Object.assign(scene.staging, directed.staging || {});
    if (directed.shot) scene.shot = directed.shot;
    if (directed.action) scene.action = directed.action;
    scene.module = moduleForKind(scene.kind);
    if (scene.audioId) audio[scene.audioId] = '../audio/w1/' + scene.audioId + '.mp3';
    if (scene.text) newFrench.push(scene);
  }

  const requiredChunks = ['tu_pourrais_vaisselle', 'le_lait_dans_le_frigo', 'il_faut_de_leau', 'on_mange_a_table', 'ce_nest_pas_moi'];
  const day9WordIds = ['liste', 'regle', 'tu_pourrais', 'faire_la_vaisselle', 'frigo', 'jardin', 'toit', 'la_haut', 'ce_nest_pas_moi', 'arrosoir'];
  const words = [], wordById = {}, oldIdToWordId = {}, lineWordIds = {};
  function addWord(record) {
    if (wordById[record.id]) return wordById[record.id];
    const met = I.firstMeet[record.id];
    const encounter = scenes.find(s => s.wordIds?.includes(record.id));
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
      scene: met?.scene || encounter?.scene || 'kitchen', pot, potId: pot, week: pot, metDay: met?.day || record.day || 9,
      seen: !!met || record.day <= 7, field: record.field || (record.pos === 'chunk' ? 'house_rules' : 'home'),
      gender: record.gender === 'm' || record.gender === 'f' ? record.gender : /^la |^une /.test(record.fr) ? 'f' : /^le |^un /.test(record.fr) ? 'm' : null,
      pos: record.pos || (/^(?:le |la |les |l’)/.test(record.fr) ? 'noun' : 'chunk'),
      growthEligible: !!met || record.day <= 9 || !!encounter, recognitionOnly: !!record.recognitionOnly,
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
    answer: deck.cloze?.accept?.[0] || deck.produce?.accept?.[0] || deck.fr, cloze: deck.cloze?.fr,
    recognitionOnly: !!deck.rare || !!deck.mcOnly || deck.id === 'cest_une_bonne_idee' });
  const wordlist = I.wordlist.filter(w => w.day === 9).map((item, index) => ({ ...item, id: day9WordIds[index],
    ...(index === 8 ? { fr: fr('Ce n’est pas moi !'), zh: '不是我！', en: 'It is not me!', pos: 'chunk', gender: '—', frequency: 'story chunk' } : {}) }));
  for (const item of wordlist) addWord({ ...item, fr: item.fr.replace(/ \([mf]\.\)/g, ''),
    ...(item.id === 'ce_nest_pas_moi' ? { module: 'week2', story: 'd10', band: 'A1', wordClip: 'ce_nest_pas_moi', audioId: 'd10_pasmoi',
      forms: ['ce n’est pas moi'], accepted: [fr('Ce n’est pas moi !')], sentence: fr('Ce n’est pas moi !'), sentenceZh: '不是我！', sentenceEn: 'It is not me!' } : {}) });
  for (const item of I.wordlist.filter(w => w.day <= 8)) {
    const base = item.fr.replace(/ \([mf]\.?\)/g, '').replace(/…/g, '').trim();
    if (!words.some(w => normalize(w.fr) === normalize(base) || w.forms.some(f => normalize(f) === normalize(base)))) addWord({ ...item, id: 'v_' + slug(base), recognitionOnly: item.frequency.startsWith('scene') });
  }
  for (const item of [
    { id: 'miettes', fr: 'les miettes', forms: ['miette', 'miettes'], zh: '碎屑', en: 'crumbs', gender: 'f' },
    { id: 'cuillere', fr: 'la cuillère', forms: ['cuillère', 'cuillères'], zh: '勺子', en: 'spoon', gender: 'f' },
    { id: 'message', fr: 'le message', forms: ['message', 'messages'], zh: '消息', en: 'message', gender: 'm' }
  ]) addWord({ ...item, pos: 'noun', recognitionOnly: true });
  for (const scene of scenes) {
    for (const id of scene.wordIds || []) {
      const word = wordById[id];
      if (!word) throw new Error('Unknown word ' + id);
      word.encounters.push({ id: scene.id, day: 9, scene: scene.scene, text: scene.text, zh: scene.zh, en: scene.en });
      (lineWordIds[scene.id] ||= []).push(id);
    }
  }
  for (const [id, value] of Object.entries(I.lines)) if (wordById[value.target]) oldIdToWordId[id] = value.target;
  for (const lex of A.LEXICON_FIELDS?.items || []) {
    const word = words.find(w => lex.deckIds?.includes(w.id) || normalize(lex.fr_def) === normalize(w.fr));
    if (word) { oldIdToWordId[lex.id] ||= word.id; word.lexicon ||= lex; }
  }
  for (const word of words) word.legacyIds = Object.keys(oldIdToWordId).filter(id => oldIdToWordId[id] === word.id);
  const glossAdditions = {
    camille: ['Camille（人名，室友）', 'Camille (a housemate)', 'une colocataire', 0, 1, 'n'],
    'lefèvre': ['Lefèvre 太太', 'Madame Lefèvre', 'la voisine', 0, 1, 'n'],
    'noé': ['Noé（人名，室友）', 'Noé (a housemate)', 'un colocataire', 0, 1, 'n'],
    seule: ['唯一的；只有一（只）', 'only; alone', 'une seule, pas deux', 0, 1, 'a'],
    petite: ['小的', 'small', 'de petite taille', 0, 1, 'a'],
    demie: ['半', 'half', 'la moitié', 0, 1, 'a'],
    coule: ['流；水流下去', 'flows', 'l’eau va vers le bas', 0, 1, 'v'],
    redresse: ['扶正；挺起来', 'straightens; lifts up', 'se remet droit', 0, 1, 'v'],
    cligne: ['眨（眼）', 'blinks', 'ferme puis ouvre les yeux', 0, 1, 'v'],
    cligner: ['眨眼', 'to blink', 'fermer puis ouvrir les yeux', 0, 1, 'v'],
    normalement: ['一般来说；按理说', 'normally; usually', 'en temps normal', 0, 1, 'x']
  };
  const glossary = { ...A.GLOSSARY_DATA, E: { ...A.GLOSSARY_DATA?.E, ...glossAdditions }, F: { ...A.GLOSSARY_DATA?.F } };
  function lookup(text) {
    const surface = String(text || '').toLowerCase().replace(/'/g, '’').replace(/^[«\s]+|[».,?!;:\s]+$/g, '');
    const bare = surface.replace(/^(?:l’|d’|j’|qu’|n’|c’)/, '');
    // Explicit reviewed surface glosses take precedence over inferred morphology.
    const reviewed = glossAdditions[bare];
    const word = !reviewed && words.find(w => normalize(w.fr) === normalize(surface) || w.forms.some(f => normalize(f) === normalize(bare)));
    if (word) return { ...word, surface, lemma: word.fr.replace(/^(?:le |la |les |un |une |des |l’)/, '') };
    const conjugated = A.Conj?.lemmaOf(bare, { verbOnly: true }), irregular = glossary.F[bare];
    const candidates = [bare, conjugated?.infinitive, irregular?.[0], bare.replace(/s$/, ''), bare.replace(/x$/, '')].filter(Boolean);
    const feminine = bare.replace(/es?$/, '');
    if (feminine !== bare && glossary.E[feminine]?.[5].includes('a')) candidates.push(feminine);
    const regular = bare.replace(/(?:ent|ons|ez|es|e)$/, 'er');
    if (regular !== bare && glossary.E[regular]?.[5].includes('v')) candidates.push(regular);
    for (const lemma of candidates) {
      const entry = glossary.E[lemma];
      if (!entry) continue;
      return { id: 'cw_' + slug(lemma), fr: lemma, lemma, surface, zh: entry[0], en: entry[1], para: entry[2], frequency: entry[3],
        pos: entry[5].includes('v') ? 'verb' : entry[5].includes('n') ? 'noun' : entry[5].includes('a') ? 'adj' : 'other',
        gender: irregular?.[1]?.[0] || null, number: irregular?.[1]?.[1] || null, conjugated,
        recognitionOnly: entry[3] < 5, pot: 2, potId: 2, seen: false, source: reviewed ? 'content-day9.js' : 'js/glossary-data.js' };
    }
    return null;
  }
  const orderedIds = scenes.map(s => s.id);
  const approvedText = Object.fromEntries(scenes.map(s => [s.id, [s.text, s.zh, s.en]]));
  function resolveBand(scene, flags = {}) {
    const variant = scene.variants?.[flags[scene.bandFlag || 'd7_band'] || 'null'];
    let resolved = variant ? { ...scene, ...variant, id: scene.id } : scene;
    if (scene.afterIf && flags[scene.afterIf.flag] === scene.afterIf.equals) {
      resolved = { ...resolved, options: scene.options.map(o => ({ ...o, after: scene.afterIf.line })) };
    }
    return resolved;
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
      for (const child of [...(scene.options || []), ...Object.values(scene.variants || {}), scene.checkpoint, scene.afterIf?.line, scene.spoonVanish?.line]) request(child, scene.id);
    }
    return { scenes: list.length, counts: Object.fromEntries(kinds.map(kind => [kind, list.filter(s => s.kind === kind).length])), audioRequests: [...requests.values()] };
  }
  function compile(list = scenes) {
    const seen = new Set();
    for (const scene of list) {
      if (!scene.id || seen.has(scene.id)) throw new Error('Duplicate or absent scene id: ' + scene.id);
      seen.add(scene.id);
      if (!kinds.includes(scene.kind) || !['kitchen', 'roof', 'stairs', 'facade'].includes(scene.scene)) throw new Error('Invalid scene type: ' + scene.id);
      if (scene.module !== moduleForKind(scene.kind)) throw new Error('Invalid scene module: ' + scene.id);
      for (const record of [scene, ...(scene.options || []), ...Object.values(scene.variants || {}), ...(scene.options || []).map(o => o.after).filter(Boolean)]) {
        for (const key of ['text', 'zh', 'en']) if (typeof record[key] !== 'string') throw new Error('Missing ' + key + ': ' + scene.id);
        if (record.text !== fr(record.text)) throw new Error('French typography: ' + scene.id);
      }
      if (!scene.shot?.type || !scene.shot.target || scene.staging?.day !== 9) throw new Error('Missing staging: ' + scene.id);
      if ([scene.text, scene.zh, scene.en].join('|') !== approvedText[scene.id]?.join('|')) throw new Error('Approved text changed: ' + scene.id);
      for (const id of scene.wordIds || []) if (!wordById[id]) throw new Error('Unknown word ' + id);
      if (['reply', 'choice'].includes(scene.kind) && (!scene.options?.length || !scene.anyAttemptCounts || scene.graded !== false)) throw new Error('Reply contract: ' + scene.id);
      if (scene.kind === 'search' && (!scene.options?.every(o => o.hotspot) || scene.answer !== null && !scene.options.some(o => o.id === scene.answer))) throw new Error('Picture search contract: ' + scene.id);
      if (scene.speaker === 'lefevre') throw new Error('Madame Lefèvre is seen, never heard');
    }
    if (list.map(s => s.id).join('|') !== orderedIds.join('|') || list[0].id !== 'n_d10_monte') throw new Error('Day 9 canonical sequence changed');
    const water = list.find(s => s.kind === 'water');
    if (list.filter(s => s.kind === 'water').length !== 1 || water.id !== 'pot_wiggle' || water.mode !== 'optional' || !water.exitAnytime || water.checkpointEvery !== 8 || water.scene !== 'roof') throw new Error('Optional watering contract');
    const walk = list.find(s => s.kind === 'walk');
    if (list.filter(s => s.kind === 'walk').length !== 1 || walk.tiles !== 5 || walk.scene !== 'stairs' || walk.review) throw new Error('Story walk contract');
    const reveal = list.find(s => s.id === 'n_d10_tresor');
    if (reveal.holdMs !== 3000 || reveal.staging.thirdPot !== 'stash') throw new Error('Reveal hold contract');
    if (list.some(s => s.staging.thirdPot === 'stash' && list.indexOf(s) < list.indexOf(reveal))) throw new Error('Early stash reveal');
    if (list.find(s => s.kind === 'letter')?.letter?.to !== 'Madame Lefèvre') throw new Error('Letter recipient changed');
    return list;
  }
  const api = { version: 5, day: 9, title: 'Le toit', story: 'd10', scenes: compile(),
    sceneById: Object.fromEntries(scenes.map(s => [s.id, s])), legacySceneIds: orderedIds.slice(), v3SceneIds: [],
    words, wordById, wordlist, day9WordIds, requiredChunks, oldIdToWordId, lineWordIds, audio, newFrench,
    glossary, grammar: A.GRAMMAR_DATA || [], voicemail: null, chats: [], hotspots: [],
    pots: [{ id: 1, name: 'Chez nous', location: 'roof', plant: 'martin' }, { id: 2, name: 'À table', location: 'roof', plant: 'basilic' }],
    evening: { id: 'eve_d10', scene: 'roof', silent: true, staging: { day: 9, phase: 'night', thirdPot: 'sleep', cat: 'pot', lefevreLamp: true } },
    lessonInstructions: { pick: fr('Écoute, puis choisis.'), chips: fr('Mets les mots dans l’ordre.'), diary: fr('Aujourd’hui…') },
    compile, auditLesson, resolveBand, resolveScene: resolveBand, lookup, normalize, french: fr,
    accepts: (scene, answer) => L.gradeAnswer(answer, scene.accepted || [], scene.canonical || scene.answer).correct,
    clipPath: id => audio[id] || '../audio/w1/' + id + '.mp3' };
  root.Day9Content = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
