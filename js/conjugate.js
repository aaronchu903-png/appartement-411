/* L’Appartement 411 — v0.9.0 « Voir la conjugaison »: an offline French conjugator.
 * Rules for regular -er (with the usual spelling changes), -ir (finir) and -re (vendre) verbs, plus a bundled table of
 * common irregular verbs and their families. Pronominal verbs (se réveiller) supported. Also a small lemmatizer
 * (form → infinitive) used by the wordbook. Pure logic, no DOM; runs in Node tests. No learner data here. */
(function (root) {
  'use strict';
  var P = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  var IMP_P = [1, 3, 4];
  var VOW = /^[aeiouyàâäéèêëîïôöûùüœæh]/i;
  var H_ASPIRE = { 'haïr': 1, hurler: 1, heurter: 1, hacher: 1, hausser: 1, hanter: 1, harceler: 1, hisser: 1, huer: 1, hâter: 1, hésiter: 0 };
  function sp(s) { return s.split(' '); }
  function elides(form, inf) { return VOW.test(form) && !(form[0] === 'h' && H_ASPIRE[inf]); }

  // ---------- regular rules ----------
  function erStem(inf) { return inf.slice(0, -2); }
  // e/é + consonant(s) + er: which change applies on a mute ending
  var KEEP_EL_ET = { acheter: 1, racheter: 1, geler: 1, dégeler: 1, congeler: 1, peler: 1, modeler: 1, haleter: 1, harceler: 1, ciseler: 1, marteler: 1, crocheter: 1, fureter: 1 };
  function muteStem(inf) {
    var st = erStem(inf), m;
    if (/(oy|uy|ay)$/.test(st)) return st.slice(0, -1) + 'i';
    if ((m = st.match(/^(.*)e(l|t)$/)) && !KEEP_EL_ET[inf.replace(/^(re|r)(?=.)/, '') ] && !KEEP_EL_ET[inf]) return st + st.slice(-1);
    if ((m = st.match(/^(.*[^aeiouyéèê])[eé](ch|gn|[bcdfgjklmnpqrstvz][rl]?)$/))) return m[1] + 'è' + m[2];
    return st;
  }
  function futStemEr(inf) {
    if (inf === 'envoyer' || inf === 'renvoyer') return inf.replace(/voyer$/, 'verr');
    var st = erStem(inf), ms = muteStem(inf);
    if (/[^aeiouyéèê]é(ch|gn|[bcdfgjklmnpqrstvz][rl]?)$/.test(st)) return st + 'er'; // préférer → préférer-
    return ms + 'er';
  }
  function soft(stem, end) { // manger/commencer before a/o; and back before i
    if (/^[ao]/.test(end)) { if (/g$/.test(stem)) return stem + 'e' + end; if (/c$/.test(stem)) return stem.slice(0, -1) + 'ç' + end; }
    if (/^i/.test(end)) { if (/ge$/.test(stem)) return stem.slice(0, -1) + end; if (/ç$/.test(stem)) return stem.slice(0, -1) + 'c' + end; }
    return stem + end;
  }
  function regularSpec(inf) {
    var s;
    if (/er$/.test(inf)) {
      var st = erStem(inf), ms = muteStem(inf);
      return { p: [ms + 'e', ms + 'es', ms + 'e', soft(st, 'ons'), st + 'ez', ms + 'ent'], pp: st + 'é', f: futStemEr(inf), group: 'er' };
    }
    if (/ir$/.test(inf)) {
      s = inf.slice(0, -2);
      return { p: [s + 'is', s + 'is', s + 'it', s + 'issons', s + 'issez', s + 'issent'], pp: s + 'i', f: inf, group: 'ir' };
    }
    if (/re$/.test(inf)) {
      s = inf.slice(0, -2);
      return { p: [s + 's', s + 's', s, s + 'ons', s + 'ez', s + 'ent'], pp: s + 'u', f: inf.slice(0, -1), group: 're' };
    }
    return null;
  }

  // ---------- irregular table (présent, participe passé, futur stem, overrides) ----------
  var T = {
    'être': { p: 'suis es est sommes êtes sont', pp: 'été', f: 'ser', i: 'ét', s: 'sois sois soit soyons soyez soient', imp: 'sois soyons soyez' },
    avoir: { p: 'ai as a avons avez ont', pp: 'eu', f: 'aur', s: 'aie aies ait ayons ayez aient', imp: 'aie ayons ayez' },
    aller: { p: 'vais vas va allons allez vont', pp: 'allé', f: 'ir', s: 'aille ailles aille allions alliez aillent', imp: 'va allons allez', aux: 'être' },
    faire: { p: 'fais fais fait faisons faites font', pp: 'fait', f: 'fer', s: 'fasse fasses fasse fassions fassiez fassent', imp: 'fais faisons faites' },
    pouvoir: { p: 'peux peux peut pouvons pouvez peuvent', pp: 'pu', f: 'pourr', s: 'puisse puisses puisse puissions puissiez puissent', imp: '- - -' },
    vouloir: { p: 'veux veux veut voulons voulez veulent', pp: 'voulu', f: 'voudr', s: 'veuille veuilles veuille voulions vouliez veuillent', imp: 'veuille veuillons veuillez' },
    devoir: { p: 'dois dois doit devons devez doivent', pp: 'dû', f: 'devr', imp: '- - -' },
    savoir: { p: 'sais sais sait savons savez savent', pp: 'su', f: 'saur', s: 'sache saches sache sachions sachiez sachent', imp: 'sache sachons sachez' },
    valoir: { p: 'vaux vaux vaut valons valez valent', pp: 'valu', f: 'vaudr', s: 'vaille vailles vaille valions valiez vaillent' },
    falloir: { p: '- - faut - - -', pp: 'fallu', f: 'faudr', i: 'fall', s: '- - faille - - -', imp: '- - -', impersonal: 1 },
    pleuvoir: { p: '- - pleut - - -', pp: 'plu', f: 'pleuvr', i: 'pleuv', s: '- - pleuve - - -', imp: '- - -', impersonal: 1 },
    voir: { p: 'vois vois voit voyons voyez voient', pp: 'vu', f: 'verr' },
    prévoir: { p: 'prévois prévois prévoit prévoyons prévoyez prévoient', pp: 'prévu', f: 'prévoir' },
    recevoir: { p: 'reçois reçois reçoit recevons recevez reçoivent', pp: 'reçu', f: 'recevr' },
    apercevoir: { p: 'aperçois aperçois aperçoit apercevons apercevez aperçoivent', pp: 'aperçu', f: 'apercevr' },
    'asseoir': { p: 'assieds assieds assied asseyons asseyez asseyent', pp: 'assis', f: 'assiér' },
    dire: { p: 'dis dis dit disons dites disent', pp: 'dit', f: 'dir' },
    interdire: { p: 'interdis interdis interdit interdisons interdisez interdisent', pp: 'interdit', f: 'interdir' },
    lire: { p: 'lis lis lit lisons lisez lisent', pp: 'lu', f: 'lir' },
    'écrire': { p: 'écris écris écrit écrivons écrivez écrivent', pp: 'écrit', f: 'écrir' },
    rire: { p: 'ris ris rit rions riez rient', pp: 'ri', f: 'rir' },
    boire: { p: 'bois bois boit buvons buvez boivent', pp: 'bu', f: 'boir' },
    croire: { p: 'crois crois croit croyons croyez croient', pp: 'cru', f: 'croir' },
    mettre: { p: 'mets mets met mettons mettez mettent', pp: 'mis', f: 'mettr' },
    prendre: { p: 'prends prends prend prenons prenez prennent', pp: 'pris', f: 'prendr' },
    venir: { p: 'viens viens vient venons venez viennent', pp: 'venu', f: 'viendr', aux: 'être' },
    tenir: { p: 'tiens tiens tient tenons tenez tiennent', pp: 'tenu', f: 'tiendr' },
    vivre: { p: 'vis vis vit vivons vivez vivent', pp: 'vécu', f: 'vivr' },
    suivre: { p: 'suis suis suit suivons suivez suivent', pp: 'suivi', f: 'suivr' },
    courir: { p: 'cours cours court courons courez courent', pp: 'couru', f: 'courr' },
    mourir: { p: 'meurs meurs meurt mourons mourez meurent', pp: 'mort', f: 'mourr', aux: 'être' },
    'naître': { p: 'nais nais naît naissons naissez naissent', pp: 'né', f: 'naîtr', aux: 'être' },
    'connaître': { p: 'connais connais connaît connaissons connaissez connaissent', pp: 'connu', f: 'connaîtr' },
    'paraître': { p: 'parais parais paraît paraissons paraissez paraissent', pp: 'paru', f: 'paraîtr' },
    plaire: { p: 'plais plais plaît plaisons plaisez plaisent', pp: 'plu', f: 'plair' },
    taire: { p: 'tais tais tait taisons taisez taisent', pp: 'tu', f: 'tair' },
    battre: { p: 'bats bats bat battons battez battent', pp: 'battu', f: 'battr' },
    rompre: { p: 'romps romps rompt rompons rompez rompent', pp: 'rompu', f: 'rompr' },
    vaincre: { p: 'vaincs vaincs vainc vainquons vainquez vainquent', pp: 'vaincu', f: 'vaincr' },
    'résoudre': { p: 'résous résous résout résolvons résolvez résolvent', pp: 'résolu', f: 'résoudr' },
    coudre: { p: 'couds couds coud cousons cousez cousent', pp: 'cousu', f: 'coudr' },
    fuir: { p: 'fuis fuis fuit fuyons fuyez fuient', pp: 'fui', f: 'fuir' },
    'acquérir': { p: 'acquiers acquiers acquiert acquérons acquérez acquièrent', pp: 'acquis', f: 'acquerr' },
    'haïr': { p: 'hais hais hait haïssons haïssez haïssent', pp: 'haï', f: 'haïr' },
    envoyer: { p: 'envoie envoies envoie envoyons envoyez envoient', pp: 'envoyé', f: 'enverr' },
    cueillir: { p: 'cueille cueilles cueille cueillons cueillez cueillent', pp: 'cueilli', f: 'cueiller' },
    accueillir: { p: 'accueille accueilles accueille accueillons accueillez accueillent', pp: 'accueilli', f: 'accueiller' }
  };
  // families: generated from a model
  function fam(model, list, fn) { list.forEach(function (v) { T[v] = fn(v, model); }); }
  // partir / sortir / dormir / sentir / servir / mentir: pars, part, partons
  fam(null, ['partir', 'sortir', 'dormir', 'sentir', 'servir', 'mentir', 'repartir', 'ressortir', 'endormir', 'rendormir', 'ressentir', 'consentir', 'desservir'], function (v) {
    var st = v.slice(0, -2), sg = st.slice(0, -1);
    return { p: [sg + 's', sg + 's', sg + 't', st + 'ons', st + 'ez', st + 'ent'].join(' '), pp: st + 'i', f: v,
      aux: /^(partir|sortir|repartir|ressortir)$/.test(v) ? 'être' : null };
  });
  // ouvrir / offrir / souffrir / couvrir: ouvre, ouvert
  fam(null, ['ouvrir', 'rouvrir', 'couvrir', 'découvrir', 'recouvrir', 'offrir', 'souffrir'], function (v) {
    var st = v.slice(0, -2);
    return { p: [st + 'e', st + 'es', st + 'e', st + 'ons', st + 'ez', st + 'ent'].join(' '), pp: st.slice(0, -1) + 'ert', f: v };
  });
  // conduire / construire / produire / traduire / cuire / détruire: conduis, conduisons, conduit
  fam(null, ['conduire', 'construire', 'produire', 'traduire', 'réduire', 'détruire', 'cuire', 'instruire', 'introduire', 'séduire', 'reconstruire'], function (v) {
    var st = v.slice(0, -2);
    return { p: [st + 's', st + 's', st + 't', st + 'sons', st + 'sez', st + 'sent'].join(' '), pp: st + 't', f: v.slice(0, -1) };
  });
  // peindre / craindre / joindre / éteindre: peins, peignons, peint
  fam(null, ['peindre', 'éteindre', 'atteindre', 'teindre', 'craindre', 'plaindre', 'contraindre', 'joindre', 'rejoindre'], function (v) {
    var st = v.slice(0, -3);
    return { p: [st + 's', st + 's', st + 't', st.slice(0, -1) + 'gnons', st.slice(0, -1) + 'gnez', st.slice(0, -1) + 'gnent'].join(' '), pp: st + 't', f: v.slice(0, -1) };
  });
  // prefixed members of irregular families
  var DERIVED = {
    prendre: ['comprendre', 'apprendre', 'reprendre', 'surprendre', 'entreprendre'],
    mettre: ['permettre', 'promettre', 'admettre', 'remettre', 'soumettre', 'transmettre', 'commettre'],
    venir: ['devenir', 'revenir', 'parvenir', 'souvenir', 'prévenir', 'convenir', 'intervenir'],
    tenir: ['obtenir', 'retenir', 'maintenir', 'appartenir', 'contenir', 'entretenir', 'soutenir', 'détenir'],
    voir: ['revoir', 'entrevoir'], 'écrire': ['décrire', 'inscrire', 'réécrire', 'prescrire'], lire: ['relire', 'élire'],
    'connaître': ['reconnaître', 'méconnaître'], 'paraître': ['disparaître', 'apparaître', 'reparaître'],
    faire: ['refaire', 'défaire', 'satisfaire'], courir: ['parcourir', 'secourir', 'accourir', 'recourir'], rire: ['sourire'],
    battre: ['combattre', 'débattre', 'abattre'], vivre: ['survivre', 'revivre'], dire: ['redire'], suivre: ['poursuivre'],
    vaincre: ['convaincre'], fuir: ['enfuir'], 'acquérir': ['conquérir'], envoyer: ['renvoyer'], cueillir: ['recueillir'], recevoir: ['décevoir', 'concevoir'],
    plaire: ['déplaire'], 'asseoir': ['rasseoir']
  };
  var ETRE_FAMILY = { devenir: 1, revenir: 1, parvenir: 1, intervenir: 1, souvenir: 1 };
  Object.keys(DERIVED).forEach(function (base) {
    var b = T[base];
    DERIVED[base].forEach(function (v) {
      var pre = v.slice(0, v.length - base.length);
      if (v.slice(pre.length) !== base) return;
      function px(x) { return x.split(' ').map(function (f) { return f === '-' ? f : pre + f; }).join(' '); }
      T[v] = { p: px(b.p), pp: pre + b.pp, f: pre + b.f, s: b.s ? px(b.s) : undefined, imp: b.imp && base !== 'faire' ? px(b.imp) : undefined,
        aux: ETRE_FAMILY[v] ? 'être' : null, base: base };
      if (base === 'faire') T[v].imp = px(b.imp);
    });
  });
  T.satisfaire.p = 'satisfais satisfais satisfait satisfaisons satisfaites satisfont';
  T.redire.p = 'redis redis redit redisons redites redisent';

  // verbs conjugated with être in the passé composé (besides all pronominal verbs)
  var ETRE = { aller: 1, venir: 1, arriver: 1, partir: 1, entrer: 1, rentrer: 1, sortir: 1, monter: 1, descendre: 1, 'naître': 1, mourir: 1, rester: 1,
    tomber: 1, retourner: 1, passer: 0, devenir: 1, revenir: 1, repartir: 1, ressortir: 1, remonter: 1, redescendre: 1, retomber: 1, parvenir: 1, intervenir: 1, 'décéder': 1, souvenir: 1 };

  // common regular verbs (for the lemmatizer; any -er/-ir/-re infinitive still conjugates by rule)
  var COMMON = sp('aimer adorer détester parler regarder écouter chercher trouver donner montrer porter apporter ' +
    'arroser jouer manger habiter travailler étudier penser demander répondre attendre entendre vendre perdre rendre descendre ' +
    'finir choisir réussir réfléchir grandir remplir obéir rougir vieillir maigrir grossir ralentir punir bâtir agir ' +
    'arriver entrer rentrer rester tomber retourner monter passer appeler acheter lever préférer espérer répéter ' +
    'commencer manger nager voyager ranger changer bouger partager essayer payer nettoyer employer ennuyer ' +
    'fermer ouvrir laisser garder sonner frapper sauter danser chanter marcher tourner traverser continuer ' +
    'aider oublier rêver rencontrer raconter expliquer préparer cuisiner goûter laver lancer placer ' +
    'réveiller coucher lever habiller doucher promener dépêcher inquiéter excuser asseoir installer occuper ' +
    'arrêter retrouver visiter voler cacher miauler caresser nourrir griffer ronronner gronder crier pleurer ' +
    'quitter utiliser fumer dîner déjeuner commander compter coûter oser accepter refuser décider ' +
    'neiger geler jeter projeter rappeler épeler amener emmener mener peser semer soulever enlever ' +
    'envoyer tutoyer vouvoyer appuyer essuyer balayer effrayer rayer ' +
    'sembler tenter toucher trembler tirer pousser poser déposer composer proposer imaginer inviter ' +
    'informer intéresser garer louer prêter emprunter rembourser signer copier crier marier remercier vérifier ' +
    'défendre fondre mordre pendre répandre tendre tordre correspondre');
  function isPronominal(inf) { return /^(se |s’|s')/.test(inf); }
  function bare(inf) { return String(inf).trim().toLowerCase().replace(/^(se |s’|s')/, ''); }

  function specFor(inf) {
    var t = T[inf];
    if (t) return { p: sp(t.p), pp: t.pp, f: t.f, i: t.i, s: t.s ? sp(t.s) : null, imp: t.imp ? sp(t.imp) : null,
      aux: t.aux, table: true, impersonal: !!t.impersonal };
    var r = regularSpec(inf);
    if (!r) return null;
    r.table = false;
    return r;
  }
  function finishTenses(inf, sp1) {
    var pr = sp1.p;
    var iStem = sp1.i || (pr[3] !== '-' ? pr[3].replace(/ons$/, '') : null);
    var E_IMP = sp('ais ais ait ions iez aient'), E_FUT = sp('ai as a ons ez ont'), E_SUB = sp('e es e ions iez ent');
    var imparfait = E_IMP.map(function (e, k) { return pr[k] === '-' && sp1.impersonal ? '-' : soft(iStem, e); });
    var futur = E_FUT.map(function (e, k) { return pr[k] === '-' && sp1.impersonal ? '-' : sp1.f + e; });
    var cond = E_IMP.map(function (e, k) { return pr[k] === '-' && sp1.impersonal ? '-' : sp1.f + e; });
    var subj = sp1.s || E_SUB.map(function (e, k) {
      if (k === 3 || k === 4) return soft(iStem, e);
      var st = pr[5].replace(/ent$/, '');
      return st + e;
    });
    var imp = sp1.imp || [pr[1].replace(/es$/, 'e').replace(/^va$/, 'va'), pr[3], pr[4]];
    if (!sp1.imp && /es$/.test(pr[1])) imp[0] = pr[1].slice(0, -1);
    if (sp1.impersonal) { imparfait = imparfait.map(function (x, k) { return k === 2 ? x : '-'; }); futur = futur.map(function (x, k) { return k === 2 ? x : '-'; }); cond = cond.map(function (x, k) { return k === 2 ? x : '-'; }); }
    return { present: pr, imparfait: imparfait, futur: futur, conditionnel: cond, subjonctif: subj, imperatif: imp };
  }
  var TENSES = [
    ['present', 'Présent', '现在时', 'Present'], ['passe', 'Passé composé', '复合过去时', 'Perfect (passé composé)'],
    ['imparfait', 'Imparfait', '未完成过去时', 'Imperfect'], ['futur', 'Futur simple', '简单将来时', 'Future'],
    ['conditionnel', 'Conditionnel présent', '条件式现在时', 'Conditional'], ['subjonctif', 'Subjonctif présent', '虚拟式现在时', 'Subjunctive'],
    ['imperatif', 'Impératif', '命令式', 'Imperative']];
  var REFL = ['me', 'te', 'se', 'nous', 'vous', 'se'];
  var AUX_E = sp('suis es est sommes êtes sont'), AUX_A = sp('ai as a avons avez ont');
  function withPron(k, form, inf, refl, que) {
    if (form === '-') return '-';
    var lead = refl ? REFL[k] : null, body = form;
    if (lead && (k === 0 || k === 1 || k === 2 || k === 5) && elides(form, inf)) body = lead[0] + '’' + form; else if (lead) body = lead + ' ' + form;
    var pron = P[k];
    var head = pron === 'je' && elides(body, inf) ? 'j’' : pron + ' ';
    var q = que ? ((k === 2 || k === 5) ? 'qu’' : 'que ') : '';
    return q + head + body;
  }
  function ppShow(pp, k, etre) {
    if (!etre) return pp;
    var s = /s$/.test(pp);
    if (k < 3) return pp + '(e)';
    if (k === 4) return pp + (s ? '(e)(s)' : '(e)(s)');
    return pp + (s ? '(es)' : '(e)s');
  }
  function conjugate(input) {
    var raw = String(input || '').trim().toLowerCase().replace(/'/g, '’');
    var refl = isPronominal(raw), inf = bare(raw);
    if (inf === 'souvenir' || inf === 'enfuir' || inf === 'taire' && refl) refl = true;
    var spec = specFor(inf);
    if (!spec) return null;
    var reg = regularSpec(inf);
    var base = finishTenses(inf, spec), regT = reg && !/oir$/.test(inf) ? finishTenses(inf, reg) : null;
    var etre = refl || !!ETRE[inf] || spec.aux === 'être';
    var aux = etre ? AUX_E : AUX_A;
    var out = { infinitive: (refl ? (elides(inf, inf) ? 's’' : 'se ') : '') + inf, pronominal: refl, aux: etre ? 'être' : 'avoir', participle: spec.pp,
      source: spec.table ? 'table' : 'rule', group: reg ? reg.group : 'oir', tenses: [] };
    TENSES.forEach(function (t) {
      var rows = [];
      if (t[0] === 'passe') {
        for (var k = 0; k < 6; k++) {
          if (spec.impersonal && k !== 2) { rows.push({ person: P[k], form: '-', text: '-', irregular: false }); continue; }
          var form = aux[k] + ' ' + ppShow(spec.pp, k, etre);
          var regPP = regT ? reg.pp : null;
          rows.push({ person: P[k], form: form, text: withPron(k, form, inf, refl, false), irregular: regPP ? regPP !== spec.pp : !!spec.table, speak: withPron(k, aux[k] + ' ' + spec.pp, inf, refl, false) });
        }
      } else if (t[0] === 'imperatif') {
        base.imperatif.forEach(function (f, j) {
          var k = IMP_P[j], txt = f === '-' ? '-' : (refl ? f + '-' + ['toi', 'nous', 'vous'][j] : f);
          var irr = f !== '-' && (regT ? regT.imperatif[j] !== f : !!spec.table);
          rows.push({ person: ['(tu)', '(nous)', '(vous)'][j], form: txt, text: txt, irregular: irr, speak: txt });
        });
      } else {
        base[t[0]].forEach(function (f, k) {
          var irr = f !== '-' && (regT ? regT[t[0]][k] !== f : !!spec.table);
          var txt = withPron(k, f, inf, refl, t[0] === 'subjonctif');
          rows.push({ person: P[k], form: f, text: txt, irregular: irr, speak: txt });
        });
      }
      if (spec.impersonal) rows.forEach(function (r) { r.text = r.text.replace('il/elle', 'il'); if (r.speak) r.speak = r.speak.replace('il/elle', 'il'); if (r.person === 'il/elle') r.person = 'il'; });
      out.tenses.push({ id: t[0], fr: t[1], zh: t[2], en: t[3], rows: rows });
    });
    // v0.9.2: participles (+ gérondif). Participe présent = « nous » present stem + -ant (être, avoir, savoir are irregular).
    var PPR = { 'être': 'étant', avoir: 'ayant', savoir: 'sachant' };
    var nousP = base.present[3], ppr = PPR[inf] || (nousP && nousP !== '-' ? nousP.replace(/ons$/, 'ant') : (inf === 'pleuvoir' ? 'pleuvant' : null));
    var regPpr = regT && regT.present[3] ? regT.present[3].replace(/ons$/, 'ant') : null;
    var ppForms = /[sx]$/.test(spec.pp) ? [spec.pp, spec.pp.replace(/s$/, 'se').replace(/x$/, 'se'), spec.pp, spec.pp.replace(/s$/, 'ses').replace(/x$/, 'ses')] : [spec.pp, spec.pp + 'e', spec.pp + 's', spec.pp + 'es'];
    if (/[^s]x$/.test(spec.pp) || { 'été': 1, fallu: 1, plu: 1, pu: 1, ri: 1, souri: 1, suffi: 1, nui: 1, lui: 1 }[spec.pp]) ppForms = [spec.pp, spec.pp, spec.pp, spec.pp]; // invariable
    var refLead = refl ? (elides(ppr || inf, inf) ? 's’' : 'se ') : '';
    out.participles = {
      passe: { forms: ppForms, text: ppForms.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' · '), irregular: reg && regT ? reg.pp !== spec.pp : !!spec.table, speak: spec.pp },
      present: ppr ? { form: ppr, text: refLead + ppr, irregular: regPpr ? regPpr !== ppr : !!PPR[inf], speak: refLead + ppr } : null,
      gerondif: ppr ? { form: 'en ' + refLead + ppr, text: 'en ' + refLead + ppr, irregular: regPpr ? regPpr !== ppr : !!PPR[inf], speak: 'en ' + refLead + ppr } : null
    };
    return out;
  }

  // ---------- lemmatizer: inflected form → infinitive ----------
  var INDEX = null;
  function strip(f) { return String(f).replace(/\(e\)|\(es\)|\(s\)/g, ''); }
  function addForms(idx, inf) {
    var c = conjugate(inf); if (!c) return;
    function put(f) { f = strip(f); if (f && f !== '-' && !idx[f]) idx[f] = inf; }
    put(inf);
    [c.participle, c.participle + 'e', c.participle + 's', c.participle + 'es'].forEach(function (pp) { if (/[éiu]$|[st]$/.test(c.participle)) put(pp); });
    c.tenses.forEach(function (t) { if (t.id === 'passe') return; t.rows.forEach(function (r) { put(t.id === 'imperatif' ? r.form : (r.form || '')); }); });
  }
  function index() {
    if (INDEX) return INDEX;
    INDEX = {};
    ['être', 'avoir', 'aller', 'faire', 'dire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'venir', 'prendre', 'mettre', 'voir'].forEach(function (v) { addForms(INDEX, v); });
    Object.keys(T).forEach(function (v) { addForms(INDEX, v); });
    COMMON.forEach(function (v) { addForms(INDEX, v); });
    return INDEX;
  }
  // words that are far more often a noun/adjective/other word than a verb form: never turned into a verb lemma
  var NOT_VERB = sp('porte ferme montre cuisine livre été marche sort danse tour place lit vis vers est fils plus son sur ' +
    'bois cours tu plu ri nu devoir pouvoir savoir rire sourire sens nous vous ' +
    'parle aime mange mot boîte tasse bouge sac fin tour chat vol garde sonne poste caresse jeu pense dîner déjeuner goûter part ' +
    'rêve aide visite cache commande pose change compte appel copie cri signe touche tente rappel reste passe entrée arrivée tombe ' +
    'coucher lever étude travail voyage marié mariée invité invitée occupé occupée occupés occupées fermé fermée fermés fermées');
  var NV = {}; NOT_VERB.forEach(function (w) { NV[w] = 1; });
  function lemmaOf(word, opts) {
    var w = String(word || '').trim().toLowerCase().replace(/'/g, '’').replace(/^(j’|l’|qu’|n’)/, '');
    var refl = false;
    var m = w.match(/^(se |s’|m’|t’|me |te )(.+)$/); if (m) { refl = true; w = m[2]; }
    w = w.replace(/-(toi|nous|vous|moi|le|la|les|lui|leur|en|y)$/, '');
    if (!w) return null;
    var idx = index();
    var inf = idx[w];
    if (!inf) {
      // rule-based guesses for regular -er verbs (validated by regenerating the form)
      var cands = [w.replace(/(é|ée|és|ées)$/, 'er'), w.replace(/(ais|ait|aient|ions|iez|ons|ez|ent|es|e)$/, 'er'), w.replace(/(erai|eras|era|erons|erez|eront|erais|erait|eraient)$/, 'er')];
      for (var i = 0; i < cands.length && !inf; i++) {
        var c = cands[i]; if (!/er$/.test(c) || c === w || c.length < 4) continue;
        var tmp = {}; addForms(tmp, c); if (tmp[w] === c && (opts && opts.guess)) inf = c;
      }
    }
    if (!inf) return null;
    if (NV[w] && !(opts && opts.verbOnly)) return null;
    return { infinitive: inf, pronominal: refl, form: w };
  }
  // verbs found in a French sentence (for « Voir la conjugaison » on sentence cards); auxiliaries are kept only if alone.
  function verbsIn(text) {
    var toks = String(text || '').toLowerCase().replace(/'/g, '’').replace(/s’il (te|vous) pla[iî]t/g, ' ').split(/[^a-zàâäéèêëîïôöûùüçœæ’\-]+/).filter(Boolean);
    var out = [], aux = [];
    toks.forEach(function (t, i) {
      var tt = t.replace(/^(j’|l’|qu’|n’|d’|c’)/, '');
      var prev = toks[i - 1] || '', prev2 = toks[i - 2] || '';
      var impPron = /-(toi|vous|nous)$/.test(t) && !/-(vous|nous)$/.test(t) || /-toi$/.test(t);
      var pron = impPron || /^(s’|m’|t’)/.test(tt) || /^(se|me|te)$/.test(prev) ||
        (/^(suis|es|est|sommes|êtes|sont|étais|était|serai|sera)$/.test(prev.replace(/^(s’|m’|t’)/, '')) && (/^(s’|m’|t’)/.test(prev) || /^(se|me|te)$/.test(prev2)));
      tt = tt.replace(/^(s’|m’|t’)/, '').replace(/-(toi|nous|vous|moi|le|la|les|lui|leur|en|y|je|tu|il|elle|on|ils|elles)$/, '');
      if (tt.length < 2) return;
      var l = lemmaOf(tt, { verbOnly: tt.length > 3 });
      if (!l || NV[tt] && tt.length <= 3) return;
      if (NV[tt] && i > 0 && /^(la|le|les|une|un|ma|sa|ta|mon|ton|son|cette|ce|des|du|de|notre|votre|leur|en)$/.test(toks[i - 1])) return;
      if (/^(être|avoir)$/.test(l.infinitive)) pron = false;
      var name = (pron ? (elides(l.infinitive, l.infinitive) ? 's’' : 'se ') : '') + l.infinitive;
      var list = /^(être|avoir)$/.test(l.infinitive) ? aux : out;
      if (list.indexOf(name) < 0) list.push(name);
    });
    return out.length ? out.slice(0, 4) : aux.slice(0, 2);
  }
  function isVerb(inf) { return !!conjugate(inf) && (!!T[bare(inf)] || COMMON.indexOf(bare(inf)) >= 0 || /(er|ir|re)$/.test(bare(inf))); }

  var api = { conjugate: conjugate, lemmaOf: lemmaOf, verbsIn: verbsIn, isVerb: isVerb, TABLE: T, COMMON: COMMON, TENSES: TENSES,
    irregularCount: function () { return Object.keys(T).length; } };
  root.A411 = root.A411 || {};
  root.A411.Conj = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
