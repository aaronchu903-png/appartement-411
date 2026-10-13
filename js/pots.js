/* Act I pots — one pot is one word set (ACT1_POTS). A module is only a story grouping.
 * Leaves follow FSRS retrievability R. Stem follows median stability S. Roots follow
 * distinct contexts. Plants never die. */
(function (root) {
  'use strict';
  var Fr = root.A411 && root.A411.Fr;
  if (!Fr && typeof require === 'function') Fr = require('./fr.js');
  var fr = Fr.normalizeFr;
  var DECAY = -0.5;
  var FACTOR = 19 / 81;
  var DAY = 86400000;
  var GROWN_S = 7;
  var GROWN_SUCCESSES = 2;
  var GROWN_RATIO = 0.8;

  function item(id, french, deck, scenes) {
    return { id: id, fr: fr(french), deck: deck || [], scenes: scenes || [] };
  }

  var POTS = [
    {
      n: 1, id: 'chez_nous', fr: 'Chez nous', indoor: true,
      items: [
        item('bonjour', 'Bonjour !', ['bonjour'], ['d1']),
        item('salut', 'Salut !', ['salut'], ['d1']),
        item('bonsoir', 'Bonsoir !', ['bonsoir'], ['d6', 'd9']),
        item('je_mappelle', 'Je m’appelle…', ['je_mappelle'], ['d1']),
        item('tu_tappelles_comment', 'Tu t’appelles comment ?', ['tu_tappelles_comment'], ['w1']),
        item('moi_cest', 'Moi, c’est…', ['moi_cest'], ['w1']),
        item('enchante', 'Enchanté(e) !', ['enchante'], ['d7']),
        item('colocataire', 'le / la colocataire', ['je_suis', 'jai_elision'], ['d1']),
        item('tu_habites', 'Tu habites où ?', ['tu_habites'], ['w1']),
        item('jhabite_paris', 'J’habite à Paris.', ['jhabite_paris'], ['w1']),
        item('mon_appartement', 'C’est mon appartement.', ['mon_appartement'], ['w1']),
        item('bienvenue_chez_nous', 'Bienvenue chez nous !', [], ['d1']),
        item('porte', 'la porte', [], ['d1']),
        item('cle', 'la clé', ['jai_perdu_la_cle'], ['d5', 'd9']),
        item('cuisine', 'la cuisine', ['dans_la_cuisine'], ['d3']),
        item('canape', 'le canapé', ['derriere_le_canape'], ['d1', 'd3']),
        item('sur_sous_table', 'sur / sous la table', ['sur_la_table', 'sous_la_table'], ['d3']),
        item('a_cote_de', 'à côté de…', ['a_cote_de'], ['d3']),
        item('plante', 'la plante', [], ['d1']),
        item('lettre', 'la lettre', [], ['d1']),
        item('fenetre', 'la fenêtre', [], ['d10']),
        item('escalier', 'l’escalier', [], ['d5', 'd9']),
        item('en_haut_en_bas', 'en haut / en bas', [], ['d4', 'd9']),
        item('lit', 'le lit', [], ['d10']),
        item('entrez', 'Entrez !', [], ['d7', 'd9']),
        item('asseyez', 'Asseyez-vous. / Assieds-toi.', ['asseyez_vous', 'assieds_toi'], ['d9']),
        item('bruit', 'Il y a du bruit.', ['il_y_a_du_bruit'], ['d4']),
        item('pas_de_bruit', 'Pas de bruit la nuit.', [], ['d10']),
        item('regle', 'une règle', [], ['d10']),
        item('chambre', 'la chambre', [], []),
        item('salle_de_bains', 'la salle de bains', [], [])
      ]
    },
    {
      n: 2, id: 'a_table', fr: 'À table',
      items: [
        item('the_ou_cafe', 'Tu veux du thé ou du café ?', ['the_ou_cafe'], ['d2']),
        item('je_voudrais_boire', 'Je voudrais du café / du thé.', ['je_voudrais_cafe', 'je_voudrais_the'], ['d2']),
        item('de_leau', 'Je voudrais de l’eau.', ['de_leau'], ['d2']),
        item('tu_veux_du_cafe', 'Tu veux du café ?', ['du_cafe'], ['d11']),
        item('vous_voulez_de_la_soupe', 'Vous voulez de la soupe ?', ['vous_voulez_de_la_soupe'], ['d9']),
        item('je_voudrais_du_pain', 'Je voudrais du pain, s’il vous plaît.', ['je_voudrais_du_pain'], ['d9']),
        item('encore_un_peu', 'Encore un peu ?', ['encore_un_peu'], ['d9']),
        item('fromage', 'le fromage', [], ['d9']),
        item('cest_du_basilic', 'C’est du basilic, pour la cuisine.', ['cest_du_basilic'], ['d8']),
        item('on_mange_a_table', 'On mange à table.', ['on_mange_a_table'], ['d10']),
        item('pas_de_nourriture_canape', 'Pas de nourriture sur le canapé.', ['pas_de_nourriture_canape'], ['d10']),
        item('tu_pourrais_vaisselle', 'Tu pourrais faire la vaisselle ?', ['tu_pourrais_vaisselle'], ['d10']),
        item('le_lait_dans_le_frigo', 'Le lait, ça va dans le frigo.', ['le_lait_dans_le_frigo'], ['d10']),
        item('beurre', 'le beurre', [], ['d10']),
        item('il_ny_a_plus_de_lait', 'Il n’y a plus de lait.', ['il_ny_a_plus_de_lait'], ['d11']),
        item('jai_faim', 'J’ai faim !', ['jai_faim'], ['d11']),
        item('tu_as_faim', 'Tu as faim ?', ['tu_as_faim'], ['d14']),
        item('je_nai_plus_faim', 'Je n’ai plus faim.', ['je_nai_plus_faim'], ['d12']),
        item('jai_soif', 'J’ai soif.', ['jai_soif'], ['d13']),
        item('cest_delicieux', 'C’est délicieux !', ['cest_delicieux'], ['d12']),
        item('vous_voulez_du_the', 'Vous voulez du thé ?', ['vous_voulez_du_the'], ['d12']),
        item('merci_pour_le_diner', 'Merci pour le dîner.', ['merci_pour_le_diner'], ['d12']),
        item('une_part_de_tarte', 'Une part de tarte ?', ['une_part_de_tarte'], ['d12']),
        item('soupe_de_legumes', 'la soupe de légumes', [], ['d12']),
        item('on_dejeune', 'On déjeune ?', ['on_dejeune'], ['d13']),
        item('des_pates_ca_te_va', 'Des pâtes, ça te va ?', ['des_pates_ca_te_va'], ['d13']),
        item('un_verre_deau', 'Un verre d’eau, s’il te plaît.', ['un_verre_deau'], ['d13']),
        item('cest_pret', 'C’est prêt ! À table !', ['cest_pret'], ['d13']),
        item('tu_veux_boire_quelque_chose', 'Tu veux boire quelque chose ?', ['tu_veux_boire_quelque_chose'], ['d14']),
        item('avec_plaisir', 'Avec plaisir.', ['avec_plaisir'], ['d14']),
        item('il_reste_de_la_tarte', 'Il reste de la tarte.', ['il_reste_de_la_tarte'], ['d14']),
        item('bon_appetit', 'Bon appétit !', ['bon_appetit'], ['d14']),
        item('jai_fait', 'J’ai fait du café.', ['jai_fait'], ['w1']),
        item('petit_dejeuner', 'le petit-déjeuner', [], []),
        item('croissant_pain', 'un croissant, un pain au chocolat', [], [])
      ]
    },
    {
      n: 3, id: 'la_superette', fr: 'La supérette',
      items: [
        item('cest_combien', 'C’est combien ?', ['cest_combien'], ['d2']),
        item('un_sac_de', 'Je voudrais un sac de croquettes, s’il vous plaît.', ['un_sac_de'], ['d2']),
        item('bonne_journee', 'Merci, bonne journée !', ['bonne_journee'], ['d2']),
        item('pas_de_croquettes', 'Il n’y a pas de croquettes.', ['pas_de_croquettes'], ['d2']),
        item('pas_de_pain', 'Il n’y a pas de pain.', ['pas_de_pain'], ['w1']),
        item('je_vais_acheter', 'Je vais acheter…', ['je_vais_acheter'], ['d2']),
        item('jai_achete', 'J’ai acheté du pain.', ['jai_achete'], ['w1']),
        item('superette', 'Il y a une supérette au coin.', ['superette'], ['d2']),
        item('merci', 'Merci !', ['merci'], ['d2']),
        item('s_il_vous_plait', 'S’il vous plaît.', ['s_il_vous_plait'], ['d2']),
        item('vous_pouvez_repeter', 'Vous pouvez répéter, s’il vous plaît ?', ['vous_pouvez_repeter'], ['d4']),
        item('je_ne_sais_pas', 'Je ne sais pas.', ['je_ne_sais_pas'], ['d3']),
        item('je_prends', 'Je prends ce… / ça.', ['ce_verre'], ['w1']),
        item('moins_cher', 'moins cher / trop cher', ['moins_cher'], ['w1']),
        item('une_boite', 'une boîte de…', [], ['d3']),
        item('nombres_1_10', 'les nombres 1–10', [], ['d3', 'd5', 'd8']),
        item('nombres_11_20', 'les nombres 11–20', [], []),
        item('dizaines', 'les dizaines 20–100', [], []),
        item('euros', 'un euro, deux euros…', [], []),
        item('ca_fait', 'Ça fait trois euros cinquante.', [], []),
        item('monnaie', 'Vous avez la monnaie ?', [], []),
        item('payer_carte', 'Je peux payer par carte ?', [], []),
        item('vous_voulez_un_sac', 'Vous voulez un sac ?', [], []),
        item('kilo_litre', 'un kilo de… / un litre de…', [], []),
        item('bouteille_eau', 'une bouteille d’eau', [], []),
        item('paquet_pates', 'un paquet de pâtes', [], []),
        item('baguette', 'une baguette, une demi-baguette', [], []),
        item('et_avec_ceci', 'Et avec ceci ?', [], []),
        item('cest_tout', 'C’est tout, merci.', [], []),
        item('vous_avez_encore', 'Vous avez encore des… ?', [], []),
        item('caisse', 'la caisse', [], []),
        item('ticket', 'le ticket', [], []),
        item('excusez_moi', 'Excusez-moi !', [], []),
        item('cest_pour_offrir', 'C’est pour offrir.', [], [])
      ]
    },
    {
      n: 4, id: 'le_quartier', fr: 'Le quartier',
      items: [
        item('a_droite', 'à droite', ['a_droite'], ['d6']),
        item('a_gauche', 'à gauche', ['a_gauche'], ['d6']),
        item('tout_droit', 'tout droit', ['tout_droit'], ['d6']),
        item('ou_est_metro', 'Où est la station de métro ?', ['ou_est_metro'], ['w1']),
        item('pouvez_mindiquer', 'Vous pouvez m’indiquer… ?', ['pouvez_mindiquer'], ['w1']),
        item('je_cherche_poste', 'Je cherche un bureau de poste.', ['je_cherche_poste'], ['w1']),
        item('rue', 'la rue', ['rue_ou'], ['w1']),
        item('colis', 'le colis', ['il_y_a_deux_colis', 'colis_livre'], ['d3']),
        item('jours', 'les jours', [], ['d1', 'd8', 'd9']),
        item('le_jeudi', 'le jeudi', ['vous_venez_le_jeudi'], ['d9']),
        item('a_six_heures', 'à six heures', ['venez_a_six_heures'], ['d8']),
        item('sept_heures', 'sept heures et demie', [], ['d8']),
        item('matin_soir_nuit', 'le matin / le soir / la nuit', [], ['d4', 'd9', 'd10']),
        item('aujourdhui', 'aujourd’hui / demain / hier', [], ['d1', 'd11', 'd13']),
        item('a_bientot', 'À jeudi ! / À bientôt !', ['a_bientot'], ['d9']),
        item('il_pleut', 'Il pleut.', ['il_pleuvait'], ['d5']),
        item('il_fait_froid', 'Il fait froid.', ['froid_manteau'], ['w1']),
        item('fin_du_mois', 'la fin du mois', [], ['d11', 'd13']),
        item('le_cafe_lieu', 'le café (lieu)', ['nous_sommes_alles'], ['w1']),
        item('toit_jardin', 'le toit, le jardin', [], ['d10', 'd12']),
        item('quelle_heure', 'Quelle heure est-il ?', [], []),
        item('en_retard', 'Je suis en retard !', [], []),
        item('boulangerie', 'la boulangerie', [], []),
        item('pharmacie', 'la pharmacie', [], []),
        item('marche', 'le marché', [], []),
        item('parc', 'le parc', [], []),
        item('loin_pres', 'C’est loin ? / C’est près d’ici ?', [], []),
        item('en_face', 'en face de…', [], []),
        item('prendre_metro', 'prendre le métro / le bus', [], []),
        item('au_coin', 'au coin de la rue', [], [])
      ]
    },
    {
      n: 5, id: 'les_gens', fr: 'Les gens',
      items: [
        item('la_proprietaire', 'la propriétaire', ['la_proprietaire'], ['d1']),
        item('voisine', 'la voisine / le voisin', ['dont_voisine'], ['d4']),
        item('madame', 'Madame / Monsieur', [], ['d4', 'd9', 'd12']),
        item('il_est_gentil', 'Il est gentil.', ['il_est_gentil'], ['d4']),
        item('je_suis_desole', 'Je suis désolé(e).', ['je_suis_desole'], ['d4']),
        item('pardon', 'Pardon.', ['pardon'], ['d4']),
        item('vous_avez_vu', 'Vous avez vu… ?', ['vous_avez_vu_un_chat'], ['d6']),
        item('je_suis_etudiant', 'Je suis étudiant(e).', ['je_suis_etudiant'], ['w1']),
        item('tu_es_nouveau', 'Tu es nouveau / nouvelle ici ?', ['tu_es_nouveau'], ['w1']),
        item('content', 'Il est content. / Il n’est pas content.', [], ['d9']),
        item('elle_est_seule', 'Elle est seule.', [], ['d4', 'd9']),
        item('triste', 'triste', [], ['d10', 'd13']),
        item('famille', 'la famille', [], ['d7']),
        item('mari', 'le mari', [], ['d12']),
        item('niece', 'la nièce, la tante', [], ['d14']),
        item('roux', 'roux / rousse', ['je_lai_vu'], ['d6']),
        item('cest_une_bonne_idee', 'C’est une bonne idée.', ['cest_une_bonne_idee'], ['d10']),
        item('daccord', 'D’accord.', [], ['d2', 'd10']),
        item('tres_drole', 'Très drôle.', [], ['d10']),
        item('bonne_chance', 'Bonne chance !', [], ['d10']),
        item('merci_cest_gentil', 'Merci, c’est gentil.', [], ['d14']),
        item('moi_aussi', 'Moi aussi.', [], ['d9', 'd13']),
        item('jai_mal', 'J’ai mal à la tête.', ['jai_mal'], ['w1']),
        item('jai_froid', 'J’ai froid.', ['jai_froid'], ['w1']),
        item('fatigue', 'fatigué(e)', [], []),
        item('age', 'Tu as quel âge ? / J’ai 20 ans.', [], []),
        item('frere_soeur', 'le frère, la sœur', [], []),
        item('cuisinier', 'Il est cuisinier.', [], []),
        item('grand_petit', 'grand(e) / petit(e)', [], []),
        item('sympa', 'Elle est sympa.', [], [])
      ]
    }
  ];

  var BY_N = {};
  var BY_ID = {};
  POTS.forEach(function (p) {
    BY_N[p.n] = p;
    p.items.forEach(function (it) { it.pot = p.n; BY_ID[it.id] = it; });
  });

  function utcDayDiff(from, to) {
    var a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    var b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    return Math.floor((b - a) / DAY);
  }

  function retrievability(card, now) {
    if (!card) return null;
    if (!card.reps && !card.stability) return null;
    var s = card.stability || 0;
    if (!s) return null;
    if (!card.lastReview) return 1;
    var elapsed = Math.max(0, utcDayDiff(new Date(card.lastReview), now || new Date()));
    return Math.pow(1 + FACTOR * elapsed / s, DECAY);
  }

  function successesOf(card) {
    if (!card) return 0;
    if (typeof card.successes === 'number') return card.successes;
    return Math.max(0, (card.reps || 0) - (card.lapses || 0));
  }

  function idsOf(it) {
    var ids = (it.deck || []).slice();
    if (ids.indexOf(it.id) < 0) ids.push(it.id);
    return ids;
  }

  function cardsFor(learn, it) {
    var want = {};
    idsOf(it).forEach(function (id) { want[id] = 1; });
    var out = [];
    var cards = (learn && learn.cards) || {};
    Object.keys(cards).forEach(function (k) {
      var c = cards[k];
      if (c && want[c.itemId]) out.push(c);
    });
    return out;
  }

  function contextsOf(learn, it) {
    var g = learn && learn.garden;
    var saved = g && g.contexts && g.contexts[it.id];
    if (saved && saved.length) return saved.slice();
    var cards = cardsFor(learn, it);
    var seen = cards.some(function (c) { return (c.reps || 0) > 0 || c.due; });
    return seen ? (it.scenes || []).slice(0, 1) : [];
  }

  function median(nums) {
    if (!nums.length) return 0;
    var a = nums.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  }

  function leavesFromR(r) {
    if (r == null) return 'empty';
    if (r < 0.5) return 'dormant';
    if (r < 0.85) return 'wilting';
    return 'full';
  }

  function itemState(learn, it, now) {
    var cards = cardsFor(learn, it);
    if (!cards.length) return { unlocked: false, grown: false, R: null, S: 0, successes: 0, scenes: [] };
    var rs = [], ss = [], succ = 0;
    cards.forEach(function (c) {
      var r = retrievability(c, now);
      if (r != null) rs.push(r);
      if (c.stability) ss.push(c.stability);
      succ = Math.max(succ, successesOf(c));
    });
    var R = rs.length ? rs.reduce(function (a, b) { return a + b; }, 0) / rs.length : 1;
    var S = ss.length ? Math.max.apply(null, ss) : 0;
    return {
      unlocked: true,
      grown: S >= GROWN_S && succ >= GROWN_SUCCESSES,
      R: R,
      S: S,
      successes: succ,
      scenes: contextsOf(learn, it)
    };
  }

  function derivePot(pot, learn, now) {
    now = now || new Date();
    var unlocked = [];
    var grownN = 0;
    var scenes = [];
    pot.items.forEach(function (it) {
      var st = itemState(learn, it, now);
      if (st.grown) grownN++;
      if (st.unlocked) unlocked.push(st);
      if (st.scenes) scenes.push(st.scenes.length);
    });
    var meanR = unlocked.length ? unlocked.reduce(function (a, s) { return a + s.R; }, 0) / unlocked.length : null;
    var leaves = leavesFromR(meanR);
    var g = learn && learn.garden;
    if (g && g.forceDormant && g.forceDormant[pot.n] && leaves !== 'empty') leaves = 'dormant';
    var stem = median(unlocked.map(function (s) { return s.S; }));
    var roots = scenes.length ? scenes.reduce(function (a, b) { return a + b; }, 0) / pot.items.length : 0;
    var grown = pot.items.length > 0 && grownN / pot.items.length >= GROWN_RATIO;
    return {
      n: pot.n, id: pot.id, fr: pot.fr, indoor: !!pot.indoor,
      leaves: leaves, meanR: meanR, stem: stem, roots: roots,
      grown: grown, grownN: grownN, total: pot.items.length,
      unlocked: unlocked.length
    };
  }

  function deriveAll(learn, now) {
    return POTS.map(function (p) { return derivePot(p, learn, now); });
  }

  var getLearn = function () { return null; };
  function bind(fn) { if (typeof fn === 'function') getLearn = fn; }

  function isPotGrown(n, learn, now) {
    var pot = BY_N[Number(n)];
    if (!pot) return false;
    return derivePot(pot, learn || getLearn(), now || new Date()).grown;
  }

  function noteLapse(learn, potN, now) {
    if (!learn) return;
    learn.garden = learn.garden || { v: 3 };
    learn.garden.lapse = { pot: potN || 0, at: (now || new Date()).getTime() };
  }

  function lapseActive(learn, potN, now) {
    var lap = learn && learn.garden && learn.garden.lapse;
    if (!lap) return false;
    if (potN && lap.pot && lap.pot !== potN) return false;
    return (now || new Date()).getTime() - lap.at < 2500;
  }

  function clearForce(learn, potN) {
    var g = learn && learn.garden;
    if (!g || !g.forceDormant) return;
    if (potN) delete g.forceDormant[potN];
    else g.forceDormant = {};
  }

  function migrateGarden(g, today, learn) {
    if (!g) return false;
    var changed = false;
    function revive(p, potN) {
      if (!p || !p.dead) return;
      p.dead = false;
      p.dormant = true;
      p.revivedFrom = p.diedOn || today || null;
      p.diedOn = null;
      g.forceDormant = g.forceDormant || {};
      if (potN) g.forceDormant[potN] = true;
      changed = true;
    }
    if (g.v < 3 || (g.plant && g.plant.dead) || (g.plants || []).some(function (p) { return p && p.dead; })) {
      revive(g.plant, g.plant && g.plant.module === 'week2' ? 2 : 1);
      (g.plants || []).forEach(function (p) {
        if (!p) return;
        var n = p.module === 'week2' ? 2 : p.module === 'week1' ? 1 : null;
        revive(p, n);
      });
      if (g.v !== 3) { g.v = 3; changed = true; }
    }
    if (learn && !g.contexts) {
      g.contexts = {};
      changed = true;
    }
    return changed;
  }

  function fillPreview(learn, kind) {
    kind = kind || 'full';
    var S = kind === 'dormant' ? 2 : kind === 'wilting' ? 10 : 14;
    var R = kind === 'dormant' ? 0.25 : kind === 'wilting' ? 0.7 : 0.96;
    var elapsed = Math.max(0, Math.round((Math.pow(R, 1 / DECAY) - 1) * S / FACTOR));
    var now = new Date();
    var last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - elapsed * DAY);
    learn.cards = {};
    learn.garden = { v: 3, contexts: {}, forceDormant: {} };
    var scenes = kind === 'full' ? ['d1', 'd8', 'd10'] : kind === 'wilting' ? ['d8'] : [];
    POTS.forEach(function (p) {
      p.items.forEach(function (it) {
        learn.cards[it.id + '|reading'] = {
          itemId: it.id, modality: 'reading', reps: 3, lapses: 0, successes: 3,
          stability: S, difficulty: 5, lastReview: last.toISOString(), scheduledDays: 7, state: 'review'
        };
        if (scenes.length) learn.garden.contexts[it.id] = scenes.slice();
      });
    });
    return learn;
  }

  function potOfItem(itemId) {
    var it = BY_ID[itemId];
    if (it) return it.pot;
    var found = 0;
    POTS.forEach(function (p) {
      p.items.forEach(function (x) {
        if ((x.deck || []).indexOf(itemId) >= 0) found = p.n;
      });
    });
    return found;
  }

  var api = {
    POTS: POTS, BY_N: BY_N, BY_ID: BY_ID,
    GROWN_S: GROWN_S, GROWN_RATIO: GROWN_RATIO, GROWN_SUCCESSES: GROWN_SUCCESSES,
    leavesFromR: leavesFromR, retrievability: retrievability, median: median,
    derivePot: derivePot, deriveAll: deriveAll, itemState: itemState,
    isPotGrown: isPotGrown, bind: bind, migrateGarden: migrateGarden,
    noteLapse: noteLapse, lapseActive: lapseActive, clearForce: clearForce,
    fillPreview: fillPreview, potOfItem: potOfItem, successesOf: successesOf
  };
  root.A411 = root.A411 || {};
  root.A411.Pots = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
