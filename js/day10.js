/* Day 10 « La clé » — DAY10_DRAFT_v2 (34 numbered steps + 12b).
 * Band lines follow the Day 8 A/B/C/null pattern: the v1 wording is not in this build. */
(function (root) {
  'use strict';
  var Fr = root.A411 && root.A411.Fr;
  if (!Fr && typeof require === 'function') Fr = require('./fr.js');
  var fr = Fr.normalizeFr;
  var NB = Fr.NB;

  function narr(id, french, zh, en, art, beat) {
    return { t: 'narr', id: id, fr: fr(french), zh: zh, en: en, art: art, beat: beat };
  }
  function line(id, art, beat) {
    return { t: 'line', id: id, art: art, beat: beat };
  }

  var LINES = {
    d10_cam_liste: { speaker: 'camille', fr: fr('C’est une liste. La liste de la maison.'), zh: '这是一张清单。家里的清单。', en: 'It’s a list. The list for the house.', label: 'understand', target: 'cest_une_bonne_idee' },
    d10_cam_a: { speaker: 'camille', fr: fr('Samedi, elle a souri. On fait attention.'), zh: '星期六她是笑着走的。我们小心一点。', en: 'On Saturday she left smiling. We are careful.', label: 'atmosphere' },
    d10_cam_b: { speaker: 'camille', fr: fr('Elle revient dans un mois. Moins de bruit.'), zh: '她一个月后回来。少一点声音。', en: 'She comes back in a month. Less noise.', label: 'atmosphere' },
    d10_cam_c: { speaker: 'camille', fr: fr('On écrit les règles. On fait très attention.'), zh: '我们把规矩写下来。我们会非常小心。', en: 'We write the rules. We are very careful.', label: 'atmosphere' },
    d10_cam_null: { speaker: 'camille', fr: fr('C’est mardi. On écrit la liste.'), zh: '今天是星期二。我们写清单。', en: 'It’s Tuesday. We write the list.', label: 'atmosphere' },
    d10_cam_frigo: { speaker: 'camille', fr: fr('Le lait, ça va dans le frigo. Pas sur la table.'), zh: '牛奶放冰箱。不放桌上。', en: 'The milk goes in the fridge. Not on the table.', label: 'understand', target: 'le_lait_dans_le_frigo' },
    d10_cam_vaisselle: { speaker: 'camille', fr: fr('Noé, tu pourrais faire la vaisselle ?'), zh: 'Noé，你能洗一下碗吗？', en: 'Noé, could you do the dishes?', label: 'understand', target: 'tu_pourrais_vaisselle' },
    d10_noe_vaisselle: { speaker: 'noe', fr: fr('Je pourrais… Mais je ne voudrais pas.'), zh: '我可以……但我不想。', en: 'I could… But I wouldn’t want to.', label: 'understand' },
    d10_cam_chat: { speaker: 'camille', fr: fr('Croissant. C’est une liste. Pas un lit.'), zh: 'Croissant。这是清单。不是床。', en: 'Croissant. It’s a list. Not a bed.', label: 'atmosphere' },
    d10_cam_cafe: { speaker: 'camille', fr: fr('Bonjour, Madame. Vous voulez un café ?'), zh: '您好。您要喝杯咖啡吗？', en: 'Hello, Madame. Would you like a coffee?', label: 'understand' },
    d10_lef_bonjour: { speaker: 'lefevre', fr: fr('Non, merci. Je ne reste pas.'), zh: '不了，谢谢。我不进来了。', en: 'No, thank you. I’m not staying.', label: 'understand' },
    d10_lef_toi: { speaker: 'lefevre', fr: fr('C’est pour vous.'), zh: '这是给你的。', en: 'This is for you.', label: 'understand' },
    d10_lef_jardin: { speaker: 'lefevre', fr: fr('La clé du toit. Il y a un jardin, là-haut.'), zh: '楼顶的钥匙。上面有一个花园。', en: 'The key to the roof. There is a garden, up there.', label: 'understand' },
    d10_noe_jardin: { speaker: 'noe', fr: fr('Un jardin ? Au-dessus de nous ?'), zh: '花园？就在我们头顶上？', en: 'A garden? Above us?', label: 'understand' },
    d10_lef_allez: { speaker: 'lefevre', fr: fr('Allez-y. Moi… pas encore.'), zh: '你们去吧。我……还不行。', en: 'Go ahead. Me… not yet.', label: 'understand' },
    d10_cam_toit: { speaker: 'camille', fr: fr('Le toit… C’est beau.'), zh: '楼顶……真美。', en: 'The roof… It’s beautiful.', label: 'understand' },
    d10_noe_sec: { speaker: 'noe', fr: fr('Tout est sec. Le jardin dort.'), zh: '全都干了。花园在睡觉。', en: 'Everything is dry. The garden is asleep.', label: 'understand' },
    d10_noe_ici: { speaker: 'noe', fr: fr('Ici ? Dans ce pot ?'), zh: '放这里？种在这个盆里？', en: 'Here? In this pot?', label: 'understand' },
    d10_cam_idee: { speaker: 'camille', fr: fr('C’est une bonne idée.'), zh: '这是个好主意。', en: 'It’s a good idea.', label: 'understand', target: 'cest_une_bonne_idee' }
  };

  var kitchen = { scene: 'kitchen', camille: 'idle', noe: 'idle', cat: 'sit' };
  var door = { scene: 'doorway', door: 'open', voisine: 'idle', camille: 'idle', noe: 'idle' };
  var roof = { scene: 'rooftop', placeholder: true, camille: 'idle', noe: 'idle', cat: 'sit' };

  var IDEA = { fr: fr('Camille : « C’est une bonne idée. »'), zh: 'Camille：「这是个好主意。」', en: 'Camille: “It’s a good idea.”' };

  var STEPS = [
    narr('n_d10_matin', 'Mardi matin. Huit heures. Camille a un stylo et une feuille.', '星期二早上。八点。Camille 拿着笔和纸。', 'Tuesday morning. Eight o’clock. Camille has a pen and a sheet of paper.', Object.assign({}, kitchen, { props: [['paper', 40, 36]] }), 'd10_kitchen'),
    line('d10_cam_liste', kitchen, 'd10_kitchen'),
    Object.assign(line('d10_cam_a', kitchen, 'd10_kitchen'), { when: { k: 'd7_band', v: ['A'] } }),
    Object.assign(line('d10_cam_b', kitchen, 'd10_kitchen'), { when: { k: 'd7_band', v: ['B'] } }),
    Object.assign(line('d10_cam_c', kitchen, 'd10_kitchen'), { when: { k: 'd7_band', v: ['C'] } }),
    Object.assign(line('d10_cam_null', kitchen, 'd10_kitchen'), { when: { k: 'd7_band', v: [null] } }),
    { t: 'focus', w: 'liste', art: Object.assign({}, kitchen, { props: [['paper', 40, 36]], focus: 'paper' }), beat: 'd10_kitchen' },
    line('d10_cam_frigo', kitchen, 'd10_kitchen'),
    line('d10_cam_vaisselle', kitchen, 'd10_kitchen'),
    line('d10_noe_vaisselle', Object.assign({}, kitchen, { noe: 'idle' }), 'd10_kitchen'),
    { t: 'choice', key: 'd10_regle', beat: 'd10_kitchen', fr: fr('Une règle pour la maison. Tu dis quoi ?'), zh: '一条家里的规矩。你说什么？（没有对错）', en: 'A rule for the house. What do you say? (No wrong answer.)', art: kitchen,
      opts: [
        { id: 'frigo', fr: fr('Le lait, dans le frigo.'), zh: '牛奶放冰箱', en: 'The milk, in the fridge', after: IDEA },
        { id: 'nuit', fr: fr('Pas de bruit la nuit.'), zh: '晚上不许吵', en: 'No noise at night', after: IDEA },
        { id: 'chat', fr: fr('Croissant, dans ton panier.'), zh: 'Croissant，回你的窝', en: 'Croissant, in your basket', after: IDEA }
      ] },
    narr('n_d10_noe_ecrit', 'Noé prend le stylo. Il écrit : « Jeudi : dîner en bas. »', 'Noé 拿过笔。他写道：「星期四：在楼下吃饭。」', 'Noé takes the pen. He writes: “Thursday: dinner downstairs.”', kitchen, 'd10_kitchen'),
    line('d10_cam_chat', Object.assign({}, kitchen, { cat: 'sit' }), 'd10_kitchen'),
    narr('n_d10_toc', 'Toc toc. Quelqu’un frappe à la porte.', '咚咚。有人敲门。', 'Knock knock. Someone is at the door.', { scene: 'doorway', door: 'closed', camille: 'ask', sfx: 'knock' }, 'd10_knock'),
    narr('n_d10_lef_porte', 'C’est Madame Lefèvre. Elle a la main fermée.', '是 Lefèvre 太太。她一只手握着。', 'It’s Madame Lefèvre. Her hand is closed.', door, 'd10_knock'),
    line('d10_cam_cafe', door, 'd10_knock'),
    line('d10_lef_bonjour', door, 'd10_knock'),
    narr('n_d10_cle', 'Elle ouvre la main. La vieille clé.', '她摊开手。那把旧钥匙。', 'She opens her hand. The old key.', Object.assign({}, door, { props: [['key', 40, 40, 'hl']], focus: 'key' }), 'd10_knock'),
    { t: 'focus', w: 'cle', art: Object.assign({}, door, { props: [['key', 40, 40]], focus: 'key' }), beat: 'd10_knock' },
    line('d10_lef_toi', door, 'd10_knock'),
    { t: 'choice', key: 'd10_pourmoi', beat: 'd10_knock', fr: fr('La clé est dans ta main. Tu dis quoi ?'), zh: '钥匙在你手里。你说什么？（说什么都行）', en: 'The key is in your hand. What do you say? (Any line counts.)', art: door,
      opts: [
        { id: 'pourmoi', fr: fr('C’est pour moi ?'), zh: '给我的？', en: 'Is this for me?' },
        { id: 'merci', fr: fr('Merci, Madame.'), zh: '谢谢您', en: 'Thank you, Madame.' },
        { id: 'quoi', fr: fr('C’est quoi ?'), zh: '这是什么？', en: 'What is it?' }
      ] },
    line('d10_lef_jardin', Object.assign({}, door, { voisine: 'point' }), 'd10_knock'),
    line('d10_noe_jardin', Object.assign({}, door, { noe: 'ask' }), 'd10_knock'),
    line('d10_lef_allez', door, 'd10_knock'),
    narr('n_d10_descend', 'Elle descend. Sa porte se ferme. Doucement.', '她下楼了。她的门轻轻关上。', 'She goes down. Her door closes. Softly.', { scene: 'stairs', sfx: 'door' }, 'd10_knock'),
    narr('n_d10_monte', 'La petite porte, en haut. La clé tourne.', '顶上的小门。钥匙转动了。', 'The little door, at the top. The key turns.', { scene: 'stairs', focus: 'porte' }, 'd10_climb'),
    { t: 'focus', w: 'toit', art: roof, beat: 'd10_roof' },
    line('d10_cam_toit', roof, 'd10_roof'),
    line('d10_noe_sec', roof, 'd10_roof'),
    { t: 'focus', w: 'jardin', art: Object.assign({}, roof, { focus: 'pots' }), beat: 'd10_roof' },
    narr('n_d10_basilic', 'Noé a le basilic de Madame Lefèvre.', 'Noé 拿着 Lefèvre 太太的罗勒。', 'Noé has Madame Lefèvre’s basil.', Object.assign({}, roof, { props: [['basil', 40, 30]] }), 'd10_roof'),
    line('d10_noe_ici', roof, 'd10_roof'),
    narr('n_d10_plante', 'Tu plantes le basilic. Croissant aide… un peu trop.', '你把罗勒种进盆里。Croissant 也来帮忙。帮得有点多。', 'You plant the basil. Croissant helps… a bit too much.', Object.assign({}, roof, { planted: true }), 'd10_plant'),
    { t: 'choice', key: 'd10_eau', beat: 'd10_say', fr: fr('La terre est sèche. Tu dis quoi ?'), zh: '土是干的。你说什么？', en: 'The soil is dry. What do you say?', art: Object.assign({}, roof, { planted: true }),
      opts: [
        { id: 'eau', fr: fr('Il faut de l’eau.') },
        { id: 'eau2', fr: fr('Il faut de l’eau, non ?') },
        { id: 'cafe', fr: fr('Il faut du café.'), after: { fr: fr('Noé rit. « Pour moi, oui. »'), zh: 'Noé 笑了。「我是需要。」', en: 'Noé laughs. “For me, yes.”' } }
      ] },
    narr('n_d10_arrose', 'L’eau coule. La terre devient plus sombre. Une feuille se redresse.', '水流下去。泥土变深了。一片叶子抬了起来。', 'The water runs. The soil turns darker. One leaf lifts.', Object.assign({}, roof, { planted: true, watered: true, sfx: 'water' }), 'd10_water'),
    line('d10_cam_idee', Object.assign({}, roof, { planted: true, watered: true }), 'd10_water'),
    narr('n_d10_regard', 'En bas, sa porte est fermée. Il y a de la lumière sous la porte.', '楼下，她的门关着。门缝里有光。', 'Downstairs, her door is closed. There is light under the door.', { scene: 'stairs', night: true }, 'd10_down'),
    { t: 'done', beat: 'd10_done', art: { scene: 'title', night: true, roofLight: true },
      hook: { fr: fr('Sur le toit, il y a un jardin. Et une plante qui ne dort plus.'), zh: '楼顶上有一个花园。还有一盆不再睡觉的植物。', en: 'On the roof, there is a garden. And a plant that is no longer asleep.' } }
  ];

  var CHAPTER = {
    id: 'd10', n: 10, title: 'La clé', lesson: 'd10',
    deck: ['cest_une_bonne_idee', 'tu_pourrais_vaisselle', 'le_lait_dans_le_frigo', 'cest_pour_moi', 'il_faut_de_leau'],
    steps: STEPS
  };

  var HUB = {
    order: ['d10_kitchen', 'd10_knock', 'd10_climb', 'd10_roof', 'd10_plant', 'd10_say', 'd10_water', 'd10_down', 'd10_done'],
    meta: {
      d10_kitchen: { auto: true, scene: true },
      d10_knock: { auto: true, scene: true },
      d10_climb: { scene: true, hotspot: 'rooftop' },
      d10_roof: { auto: true, scene: true },
      d10_plant: { scene: true, hotspot: 'pot_empty' },
      d10_say: { auto: true, scene: true },
      d10_water: { scene: true, hotspot: 'watering_can' },
      d10_down: { auto: true, scene: true },
      d10_done: { auto: true, scene: true, done: true }
    }
  };

  var WORDS = {
    liste: { fr: fr('la liste'), forms: ['liste'], focus: ['paper'], prop: null, para: fr('On écrit les choses à faire.'), zh: '清单', en: 'list', say: { by: 'camille', tts: 'La liste… la liste.' } },
    toit: { fr: fr('le toit'), forms: ['toit'], focus: ['toit'], prop: null, para: fr('En haut de la maison.'), zh: '楼顶', en: 'roof', say: { by: 'camille', tts: 'Le toit… le toit.' } },
    jardin: { fr: fr('le jardin'), forms: ['jardin'], focus: ['pots'], prop: null, para: fr('Là où on plante.'), zh: '花园', en: 'garden', say: { by: 'noe', tts: 'Le jardin… le jardin.' } }
  };

  function deckCard(id, french, zh, en, grammar) {
    var shown = fr(french);
    return {
      id: id, module: 'week2', pot: 'a_table', grammar: grammar, band: 'A1', speaker: 'camille',
      fr: shown, zh: zh, en: en, story: 'd10',
      listen: { answer: 'yes', options: [
        { id: 'yes', zh: zh, en: en },
        { id: 'no', zh: '不是这个意思', en: 'not this meaning' },
        { id: 'later', zh: '以后再说', en: 'later' }
      ] },
      produce: { accept: [shown] }
    };
  }

  var DECK = [
    deckCard('cest_une_bonne_idee', 'C’est une bonne idée.', '这是个好主意。', 'It’s a good idea.', 'cest'),
    deckCard('tu_pourrais_vaisselle', 'Tu pourrais faire la vaisselle ?', '你能洗一下碗吗？', 'Could you do the dishes?', 'conditionnel'),
    deckCard('le_lait_dans_le_frigo', 'Le lait, ça va dans le frigo.', '牛奶放冰箱。', 'The milk goes in the fridge.', 'dans'),
    deckCard('cest_pour_moi', 'C’est pour moi ?', '这是给我的吗？', 'Is this for me?', 'cest'),
    deckCard('il_faut_de_leau', 'Il faut de l’eau.', '得浇水。', 'It needs water.', 'il_faut'),
    deckCard('on_mange_a_table', 'On mange à table.', '我们在饭桌上吃。', 'We eat at the table.', 'on'),
    deckCard('pas_de_nourriture_canape', 'Pas de nourriture sur le canapé.', '不许在沙发上吃东西。', 'No food on the sofa.', 'pas_de')
  ];

  var LETTER = {
    n: 10, ch: 'd10', kind: 'Liste', to: 'le frigo', grammar: 'conditionnel', band: 'A1',
    intro: { zh: '清单贴在冰箱上。你补上最后一行。', en: 'The list is on the fridge. You add the last line.' },
    body: [
      ['La liste de la maison'],
      ['1. Le lait, ça va dans le frigo.'],
      ['2. Noé, tu ', { gap: 'pourrais' }, ' faire la vaisselle' + NB + '?'],
      ['3. Pas de bruit la nuit.'],
      ['4. Croissant, dans ton panier.'],
      [fr('5. Jeudi : dîner en bas.')],
      [fr('6. Le jardin : un peu d’eau.')]
    ],
    gaps: {
      pourrais: { type: 'mc', answer: 'pourrais', options: ['pourrais', 'peux', 'fais'],
        fr: fr('Tu pourrais faire la vaisselle ?'), zh: '你能洗一下碗吗？', en: 'Could you do the dishes?',
        h1: { zh: '客气地请人做事：tu pourrais + 动词原形。', en: 'A polite request: tu pourrais + infinitive.' },
        h2: { zh: 'p o u r r a i s。', en: 'p o u r r a i s.' } }
    }
  };

  var LESSON = {
    title: fr('Tu pourrais… ?'),
    steps: [
      { kind: 'example', prof: fr('Regarde. On demande poliment.'), ex: [fr('Tu pourrais faire la vaisselle ?')], mark: ['pourrais'],
        zh: '用 pourrais 请别人帮忙，语气更客气。', en: 'pourrais asks for help, more politely.' },
      { kind: 'pattern', prof: fr('tu pourrais + verbe'), pattern: ['tu pourrais', '+', 'infinitif', '+', '?'],
        zh: '后面接动词原形，句末是问号。', en: 'Then the infinitive, and a question mark.' },
      { kind: 'try', prof: fr('À toi !'), q: fr('Tu ___ faire la vaisselle ?'), options: ['pourrais', 'peux', 'fais'], answer: 'pourrais',
        zh: '请 Noé 洗碗。', en: 'Ask Noé to do the dishes.', why: { zh: '客气的请求用 pourrais。', en: 'A polite request uses pourrais.' } }
    ]
  };

  var RITUAL = { fr: fr('La nuit, sur le toit. Le basilic a bu. Croissant dort sur la vieille chaise.'), zh: '夜里，楼顶上。罗勒喝过水了。Croissant 睡在那把旧椅子上。', en: 'Night, on the roof. The basil has had water. Croissant sleeps on the old chair.', sfx: ['purr'] };

  var REQUIRED_IDS = ['n_d10_matin', 'd10_cam_liste', 'd10_cam_frigo', 'd10_cam_vaisselle', 'd10_noe_vaisselle', 'd10_regle', 'n_d10_noe_ecrit', 'd10_cam_chat', 'n_d10_toc', 'n_d10_lef_porte', 'd10_cam_cafe', 'd10_lef_bonjour', 'n_d10_cle', 'd10_lef_toi', 'd10_pourmoi', 'd10_lef_jardin', 'd10_noe_jardin', 'd10_lef_allez', 'n_d10_descend', 'n_d10_monte', 'd10_cam_toit', 'd10_noe_sec', 'n_d10_basilic', 'd10_noe_ici', 'n_d10_plante', 'd10_eau', 'n_d10_arrose', 'd10_cam_idee', 'n_d10_regard'];

  var api = {
    LINES: LINES, STEPS: STEPS, CHAPTER: CHAPTER, HUB: HUB, WORDS: WORDS, DECK: DECK,
    LETTER: LETTER, LESSON: LESSON, RITUAL: RITUAL, REQUIRED_IDS: REQUIRED_IDS, NB: NB
  };
  root.A411 = root.A411 || {};
  root.A411.Day10 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
