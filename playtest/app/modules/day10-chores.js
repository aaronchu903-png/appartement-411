/* Optional Day 10 afternoon activities. State is owned by the caller, never storage. */
(function (root) {
  'use strict';
  const activities = {
    fridge: { title: 'Le frigo vide', reward: 1 },
    list: { title: 'La liste pour Noé', reward: 1 },
    coffee: { title: 'Café du matin', reward: .5 },
    album: { title: 'L’album du toit', reward: 1 },
    message: { title: 'Le message', reward: .5 },
    letter10: { title: 'Réponse', reward: 0 }
  };
  const missingItems = [
    { id: 'lait', text: 'le lait', line: 'Il n’y a plus de lait.', audioId: 'd11_noe_lait' },
    { id: 'beurre', text: 'le beurre', line: 'Il n’y a plus de beurre.', audioId: 'd11_noe_beurre' }
  ];
  const listLines = ['Il n’y a plus de lait.', 'Il n’y a plus de beurre.', 'Il n’y a plus de pain.'];
  const coffeeOrders = [
    { person: 'camille', text: 'Tu veux du café ? Sans lait.', audioId: 'd11_cam_cafe', item: 'cafe' },
    { person: 'noe', text: 'J’ai faim ! Et pas de lait.', audioId: 'd11_noe_faim', item: 'pain' }
  ];
  const albumShots = [
    { id: 'chimney', text: 'les cheminées' }, { id: 'sky', text: 'le ciel' },
    { id: 'pot1', text: 'la plante' }, { id: 'pot2', text: 'le basilic' }, { id: 'chair', text: 'la vieille chaise' }
  ];
  const messageLines = [
    { text: 'Bonjour à vous trois. J’espère que tout va bien.', audioId: 'd11_mar_bonjour' },
    { text: 'Une photo de la plante, s’il vous plaît.', audioId: 'd11_mar_photo' },
    { text: 'De la plante. Pas du chat.', audioId: 'd11_mar_chat' },
    { text: 'Je reviendrai à la fin du mois. Nous parlerons de la plante.', audioId: 'd11_mar_futur' }
  ];
  // Canonical letter 10 is a draft, unlike Day 9's delivered note.
  const letter = {
    id: 'letter10', number: 10, title: 'Réponse', kind: 'Réponse', to: 'Madame Martin',
    source: 'js/letters.js:542-567', sourceAvailable: true, grammar: 'futur_simple', band: 'A2',
    graded: false, delivery: 'draft', sent: false,
    chips: ['Nous enverrons une photo de la plante demain.', 'La plante sera belle, promis !'],
    answers: { enverrons: 'enverrons', sera: 'sera', lait: 'lait' },
    choices: { enverrons: ['enverrons', 'enverrez', 'enverront'], sera: ['sera', 'serai', 'seras'] },
    recognitionOnly: ['enverrons', 'sera'],
    body: [ ['Bonjour Madame,'], ['Merci pour votre message. Tout va bien.'],
      ['Nous ', { gap: 'enverrons' }, ' une photo de la plante demain.'],
      ['La plante ', { gap: 'sera' }, ' belle, promis !'],
      ['Il n’y a plus de ', { gap: 'lait' }, ', mais il y a du basilic.'],
      ['Bonne journée !'], ['Camille et toute la maison'] ]
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const normalize = value => String(value || '').trim().toLocaleLowerCase('fr').replace(/'/g, '’').replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  const money = amount => amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + '\u00a0€';
  function fresh() {
    return { version: 1, day: 10, activity: 'hub', completed: {}, earned: 0, runs: {}, watered: false, evening: false,
      breadReturned: false, pastryEatenOnStairs: false,
      album: { photos: [], reservedPolaroidSlot: true, polaroid: false, polaroidDay: 11 },
      letter: { text: '', answers: {}, checked: false, saved: false, sent: false, delivered: false, finished: false } };
  }
  function create(options = {}) {
    const supplied = options.state?.day10Chores || options.state;
    let state = supplied?.version === 1 && supplied?.day === 10 && supplied?.runs && supplied?.album && supplied?.letter ? clone(supplied) : fresh();
    let container = null, message = '', dialogue = '', selected = null, speechTimer = null;
    const schedule = options.setTimeout || root.setTimeout?.bind(root);
    const unschedule = options.clearTimeout || root.clearTimeout?.bind(root);
    const getState = () => clone(state);
    const currentRun = () => state.runs[state.activity];
    const done = () => !!currentRun()?.done;
    function cancelSpeech() {
      if (speechTimer !== null) unschedule?.(speechTimer);
      speechTimer = null; dialogue = '';
    }
    function speak(text, audioId, speaker = 'noe') {
      cancelSpeech();
      if (message === text) message = '';
      if (!schedule) return;
      // Both text and audio wait for the action; text remains useful with missing audio.
      speechTimer = schedule(() => {
        speechTimer = null; dialogue = text; paint();
        options.onSpeak?.({ text, audioId, clip: audioId, speaker, delayMs: 800, audioPath: '../audio/w1/' + audioId + '.mp3' });
      }, 800);
      speechTimer?.unref?.();
    }
    function art(action = null) {
      const activity = state.activity, run = currentRun();
      options.onArt?.({ day: 10, scene: activity === 'album' ? 'roof' : 'kitchen',
        shot: activity === 'fridge' ? 'fridge' : ['message', 'letter10'].includes(activity) ? 'laptop' : activity === 'album' ? 'photo' : 'group',
        staging: { day: 10, beat: 'd11_afternoon', chore: activity, phase: 'afternoon', thirdPot: 'edge',
          delayMs: 800, panelFraming: 'subject-above-panel', floorVisible: true, tailInLiveView: false,
          cat: activity === 'album' ? 'potSleep' : 'sofa', catPot: activity === 'album' ? 3 : null,
          props: ['list', 'coffee', 'bread'], missingItems: state.runs.fridge?.found || [],
          listLines: state.runs.list?.lines || [], breadReturned: state.breadReturned, pastryEatenOnStairs: state.pastryEatenOnStairs,
          coffeeOrder: state.runs.coffee?.round || 0, served: state.runs.coffee?.served || [],
          albumShot: activity === 'album' ? Math.min(run?.round || 0, 4) : 0, albumCount: state.album.photos.length,
          albumPhotos: state.album.photos.slice(), albumFramed: run?.framed || null,
          reservedPolaroidSlot: true, polaroidInAlbum: false, photobomb: false, letterSaved: state.letter.saved }, action });
    }
    function complete() {
      const run = currentRun();
      if (!run || run.done) return;
      run.done = true;
      const count = state.completed[state.activity] || 0;
      run.reward = activities[state.activity].reward * (count === 0 ? 1 : count === 1 ? .5 : 0);
      state.completed[state.activity] = count + 1;
      state.earned += run.reward;
      message = 'Fait.';
    }
    function open(activity, repeat = false) {
      if (!Object.hasOwn(activities, activity) && activity !== 'hub') return false;
      cancelSpeech(); selected = null; message = ''; state.activity = activity;
      if (activities[activity] && (!currentRun() || repeat)) state.runs[activity] = {
        found: [], lines: [], chips: [], round: 0, served: [], photos: [], framed: null, messageLine: 0, done: false
      };
      if (repeat && activity === 'letter10') state.letter = fresh().letter;
      art();
      if (activity === 'coffee' && !done()) {
        const order = coffeeOrders[currentRun().round]; speak(order.text, order.audioId, order.person);
      }
      if (activity === 'message' && !done()) {
        const line = messageLines[currentRun().messageLine]; speak(line.text, line.audioId, 'martin');
      }
      return true;
    }
    function notify() { paint(); options.onChange?.(getState()); }
    function handle(action) {
      if (typeof action === 'string') action = { type: action };
      if (!action || typeof action !== 'object') return false;
      const run = currentRun();
      switch (action.type) {
        case 'open': if (!open(action.activity)) return false; break;
        case 'hub': open('hub'); break;
        case 'repeat': if (!activities[state.activity] || !done()) return false; open(state.activity, true); break;
        case 'missing': {
          if (state.activity !== 'fridge' || done()) return false;
          const item = missingItems.find(item => item.id === action.item);
          if (!item) { art(); speak('Il y a du basilic.', 'd11_frigo_basilic'); break; }
          if (run.found.includes(item.id)) return false;
          run.found.push(item.id); message = item.line;
          art({ type: 'object', object: 'list', state: 'write', item: item.id });
          speak(item.line, item.audioId);
          if (run.found.length === missingItems.length) complete();
          break;
        }
        case 'chip': {
          if (state.activity !== 'list' || done()) return false;
          const chips = listLines[run.round].split(' '), index = Number(action.number);
          if (!Number.isInteger(index) || index < 0 || index >= chips.length || run.chips.includes(index)) return false;
          run.chips.push(index); break;
        }
        case 'unchip':
          if (state.activity !== 'list' || done() || !Number.isInteger(Number(action.number)) || Number(action.number) < 0 || Number(action.number) >= run.chips.length) return false;
          run.chips.splice(Number(action.number), 1); break;
        case 'list-check': {
          if (state.activity !== 'list' || done()) return false;
          const chips = listLines[run.round].split(' '), text = run.chips.map(index => chips[index]).join(' ');
          if (normalize(text) !== normalize(listLines[run.round])) { message = 'Il n’y a plus de…'; break; }
          run.lines.push(text); run.round++; run.chips = [];
          art({ type: 'object', object: 'list', state: 'write', lines: run.lines.slice() });
          if (run.round === listLines.length) {
            state.breadReturned = true; state.pastryEatenOnStairs = true;
            complete(); art({ type: 'object', object: 'bread', state: 'return', crumbsOnStairs: true });
          }
          break;
        }
        case 'serve': {
          if (state.activity !== 'coffee' || done()) return false;
          const order = coffeeOrders[run.round];
          if (action.item !== order.item) { message = order.text; art(); speak(order.text, order.audioId, order.person); break; }
          run.served.push({ person: order.person, item: action.item }); run.round++;
          art({ type: 'object', object: action.item, state: 'serve', to: order.person });
          if (run.round === coffeeOrders.length) { cancelSpeech(); complete(); }
          else { const next = coffeeOrders[run.round]; speak(next.text, next.audioId, next.person); }
          break;
        }
        case 'frame': {
          if (state.activity !== 'album' || done() || !albumShots.some(shot => shot.id === action.shot)) return false;
          selected = action.shot;
          run.framed = action.shot === albumShots[run.round].id ? action.shot : null;
          art({ type: 'object', object: 'viewfinder', state: 'frame', shot: action.shot, centered: !!run.framed });
          speak(run.framed ? 'Souriez !' : 'Plus près… plus près !', run.framed ? 'd11_noe_souriez' : 'd11_noe_pres');
          break;
        }
        case 'snap': {
          if (state.activity !== 'album' || done() || !run.framed) return false;
          cancelSpeech();
          const shot = run.framed;
          run.photos.push(shot);
          if (!state.album.photos.includes(shot)) state.album.photos.push(shot);
          run.round++; run.framed = null; selected = null;
          art({ type: 'object', object: 'photo', state: 'snap', shot, flashDurationMs: 200, flashOpacity: .5 });
          if (run.round === albumShots.length) complete();
          break;
        }
        case 'listen':
          if (state.activity === 'message') {
            const line = messageLines[run.messageLine]; art(); speak(line.text, line.audioId, 'martin');
          } else if (state.activity === 'coffee' && !done()) {
            const order = coffeeOrders[run.round]; art(); speak(order.text, order.audioId, order.person);
          } else return false;
          break;
        case 'message-next':
          if (state.activity !== 'message') return false;
          run.messageLine = (run.messageLine + 1) % messageLines.length;
          art(); speak(messageLines[run.messageLine].text, messageLines[run.messageLine].audioId, 'martin'); break;
        case 'pick':
          if (state.activity !== 'message' || done() || !['plante', 'chat', 'canape', 'unknown'].includes(action.item)) return false;
          if (action.item === 'plante') { cancelSpeech(); complete(); }
          else { message = 'Une photo de la plante, s’il vous plaît.'; art(); speak(message, 'd11_mar_photo', 'martin'); }
          break;
        case 'letter-chip': {
          if (state.activity !== 'letter10' || state.letter.saved) return false;
          const chip = letter.chips[Number(action.number) - 1];
          if (!chip) return false;
          state.letter.text = chip; break;
        }
        case 'letter-text':
          if (state.activity !== 'letter10' || state.letter.saved) return false;
          state.letter.text = String(action.value || '').slice(0, 500); break;
        case 'letter-answer':
          if (state.activity !== 'letter10' || state.letter.saved || !Object.hasOwn(letter.answers, action.field)) return false;
          if (letter.choices[action.field] && action.value && !letter.choices[action.field].includes(action.value)) return false;
          state.letter.answers[action.field] = String(action.value || '').slice(0, 100); state.letter.checked = false;
          options.onChange?.(getState()); return true;
        case 'letter-read':
          if (state.activity !== 'letter10' || state.letter.saved) return false;
          state.letter.answers = { ...letter.answers }; state.letter.checked = true;
          state.letter.text = letter.body.map(row => row.map(part => typeof part === 'string' ? part : letter.answers[part.gap]).join('')).join('\n');
          message = 'Le brouillon est prêt.'; break;
        case 'letter-check':
          if (state.activity !== 'letter10' || state.letter.saved) return false;
          state.letter.checked = true;
          message = Object.entries(letter.answers).every(([key, value]) => normalize(state.letter.answers[key]) === value)
            ? 'Le brouillon est prêt.' : 'Relis les mots, ou lis la réponse complète.'; break;
        case 'letter-save':
          if (state.activity !== 'letter10' || state.letter.saved) return false;
          if (!state.letter.text.trim() && !Object.values(state.letter.answers).some(value => value.trim())) {
            message = 'Lis la réponse complète, ou choisis une phrase.'; break;
          }
          if (!state.letter.text.trim()) state.letter.text = letter.body.map(row => row.map(part =>
            typeof part === 'string' ? part : state.letter.answers[part.gap] || '…').join('')).join('\n');
          state.letter.saved = true; state.letter.finished = true;
          complete(); message = 'Brouillon gardé. Pas envoyé aujourd’hui.';
          art({ type: 'object', object: 'letter', state: 'draft' }); break;
        case 'continue':
          if (state.activity !== 'letter10' || !state.letter.saved) return false;
          open('hub'); break;
        case 'evening':
          if (state.activity !== 'hub' || state.evening) return false;
          cancelSpeech(); state.evening = true; notify(); options.onFinish?.({ activity: 'hub' }); return true;
        case 'water':
          if (state.activity !== 'hub' || state.watered || !options.onWater) return false;
          cancelSpeech(); state.watered = true; notify(); options.onWater(); return true;
        default: return false;
      }
      notify(); return true;
    }
    const button = (type, text, attrs = '') => '<button type="button" data-d10-action="' + type + '" ' + attrs + '>' + text + '</button>';
    function field(id) {
      const value = state.letter.answers[id] || '', choices = letter.choices[id];
      const wrong = state.letter.checked && normalize(value) !== letter.answers[id];
      const attrs = ' data-d10-field="' + id + '" data-d10-key="' + id + '" aria-label="' + id + '"' + (wrong ? ' aria-invalid="true"' : '');
      return (choices ? '<select' + attrs + '><option value="">...</option>' + choices.map(choice => '<option' + (value === choice ? ' selected' : '') + '>' + choice + '</option>').join('') + '</select>'
        : '<input' + attrs + ' value="' + escape(value) + '" autocomplete="off" autocapitalize="none" spellcheck="false" size="7" maxlength="100">')
        + (wrong ? '<small class="day9-correction">' + letter.answers[id] + '</small>' : '');
    }
    function paint() {
      if (!container) return;
      const focus = container.ownerDocument.activeElement, key = container.contains(focus) ? focus?.dataset?.d10Key : null;
      const activity = state.activity, run = currentRun();
      let body = '';
      if (activity === 'hub') {
        body = '<div class="day9-menu">' + Object.entries(activities).map(([id, item]) => button('open', escape(item.title) + (state.completed[id] ? '<small>Fait</small>' : ''), 'data-activity="' + id + '" data-d10-key="' + id + '"')).join('') + '</div>'
          + '<div class="day9-footer">' + (options.onWater && !state.watered ? button('water', 'Arroser', 'data-d10-key="water"') : '')
          + button('evening', 'Le soir', 'data-d10-key="evening"' + (state.evening ? ' disabled' : '')) + '</div>';
      } else if (activity === 'fridge') {
        body = '<p>Il n’y a plus de…</p><div class="day9-items">' + [...missingItems, { id: 'basilic', text: 'le basilic' }].map(item => button('missing', escape(item.text), 'data-item="' + item.id + '" data-d10-key="' + item.id + '"' + (done() || run.found.includes(item.id) ? ' disabled' : ''))).join('') + '</div><p>' + run.found.length + ' / 2</p>';
      } else if (activity === 'list') {
        if (done()) body = '<p>Noé revient avec du pain.</p>';
        else {
          const chips = listLines[run.round].split(' ');
          body = '<p>La liste pour Noé · ' + (run.round + 1) + ' / 3</p><div class="ordered">'
            + run.chips.map((index, n) => button('unchip', escape(chips[index]), 'data-number="' + n + '" data-d10-key="unchip-' + n + '"')).join('') + '</div><div class="chunks">'
            + chips.map((text, index) => ({ text, index })).reverse().map(({ text, index }) => button('chip', escape(text), 'data-number="' + index + '" data-d10-key="chip-' + index + '"' + (run.chips.includes(index) ? ' disabled' : ''))).join('') + '</div>'
            + button('list-check', 'Relire', 'data-d10-key="list-check"');
        }
      } else if (activity === 'coffee') {
        body = '<p>' + (done() ? 'À table.' : escape(coffeeOrders[run.round].person === 'camille' ? 'Camille' : 'Noé')) + '</p>'
          + button('listen', 'Écouter', 'data-d10-key="listen"' + (done() ? ' disabled' : ''))
          + '<div class="day9-items">' + [['cafe', 'le café'], ['the', 'le thé'], ['pain', 'le pain'], ['lait', 'le lait']].map(([id, text]) => button('serve', text, 'data-item="' + id + '" data-d10-key="serve-' + id + '"' + (done() ? ' disabled' : ''))).join('') + '</div>';
      } else if (activity === 'album') {
        body = '<p>' + (done() ? 'L’album du toit.' : escape(albumShots[run.round].text)) + ' · ' + run.photos.length + ' / 5</p>'
          + '<div class="day9-targets">' + albumShots.map(shot => button('frame', escape(shot.text), 'data-shot="' + shot.id + '" data-d10-key="frame-' + shot.id + '" aria-pressed="' + (selected === shot.id) + '"' + (done() ? ' disabled' : ''))).join('') + '</div>'
          + button('snap', 'Prendre la photo', 'data-d10-key="snap"' + (!run.framed || done() ? ' disabled' : ''))
          + '<div class="day10-album" aria-label="Album du toit">' + albumShots.map(shot => '<span data-album-shot="' + shot.id + '"' + (state.album.photos.includes(shot.id) ? ' class="is-filled"' : '') + '>' + (state.album.photos.includes(shot.id) ? escape(shot.text) : '') + '</span>').join('')
          + '<span data-polaroid-slot="reserved" aria-label="Emplacement vide"></span></div>';
      } else if (activity === 'message') {
        body = '<p>Madame Martin · ' + (run.messageLine + 1) + ' / 4</p>' + button('listen', 'Réécouter', 'data-d10-key="listen"') + button('message-next', 'La suite', 'data-d10-key="message-next"')
          + '<p>Une photo de quoi ?</p><div class="day9-targets">' + [['plante', 'la plante'], ['chat', 'le chat'], ['canape', 'le canapé'], ['unknown', 'Je ne sais pas']].map(([id, text]) => button('pick', text, 'data-item="' + id + '" data-d10-key="pick-' + id + '"' + (done() ? ' disabled' : ''))).join('') + '</div>';
      } else if (activity === 'letter10') {
        body = '<div class="day10-letter-body" tabindex="0" role="region" aria-label="Brouillon de la réponse"><p class="day9-note">Pour Madame Martin. Pas envoyé aujourd’hui.</p>';
        if (state.letter.saved) body += '<p>Brouillon gardé.</p><div class="day9-letter">' + escape(state.letter.text).replace(/\n/g, '<br>') + '</div></div>' + button('continue', 'Continuer', 'data-d10-key="continue"');
        else body += '<div class="day9-phrases">' + letter.chips.map((text, index) => button('letter-chip', escape(text), 'data-number="' + (index + 1) + '" data-d10-key="letter-chip-' + index + '"')).join('') + '</div>'
          + (state.letter.text ? '<p class="day9-note">' + escape(state.letter.text) + '</p>' : '')
          + '<div class="day9-letter">' + letter.body.map(row => '<p>' + row.map(part => typeof part === 'string' ? escape(part) : field(part.gap)).join('') + '</p>').join('') + '</div></div>'
          + '<div class="day9-footer">' + button('letter-check', 'Relire', 'data-d10-key="letter-check"') + button('letter-read', 'Lire la réponse complète', 'data-d10-key="letter-read"')
          + button('letter-save', 'Garder le brouillon', 'data-d10-key="letter-save"') + '</div>';
      }
      if (activities[activity]) body += '<div class="day9-footer">' + button('hub', 'La maison', 'data-d10-key="hub"')
        + (done() ? '<span class="day9-reward">' + (run.reward ? '+' + money(run.reward) : 'Fait') + '</span>' + button('repeat', 'Encore', 'data-d10-key="repeat"') : '') + '</div>';
      container.innerHTML = '<section class="day9-chores day10-chores" aria-label="Jour 10" lang="fr"><header><h2>'
        + escape(activities[activity]?.title || 'La maison') + '</h2>' + (activity === 'hub' ? '<span class="day9-earned">' + money(state.earned) + '</span>' : '')
        + '</header>' + body + (dialogue ? '<p class="day10-dialogue" lang="fr">' + escape(dialogue) + '</p>' : '')
        + '<p class="day9-status" role="status" aria-live="polite" aria-atomic="true">' + escape(message) + '</p></section>';
      if (key) {
        const nodes = [...container.querySelectorAll('[data-d10-key]')];
        const target = nodes.find(node => node.dataset.d10Key === key && !node.disabled)
          || nodes.find(node => node.dataset.d10Action === (done() ? 'hub' : 'snap') && !node.disabled) || nodes.find(node => !node.disabled);
        target?.focus({ preventScroll: true });
      }
    }
    function click(event) {
      const node = event.target.closest?.('[data-d10-action]');
      if (!node || !container.contains(node) || node.disabled) return;
      event.stopPropagation();
      handle({ type: node.dataset.d10Action, activity: node.dataset.activity, item: node.dataset.item, shot: node.dataset.shot,
        number: node.dataset.number === undefined ? undefined : Number(node.dataset.number) });
    }
    function input(event) {
      const field = event.target.dataset?.d10Field;
      if (!field || !container.contains(event.target)) return;
      event.stopPropagation(); handle({ type: 'letter-answer', field, value: event.target.value });
    }
    const listeners = { click, input, change: input };
    function detach() {
      cancelSpeech();
      if (container) Object.entries(listeners).forEach(([type, fn]) => container.removeEventListener(type, fn));
      container = null;
    }
    function render(target, activity) {
      if (!target?.addEventListener) throw new TypeError('Day10Chores.render requires a DOM container');
      if (container !== target) { detach(); container = target; Object.entries(listeners).forEach(([type, fn]) => container.addEventListener(type, fn)); }
      if (activity && typeof activity === 'object') activity = activity.kind === 'letter' ? 'letter10' : activity.activity || 'hub';
      if (activity && activity !== state.activity) open(activity);
      else if (activities[state.activity] && !currentRun()) open(state.activity);
      else art();
      paint(); return controller;
    }
    const controller = { render, handle, getState, destroy: detach,
      reset() { cancelSpeech(); state = fresh(); selected = null; message = ''; art(); notify(); return getState(); } };
    return controller;
  }
  const api = { create, activities, letter, missingItems, listLines, coffeeOrders, albumShots, messageLines };
  root.Day10Chores = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
