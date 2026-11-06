import { ON_WRONG, ASR_PLAYTEST } from './constants.js';
import { matchDictation } from './normalize.js';
import { formatPlacementScreen, placementTimeGoal, PLACEMENT_MINUTE_PRESETS } from './placement.js';
import { placementCopy } from './placement-copy.js';
import {
  normalizeLearningItems,
  playM2Clip,
  primaryClipForStep,
  stopM2Clip
} from './m2-audio.js';
import {
  loadUiKit,
  mountUi,
  mountExit,
  mountRecastBox,
  mountPotState,
  mountSceneThumbFill,
  mountLearnWordArt,
  mountWordCardArt,
  mountPromptModuleArt,
  mountPlacementPromptArt,
  mountPlacementResultCard,
  updatePlacementTimeGoalDom,
  columnWidthX1,
  M2_PANEL_W_X1
} from './ui-kit.js';

const SHAME_RE = /\b(Faux|Erreur)\b|✗/i;
const PALETTE_RED = /#(?:f00|ff0000|e11|dc2626|b04a3a)\b/i;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function assertNoShameCopy(root) {
  const t = root.textContent || '';
  if (SHAME_RE.test(t)) throw new Error('R7: shame copy in module UI');
  if (PALETTE_RED.test(root.innerHTML)) throw new Error('R7: red in module palette');
}

function viewportWidth() {
  return typeof window !== 'undefined' ? window.innerWidth : 390;
}

function mountOpts(kit, ctx, extra = {}) {
  return {
    viewportWidth: ctx.viewportWidth ?? viewportWidth(),
    widthX1: columnWidthX1(ctx.viewportWidth ?? viewportWidth()),
    fullWidth: extra.fullWidth ?? false,
    ...extra
  };
}

async function ensureKit(ctx) {
  if (ctx.ui) return ctx.ui;
  ctx.ui = await loadUiKit();
  return ctx.ui;
}

/**
 * Render a learning_module step into `container` (ui_learning rev1 art).
 */
