import { renderLearningModule, renderStartPath, renderPlacementResult, renderRecastFeedback } from '../app/engine/learning/module-ui.js';
import { createEvidenceStore, exportEvidenceJson } from '../app/engine/learning/evidence.js';
import { loadUiKit, applyThemeToDocument } from '../app/engine/learning/ui-kit.js';

const FLOWS = {
  start: (ctx) => renderStartPath(document.getElementById('app'), {
    ...ctx,
    exportData: () => exportEvidenceJson(store)
  }),
  placement_result: (ctx) => {
    const params = new URLSearchParams(location.search);
    const minutes = Number(params.get('minutes')) || 30;
    const lang = params.get('lang') || 'en';
    return renderPlacementResult(document.getElementById('app'), 8, minutes, { ...ctx, lang });
  },
  learn_words: (ctx) => renderLearningModule(document.getElementById('app'), {
    do: 'learning_module',
    module: 'learn_words',
    items: ['samedi'],
    focus: true,
    anchor: true
  }, { ...ctx, onDone: () => {}, onEvidence: (e) => store.events.push(e) }),
  review: (ctx) => renderLearningModule(document.getElementById('app'), {
    do: 'learning_module',
    module: 'review',
    items: ['lundi'],
    max_items: 6,
    optional: true
  }, { ...ctx, onDone: () => {}, onEvidence: (e) => store.events.push(e) }),
  listening: (ctx) => renderLearningModule(document.getElementById('app'), {
    do: 'learning_module',
    module: 'listening',
    prompt: { fr: 'Où est le colis ?', zh: '包裹放哪儿？' },
    items: ['derriere'],
    options: [
      { fr: 'sur la table', correct: false },
      { fr: 'sous la table', correct: false },
      { fr: 'derrière la chaise', correct: true }
    ]
  }, { ...ctx, onDone: () => {} }),
  dictation: (ctx) => renderLearningModule(document.getElementById('app'), {
    do: 'learning_module',
    module: 'dictation',
    prompt: { fr: 'Mets le colis ___ la chaise.', zh: '…' },
    items: ['derriere'],
    accept: ['derrière', 'derriere']
  }, { ...ctx, onDone: () => {} }),
  recast: (ctx) => renderRecastFeedback(document.getElementById('app'), ctx),
  output: (ctx) => renderLearningModule(document.getElementById('app'), {
    do: 'learning_module',
    module: 'output',
    mode: 'spoken',
    asr: 'off',
    record: true,
    prompt: { fr: 'Camille demande : « Tu peux m’aider ? »', zh: '…' },
    choices: [{ fr: 'Désolé.', sets_flag: { flag: 'story_apology', value: true } }]
  }, { ...ctx, onDone: () => {} })
};

const store = createEvidenceStore();
const flow = new URLSearchParams(location.search).get('flow') || 'start';
const app = document.getElementById('app');
const vw = window.innerWidth;
app.style.width = `${vw}px`;
const uiKit = await loadUiKit();
const manifestRes = await fetch('/style/canonical/sets/ui_learning/manifest.json').then((r) => r.json());
const goldKeys = new Set();
for (const [k, v] of Object.entries(manifestRes.assets || {})) {
  if (k.startsWith('ui.') && v?.allowsGoldPixels === true) goldKeys.add(k);
}
window.__m2GoldKeys = goldKeys;
document.documentElement.classList.add('m2-compact');
document.documentElement.style.setProperty('--m2-primary', '#1a4534');
document.documentElement.style.setProperty('--m2-ink', '#2a1c14');
document.documentElement.style.setProperty('--m2-ink-dense', '#241810');
uiKit.theme = { ...uiKit.theme, ink: '#2a1c14', primary: '#1a4534' };
applyThemeToDocument(uiKit.theme);
const ctx = { ui: uiKit, viewportWidth: vw };
const ui = await (FLOWS[flow]?.(ctx) || FLOWS.start(ctx));

window.__m2Capture = {
  flow,
  viewport: { width: 390, height: 844 },
  placeholderArt: uiKit.placeholderArt,
  getState: () => ui.getCaptureState?.() || {},
  hasExit: () => !!document.querySelector('[data-ui-component="ui.exit"]')
};
