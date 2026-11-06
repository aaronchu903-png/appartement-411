/* Day 9's optional afternoon activities. This controller never persists player data. */
(function (root) {
  'use strict';
  const activities = {
    list: { title: 'La liste de la maison', reward: 1 },
    dishes: { title: 'La vaisselle', reward: 1 },
    table: { title: 'On mange \u00e0 table', reward: .5 },
    coins: { title: 'La cagnotte', reward: 0 },
    hide: { title: 'Cache-cache', reward: .5 }
  };
  const listItems = [
    { id: 'vaisselle', text: 'la vaisselle', target: 'evier' },
    { id: 'lait', text: 'le lait', target: 'frigo' },
    { id: 'pain', text: 'le pain', target: 'table' }
  ];
  const tableItems = [
    { id: 'tartine', text: 'la tartine', target: 'table' },
    { id: 'tasse', text: 'la tasse', target: 'table' },
    { id: 'assiette', text: 'l\u2019assiette', target: 'table' }
  ];
  const hiding = [
    { id: 'placard', label: 'le placard', text: 'Dans le placard.' },
    { id: 'canape', label: 'le canap\u00e9', text: 'Sur le canap\u00e9.' },
    { id: 'table', label: 'la table', text: 'Sous la table.' },
    { id: 'panier', label: 'le panier', text: 'Derri\u00e8re le panier.' }
  ];
  const numbers = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
  // Legacy js/letters.js:511-540 is a Mot to Lea. Keep its practice chunks,
  // but follow DAY09_V3 section 3's recipient; quoted tu addresses Noe, not her.
  const letter = {
    id: 'letter9', title: 'Mot', to: 'Madame Lef\u00e8vre',
    source: 'js/letters.js:511-540; recipient adapted per DAY09_V3 section 3',
    sourceAvailable: false, graded: false,
    chips: ['On mange \u00e0 table.', 'Il faut de l\u2019eau.'],
    answers: { pourrais: 'pourrais', frigo: 'frigo', moi: 'moi', eau: 'eau' }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const money = amount => amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + '\u00a0\u20ac';
  const normalize = value => String(value || '').trim().toLocaleLowerCase('fr').replace(/[.!?]+$/, '');
  function fresh() {
    return { version: 1, activity: 'hub', completed: {}, earned: 0, runs: {}, spoonGone: false,
      jar: { unlocked: false, noeEuros: 0 }, watered: false, evening: false,
      letter: { text: '', answers: {}, checked: false, delivered: false, finished: false } };
  }
  function create(options = {}) {
    // Accept only this module's own snapshot, never mutate a parent save object.
    const supplied = options.state?.day9Chores || options.state;
    let state = supplied?.version === 1 && supplied?.runs && supplied?.jar && supplied?.letter
      ? clone(supplied) : fresh();
    let container = null, selected = null, message = '', drag = null, suppressClick = false;
    const getState = () => clone(state);
    const speak = (text, audioId = null, speaker = 'narrator') => options.onSpeak?.({ text, audioId, speaker });
    const currentRun = () => state.runs[state.activity];
    const items = () => state.activity === 'table' ? tableItems : listItems;
    const done = () => !!currentRun()?.done;
    function art(action = null) {
      const activity = state.activity;
      const props = ['list', 'milk', 'plates'];
      if (!state.spoonGone) props.push('spoon');
      options.onArt?.({ day: 9, scene: activity === 'letter9' ? 'stairs' : 'kitchen',
        shot: activity === 'dishes' ? 'plates' : activity === 'list' ? 'list' : activity === 'letter9' ? 'lefevreDoor' : 'group',
        staging: { day: 9, phase: activity === 'letter9' ? 'night' : 'afternoon', thirdPot: 'hidden', props,
          cat: 'none', platesRemaining: 6 - (state.runs.dishes?.plates || 0),
          spoon: state.spoonGone ? 'gone' : 'rack',
          hideSpot: activity === 'hide' && !done() ? hiding[currentRun().round].id : null,
          tableItems: state.runs.table?.placed || [], listItems: state.runs.list?.placed || [],
          letterDelivered: state.letter.delivered }, action });
    }
    function complete() {
      const run = currentRun();
      if (!run || run.done) return;
      run.done = true;
      const count = state.completed[state.activity] || 0;
      const reward = activities[state.activity].reward * (count === 0 ? 1 : count === 1 ? .5 : 0);
      state.completed[state.activity] = count + 1;
      state.earned += reward;
      run.reward = reward;
      message = state.activity === 'dishes' ? 'Ma cuill\u00e8re\u202f?!' : 'C\u2019est une bonne id\u00e9e.';
    }
    function open(activity, repeat = false) {
      cancelDrag();
      if (!activities[activity] && activity !== 'hub' && activity !== 'letter9') return false;
      state.activity = activity;
      selected = null;
      message = '';
      if (activities[activity] && (!state.runs[activity] || repeat)) {
        state.runs[activity] = { placed: [], plates: 0, counted: 0, round: 0, done: false };
      }
      if (activity === 'coins' && !state.jar.unlocked) {
        state.jar = { unlocked: true, noeEuros: 5 };
      }
      art();
      if (activity === 'hide' && !done()) speak(hiding[currentRun().round].text);
      return true;
    }
    function notify() {
      paint();
      options.onChange?.(getState());
    }
    function handle(action) {
      if (typeof action === 'string') action = { type: action };
      if (!action || typeof action !== 'object') return false;
      const run = currentRun();
      switch (action.type) {
        case 'open':
          if (!open(action.activity)) return false;
          break;
        case 'hub': cancelDrag(); open('hub'); break;
        case 'repeat':
          if (!activities[state.activity] || !done()) return false;
          open(state.activity, true);
          break;
        case 'select':
          if (!['list', 'table'].includes(state.activity) || done() || !items().some(item => item.id === action.item) || run.placed.includes(action.item)) return false;
          selected = selected === action.item ? null : action.item;
          message = selected ? 'Choisis une place.' : '';
          break;
        case 'cancel': selected = null; message = ''; break;
        case 'place': {
          if (!['list', 'table'].includes(state.activity) || done()) return false;
          const item = items().find(item => item.id === (action.item || selected));
          if (!item || run.placed.includes(item.id)) return false;
          if (item.target !== action.target) {
            message = item.id === 'lait' ? 'Le lait, \u00e7a va dans le frigo.' : 'Essaie une autre place.';
            speak(message); break;
          }
          run.placed.push(item.id);
          selected = null;
          message = state.activity === 'table' ? 'On mange \u00e0 table.' : item.text + '\u00a0: ' + action.target + '.';
          art({ type: 'object', object: item.id, state: 'move', from: state.activity === 'table' ? 'sofa' : 'list', to: action.target });
          if (state.activity === 'table') speak('On mange \u00e0 table.', 'd10_cam_table', 'camille');
          if (run.placed.length === items().length) complete();
          break;
        }
        case 'wash':
          if (state.activity !== 'dishes' || done()) return false;
          run.plates++;
          message = run.plates + ' / 6';
          art({ type: 'object', object: 'plates', state: 'wash', remaining: 6 - run.plates });
          if (run.plates === 6) {
            if (!state.spoonGone) {
              state.spoonGone = true;
              art({ type: 'object', object: 'spoon', state: 'vanish', at: 'rack' });
              speak('Ma cuill\u00e8re\u202f?!', 'd10_noe_cuillere', 'noe');
            }
            complete();
          }
          break;
        case 'coin':
          if (state.activity !== 'coins' || done()) return false;
          if (Number(action.number) !== run.counted + 1) { message = 'Encore\u202f?'; break; }
          run.counted++;
          speak(numbers[run.counted - 1] + '.');
          message = numbers[run.counted - 1] + ' / dix';
          art({ type: 'object', object: 'coin', state: 'move', to: 'jar', count: run.counted });
          if (run.counted === 10) complete();
          break;
        case 'listen':
          if (state.activity !== 'hide' || done()) return false;
          speak(hiding[run.round].text); return true;
        case 'find':
          if (state.activity !== 'hide' || done()) return false;
          if (action.spot !== hiding[run.round].id) { message = 'Pas ici.'; break; }
          message = hiding[run.round].text;
          run.round++;
          if (run.round === 4) complete();
          art();
          if (!done()) speak(hiding[run.round].text);
          break;
        case 'letter-chip':
          if (state.activity !== 'letter9' || state.letter.delivered) return false;
          const chip = letter.chips[Number(action.number) - 1];
          if (!chip) return false;
          state.letter.text = chip;
          break;
        case 'letter-text':
          if (state.activity !== 'letter9' || state.letter.delivered) return false;
          state.letter.text = String(action.value || '').slice(0, 200);
          break;
        case 'letter-answer':
          if (state.activity !== 'letter9' || state.letter.delivered || !Object.hasOwn(letter.answers, action.field)) return false;
          state.letter.answers[action.field] = String(action.value || '').slice(0, 100);
          state.letter.checked = false;
          // Do not replace the focused input while the player types.
          options.onChange?.(getState()); return true;
        case 'letter-read':
          if (state.activity !== 'letter9' || state.letter.delivered) return false;
          state.letter.answers = { ...letter.answers };
          state.letter.checked = true;
          state.letter.text = letter.chips.join(' ');
          message = 'Le mot est pr\u00eat.';
          break;
        case 'letter-check':
          if (state.activity !== 'letter9' || state.letter.delivered) return false;
          state.letter.checked = true;
          message = Object.entries(letter.answers).every(([key, answer]) => normalize(state.letter.answers[key]) === answer)
            ? 'Le mot est pr\u00eat.' : 'Relis les mots, ou lis le mot complet.';
          break;
        case 'deliver':
          if (state.activity !== 'letter9' || state.letter.delivered) return false;
          const filled = Object.entries(letter.answers).every(([key, answer]) => normalize(state.letter.answers[key]) === answer);
          if (!normalize(state.letter.text) && !filled) {
            message = 'Lis le mot complet avant de le glisser sous la porte.'; break;
          }
          state.letter.delivered = true;
          message = 'Le mot est sous la porte de Madame Lef\u00e8vre.';
          art({ type: 'object', object: 'letter', state: 'deliver', at: 'lefevreDoor' });
          break;
        case 'continue':
          if (state.activity !== 'letter9' || !state.letter.delivered || state.letter.finished) return false;
          state.letter.finished = true;
          notify(); options.onFinish?.({ activity: 'letter9', delivered: true }); return true;
        case 'evening':
          if (state.activity !== 'hub' || state.evening) return false;
          state.evening = true;
          notify(); options.onFinish?.({ activity: 'hub', spoonGone: state.spoonGone }); return true;
        case 'water':
          if (state.activity !== 'hub' || state.watered || !options.onWater) return false;
          state.watered = true;
          notify(); options.onWater(); return true;
        default: return false;
      }
      notify(); return true;
    }
    const button = (type, text, attrs = '') => '<button type="button" data-d9-action="' + type + '" ' + attrs + '>' + text + '</button>';
    function field(id, choices) {
      const value = state.letter.answers[id] || '';
      const wrong = state.letter.checked && normalize(value) !== letter.answers[id];
      const attrs = ' data-d9-field="' + id + '" data-d9-key="' + id + '" aria-label="' + id + '"' + (wrong ? ' aria-invalid="true"' : '');
      return (choices ? '<select' + attrs + '><option value="">...</option>' + choices.map(choice => '<option' + (value === choice ? ' selected' : '') + '>' + choice + '</option>').join('') + '</select>'
        : '<input' + attrs + ' value="' + escape(value) + '" autocomplete="off" autocapitalize="none" spellcheck="false" size="7" maxlength="100">')
        + (wrong ? '<small class="day9-correction">' + letter.answers[id] + '</small>' : '');
    }
    function paint() {
      if (!container) return;
      const focus = container.ownerDocument.activeElement;
      const key = container.contains(focus) ? focus?.dataset?.d9Key : null;
      const activity = state.activity, run = currentRun();
      let body = '';
      if (activity === 'hub') {
        body = '<p class="day9-note">Jeudi\u00a0: d\u00eener en bas.</p><div class="day9-menu">'
          + Object.entries(activities).map(([id, item]) => button('open', escape(item.title) + (state.completed[id] ? '<small>Fait</small>' : ''), 'data-activity="' + id + '" data-d9-key="' + id + '"')).join('') + '</div>'
          + '<div class="day9-footer">' + (options.onWater && !state.watered ? button('water', 'Arroser', 'data-d9-key="water"') : '')
          + button('evening', 'Le soir', 'data-d9-key="evening"' + (state.evening ? ' disabled' : '')) + '</div>';
      } else if (activity === 'list' || activity === 'table') {
        body = '<p class="day9-instruction">Glisse un objet, ou choisis un objet puis sa place.</p>'
          + (activity === 'list' ? '<p class="day9-note">Jeudi\u00a0: d\u00eener en bas.</p>' : '<p>Le canap\u00e9</p>')
          + '<div class="day9-items">' + items().filter(item => !run.placed.includes(item.id)).map(item => button('select', escape(item.text), 'data-item="' + item.id + '" data-d9-key="' + item.id + '" aria-pressed="' + (selected === item.id) + '" class="day9-carry"')).join('') + '</div>'
          + '<div class="day9-targets">' + (activity === 'table' ? [['table', '\u00e0 table']] : [['evier', 'la cuisine\u00a0: l\u2019\u00e9vier'], ['frigo', 'la cuisine\u00a0: le frigo'], ['table', '\u00e0 table']]).map(([id, label]) => button('place', label + '<small>' + items().filter(item => item.target === id && run.placed.includes(item.id)).map(item => escape(item.text)).join(', ') + '</small>', 'data-target="' + id + '" data-d9-key="target-' + id + '"')).join('') + '</div>';
      } else if (activity === 'dishes') {
        body = '<p>Tu pourrais faire la vaisselle\u202f?</p><div class="day9-dishes" aria-label="' + run.plates + ' assiettes propres sur 6">'
          + Array.from({ length: 6 }, (_, i) => '<span class="day9-plate' + (i < run.plates ? ' is-clean' : '') + '" aria-hidden="true"></span>').join('')
          + '</div><p>' + run.plates + ' / 6</p>'
          + button('wash', 'Laver une assiette', 'data-d9-key="wash"' + (done() ? ' disabled' : ''))
          + '<p class="day9-rack">' + (state.spoonGone ? 'L\u2019\u00e9gouttoir est vide.' : 'Une cuill\u00e8re dans l\u2019\u00e9gouttoir.') + '</p>';
      } else if (activity === 'coins') {
        body = '<p>No\u00e9\u00a0: 5\u00a0\u20ac pour la cagnotte.</p><p class="day9-instruction">Dix pi\u00e8ces de 50 centimes. Compte de un \u00e0 dix.</p>'
          + '<div class="day9-coins">' + numbers.map((word, i) => button('coin', String(i + 1), 'data-number="' + (i + 1) + '" data-d9-key="coin-' + (i + 1) + '" aria-label="' + word + '"' + (i < run.counted ? ' disabled' : ''))).join('')
          + '</div><p class="day9-jar">La cagnotte\u00a0: ' + money(state.jar.noeEuros) + ' <span>(' + run.counted + ' / 10)</span></p>';
      } else if (activity === 'hide') {
        body = '<p>Dans l\u2019appartement\u00a0: ' + Math.min(run.round + 1, 4) + ' / 4</p>'
          + button('listen', '\u00c9couter', 'data-d9-key="listen"' + (done() ? ' disabled' : ''))
          + '<div class="day9-targets">' + hiding.map(spot => button('find', spot.label, 'data-spot="' + spot.id + '" data-d9-key="spot-' + spot.id + '"' + (done() ? ' disabled' : ''))).join('') + '</div>';
      } else if (activity === 'letter9') {
        body = state.letter.delivered ? '<p>Pour Madame Lef\u00e8vre.</p><div class="day9-envelope" aria-hidden="true"></div>' + button('continue', 'Continuer', 'data-d9-key="continue"' + (state.letter.finished ? ' disabled' : ''))
          : '<p class="day9-instruction">Un petit mot pour Madame Lef\u00e8vre. Choisis une phrase, compl\u00e8te les mots, ou lis le mot complet.</p>'
          + '<div class="day9-phrases">' + letter.chips.map((text, i) => button('letter-chip', escape(text), 'data-number="' + (i + 1) + '" data-d9-key="chip-' + (i + 1) + '"')).join('') + '</div>'
          + (state.letter.text ? '<p class="day9-note">' + escape(state.letter.text) + '</p>' : '')
          + '<div class="day9-letter"><p>Ch\u00e8re Madame Lef\u00e8vre,</p><p>C\u2019est une bonne id\u00e9e\u00a0: les deux plantes montent sur le toit.</p>'
          + '<p>Camille dit\u00a0: \u00ab\u00a0No\u00e9, tu ' + field('pourrais', ['pourrais', 'pourriez']) + ' faire la vaisselle\u202f?\u00a0\u00bb</p>'
          + '<p>Le lait, \u00e7a va dans le ' + field('frigo') + '.</p><p>No\u00e9 dit\u00a0: \u00ab\u00a0C\u2019est pour ' + field('moi', ['moi', 'toi', 'lui']) + '\u202f?\u00a0\u00bb</p>'
          + '<p>Le jardin\u00a0: un peu d\u2019' + field('eau') + '.</p><p>Bonne soir\u00e9e, Madame.</p></div>'
          + '<div class="day9-footer">' + button('letter-check', 'Relire', 'data-d9-key="check"') + button('letter-read', 'Lire le mot complet', 'data-d9-key="read"') + button('deliver', 'Glisser sous la porte', 'data-d9-key="deliver"') + '</div>';
      }
      if (activities[activity]) {
        body += '<div class="day9-footer">' + button('hub', 'La maison', 'data-d9-key="hub"')
          + (done() ? '<span class="day9-reward">' + (run.reward ? '+' + money(run.reward) : 'Fait') + '</span>' + button('repeat', 'Encore', 'data-d9-key="repeat"') : '') + '</div>';
      }
      container.innerHTML = '<section class="day9-chores" aria-label="Jour 9" lang="fr"><header><h2>'
        + (activities[activity]?.title || (activity === 'letter9' ? 'Mot \u00b7 Madame Lef\u00e8vre' : 'La maison'))
        + '</h2>' + (activity === 'hub' ? '<span class="day9-earned">' + money(state.earned) + '</span>' : '')
        + '</header>' + body + '<p class="day9-status" role="status" aria-live="polite" aria-atomic="true">' + escape(message) + '</p></section>';
      if (key) {
        const buttons = [...container.querySelectorAll('[data-d9-key]')];
        const target = buttons.find(node => node.dataset.d9Key === key && !node.disabled)
          || buttons.find(node => node.dataset.d9Action === (done() ? 'hub' : selected ? 'place' : 'select') && !node.disabled)
          || buttons.find(node => !node.disabled);
        target?.focus({ preventScroll: true });
      }
    }
    function click(event) {
      const node = event.target.closest?.('[data-d9-action]');
      if (!node || !container.contains(node)) return;
      event.stopPropagation();
      if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
      if (node.disabled) return;
      handle({ type: node.dataset.d9Action, activity: node.dataset.activity, item: node.dataset.item,
        target: node.dataset.target, spot: node.dataset.spot, number: Number(node.dataset.number) || node.dataset.number });
    }
    function input(event) {
      const field = event.target.dataset?.d9Field;
      if (field) { event.stopPropagation(); handle({ type: 'letter-answer', field, value: event.target.value }); }
    }
    function keydown(event) {
      if (event.key === 'Escape' && (selected || drag)) {
        event.preventDefault(); event.stopPropagation(); cancelDrag(); handle('cancel');
      }
    }
    function pointerdown(event) {
      const node = event.target.closest?.('[data-item]');
      if (!node || !container.contains(node) || (event.button !== undefined && event.button !== 0) || event.isPrimary === false) return;
      suppressClick = false;
      drag = { node, item: node.dataset.item, id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      node.setPointerCapture?.(event.pointerId);
    }
    function pointermove(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const x = event.clientX - drag.x, y = event.clientY - drag.y;
      if (Math.hypot(x, y) > 6) drag.moved = true;
      if (!drag.moved) return;
      event.preventDefault();
      drag.node.classList.add('is-dragging');
      drag.node.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    function cancelDrag() {
      suppressClick = false;
      if (!drag) return;
      const previous = drag; drag = null;
      previous.node.classList.remove('is-dragging'); previous.node.style.transform = '';
      if (previous.node.hasPointerCapture?.(previous.id)) previous.node.releasePointerCapture(previous.id);
    }
    function pointerup(event) {
      if (!drag || drag.id !== event.pointerId) return;
      const previous = drag;
      // The captured source is not the drop target, including on touch screens.
      const target = container.ownerDocument.elementFromPoint(event.clientX, event.clientY)?.closest('[data-target]');
      cancelDrag();
      if (!previous.moved) return;
      event.preventDefault(); suppressClick = true;
      if (target && container.contains(target)) handle({ type: 'place', item: previous.item, target: target.dataset.target });
      else handle({ type: 'select', item: previous.item });
    }
    const listeners = { click, input, change: input, keydown, pointerdown, pointermove, pointerup, pointercancel: cancelDrag, lostpointercapture: cancelDrag };
    function detach() {
      cancelDrag();
      if (container) Object.entries(listeners).forEach(([type, fn]) => container.removeEventListener(type, fn));
      container = null;
    }
    function render(target, activity) {
      if (!target?.addEventListener) throw new TypeError('Day9Chores.render requires a DOM container');
      if (container !== target) {
        detach(); container = target;
        Object.entries(listeners).forEach(([type, fn]) => container.addEventListener(type, fn));
      }
      if (activity && typeof activity === 'object') activity = activity.kind === 'letter' ? 'letter9' : activity.activity || 'hub';
      if (activity && activity !== state.activity) open(activity);
      else if (activities[state.activity] && !currentRun()) open(state.activity);
      else art();
      paint();
      return controller;
    }
    const controller = { render, handle, getState, destroy: detach,
      reset() { state = fresh(); selected = null; message = ''; cancelDrag(); art(); notify(); return getState(); } };
    return controller;
  }
  const api = { create, activities, letter };
  root.Day9Chores = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