export async function renderLearningModule(container, step, ctx) {
  const kit = await ensureKit(ctx);
  const col = columnWidthX1(ctx.viewportWidth ?? viewportWidth());
  container.innerHTML = '';
  container.className = 'm2-module-root';
  container.dataset.placeholderArt = kit.placeholderArt ? 'true' : 'false';

  const mod = step.module;
  const topBar = el('div', 'm2-top-bar');
  topBar.dataset.uiKey = 'ui.top_bar.idle';
  container.appendChild(topBar);
  const body = el('div', 'm2-body m2-col');
  body.style.maxWidth = `${col * kit.scale}px`;
  container.appendChild(body);
  const footer = el('div', 'm2-footer m2-thumb-zone m2-col');
  footer.style.maxWidth = `${col * kit.scale}px`;
  container.appendChild(footer);

  let captureState = { module: mod, onWrong: ON_WRONG, asr: ASR_PLAYTEST };

  const finish = (via = 'finish') => {
    stopM2Clip();
    ctx.onEvidence?.({ type: 'module_exit', module: mod, via, items_done: captureState.itemsDone ?? 0 });
    ctx.onDone?.();
  };

  const playClip = (clipId, opts) => playM2Clip(clipId, opts).then((r) => {
    ctx.onEvidence?.({ type: 'audio_play', clipId: r.clipId, ok: r.ok, reason: r.reason });
    return r;
  });

  const wirePlayButton = (btn, clipId, { slow = false } = {}) => {
    if (!btn || !clipId) return;
    btn.addEventListener('click', () => {
      playClip(clipId, { rate: slow ? 0.75 : 1 });
    });
  };

  mountExit(kit, topBar, 'Fini pour aujourd\'hui', () => finish('exit'));

  switch (mod) {
    case 'learn_words': {
      const learnItems = normalizeLearningItems(step.items);
      const panelWrap = el('div', 'm2-learn-panel');
      const wordInterior = el('div', 'm2-wordbook-inner');
      const thumbSlot = el('div', 'm2-wordbook-thumb-slot');
      const picFrame = el('div', 'm2-wordbook-pic');
      const learnItemId = learnItems[0]?.id || learnItems[0]?.audio;
      mountUi(kit, 'ui.card_picture_frame', 'idle', picFrame, {
        tag: 'div',
        widthX1: 64,
        heightX1: 44
      });
      const frameShell = picFrame.querySelector('.m2-ui-shell');
      if (frameShell) {
        frameShell.style.position = 'relative';
        frameShell.style.zIndex = '0';
        mountWordCardArt(kit, frameShell, learnItemId);
        const sprite = frameShell.querySelector('.m2-manifest-sprite');
        if (sprite) sprite.style.zIndex = '1';
      } else {
        mountWordCardArt(kit, picFrame, learnItemId);
      }
      thumbSlot.appendChild(picFrame);
      wordInterior.appendChild(thumbSlot);
      mountLearnWordArt(kit, wordInterior);
      const displayFr = learnItemId ? String(learnItemId).replace(/_/g, ' ') : '…';
      const fr = el('p', 'm2-wordbook-fr', displayFr);
      const gloss = el('p', 'm2-wordbook-gloss', step.items?.[0]?.zh || '…');
      wordInterior.append(fr, gloss);
      panelWrap.appendChild(wordInterior);
      body.appendChild(panelWrap);
      const opts = el('div', 'm2-learn-options');
      ['la serviette', 'la fourchette', 'le pain'].forEach((label) =>
        mountUi(kit, 'ui.btn_option_row', 'idle', opts, {
          text: label,
          role: 'answer',
          fullWidth: true,
          widthX1: M2_PANEL_W_X1,
          cardInterior: true,
          cardId: `opt-${label}`,
          ...mountOpts(kit, ctx, { fullWidth: true, widthX1: M2_PANEL_W_X1 })
        })
      );
      panelWrap.appendChild(opts);
      const learnPlay = mountUi(kit, 'ui.btn_icon', 'idle', panelWrap, {
        tag: 'button',
        className: 'm2-icon-slot m2-learn-play',
        icon: 'ui.icon.audio',
        text: '',
        widthX1: 24,
        heightX1: 24,
        cardInterior: true,
        cardId: 'learn-play'
      });
      wirePlayButton(learnPlay, learnItems[0]?.audio);
      captureState.screen = 'learn_words';
      captureState.itemsDone = learnItems.length;
      captureState.items = learnItems;
      if (ctx.autoAdvanceMs > 0) setTimeout(() => finish('finish'), ctx.autoAdvanceMs);
      break;
    }
    case 'review': {
      const reviewItems = normalizeLearningItems(step.items?.length ? step.items : ['lundi', 'mardi', 'samedi']);
      const target = reviewItems[0]?.id || 'lundi';
      mountUi(kit, 'ui.water_meter', 'third', topBar, { tag: 'div', className: 'm2-meter-glyphs' });
      const promptCard = el('div', 'm2-prompt-card');
      mountUi(kit, 'ui.panel', 'idle', promptCard, {
        tag: 'div',
        widthX1: M2_PANEL_W_X1,
        heightX1: 72,
        ...mountOpts(kit, ctx, { widthX1: M2_PANEL_W_X1 })
      });
      const promptInner = el('div', 'm2-prompt-card-inner');
      const picFrame = el('div', 'm2-prompt-pic');
      mountUi(kit, 'ui.card_picture_frame', 'idle', picFrame, { tag: 'div', widthX1: 64, heightX1: 44 });
      const shell = picFrame.querySelector('.m2-ui-shell');
      if (shell) mountWordCardArt(kit, shell, target);
      promptInner.append(picFrame);
      const q = el('p', 'm2-prompt', `Quel mot : ${String(target).replace(/_/g, ' ')} ?`);
      promptInner.append(q);
      promptCard.appendChild(promptInner);
      body.appendChild(promptCard);
      const opts = el('div', 'm2-options');
      ['lundi', 'mardi', 'samedi'].forEach((id) => {
        const label = id.replace(/_/g, ' ');
        mountUi(kit, 'ui.review_option_row', 'idle', opts, {
          text: label,
          role: 'answer',
          fullWidth: true,
          widthX1: M2_PANEL_W_X1,
          cardInterior: true,
          cardId: `rev-${id}`,
          ...mountOpts(kit, ctx, { fullWidth: true, widthX1: M2_PANEL_W_X1 })
        });
      });
      mountUi(kit, 'ui.btn_secondary', 'idle', opts, {
        text: 'Je ne sais pas',
        role: 'cta',
        fullWidth: true,
        widthX1: M2_PANEL_W_X1,
        ...mountOpts(kit, ctx, { fullWidth: true, widthX1: M2_PANEL_W_X1 })
      });
      body.appendChild(opts);
      captureState.screen = 'review';
      captureState.optional = true;
      captureState.items = reviewItems;
      break;
    }
    case 'listening':
    case 'dictation': {
      const stepItems = normalizeLearningItems(step.items);
      const promptClip = primaryClipForStep({ ...step, items: stepItems });
      const card = el('div', 'm2-prompt-card');
      card.dataset.m2CardInterior = 'true';
      card.dataset.m2CardId = mod === 'listening' ? 'listen-card' : 'dictation-card';
      mountUi(kit, 'ui.panel', 'idle', card, {
        tag: 'div',
        widthX1: M2_PANEL_W_X1,
        heightX1: mod === 'listening' ? 96 : 88,
        ...mountOpts(kit, ctx, { widthX1: M2_PANEL_W_X1 })
      });
      const inner = el('div', 'm2-prompt-card-inner');
      inner.style.position = 'relative';
      inner.style.zIndex = '1';
      inner.style.minHeight = `${(mod === 'listening' ? 96 : 88) * kit.scale}px`;
      inner.style.padding = `${10 * kit.scale}px ${12 * kit.scale}px`;
      const picRow = el('div', 'm2-picture-frame');
      const picFrame = el('div', 'm2-prompt-pic');
      mountUi(kit, 'ui.card_picture_frame', 'idle', picFrame, {
        tag: 'div',
        widthX1: 64,
        heightX1: 44
      });
      const promptFrameShell = picFrame.querySelector('.m2-ui-shell');
      if (promptFrameShell) {
        promptFrameShell.style.position = 'relative';
        promptFrameShell.style.zIndex = '0';
        mountPromptModuleArt(kit, promptFrameShell, mod);
        const sprite = promptFrameShell.querySelector('.m2-manifest-sprite');
        if (sprite) sprite.style.zIndex = '1';
      } else {
        mountPromptModuleArt(kit, picFrame, mod);
      }
      picRow.appendChild(picFrame);
      inner.appendChild(picRow);
      const prompt = el('p', mod === 'listening' ? 'm2-prompt' : 'm2-dictation-prompt');
      prompt.textContent = step.prompt?.fr || '…';
      inner.appendChild(prompt);
      card.appendChild(inner);
      if (mod === 'listening') {
        const ctrl = el('div', 'm2-listen-row');
        const play = mountUi(kit, 'ui.btn_icon', 'idle', ctrl, {
          tag: 'button',
          className: 'm2-icon-slot m2-play-btn',
          icon: 'ui.icon.audio',
          text: '',
          widthX1: 24,
          heightX1: 24,
          cardInterior: true,
          cardId: 'listen-play'
        });
        play.dataset.m2CardInterior = 'true';
        play.dataset.m2CardId = 'listen-play';
        wirePlayButton(play, promptClip);
        const replay = mountUi(kit, 'ui.btn_icon', 'idle', ctrl, {
          tag: 'button',
          className: 'm2-icon-slot m2-replay',
          icon: 'ui.icon.replay',
          text: ''
        });
        wirePlayButton(replay, promptClip);
        const slow = mountUi(kit, 'ui.btn_icon', 'active', ctrl, {
          tag: 'button',
          className: 'm2-icon-slot m2-slow',
          icon: 'ui.icon.slow',
          text: ''
        });
        wirePlayButton(slow, promptClip, { slow: true });
        inner.appendChild(ctrl);
      } else if (mod === 'dictation') {
        if (promptClip) {
          const ctrl = el('div', 'm2-listen-row');
          const play = mountUi(kit, 'ui.btn_icon', 'idle', ctrl, {
            tag: 'button',
            className: 'm2-icon-slot m2-play-btn',
            icon: 'ui.icon.audio',
            text: ''
          });
          wirePlayButton(play, promptClip);
          inner.appendChild(ctrl);
        }
        mountUi(kit, 'ui.dictation_gap', 'idle', inner, {
          tag: 'input',
          role: 'input',
          className: 'm2-dictation-input',
          text: '',
          placeholder: '…',
          fullWidth: true,
          widthX1: M2_PANEL_W_X1,
          ...mountOpts(kit, ctx, { fullWidth: true, widthX1: M2_PANEL_W_X1 })
        });
      }
      body.appendChild(card);
      if (mod === 'listening' && step.options) {
        step.options.forEach((o) =>
          mountUi(kit, 'ui.btn_option_row', 'idle', footer, {
            text: o.fr,
            role: 'answer',
            fullWidth: true,
            widthX1: M2_PANEL_W_X1,
            cardInterior: true,
            cardId: `listen-opt-${o.fr}`,
            ...mountOpts(kit, ctx, { fullWidth: true, widthX1: M2_PANEL_W_X1 })
          })
        );
      } else if (mod === 'dictation') {
        const row = el('div', 'm2-dictation-actions');
        mountUi(kit, 'ui.btn_secondary', 'idle', row, {
          text: 'Passer',
          role: 'cta',
          className: 'm2-pass',
          onPress: () => finish('exit')
        });
        mountUi(kit, 'ui.btn_primary', 'idle', row, {
          text: 'Valider',
          role: 'cta',
          className: 'm2-validate',
          onPress: () => {
            const inp = card.querySelector('.m2-dictation-input');
            const ans = (step.prompt?.fr || '').split('___').join(stepItems[0]?.id || '');
            captureState.lastMatch = matchDictation(inp?.value || '', ans, step.accept || []);
            finish('finish');
          }
        });
        footer.appendChild(row);
        const bar = el('div', 'm2-accent-bar');
        bar.dataset.uiKey = 'ui.accent_bar.key_idle';
        (kit.reg.defs?.['ui.accent_bar']?.keys || ['é', 'è', 'à', 'ç', 'ê', 'ô', 'ù', 'î', '’']).forEach((ch) => {
          mountUi(kit, 'ui.accent_bar', 'key_idle', bar, {
            text: ch,
            className: 'm2-accent-key',
            tag: 'button'
          });
        });
        footer.appendChild(bar);
      }
      captureState.screen = mod;
      captureState.items = stepItems;
      captureState.promptAudio = promptClip;
      break;
    }
    case 'output': {
      const asrOn = (step.asr || ASR_PLAYTEST) !== 'off';
      captureState.asr = step.asr || ASR_PLAYTEST;
      if (step.mode === 'spoken') {
        const promptCard = el('div', 'm2-prompt-card');
        mountUi(kit, 'ui.panel', 'idle', promptCard, {
          tag: 'div',
          widthX1: M2_PANEL_W_X1,
          heightX1: 64,
          ...mountOpts(kit, ctx, { widthX1: M2_PANEL_W_X1 })
        });
        const promptInner = el('div', 'm2-prompt-card-inner m2-output-prompt-inner');
        const picFrame = el('div', 'm2-prompt-pic m2-output-prompt-pic');
        mountUi(kit, 'ui.card_picture_frame', 'idle', picFrame, {
          tag: 'div',
          widthX1: 64,
          heightX1: 44
        });
        const frameShell = picFrame.querySelector('.m2-ui-shell');
        if (frameShell) {
          frameShell.style.position = 'relative';
          mountPromptModuleArt(kit, frameShell, 'listening');
        }
        promptInner.appendChild(picFrame);
        const prompt = el('p', 'm2-prompt m2-output-prompt', step.prompt?.fr || 'Répondez poliment.');
        promptInner.append(prompt);
        promptCard.appendChild(promptInner);
        body.appendChild(promptCard);
        captureState.promptFr = step.prompt?.fr;
        const chips = el('div', 'm2-output-chips');
        ['Oui,', 'avec plaisir', 'merci', 'non'].forEach((t) =>
          mountUi(kit, 'ui.chunk_chip', 'idle', chips, { text: t, role: 'chunk', tag: 'button' })
        );
        body.appendChild(chips);
        const modelRow = el('div', 'm2-model-row');
        mountUi(kit, 'ui.record_compare', 'model_idle', modelRow, {
          text: 'Modèle',
          role: 'cta',
          className: 'm2-model',
          iconAt: { x: 8, y: 8 }
        });
        footer.appendChild(modelRow);
        if (asrOn) {
          mountUi(kit, 'ui.mic_button', 'idle', footer, { tag: 'button', className: 'm2-mic' });
        }
        mountUi(kit, 'ui.btn_secondary', 'idle', footer, {
          text: 'Passer',
          className: 'm2-pass',
          onPress: () => finish('exit')
        });
        mountUi(kit, 'ui.btn_primary', 'idle', footer, {
          text: 'Valider',
          className: 'm2-validate',
          onPress: () => finish('finish')
        });
      } else {
        mountUi(kit, 'ui.reply_note', 'idle', body, { tag: 'textarea', className: 'm2-written', widthX1: col });
        mountUi(kit, 'ui.btn_secondary', 'idle', footer, {
          text: 'Passer',
          className: 'm2-pass',
          onPress: () => finish('exit')
        });
        mountUi(kit, 'ui.btn_primary', 'idle', footer, {
          text: 'Valider',
          className: 'm2-validate',
          onPress: () => finish('finish')
        });
      }
      captureState.screen = 'output';
      break;
    }
    default:
      body.textContent = `Module ${mod}`;
  }

  footer.querySelectorAll('.m2-pass').forEach((b) => {
    if (!b.onclick) b.addEventListener('click', () => finish('exit'));
  });
  footer.querySelectorAll('.m2-validate').forEach((b) => {
    if (!b.dataset.bound) {
      b.dataset.bound = '1';
      if (!b.onclick) b.addEventListener('click', () => finish('finish'));
    }
  });

  assertNoShameCopy(container);
  return {
    dispose: () => {
      stopM2Clip();
      container.innerHTML = '';
    },
    getCaptureState: () => captureState,
    playPrimaryClip: () => playClip(primaryClipForStep(step))
  };
}

export async function renderStartPath(container, ctx) {
  const kit = await ensureKit(ctx);
  const col = M2_PANEL_W_X1;
  container.innerHTML = '';
  container.className = 'm2-start-root m2-col';
  container.style.maxWidth = `${col * kit.scale}px`;
  container.dataset.placeholderArt = kit.placeholderArt ? 'true' : 'false';
  const topBar = el('div', 'm2-top-bar');
  mountExit(kit, topBar, 'Quitter', () => {});
  container.appendChild(topBar);
  mountUi(kit, 'ui.start_choice_big', 'idle', container, {
    text: 'De zéro',
    role: 'cta',
    fullWidth: true,
    widthX1: col,
    className: 'm2-start-zero',
    ...mountOpts(kit, ctx, { fullWidth: true, widthX1: col })
  });
  mountUi(kit, 'ui.start_choice_small', 'idle', container, {
    text: 'Je connais un peu le français',
    role: 'cta',
    fullWidth: true,
    widthX1: col,
    ...mountOpts(kit, ctx, { fullWidth: true, widthX1: col })
  });
  mountUi(kit, 'ui.name_field', 'idle', container, {
    tag: 'input',
    role: 'input',
    fullWidth: true,
    widthX1: col,
    ...mountOpts(kit, ctx, { fullWidth: true, widthX1: col })
  });
  mountUi(kit, 'ui.btn_secondary', 'idle', container, {
    text: 'Copier mes données',
    role: 'cta',
    className: 'm2-export',
    fullWidth: true,
    widthX1: col,
    onPress: () => {
      const json = ctx.exportData?.() || '{}';
      navigator.clipboard?.writeText(json);
    },
    ...mountOpts(kit, ctx, { fullWidth: true })
  });
  return {
    getCaptureState: () => ({ screen: 'start' }),
    dispose: () => { container.innerHTML = ''; }
  };
}

export async function renderPlacementResult(container, startDay, minutes, ctx = {}) {
  const kit = await ensureKit(ctx);
  const col = M2_PANEL_W_X1;
  const lang = ctx.lang || 'en';
  let minutesPerDay = Number(minutes) || 30;
  container.innerHTML = '';
  container.className = 'm2-placement-result m2-col';
  container.style.maxWidth = `${col * kit.scale}px`;
  container.dataset.placeholderArt = kit.placeholderArt ? 'true' : 'false';
  const topBar = el('div', 'm2-top-bar');
  mountExit(kit, topBar, 'Fini pour aujourd\'hui', () => {});
  container.appendChild(topBar);
  const copy = formatPlacementScreen(startDay, minutesPerDay, lang);
  const outer = el('div', 'm2-placement-outer');
  mountPlacementResultCard(kit, outer, {
    headline: copy.headline,
    timeGoal: copy.timeGoal
  });
  container.appendChild(outer);

  const copyTable = placementCopy(lang);
  const presetRow = el('div', 'm2-placement-presets');
  presetRow.setAttribute('role', 'group');
  presetRow.setAttribute('aria-label', copyTable.minutesLabel);
  const presetLabel = el('span', 'm2-placement-presets-label', copyTable.minutesLabel);
  presetRow.appendChild(presetLabel);
  const presetBtns = el('div', 'm2-placement-presets-btns');
  const refreshGoal = () => {
    const goal = placementTimeGoal(startDay, minutesPerDay, lang);
    updatePlacementTimeGoalDom(outer, goal);
    copy.timeGoal = goal;
  };
  for (const m of PLACEMENT_MINUTE_PRESETS) {
    const btn = el('button', 'm2-placement-preset-btn', String(m));
    btn.type = 'button';
    btn.dataset.minutes = String(m);
    if (m === minutesPerDay) btn.classList.add('is-active');
    btn.addEventListener('click', () => {
      minutesPerDay = m;
      presetBtns.querySelectorAll('.m2-placement-preset-btn').forEach((b) => {
        b.classList.toggle('is-active', Number(b.dataset.minutes) === m);
      });
      refreshGoal();
    });
    presetBtns.appendChild(btn);
  }
  presetRow.appendChild(presetBtns);
  container.appendChild(presetRow);
  mountUi(kit, 'ui.btn_primary', 'idle', container, {
    text: copy.startCta || 'Commencer',
    role: 'cta',
    fullWidth: true,
    widthX1: col,
    ...mountOpts(kit, ctx, { fullWidth: true })
  });
  mountUi(kit, 'ui.btn_secondary', 'idle', container, {
    text: copy.earlier,
    role: 'cta',
    fullWidth: true,
    widthX1: col,
    ...mountOpts(kit, ctx, { fullWidth: true })
  });
  return { getCaptureState: () => ({ screen: 'placement_result', startDay, timeGoal: copy.timeGoal }) };
}

/** Demo flow for capture: wrong/near-miss = orange + correct form beside (§10a). */
export async function renderRecastFeedback(container, ctx = {}) {
  const kit = await ensureKit(ctx);
  container.innerHTML = '';
  container.className = 'm2-recast-demo m2-col';
  container.style.maxWidth = `${M2_PANEL_W_X1 * kit.scale}px`;
  container.dataset.placeholderArt = kit.placeholderArt ? 'true' : 'false';
  const topBar = el('div', 'm2-top-bar');
  mountExit(kit, topBar, 'Fini pour aujourd\'hui', () => {});
  container.appendChild(topBar);
  mountRecastBox(kit, container, {
    playerText: 'Je suis content',
    modelText: 'Je suis contente',
    kind: 'near'
  });
  return { getCaptureState: () => ({ screen: 'recast', kind: 'near' }) };
}
