(function () {
  'use strict';
  const C = window.Day8Content, E = window.Day8Engine, S = window.Day8Save, A = window.Day8Audio, L=window.Day8Language;
  const $ = selector => document.querySelector(selector);
  const panel = $('#panel'), game = $('#app');
  const dev = new URLSearchParams(location.search).get('dev') === '1';
  let storage;
  try { storage = localStorage; } catch (_) { storage = null; }
  let loaded = S.load(storage, C.words);
  let state = loaded?.state || loaded || S.fresh(C.words);
  function sanitizeState(value) {
    const object=x=>x && typeof x==='object' && !Array.isArray(x);
    value.story=object(value.story)?value.story:{};value.settings=object(value.settings)?value.settings:{};
    const index=Number(value.story.day8Index);value.story.day8Index=Number.isInteger(index)?Math.max(0,Math.min(C.scenes.length-1,index)):0;
    value.settings.uiLang=value.settings.uiLang==='en'?'en':'zh';value.settings.muted=value.settings.muted===true;
    for(const [key,fallback] of [['music',.24],['voice',.85],['sfx',.5]])value.settings[key]=typeof value.settings[key]==='number'&&Number.isFinite(value.settings[key])?Math.max(0,Math.min(1,value.settings[key])):fallback;
    for(const key of ['words','cards','days','customWords'])if(!object(value[key]))value[key]={};
    for(const [id,word] of Object.entries(value.words)){if(!object(word)){delete value.words[id];continue;}word.scenes=Array.isArray(word.scenes)?word.scenes.filter(x=>typeof x==='string'):[];}
    for(const [id,word] of Object.entries(value.customWords))if(!object(word)||word.id!==id||typeof word.fr!=='string')delete value.customWords[id];
    for(const [day,record] of Object.entries(value.days)){if(!object(record)){delete value.days[day];continue;}for(const key of ['introduced','attempted','due','reviewed'])record[key]=Array.isArray(record[key])?record[key].filter(x=>typeof x==='string'):[];}
    value.grammar=Array.isArray(value.grammar)?value.grammar.filter(x=>typeof x==='string'):[];
    value.notes=Array.isArray(value.notes)?value.notes.filter(object):[];
    const review=value.appSession,s=review?.session;
    if(!object(review)||!object(s)||!['garden','cat'].includes(s.mode)||!Array.isArray(s.queue)||!s.queue.every(x=>object(x)&&typeof x.wordId==='string')||!Number.isInteger(s.index)||s.index<0||!Array.isArray(s.types))value.appSession=null;
    return value;
  }
  state=sanitizeState(state);
  state.story ||= {}; state.words ||= {}; state.cards ||= {}; state.settings ||= {};
  state.settings = Object.assign({uiLang:'zh',music:.24,voice:.85,sfx:.5,muted:false}, state.settings);
  let screen = 'entry', returnScreen = 'story', lookupReturn = 'story', selectedWord = null;
  let review = state.appSession || null, feedback = review?.feedback || null, exercise = null;
  let reviewStarted = performance.now(), reviewReturn = 'story', chunks = [], lineRevealed = false;
  let glossVisible = false, replyAttempts = 0, replyFeedback = null, transcript = false;
  let currentPot = 1, expandedWord = null, search = '', simulatedNow = null, noteImages = [];
  let sceneModel = {scene:'roof',night:false,cat:true,danger:0,reaction:'idle',water:0,growth:[1,0]};
  let holdFrame = 0, holdStart = 0, holdActive = false, noticeTimer = 0, sceneTimer = 0, sceneEpoch=performance.now(),activeSceneId='';
  let importMessage = '', importReport = null, detected = null, growthReveal = null;
  const ui = (zh, en) => state.settings.uiLang === 'en' ? en : zh;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now = () => simulatedNow ? new Date(simulatedNow) : new Date();
  const names = {noe:'Noé',camille:'Camille',lefevre:'Madame Lefèvre',voisine:'Madame Lefèvre',narrator:ui('旁白','Narrator'),player:ui('你','You')};
  const paths = {
    arrow:'M5 12h14m-5-5 5 5-5 5',back:'M19 12H5m5-5-5 5 5 5',leaf:'M19 4C8 3 3 8 5 15c2 6 12 5 14-11ZM5 20l9-10',
    book:'M4 4h6l2 2 2-2h6v15h-6l-2 2-2-2H4ZM12 6v15',story:'M4 4h16v13H9l-5 4ZM8 8h8M8 12h5',
    sound:'M4 9h4l5-4v14l-5-4H4ZM17 8c3 2 3 6 0 8m2-11c5 4 5 10 0 14',mute:'M4 9h4l5-4v14l-5-4H4Zm13 0 5 6m0-6-5 6',
    settings:'M9 3h6l1 4 4 2v6l-4 2-1 4H9l-1-4-4-2V9l4-2ZM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    play:'m9 5 10 7-10 7Z',check:'m5 12 4 4L19 6',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    bulb:'M8 15c-6-8 9-16 9-6 0 3-2 4-2 6v3H8ZM9 21h5M9 15h6',more:'M5 12h.1M12 12h.1M19 12h.1',
    phone:'M7 3h10v18H7ZM10 17h4',pen:'m4 20 1-5L17 3l4 4L9 19ZM14 6l4 4',close:'m6 6 12 12M6 18 18 6',
    moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12',pot:'M5 10h14l-2 11H7ZM4 7h16v3H4ZM12 7V2m0 3c-4 0-4-3-4-3m4 4c4 0 5-3 5-3',
    water:'M4 9h12v11H4ZM16 12l5-5 2 2-7 8M4 11H1V7h5M7 9V6h6v3',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18ZM12 7v5l3 2'
  };
  const icon = (name, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.leaf}"/></svg>`;
  const button = (label, action, cls='primary', extra='') => `<button class="${esc(cls)}" data-action="${esc(action)}" ${extra}>${label}</button>`;
  const primary = (label, action='next') => button(`${label}${icon('arrow')}`, action, 'primary pulse');
  const back = (action='back') => button(`${icon('back')}${ui('返回','Back')}`, action, 'back-button');
  const eyebrow = text => `<div class="eyebrow">${text}</div>`;
  const status = () => '<div class="audio-status" aria-live="polite"></div>';
  function save() {
    state.appSession = review;
    if (dev) return;
    try {
      const result = S.save(storage,state);
      if (result === false || result?.ok === false) throw new Error(result?.error || 'Storage unavailable');
    } catch (_) {
      $('#storage-warning').hidden = false;
      $('#storage-warning').textContent = ui('无法保存到本机。请在设置中导出进度。','Local saving unavailable. Export your progress in settings.');
    }
  }
  function allWords() { return [...C.words, ...Object.values(state.customWords || {})]; }
  function wordById(id) { return allWords().find(w => w.id === id); }
  function currentScene() { return C.scenes[Math.min(Number(state.story.day8Index || 0), C.scenes.length-1)]; }
  function notice(text) { $('#notice').textContent = text; $('#notice').classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('#notice').classList.remove('show'),2600); }
  function tokenize(text) {
    return C.french(text || '').split(/([A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+(?:[’'-][A-Za-zÀ-ÖØ-öø-ÿŒœÆæ]+)*)/g).map((token,i) => i%2 ? `<button class="word" data-word="${esc(token)}">${esc(token)}</button>` : esc(token)).join('');
  }
  function header(title, right='') { return `<div class="panel-top">${eyebrow(title)}${right}</div>`; }
  function setScene(model) {
    sceneModel = {...sceneModel,...model};
    game.classList.toggle('night', !!sceneModel.night);
    $('#scene').setAttribute('aria-label', `${sceneModel.scene}, ${sceneModel.night?'night':'day'}; Camille in green, Noé in orange, Croissant the orange cat`);
  }
  function nav() {
    const items = [['story','story',ui('故事','Story')],['garden','leaf',ui('花园','Garden')],['wordbook','book',ui('单词本','Words')],['more','more',ui('更多','More')]];
    $('#nav').innerHTML = items.map(([id,ico,label]) => button(`${icon(ico)}<span>${label}</span>`,id,`nav-item ${screen===id || id==='garden' && screen==='review'?'active':''}`,`aria-label="${label}"`)).join('');
    $('#scene-actions').innerHTML = button(icon(state.settings.muted?'mute':'sound'),'mute','icon-button',`aria-label="${ui('切换声音','Toggle sound')}"`) + button(icon('settings'),'settings','icon-button',`aria-label="${ui('设置','Settings')}"`);
  }
  function render() {
    cancelHold(); clearTimeout(sceneTimer);
    game.className = `game ${screen==='entry'?'entry':''} ${['review','catdone'].includes(screen)?'review':''} ${['settings','import','lookup','wordbook','grammar','conjugation','notes','writing','atelier','more'].includes(screen)?'wide-panel':''} ${sceneModel.night?'night':''}`;
    $('#hotspots').innerHTML = ''; $('#scene-title').innerHTML = ''; $('#scene-caption').innerHTML = '';
    panel.scrollTop = 0;
    const screens = {entry:renderEntry,story:renderStory,garden:renderGarden,review:renderReview,reviewdone:renderReviewDone,catdone:renderCatDone,wordbook:renderWordbook,lookup:renderLookup,settings:renderSettings,import:renderImport,more:renderMore,grammar:renderGrammar,conjugation:renderConjugation,notes:renderNotes,writing:renderWriting,atelier:renderAtelier,end:renderEnd,reveal:renderReveal,evening:renderEvening};
    (screens[screen] || renderStory)();
    typesetFrench();
    nav(); A.configure(state.settings); document.documentElement.lang = state.settings.uiLang === 'en' ? 'en' : 'zh-Hans';
    $('#location .dev-badge')?.remove();
    if (dev) $('#location').insertAdjacentHTML('beforeend','<span class="dev-badge">ATELIER</span>');
  }
  function typesetFrench() {
    for(const element of panel.querySelectorAll('[lang="fr"]')){
      if(element.matches('input,textarea'))continue;
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      while(walker.nextNode())if(!walker.currentNode.parentElement.closest('input,textarea'))walker.currentNode.nodeValue=L.typography(walker.currentNode.nodeValue);
    }
  }
  function setLocation(place, time='LUNDI') { $('#location').innerHTML = `<span>411</span><span class="dot"></span><span>${esc(place)}</span><span class="dot"></span><span>${esc(time)}</span>`; }
  function renderEntry() {
    setScene({scene:'roof',night:false,reaction:'idle',water:0,focus:null}); setLocation('PARIS','18:42');
    $('#scene-title').innerHTML = `${eyebrow('L’APPARTEMENT 411')}<h1>Le basilic.</h1><div class="chapter-number">UN LUNDI À PARIS</div>`;
    $('#scene-caption').innerHTML = `<span>CHAPITRE 08</span>${ui('一株罗勒。一把旧钥匙。','A little basil. An old key.')}`;
    panel.innerHTML = `${eyebrow('L’APPARTEMENT 411')}<div class="entry-copy"><div class="chapter-label"><span class="chapter-icon">${icon('leaf')}</span>${eyebrow(ui('第八天 · 罗勒','DAY EIGHT · THE BASIL'))}</div><h2>${ui('在这里，慢慢生长。','A place to grow.')}</h2><div class="rule"></div><p class="muted">${ui('一点法语，一点日常。<br>今天的故事，从一盆植物开始。','A little French. A little everyday life.<br>Today begins with a plant on the table.')}</p></div><div class="entry-bottom">${primary(ui(state.story.day8Complete?'回到花园':'继续 · 第八天',state.story.day8Complete?'Return to the garden':'Continue · Day 8'),'continue')}<div class="entry-foot">${button(ui('导入我的进度','Import my save'),'import','text-button')}${button(ui('中文 / EN','EN / 中文'),'language','text-button')}</div><p class="muted" style="font-size:9px;text-align:center;margin-top:13px">${ui('无需账号 · 自动保存在本机','NO ACCOUNT · SAVED ON THIS DEVICE')}</p></div>`;
    try { detected ||= S.detect(storage); } catch (_) {}
    if (detected?.available && !state.imports?.length && !state.story.importDismissed) {
      const counts = detected.counts || {};
      $('.entry-copy').insertAdjacentHTML('beforeend',button(`${ui('继承 Jinyi 的进度','Inherit Jinyi’s progress')} · ${counts.words || 0} ${ui('词','words')}`,'import','secondary'));
    }
  }
  function storyTop(scene) {
    const idx = Number(state.story.day8Index || 0);
    return header(ui('第八天 · 罗勒','DAY 8 · LE BASILIC'),`<span class="scene-count">${String(idx+1).padStart(2,'0')} / ${C.scenes.length}</span>`) + (scene.replaceable || scene.neng ? `<span class="draft">${ui('待语言审核 · 可替换文本','LANGUAGE REVIEW · REPLACEABLE DRAFT')}</span>` : '');
  }
  function markMet(ids, scene) {
    (ids || []).forEach(id => {
      state.words[id] ||= {};
      state.words[id].met = true; state.words[id].at ||= now().toISOString();
      state.words[id].scenes ||= [];
      if (!state.words[id].scenes.includes(scene.id)) state.words[id].scenes.push(scene.id);
    }); save();
  }
  function renderStory() {
    const s = currentScene();
    if(activeSceneId!==s.id){activeSceneId=s.id;sceneEpoch=performance.now();}
    setScene({scene:s.location==='doorway'?'doorway':s.scene || 'kitchen',night:!!s.night || s.lighting==='evening' || ['lefevre','stairs','roof','facade'].includes(s.scene),direction:s.direction || 'down',action:s.action || (s.cat==='sleepBetweenPots'?'sleepBetweenPots':''),focus:null,water:0,reaction:'idle',walkProgress:0});
    setLocation(s.scene==='roof'?'LE TOIT':s.scene==='stairs'?'L’ESCALIER':s.scene==='lefevre'?'CHEZ MADAME LEFÈVRE':s.scene==='doorway'?'LA PORTE':'LA CUISINE',s.time || (sceneModel.night?'21:08':'07:30'));
    if (s.flags) { Object.assign(state.story,s.flags); save(); }
    if (s.wordIds) markMet(s.wordIds,s);
    if (s.kind === 'water') {
      if (s.mode==='first') return renderFirstWater(s);
      return renderGarden(true);
    }
    if (s.kind === 'cat') {
      panel.innerHTML = storyTop(s) + `<div class="speaker noe"><span class="speaker-mark"></span>Noé</div><h2>Non, Croissant !</h2><p class="hint">${ui('他的爪子又伸过来了……','That little paw is reaching again…')}</p><div class="spacer"></div>${primary(ui('拦住 Croissant','Stop Croissant'),'start-cat')}`;
      setScene({cat:true,reaction:'anticipate',danger:.1});
      return;
    }
    if (s.kind === 'voicemail') return renderVoicemail(s);
    if (s.kind === 'chat') return renderChat(s);
    if (s.kind === 'end') { screen='end'; return renderEnd(); }
    if (s.kind === 'choice' || s.kind === 'reply') return renderReply(s);
    let text = s.text;
    if (s.variants) { const variant = s.variants[state.story.d7_band] || s.variants.default || s.variants.null; text = typeof variant==='string'?variant:variant?.text || text; }
    const focus = s.kind==='focus';
    const probe = (s.probe || ['d8_cam_depuis','d8_gag_basilic','d9_lef_jeudi'].includes(s.id)) && !lineRevealed;
    panel.innerHTML = storyTop(s) + `<div class="speaker ${esc(s.speaker)}"><span class="speaker-mark"></span>${esc(names[s.speaker] || ui('一个星期一','A Monday'))}</div>` +
      (s.time==='17:55' || s.id==='n_d8_cinq' ? '<div class="chapter-divider"><h2>17 h 55</h2></div>' : '') +
      `<div class="dialogue ${focus?'focus-line':''}" lang="fr">${probe?'<span class="muted">…</span>':tokenize(text)}</div>` +
      `<div class="line-tools">${button(icon('sound'),'replay','round-button',`aria-label="${ui('再听一次','Play sentence')}"`)}${button(ui('看释义','Meaning'),'gloss','text-button')}${grammarFor(s)?button(icon('bulb'),'grammar','round-button',`aria-label="${ui('语法提示','Grammar insight')}"`):''}</div>${glossVisible?`<p class="gloss">${esc(s[state.settings.uiLang] || s.en || '')}</p>`:''}${status()}<div class="spacer"></div><div class="story-bottom"><div class="progress-track"><i style="width:${100*(Number(state.story.day8Index||0)+1)/C.scenes.length}%"></i></div>${probe?primary(ui('揭晓并聆听','Reveal & listen'),'reveal-line'):s.kind==='point'||s.kind==='walk'?`<p class="hint">${ui(s.kind==='walk'?'点亮着的门，继续走。':'点一下画面里发光的物品。',s.kind==='walk'?'Tap the glowing door to walk on.':'Touch the glowing object in the scene.')}</p>`:primary(ui('继续','Continue'))}</div>`;
    if (s.kind==='point' || s.kind==='walk') {
      const target = s.hotspot || (s.kind==='walk'?'door':'pot');
      hotspot(typeof target==='string'?target:target.id || 'pot','point-next');
      if (s.kind==='walk' && s.direction!=='up') hotspot('roofDoor','rattle',true);
    }
    if (focus) { setScene({focus:s.wordIds?.includes('basilic')?'basil':'pot'}); hotspot(sceneModel.focus,'focus-word'); }
    if (s.id==='n_d10_cle') { hotspot('window','optional-window',true); hotspot('chair','optional-chair',true); }
    if (s.id==='d8_noe_plante' || s.id==='d8_noe_danger') {
      const delay = s.id==='d8_noe_danger'?1500:1000;
      const next = panel.querySelector('[data-action=next]');
      if (next) { next.disabled = true; sceneTimer = setTimeout(() => { next.disabled=false; },delay); }
    }
  }
  function hotspot(target, action, quiet=false) {
    const aliases = {basilic:'basil',pot_empty:'basil',emptyPot:'basil',catChair:'chair',lefevreDoor:'down',roofDoor:'up',rooftop:'door',lfd_chaises:'chair',lfd_fenetre:'window'};
    const key = aliases[target] || target;
    const positions = window.Day8Art.projectHotspots($('#scene'),sceneModel) || {};
    const fallback = {pot:[55,67],basil:[57,62],chair:[74,66],door:[68,40],roofDoor:[83,23],window:[28,40]};
    const p = positions[key] || fallback[key] || fallback.pot;
    let x = Array.isArray(p)?p[0]:p.x, y=Array.isArray(p)?p[1]:p.y;
    if (x<=1 && y<=1) { x*=100;y*=100; }
    x=Math.max(10,Math.min(90,x));y=Math.max(15,Math.min(82,y));
    $('#hotspots').insertAdjacentHTML('beforeend',button(`<span class="sr-only">${esc(key)}</span>`,action,`hotspot ${quiet?'quiet':''}`,`style="left:${x}%;top:${y}%" aria-label="${esc(key)}"`));
    setScene({focus:key});
  }
  function nextScene() {
    A.stop(); lineRevealed=false; glossVisible=false; replyAttempts=0;replyFeedback=null;chunks=[];transcript=false;
    state.story.day8Index = Math.min(Number(state.story.day8Index || 0)+1,C.scenes.length-1);
    const s = currentScene();
    if (s.id==='d10_lef_jardin') state.story.has_key=true;
    if (s.id==='n_d10_monte') state.story.rooftop=true;
    if (s.id==='n_d10_plante') state.story.basilPlanted=true;
    save();screen='story';render();
    if (s.sfx) A.sfx(s.sfx);
    if ((s.kind==='line' || !s.kind) && !['d8_cam_depuis','d8_gag_basilic','d9_lef_jeudi'].includes(s.id)) A.speak(s.text,s.id);
    if (['stairs','roof','lefevre','facade'].includes(s.scene)) A.ambience(true);
  }
  function renderGarden(inStory=false) {
    const roof = !!state.story.rooftop || !!state.story.day8Complete;
    setScene({scene:roof?'roof':'kitchen',night:roof,water:0,focus:null,reaction:'idle'});setLocation(roof?'LE JARDIN':'LA FENÊTRE','LUNDI');
    const due = Object.values(state.cards).filter(c => !c.suspended && !c.suspend && (!c.due || new Date(c.due)<=now())).length;
    panel.innerHTML = header(ui('你的花园','YOUR LITTLE GARDEN'),icon('leaf')) + `<h2>${ui(roof?'晚安，小花园。':'早上好，小花园。',roof?'A little moonlight.':'A little morning light.')}</h2><p class="hint">${ui(roof?'罗勒在屋顶。Martin 的植物还在厨房。':'Martin 的植物，在厨房等你。',roof?'Basil on the roof. Martin’s plant, still in the kitchen.':'Martin’s plant is waiting by the kitchen window.')}</p><div class="pot-list">${potButton(1)}${roof?potButton(2):''}</div><div class="spacer"></div><div class="can-meter" style="margin:22px 0">${canIcon(review?0.6:1)}<div class="can-label"><strong>${review?ui('继续上次浇水','Your watering is waiting'):ui('给记忆一点水','A little water for your words')}</strong>${due?`${due} ${ui('项待复习','cards to revisit')}`:ui('按自己的节奏','At your own pace')}</div></div>${primary(ui(review?'继续浇水':'开始浇水',review?'Resume watering':'Water my words'),'start-garden')}${inStory?button(ui('继续今天的故事','Continue today’s story'),'next','text-button'):''}`;
    hotspot('pot','pot-one');
    if (roof) hotspot('basil','pot-two');
    $('#scene-caption').innerHTML = `<span>${ui('一盆植物，一点日常','ONE POT. A LITTLE EVERYDAY CARE.')}</span>${roof?'À table':'Chez nous'}`;
  }
  function potButton(n) { const list=allWords().filter(w=>(w.pot || w.potId)===n && (w.seen || state.words[w.id]?.met || state.words[w.id]?.collected)); return button(`<span class="pot-number">${n===1?'01':'02'}</span><span><strong>${n===1?'Chez nous':'Le basilic'}</strong><small>${list.length} ${ui('个相遇的词','words encountered')} · ${n===1?ui('厨房','Kitchen'):ui('屋顶','Rooftop')}</small></span>${icon('arrow')}`,n===1?'pot-one':'pot-two','pot-card'); }
  function canIcon(fill) { return `<svg class="can-svg" viewBox="0 0 56 40" aria-hidden="true"><path d="M12 13h24v24H12ZM12 17H5V7h13v6M36 18 48 5l6 4-18 22M19 13V7h11v6"/><path d="M15 ${34-17*Math.max(0,Math.min(1,fill))}h18V34H15Z" fill="currentColor" opacity=".23" stroke="none"/></svg>`; }
  function startReview(mode='garden',first=false) {
    reviewReturn = screen==='story'?'story':'garden';
    if (!review || review.session?.mode!==mode || first) {
      let opts = {mode,now:now(),budget:mode==='cat'?6:screen==='story'&&currentScene().mode==='morning'?currentScene().budget:undefined};
      if (first) opts = {...opts,onlyIds:[currentScene().firstWordId || 'basilic'],budget:1,practice:true};
      const session=E.createSession(state,allWords(),opts);
      review={session,returnTo:reviewReturn,first,feedback:null,danger:0,correct:0};
    }
    reviewReturn=review.returnTo; feedback=review.feedback || null; chunks=[];reviewStarted=performance.now();screen='review';save();render();
    playReviewPrompt();
  }
  function renderReview() {
    if (!review) {screen='garden';return renderGarden();}
    const isCat=review.session.mode==='cat';
    setScene({scene:isCat?'kitchen':review.first||state.story.rooftop?'roof':'kitchen',night:!isCat && (review.first||!!state.story.rooftop),danger:review.danger || 0,cat:true,reaction:feedback?(feedback.correct?['offended','lick','happy'][review.correct%3]:'anticipate'):'anticipate',action:'',focus:null});
    setLocation(isCat?'NON, CROISSANT !':ui('浇水时间','A LITTLE WATER'),isCat?'07:35':review.first?'21:08':'07:15');
    exercise = feedback ? review.lastExercise : E.current(review.session,state,allWords());
    if (!exercise && !feedback) {screen=isCat?'catdone':'reviewdone';save();return isCat?renderCatDone():renderReviewDone();}
    const ex=exercise;
    const remaining = feedback?.remaining ?? Math.max(0,(review.session.queue?.length || 0)-(review.session.index || 0));
    const total = review.session.initial || review.session.total || Math.max(remaining,1);
    const title=isCat?'Non, Croissant !':ui('浇灌记忆','WATER YOUR WORDS');
    panel.innerHTML = header(title,`<div class="can-meter">${canIcon(remaining/total)}<div class="can-label"><strong>${remaining}</strong>${ui('待浇水','to water')}</div></div>`) + `<div class="review-label">${esc(reviewTypeLabel(ex.type))}<span>·</span>${(ex.potId===2 || ex.word?.pot===2)?'Le basilic':'Chez nous'}</div>`;
    if (feedback) {
      panel.innerHTML += `<div class="feedback ${feedback.correct?'':'soft'}" role="status"><div class="eyebrow">${feedback.correct?ui(isCat?'这次，他停住了。':'一点一滴，记住了。',isCat?'A very offended little cat.':'A little more familiar.'):ui('没关系，等会再见。','A soft splash. We’ll meet it again.')}</div><p lang="fr">${tokenize(feedback.sentence)}</p><div class="muted">${esc(ui(ex.word?.zh || '',ex.word?.en || ''))}${feedback.grade==='Hard'?` · ${ui('慢慢来。留意这个拼写。','Take your time. Notice the spelling.')}`:''}</div></div><div class="line-tools">${button(icon('sound'),'review-audio','round-button',`aria-label="${ui('再听一次','Hear the sentence')}"`)}</div>${status()}<div class="spacer"></div>${primary(ui('继续','Continue'),'review-next')}`;
      $('#scene-caption').innerHTML=`<span class="mini-reaction">${isCat?(feedback.correct?['…','Non, Croissant !','Attention !'][review.correct%3]:review.danger>=.95?'Attention !':'…'):''}</span>`;
      return;
    }
    const meaning=ui(ex.word?.zh || '',ex.word?.en || '');
    if (ex.type==='R1') {
      panel.innerHTML += listenButton('review-audio')+`<h3 class="question">${ui('你听到了什么？','What did you hear?')}</h3>${(!A.canSpeak() && !ex.word?.recorded || A.isMuted())?`<p class="hint audio-fallback" lang="fr">${tokenize(ex.sentence)}</p>`:''}${status()}`;
    } else if (ex.type==='R2' || ex.type==='P1') {
      panel.innerHTML += `<h3 class="question" lang="fr">${esc(ex.prompt || ex.word?.cloze || '')}</h3>${ex.type==='P1'?`<p class="hint">${esc(meaning)} · ${esc(ex.firstLetter || String(ex.answer).charAt(0))}…</p>`:''}`;
    } else if (ex.type==='R3') {
      panel.innerHTML += `<p class="question" style="font-size:20px">${esc(ui(ex.word?.sentenceZh,ex.word?.sentenceEn) || meaning)}</p>${listenButton('review-audio')}<div class="ordered" lang="fr" aria-label="${ui('你的句子','Your sentence')}">${chunks.map((index,i)=>button(esc(ex.chunks[index]),`unchunk:${i}`,'chunk')).join('')}</div><div class="chunks" lang="fr">${ex.chunks.map((chunk,i)=>button(esc(chunk),`chunk:${i}`,`chunk ${chunks.includes(i)?'selected':''}`,chunks.includes(i)?'disabled':'')).join('')}</div><p class="hint">${ui('按顺序轻点词块。点上方的词块可以撤回。','Tap the chunks in order. Tap a placed chunk to undo.')}</p>`;
    } else {
      const usable=(ex.word?.recorded || A.canSpeak()) && !A.isMuted();
      panel.innerHTML += listenButton('review-audio')+`<h3 class="question ${usable?'':'audio-fallback'}">${usable?ui('写下听到的词。','Write the word you hear.'):esc(ex.word?.cloze || ex.prompt || '')}</h3><p class="hint">${esc(meaning)}${!usable?` · ${ui('离线文字辅助','Written audio fallback')}`:''}</p>${status()}`;
    }
    if (ex.type==='R1' || ex.type==='R2') {
      panel.innerHTML += `<div class="answer-grid" ${ex.type==='R2'?'lang="fr"':''}>${(ex.options || []).map((option,i)=>button(`<small>${i+1}</small><span>${esc(ex.type==='R1'?(option[state.settings.uiLang] || option.text):option.text)}</span>`,`answer:${option.id}`,'answer')).join('')}</div>`;
    } else if (ex.type!=='R3') {
      panel.innerHTML += `<form id="review-form" class="input-row"><input id="review-input" aria-label="${ui('法语答案','French answer')}" lang="fr" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(ex.firstLetter || '')}…"><button type="submit" class="primary" aria-label="${ui('检查答案','Check answer')}">${icon('arrow')}</button></form>`;
    }
    if (isCat) $('#scene-caption').innerHTML=`<span>${ui('Croissant 和那盆植物','CROISSANT & THE VERY TEMPTING POT')}</span>${ui('轻点答案，拦住他。','Answer to stop that little paw.')}`;
  }
  function reviewTypeLabel(type) { return ({R1:ui('听一听 · 选意思','LISTEN · FIND THE MEANING'),R2:ui('选一个词','FIND THE MISSING WORD'),R3:ui('把句子拼起来','BUILD THE SENTENCE'),P1:ui('写一个词','WRITE THE MISSING WORD'),P2:ui('听写','LISTEN & WRITE')})[type]; }
  function listenButton(action) { return button(`${icon('play')}<span>${ui('再听一次','Listen again')}</span><span class="wave">${'<i></i>'.repeat(9)}</span>`,action,'listen-button'); }
  function playReviewPrompt() { if (!feedback && exercise && ['R1','R3','P2'].includes(exercise.type)) A.speak(exercise.sentence,exercise.audioId,exercise.word?.clipPath); }
  document.addEventListener('day8-audio-unavailable',()=>{
    if(screen!=='review'||feedback||!exercise||!['R1','P2'].includes(exercise.type)||panel.querySelector('.audio-fallback'))return;
    const text=exercise.type==='R1'?exercise.sentence:exercise.word.cloze || exercise.sentence.replace(exercise.answer,'___');
    const anchor=panel.querySelector('.audio-status');if(anchor)anchor.insertAdjacentHTML('afterend',`<p class="hint audio-fallback" lang="fr">${esc(C.french(text))}</p>`);
  });
  function answerReview(input) {
    if (feedback || !exercise || !String(Array.isArray(input)?input.join(''):input).trim()) return;
    review.lastExercise=exercise;
    feedback=E.answer(review.session,state,allWords(),input,{now:now(),elapsed:(performance.now()-reviewStarted)/1000});
    if (feedback.error) {notice(feedback.error);return;}
    review.feedback=feedback;
    if (feedback.correct) {review.correct++;sceneModel.water=1;A.sfx(review.session.mode==='cat'?'purr':'water');}
    else {review.danger=Math.min(1,(review.danger || 0)+.25); A.sfx(review.session.mode==='cat'?'meow':'water');}
    if (review.danger>=1) {sceneModel.reaction='catch'; A.speak('Attention !');}
    save();render();
    if (review.danger>=1) setScene({reaction:'catch'});
    A.speak(feedback.sentence,feedback.audioId);
  }
  function reviewNext() {
    feedback=null;review.feedback=null;chunks=[];sceneModel.water=0;reviewStarted=performance.now();save();render();playReviewPrompt();
  }
  function renderReviewDone() {
    const first=review?.first;
    panel.innerHTML = header(ui('浇水完成','WATERING COMPLETE'))+`<div class="completion-emblem">${icon('water')}</div><h2>${ui('今天的水，刚刚好。','Just enough for today.')}</h2><p class="hint">${ui('记忆慢慢扎根。新的叶子，会在另一个早晨出现。','Let the words take root. A new leaf can wait for another morning.')}</p><div class="spacer"></div>${primary(ui(first?'看那片叶子':'继续今天的故事',first?'Look at that little leaf':'Back to the story'),'finish-review')}${button(ui('看看单词','Visit my words'),'wordbook','text-button')}`;
    setScene({water:0,reaction:'happy'});
  }
  function renderCatDone() {
    sceneEpoch=performance.now();setScene({scene:'kitchen',night:false,reaction:'lift',action:'lift',danger:0,water:0});
    panel.innerHTML=header('NON, CROISSANT !')+`<div class="completion-emblem">${icon('leaf')}</div><h2>${ui('植物安然无恙。','The plant is safe.')}</h2><p class="hint">${ui('Camille 轻轻把 Croissant 抱了起来。<br>至少，现在安全了。','Camille gently lifts Croissant away.<br>Safe. For the moment.')}</p><div class="spacer"></div>${primary(ui('继续','Continue'),'finish-review')}`;
  }
  function finishReview() {
    const next=review?.returnTo==='story';review=null;feedback=null;save();
    if(next)nextScene();else{screen='garden';render();}
  }
  function renderFirstWater(s) {
    game.classList.add('hold','first-water');setScene({scene:'roof',night:true,reaction:'idle',water:0});
    panel.innerHTML=storyTop(s)+`<h2>${ui('在月光下。','Under the moon.')}</h2><p class="hint">${ui('Noé 递来 Martin 的旧水壶。','Noé holds out Martin’s old watering can.')}</p><div class="water-ring">${icon('water')}</div><div class="spacer"></div>${button(`${icon('water')}${ui('按住，慢慢浇水','Hold to pour, slowly')}`,'hold-water','primary hold-button',`aria-label="${ui('按住三秒浇水','Hold for three seconds to water')}"`)}<p class="hint" style="text-align:center;font-size:10px">${ui('也可以按住空格键','Or hold the Space key')}</p>`;
  }
  function beginHold(el) {
    if(holdActive)return;holdActive=true;holdStart=performance.now();game.classList.add('holding');A.sfx('water');A.speak('Il faut de l’eau.','d8_noe_eau');
    const tick=t=>{if(!holdActive)return;const progress=Math.min(1,(t-holdStart)/3000);el.style.setProperty('--hold',progress);sceneModel.water=progress;if(progress>=1){holdActive=false;state.story.basilPlanted=true;state.story.rooftop=true;markMet([currentScene().firstWordId || 'basilic'],currentScene());startReview('garden',true);}else holdFrame=requestAnimationFrame(tick);};
    holdFrame=requestAnimationFrame(tick);
  }
  function cancelHold(){holdActive=false;cancelAnimationFrame(holdFrame);game.classList.remove('holding');document.querySelector('.hold-button')?.style.setProperty('--hold',0);}
  function renderVoicemail(s) {
    const v=C.voicemail || s;const lines=v.lines || [];const full=lines.map(l=>typeof l==='string'?l:l.text).join(' ');
    setLocation('NOÉ','12:16');setScene({scene:'kitchen',night:false});
    panel.innerHTML=storyTop(s)+`<div class="phone-time">12:16</div><div class="chat-header"><span class="avatar noe">N</span><div><h3>Noé</h3><span class="muted">${ui('一条语音留言 · 约 15 秒','A voice message · about 15 seconds')}</span></div></div>${listenButton('voicemail-audio')}${transcript?`<div class="voice-transcript" lang="fr">${tokenize(full)}</div>`:button(ui('显示文字辅助','Written support'),'transcript','text-button')}<h3 class="question" lang="fr">À <span style="color:#a1a68c">______</span>, en bas.</h3>${replyFeedback?`<div class="letter-feedback">${letterFeedback(replyFeedback.correct?'six heures':replyFeedback.input,'six heures')}</div><p class="hint">${replyFeedback.correct?ui('对了。六点，在楼下。','Six o’clock. Downstairs.'):ui('再听一次，慢慢来。','Listen once more. Take your time.')}</p>${replyFeedback.correct?`<p class="canonical-answer" lang="fr">${esc(replyFeedback.canonical)}</p>${primary(ui('打开群聊','Open the group chat'))}`:''}`:''}${!replyFeedback?.correct?`<form id="voicemail-form" class="input-row"><input id="voice-input" lang="fr" placeholder="s… h…" aria-label="six heures" autocomplete="off" spellcheck="false"><button type="submit" class="primary" aria-label="${ui('检查','Check')}">${icon('arrow')}</button></form>`:''}${status()}`;
  }
  function letterFeedback(input,target) { const normalized=E.normalize?E.normalize(input):input.toLowerCase();return [...target].map((c,i)=>`<span class="${normalized[i]===c?'':'missing'}">${esc(c===' '?'\u00a0':c)}</span>`).join(''); }
  function chatData(s) { return s.prompt ? s : (C.chats || []).find(c=>c.id===s.chatId || c.id===s.id) || s; }
  function renderChat(s) {
    const chat=chatData(s);const prompt=chat.prompt || chat.text;setLocation('COLOC 411',s.time || '14:32');
    const accepted=chat.accepted || chat.answers || [];const target=typeof accepted[0]==='string'?accepted[0]:accepted[0]?.text || '';
    const choices=chat.chunks || target.split(' ');
    panel.innerHTML=storyTop(s)+`<div class="chat-header"><span class="avatar">411</span><div><h3>Coloc 411</h3><span class="muted">Camille · Noé · ${ui('你','you')}</span></div></div><div class="chat-thread"><div><div class="chat-name">${esc(names[chat.speaker] || 'Camille')}</div><div class="bubble" lang="fr">${tokenize(prompt)}</div></div>${replyFeedback?`<div class="bubble mine ${replyFeedback.correct?'canonical-answer':''}" lang="fr">${esc(C.french(replyFeedback.correct?replyFeedback.canonical:replyFeedback.input))}</div>${!replyFeedback.correct?`<div class="bubble" lang="fr">${replyAttempts===1?'Hein ?':replyAttempts===2?esc(chat.feedback?.[1]?.text || chat.hint || target.split(' ').slice(0,2).join(' ')+'…'):esc(target)}</div>`:`<div class="bubble" lang="fr">${esc(chat.success?.text || 'D’accord !')}</div>`}`:''}</div>${replyFeedback?.correct?primary(ui('继续','Continue')):`<div class="ordered">${chunks.map((i,n)=>button(esc(choices[i]),`reply-unchunk:${n}`,'chunk')).join('')}</div><div class="chunks">${choices.map((c,i)=>button(esc(c),`reply-chunk:${i}`,`chunk ${chunks.includes(i)?'selected':''}`,chunks.includes(i)?'disabled':'')).join('')}</div><form id="reply-form" class="input-row"><input id="reply-input" aria-label="${ui('法语回复','Reply in French')}" placeholder="${ui('也可以自己写…','Or write your reply…')}" lang="fr" autocomplete="off"><button type="submit" class="primary" aria-label="${ui('发送','Send')}">${icon('arrow')}</button></form>`}`;
  }
  function renderReply(s) {
    if(replyFeedback?.correct){panel.innerHTML=storyTop(s)+`<div class="speaker"><span class="speaker-mark"></span>${ui('你','You')}</div><div class="feedback"><p class="canonical-answer" lang="fr">${tokenize(replyFeedback.canonical)}</p></div>${replyFeedback.after?`<div class="speaker lefevre"><span class="speaker-mark"></span>Madame Lefèvre</div><div class="dialogue" lang="fr">${tokenize(replyFeedback.after.text)}</div>`:''}<div class="spacer"></div>${primary(ui('继续','Continue'))}`;return;}
    panel.innerHTML=storyTop(s)+`<div class="speaker lefevre"><span class="speaker-mark"></span>Madame Lefèvre</div><div class="dialogue" lang="fr">${tokenize(s.text || s.prompt || '')}</div><p class="hint">${ui('用法语回应她。','A few words, in French.')}</p><div class="spacer"></div><div class="pot-list">${(s.options || []).map((o,i)=>button(`<small>${i+1}</small>${esc(typeof o==='string'?o:o.text)}`,`reply-option:${i}`,'answer')).join('')}</div>${s.kind==='reply'?`<form id="reply-form" class="input-row"><input id="reply-input" aria-label="${ui('法语回复','French reply')}" placeholder="${ui('或写下你的回应…','Or write a reply…')}" lang="fr"><button type="submit" class="primary" aria-label="${ui('检查','Check')}">${icon('arrow')}</button></form>`:''}${replyFeedback&&!replyFeedback.correct?`<div class="feedback soft"><p>${replyAttempts===1?'Hein ?':esc(replyAttempts===2?s.hint || (s.options?.[0]?.text || '').split(' ').slice(0,2).join(' ')+'…':s.options?.[0]?.text || '')}</p></div>`:''}`;
  }
  function normalize(s) {return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
  function submitReply(input) {
    const s=currentScene(),d=s.kind==='chat'?chatData(s):s;
    const accepted=d.accepted || (d.options || []).map(o=>typeof o==='string'?o:o.text);
    const result=L.gradeAnswer(input,accepted,d.canonicalAnswers || d.canonical || d.answer || accepted[0]);
    replyFeedback={...result,input};replyAttempts++;A.sfx(result.correct?'notif':'paper');
    if(result.correct){state.story.replies ||= {};state.story.replies[s.id]=result.canonical;save();A.speak(result.canonical);}
    render();
  }
  function grammarFor(s) {const points=window.A411?.GRAMMAR_DATA || [];return points.find(p=>(p.lines || []).includes(s.id)) || (s.id==='d8_gag_basilic'?points.find(p=>p.id==='partitif'):s.id==='d8_cam_depuis'?points.find(p=>p.id.includes('depuis')):null);}
  function findWord(raw) {
    const inherited=C.lookup(raw);
    if(inherited){
      const inf=inherited.conjugated?.infinitive;
      const forms=inf?window.A411.Conj.conjugate(inf)?.tenses || []:[];
      const morphology=forms.flatMap(t=>t.rows.filter(r=>normalize(r.form)===normalize(raw)).map(r=>`${t.fr} · ${r.person}`)).slice(0,3).join(' / ');
      return {...inherited,raw,morphology,definition:inherited.para || '',sentence:inherited.sentence || currentScene().text || raw,scene:inherited.scene || currentScene().id,infinitive:inf,seen:true,wordClip:inherited.wordClip || `w_${inherited.lemma || inherited.id}`};
    }
    const token=raw.toLowerCase().replace(/^[ldjcnsmt]’/,'').replace(/^[ldjcnsmt]'/,'');
    const exact=allWords().find(w=>normalize(w.fr.replace(/^(le|la|les|un|une|du|de la|de l’)\s*/i,''))===normalize(token)||w.id===token);
    const glossary=window.A411?.GLOSSARY_DATA || {}, entries=glossary.entries || glossary.E || {};
    const conj=window.A411?.Conj?.lemmaOf(raw);
    let lemma=exact?.id || conj?.infinitive || token;
    if(!entries[lemma] && entries[token.replace(/s$/,'')])lemma=token.replace(/s$/,'');
    const data=entries[lemma] || entries[token];
    return exact || {id:lemma,fr:lemma,zh:data?.[0] || ui('未收录释义','Meaning not bundled'),en:data?.[1] || 'Meaning not bundled',definition:data?.[2] || '',pos:data?.[5]?.includes('v')?'verb':data?.[5]?.includes('n')?'noun':'other',recognitionOnly:!data || data[3]<10,rare:!data || data[3]<10,sentence:currentScene().text || raw,scene:currentScene().id,pot:state.story.rooftop?2:1,potId:state.story.rooftop?2:1,seen:true,wordClip:`w_${lemma}`,infinitive:conj?.infinitive,raw};
  }
  function lookup(raw) {selectedWord=findWord(raw);selectedWord={...selectedWord,raw};lookupReturn=screen;screen='lookup';A.sfx('paper');render();}
  function renderLookup() {
    const w=selectedWord;if(!w){screen='wordbook';return renderWordbook();}
    const collected=state.words[w.id]?.collected;
    const glossary=window.A411?.GLOSSARY_DATA || {};const data=(glossary.entries || glossary.E || {})[w.id];
    panel.innerHTML=`${header(ui('遇见一个词','A WORD YOU MET'),back('close-lookup'))}<div class="lookup-title"><h2 lang="fr">${esc(C.french(w.fr))}</h2>${button(icon('sound'),'word-audio','round-button',`aria-label="${ui('发音','Pronunciation')}"`)}</div><div class="lookup-form">${w.raw&&normalize(w.raw)!==normalize(w.fr)?`${esc(C.french(w.raw))} → ${esc(C.french(w.fr))} · `:''}<span class="gender ${esc(w.gender)}">${w.gender==='m'?'le · m':w.gender==='f'?'la · f':esc(w.pos || '')}</span>${esc(w.morphology || (w.number==='p'?ui('复数','plural'):''))}${w.rare?ui('只需认识','Recognition only'):''}</div><div class="lookup-gloss">${esc(ui(w.zh,w.en))}<small>${esc(ui(w.en,w.zh))}</small></div>${w.definition || data?.[2]?`<p class="definition" lang="fr">${esc(C.french(w.definition || data[2]))}</p>`:''}<div class="rule"></div><p class="sentence" lang="fr">${tokenize(w.sentence || currentScene().text)}</p><p class="muted" style="font-size:10px;margin-top:12px">${esc(w.scene || currentScene().id)}</p>${status()}${window.A411?.Conj?.lemmaOf(w.fr) || w.infinitive?button(ui('查看动词变位','Voir la conjugaison'),'conjugation','text-button'):''}<div class="lookup-actions">${button(`${collected?icon('check'):icon('book')}${collected?'✓ Dans le carnet':'Ajouter au carnet'}`,'collect',collected?'secondary':'primary',collected?'aria-pressed="true"':'')}</div>`;
  }
  function collect() {
    const w=selectedWord;if(!w)return;
    state.words[w.id] ||= {}; Object.assign(state.words[w.id],{met:true,collected:true});state.words[w.id].at ||= now().toISOString();
    state.words[w.id].scenes ||= [];if(!state.words[w.id].scenes.includes(currentScene().id))state.words[w.id].scenes.push(currentScene().id);
    if(!C.words.some(x=>x.id===w.id)){state.customWords ||= {};state.customWords[w.id]={...w,legacyIds:[],answer:w.fr,chunks:(w.sentence || w.fr).split(' ')};}
    A.sfx('paper');save();render();
  }
  function renderWordbook() {
    panel.innerHTML=header(ui('单词本 · 花盆视图','WORDS · YOUR POTS'),button(icon('bulb'),'grammar','round-button',`aria-label="${ui('语法收藏','Grammar collection')}"`))+`<h2>${currentPot===1?'Chez nous':'Le basilic'}</h2><div class="segmented" style="margin-top:20px">${button('01 · Chez nous','pot-one',currentPot===1?'selected':'')}${button('02 · Le basilic','pot-two',currentPot===2?'selected':'')}</div><input class="search-input" id="word-search" placeholder="${ui('找一个词…','Find a word…')}" aria-label="${ui('搜索单词','Search words')}" value="${esc(search)}"><div class="word-list" id="word-list">${wordRows()}</div>`;
  }
  function wordRows() {
    const words=allWords().filter(w=>(w.pot || w.potId)===currentPot && (w.seen || state.words[w.id]?.met || state.words[w.id]?.collected) && normalize(`${w.fr} ${w.zh} ${w.en}`).includes(normalize(search)));
    if(!words.length)return `<p class="hint">${ui('遇见的词，会在这里慢慢扎根。','The words you meet will take root here.')}</p>`;
    return words.map(w=>{const cards=Object.values(state.cards).filter(c=>c.wordId===w.id || c.itemId===w.id);const stability=cards[0]?.stability || 0;return `<div class="word-row"><div class="word-row-head"><button data-action="expand:${esc(w.id)}"><span class="gender ${esc(w.gender)}">${w.gender==='m'?'le · m':w.gender==='f'?'la · f':esc(w.pos || '')}</span>${esc(w.fr)}</button><span class="mastery">${stability>=14?ui('很熟','Familiar'):stability>=3?ui('有点熟','Taking root'):ui('刚认识','Just met')}</span></div>${expandedWord===w.id?`<div class="word-detail">${esc(ui(w.zh,w.en))}<div class="source">${esc(w.scene || 'SEMAINE 1')} · ${ui('相遇的地方','WHERE WE MET')}</div><div class="sentence" lang="fr">${tokenize(w.sentence)}</div><div class="line-tools">${button(icon('sound'),`word-sentence:${esc(w.id)}`,'round-button',`aria-label="${ui('播放原句','Play story sentence')}"`)}${button(state.words[w.id]?.collected?'✓ Dans le carnet':'Ajouter au carnet',`collect-id:${esc(w.id)}`,'text-button')}</div>${(state.words[w.id]?.scenes || []).map(id=>{const scene=C.scenes.find(s=>s.id===id);return scene?button(`${esc(scene.text)} ${icon('sound')}`,`source:${esc(id)}`,'text-button'):'';}).join('')}</div>`:''}</div>`;}).join('');
  }
  let grammarPoint=null, conjugationTense='present';
  function renderGrammar() {
    const points=window.A411?.GRAMMAR_DATA || [];grammarPoint ||= grammarFor(currentScene()) || points.find(p=>p.id==='partitif') || points[0];
    const g=grammarPoint;
    if(!g){panel.innerHTML=back()+`<p class="hint">${ui('还没有语法卡片。','No grammar cards yet.')}</p>`;return;}
    panel.innerHTML=header(ui('一个小发现','A LITTLE DISCOVERY'),back())+`<div class="completion-emblem">${icon('bulb')}</div><h3 lang="fr">${esc(g.pattern)}</h3><p class="definition">${esc(ui(g.zh,g.en))}</p>${(g.ex || []).map(ex=>`<div class="word-row"><p lang="fr">${tokenize(ex[0])}</p><p class="muted">${esc(ex[state.settings.uiLang==='en'?2:1])}</p></div>`).join('')}<div style="margin-top:20px">${button(state.grammar?.includes(g.id)?'✓ Gardé':'Garder','keep-grammar','primary')}</div><p class="eyebrow" style="margin-top:24px">${ui('我的语法收藏','MY GRAMMAR NOTES')}</p><div class="atlas-links">${(state.grammar || []).map(id=>{const p=points.find(x=>x.id===id);return p?button(esc(p.pattern),`grammar:${id}`,'soft-button'):'';}).join('')}</div>`;
  }
  function keepGrammar() {
    const g=grammarPoint;state.grammar ||= [];if(!state.grammar.includes(g.id))state.grammar.push(g.id);
    const id=`grammar:${g.id}`;state.customWords ||= {};state.customWords[id]={id,fr:g.pattern,zh:g.zh,en:g.en,pos:'grammar',pot:currentPot,potId:currentPot,sentence:g.ex[0][0],answer:g.ex[0][0],chunks:g.ex[0][0].split(' '),recognitionOnly:true,seen:true,field:'grammar'};
    state.words[id]={met:true,collected:true,at:now().toISOString()};save();render();
  }
  function renderConjugation() {
    const inf=selectedWord?.infinitive || window.A411.Conj.lemmaOf(selectedWord?.fr)?.infinitive || selectedWord?.fr;
    const conjugated=window.A411.Conj.conjugate(inf);
    panel.innerHTML=header(ui('离线动词变位','OFFLINE CONJUGATION'),back('close-conjugation'))+`<h2>${esc(inf)}</h2>`;
    if(!conjugated){panel.innerHTML+=`<p class="hint">${ui('未收录此动词。','This verb is not in the local tables.')}</p>`;return;}
    panel.innerHTML+=(conjugated.tenses || []).map(tense=>`<h3 style="margin-top:24px">${esc(tense.fr)}</h3><table class="conjugation">${tense.rows.map(r=>`<tr><th>${esc(r.person)}</th><td>${esc(r.form)}</td></tr>`).join('')}</table>`).join('');
    panel.innerHTML+=Object.entries(conjugated.participles || {}).filter(([,v])=>v).map(([key,value])=>`<p class="hint">${esc(key)} · ${esc(value.text)}</p>`).join('');
  }
  function renderSettings() {
    panel.innerHTML=header(ui('设置','SETTINGS'),back())+`<h2>${ui('按你的节奏。','Make yourself at home.')}</h2><div class="settings-group"><div class="setting-line"><span>${ui('释义语言','Help language')}</span><div class="segmented">${button('中文','lang:zh',state.settings.uiLang==='zh'?'selected':'')}${button('English','lang:en',state.settings.uiLang==='en'?'selected':'')}</div></div><div class="setting-line"><span>${ui('声音','Sound')}</span>${button(state.settings.muted?ui('已静音','Muted'):ui('已开启','On'),'mute','soft-button')}</div>${[['music','音乐','Music'],['voice','语音','Voice'],['sfx','音效','Effects']].map(([key,zh,en])=>`<label>${ui(zh,en)}<input type="range" min="0" max="1" step=".05" value="${state.settings[key]}" data-volume="${key}" aria-label="${en}"></label>`).join('')}</div><div class="settings-group">${button(`${icon('download')}${ui('导出我的进度','Export my progress')}`,'export','secondary')}${button(ui('导入已有进度','Import an existing save'),'import','secondary')}<p class="protected-note">${ui('旧存档只读。不会读取或修改 Yuechao 的存档。','Old saves are read-only. Yuechao’s storage is never read or changed.')}</p></div>${button(ui('给制作组留一张便条','Leave a playtest note'),'notes','text-button')}${dev?button('Atelier · isolated preview','atelier','text-button'):''}<p class="muted" style="font-size:10px;margin-top:20px">${ui('动画跟随系统“减少动态效果”设置。<br>键盘：1–4 选择 · Enter / Space 继续 · Esc 返回。','Motion follows your device’s reduced-motion setting.<br>Keyboard: 1–4 choose · Enter / Space continue · Esc back.')}</p>`;
  }
  function renderImport() {
    try{detected=S.detect(storage);}catch(_){detected=null;}
    panel.innerHTML=header(ui('继承进度','BRING YOUR WORDS'),back())+`<h2>${ui('熟悉的词，<br>新的花园。','Familiar words.<br>A new garden.')}</h2>${detected?.available?`<div class="import-info"><strong>Jinyi</strong>${detected.counts?.words || 0} ${ui('个收藏的词','collected words')} · ${detected.counts?.cards || 0} ${ui('张复习卡','review cards')}${button(ui('一键继承 Jinyi 的进度','Import Jinyi’s progress'),'import-local','primary')}</div>`:`<p class="hint">${ui('这里没有检测到 Jinyi 的旧进度。可以导入文件，或粘贴导出内容。','No Jinyi save is visible here. Choose an export file or paste a save below.')}</p>`}<label class="file-label">${icon('download')} ${ui('选择 JSON 存档','Choose a JSON save')}<input id="import-file" type="file" accept="application/json,.json" multiple></label><textarea class="textarea" id="import-text" aria-label="${ui('粘贴存档 JSON','Paste save JSON')}" placeholder="${ui('粘贴 JSON 导出内容…','Paste exported JSON…')}"></textarea><label class="check-line"><input id="allow-legacy" type="checkbox">${ui('这个未命名的旧存档属于我','This unnamed legacy save belongs to me')}</label>${button(ui('导入粘贴的进度','Import pasted save'),'import-paste','primary')}${importMessage?`<div class="${importReport?'success-message':'error-message'}" role="status">${esc(importMessage)}</div>`:''}${importReport?`<details class="notes-list"><summary>${ui('查看导入报告','Import report')}</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify(importReport,null,2))}</pre></details>`:''}<p class="protected-note">${ui('Yuechao 的存档一律拒绝。导入只写入本应用的新存储空间，不修改原档。','Yuechao’s saves are always refused. Imports write only to this app’s new storage, never the source.')}</p><p class="hint">${ui('iOS 主屏幕应用与 Safari 的存储可能分开。请在原来的应用环境打开导出页，再把文件带到这里。','An iOS home-screen app may have separate storage from Safari. Open the exporter in the original app’s context, then bring its file here.')} <a href="export.html">${ui('打开只读导出页','Read-only exporter')}</a></p>`;
  }
  function importData(raw,allowLegacy=false) {
    const catalog=Object.keys(window.A411.GLOSSARY_DATA.E).map(lemma=>C.lookup(lemma)).filter(Boolean);
    const result=S.importData(raw,state,allWords(),{allowLegacy,now:now(),catalog});
    if(result.ok){state=sanitizeState(result.state);review=state.appSession;feedback=review?.feedback || null;importReport=result.report;importMessage=ui('进度已导入。原存档没有改动。','Progress imported. The original save is unchanged.');save();}
    else{importReport=null;importMessage=result.error || ui('无法导入这个存档。','This save could not be imported.');}
    render();
  }
  function download(name,data,type='application/json') {const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderMore() {
    panel.innerHTML=header(ui('一点自己的时间','A LITTLE TIME FOR YOU'))+`<h2>${ui('在 411 的小角落。','Your corner of 411.')}</h2><div class="pot-list">${button(`${icon('moon')}${ui('晚间重听','Evening listening')}`,'evening','pot-card')}${button(`${icon('pen')}${ui('写几句法语','A few words at the desk')}`,'writing','pot-card')}${button(`${icon('bulb')}${ui('我的语法收藏','My grammar notes')}`,'grammar','pot-card')}${button(`${icon('story')}${ui('留一张测试便条','Leave a playtest note')}`,'notes','pot-card')}${button(`${icon('settings')}${ui('设置与进度','Settings & saves')}`,'settings','pot-card')}${dev?button('Atelier','atelier','pot-card'):''}</div>`;
  }
  function renderWriting() {
    panel.innerHTML=header(ui('小书桌','A LITTLE WRITING DESK'),back())+`<h2>${ui('写给今天。','A note about today.')}</h2><p class="hint">${ui('随便写几句。离线检查只提供已学句型提示，不会假装批改自由写作。','Write a little. Offline checking offers learned patterns, not a pretend correction of free writing.')}</p><textarea id="writing-text" class="textarea" lang="fr" style="min-height:210px" placeholder="Aujourd’hui…">${esc(state.writing || '')}</textarea>${button('Vérifier','check-writing','primary')}<div id="writing-feedback" class="notes-list"></div>${button(`${icon('download')}${ui('导出文字','Export writing')}`,'export-writing','secondary')}`;
  }
  function renderNotes() {
    panel.innerHTML=header(ui('给制作组的便条','A NOTE FOR THE MAKERS'),back())+`<h2>${ui('哪里可以更好？','A little note.')}</h2><p class="hint">${ui('便条保存在本机，导出后可以发给制作组。不连接私人仓库，也不上传任何内容。','Notes stay on this device. Export to share with the makers. Nothing is uploaded and no private repository is contacted.')}</p><textarea id="note-text" class="textarea" placeholder="${ui('写下你的想法…','What did you notice?')}"></textarea><label class="file-label">${ui('添加图片（最多四张）','Attach up to four images')}<input type="file" accept="image/*" multiple id="note-files"></label><div class="feedback-images">${noteImages.map(src=>`<img src="${src}" alt="Note attachment">`).join('')}</div>${button(ui('附上当前场景','Attach current scene'),'attach-scene','secondary')}${button(ui('保存便条','Keep this note'),'save-note','primary',`style="margin-top:14px"`)}<p class="notes-list">${(state.notes || []).length} ${ui('张便条已安全存放在本机','notes kept on this device')}</p>${button(ui('导出全部便条','Export all notes'),'export-notes','secondary')}`;
  }
  function renderEvening() {
    A.ambience(true);
    setScene({scene:'roof',night:true});setLocation('ÉCOUTE DU SOIR','22:10');
    const choices=C.scenes.filter(s=>s.kind==='line' && s.text && s.id!=='d8_cam_depuis');
    const s=choices[state.story.eveningIndex || 0] || choices[0];
    panel.innerHTML=header(ui('晚间重听','ÉCOUTE DU SOIR'),back())+`<h2>${ui('再听一遍今天。','Listen to today again.')}</h2>${listenButton('evening-audio')}<p class="hint">${ui('听一句，写一句。需要时再展开文字。','Listen, then write the sentence. Reveal the text whenever you need it.')}</p>${button(ui('显示文字','Show text'),'evening-text','text-button')}<div id="evening-line" class="voice-transcript" hidden>${tokenize(s.text)}</div><form id="evening-form"><textarea class="textarea" id="evening-input" lang="fr" aria-label="${ui('晚间听写','Evening dictation')}"></textarea>${button(ui('检查拼写','Check the spelling'),'check-evening','primary')}</form><div id="evening-result"></div>${button(ui('换一句','Another line'),'evening-next','text-button')}${status()}`;
  }
  function eveningScene(){return C.scenes.filter(s=>s.kind==='line' && s.text && s.id!=='d8_cam_depuis')[state.story.eveningIndex || 0];}
  function renderEnd() {
    state.story.day8Complete=true;state.story.rooftop=true;state.story.basilPlanted=true;save();
    setScene({scene:'facade',night:true,reaction:'idle',water:0});setLocation('CHEZ NOUS','22:03');
    const hook=C.scenes.find(s=>s.kind==='end');
    $('#scene-caption').innerHTML=`<span>L’APPARTEMENT 411</span>${ui('有一盏灯，还亮着。','One window is still awake.')}`;
    panel.innerHTML=header('DAY 08 · TERMINÉ')+`<div class="completion-emblem">${icon('leaf')}</div><h2>${ui('晚安，411。','Goodnight, 411.')}</h2><div class="rule"></div><p style="font-size:19px;line-height:1.8" lang="fr">${tokenize(hook?.text || '')}</p><div class="summary-grid"><div><strong>${Object.values(state.words).filter(w=>w.met || w.collected).length}</strong><span>${ui('个相遇的词','words encountered')}</span></div><div><strong>2</strong><span>${ui('盆不会孤单的植物','little plants')}</span></div></div><div class="spacer"></div>${primary(ui('去花园坐一会儿','Stay a little in the garden'),'garden')}<p class="muted" style="text-align:center;font-size:10px;margin-top:13px">${ui('今天的故事，已保存。','Today’s little story is saved.')}</p>`;
  }
  function settle() {try{const result=E.settleGrowth(state,allWords(),{now:now()});if(result?.state)state=result.state;growthReveal=result?.reveal;sceneModel.growth=[1,2].map(id=>state.growth?.pots?.[id]?.shownStage || 0);save();}catch(error){console.warn('Growth settlement unavailable:',error.message);}}
  function renderReveal() {game.classList.add('reveal');setScene({scene:state.story.rooftop?'roof':'kitchen',night:false,growth:[1,2].map(id=>state.growth?.pots?.[id]?.shownStage || 0)});panel.innerHTML=header(ui('一个新的早晨','A NEW MORNING'))+`<div class="speaker noe"><span class="speaker-mark"></span>Noé</div><div class="dialogue" lang="fr">${growthReveal?.kind==='wake'?ui('它又醒来了。','It’s awake again.'):L.uiFrench.reveal}</div><p class="hint">${Number(growthReveal?.potId)===2?'Le basilic':'Chez nous'}</p><div class="spacer"></div>${primary(ui('早上好。','Good morning.'),'after-reveal')}`;}
  function renderAtelier() {
    panel.innerHTML=header('ATELIER · ISOLATED CLONE',back())+`<h2>Day 8</h2><p class="hint">${ui('这里的预览不写入真实进度。','Previews never write to your real progress.')}</p>${button('+1 local day','debug-day','secondary')}<div class="atlas-links">${['R1','R2','R3','P1','P2'].map(type=>button(type,`debug-type:${type}`,'soft-button')).join('')}</div><div class="atlas-links">${C.scenes.map((s,i)=>button(`${i+1} ${s.id}`,`jump:${i}`,'soft-button')).join('')}</div>`;
  }
  function go(target) {if(screen==='lookup' && target==='back'){screen=lookupReturn;}else{if(!['settings','import','lookup','conjugation','grammar'].includes(screen))returnScreen=screen;screen=target;}render();}
  function handle(action,el) {
    A.unlock();if(!['hold-water','mute'].includes(action))A.sfx('click');
    if(action==='next'){nextScene();return;}
    if(action==='continue') {settle();screen=growthReveal?'reveal':state.story.day8Complete?'garden':'story';render();return;}
    if(action==='after-reveal'){growthReveal=null;screen='story';render();return;}
    if(action==='back'){screen=returnScreen==='settings'?'story':returnScreen;render();return;}
    if(action==='close-lookup'){screen=lookupReturn;render();return;}
    if(action==='close-conjugation'){screen='lookup';render();return;}
    if(action==='mute'){state.settings.muted=!state.settings.muted;A.configure(state.settings);save();render();return;}
    if(action==='language'||action.startsWith('lang:')){state.settings.uiLang=action==='language'?(state.settings.uiLang==='zh'?'en':'zh'):action.split(':')[1];save();render();return;}
    if(action==='replay'){A.speak(currentScene().text,currentScene().id);return;}
    if(action==='gloss'){glossVisible=!glossVisible;render();return;}
    if(action==='reveal-line'){lineRevealed=true;render();A.speak(currentScene().text,currentScene().id);return;}
    if(action==='point-next'){A.sfx(currentScene().kind==='walk'?'steps':'paper');if(currentScene().kind==='walk'){game.classList.add('walking');const started=performance.now();const step=t=>{sceneModel.walkProgress=Math.min(1,(t-started)/700);if(sceneModel.walkProgress<1)requestAnimationFrame(step);else nextScene();};requestAnimationFrame(step);}else nextScene();return;}
    if(action==='rattle'){A.sfx('door');return;}
    if(action==='focus-word'){const id=currentScene().wordIds?.[0];if(id)lookup(wordById(id)?.fr || id);return;}
    if(action.startsWith('optional-')){const text=action==='optional-window'?'À la fenêtre, une plante. Elle a soif.':'À côté de la table, une chaise vide.';notice(text);A.speak(text,action==='optional-window'?'lfd_fenetre':'lfd_chaises');return;}
    if(action==='start-garden'){startReview();return;}
    if(action==='start-cat'){startReview('cat');return;}
    if(action==='review-next'){reviewNext();return;}
    if(action==='finish-review'){finishReview();return;}
    if(action==='review-audio'){A.speak(feedback?.sentence || exercise.sentence,feedback?.audioId || exercise.audioId);return;}
    if(action.startsWith('answer:')){answerReview(action.slice(7));return;}
    if(action.startsWith('chunk:')){chunks.push(Number(action.split(':')[1]));if(chunks.length===exercise.chunks.length)answerReview(chunks.map(i=>exercise.chunks[i]));else render();return;}
    if(action.startsWith('unchunk:')){chunks.splice(Number(action.split(':')[1]),1);render();return;}
    if(action==='hold-water')return;
    if(action==='voicemail-audio'){const v=C.voicemail || currentScene();A.speak((v.lines || []).map(x=>typeof x==='string'?x:x.text).join(' '),v.audioId || v.id);return;}
    if(action==='transcript'){transcript=!transcript;render();return;}
    if(action.startsWith('reply-chunk:')){const d=chatData(currentScene());const choices=d.chunks || d.accepted[0].split(' ');chunks.push(Number(action.split(':')[1]));if(chunks.length===choices.length){const input=chunks.map(i=>choices[i]).join(' ');chunks=[];submitReply(input);}else render();return;}
    if(action.startsWith('reply-unchunk:')){chunks.splice(Number(action.split(':')[1]),1);render();return;}
    if(action.startsWith('reply-option:')){const s=currentScene(),o=s.options[Number(action.split(':')[1])];state.story[s.id]=o.id || String(Number(action.split(':')[1]));state.story.choices ||= {};state.story.choices[s.id]=o.id || o.text;replyFeedback={correct:true,canonical:o.text,after:o.after,input:o.text};save();A.speak(o.text);render();return;}
    if(action==='collect'){collect();return;}
    if(action==='word-audio'){A.speak(selectedWord.fr,selectedWord.wordClip || `w_${selectedWord.id}`);return;}
    if(action==='pot-one'||action==='pot-two'){currentPot=action==='pot-one'?1:2;screen='wordbook';search='';render();return;}
    if(action.startsWith('expand:')){expandedWord=expandedWord===action.slice(7)?null:action.slice(7);render();return;}
    if(action.startsWith('collect-id:')){selectedWord=wordById(action.slice(11));collect();return;}
    if(action.startsWith('word-sentence:')){const w=wordById(action.slice(14));A.speak(w.sentence,w.audioId || w.clip);return;}
    if(action.startsWith('source:')){const s=C.scenes.find(s=>s.id===action.slice(7));A.speak(s.text,s.id);return;}
    if(action.startsWith('grammar:')){grammarPoint=(window.A411.GRAMMAR_DATA || []).find(g=>g.id===action.slice(8));screen='grammar';render();return;}
    if(action==='keep-grammar'){keepGrammar();return;}
    if(action==='export'){download('appartement-411-day8.json',S.exportData(state));notice(ui('进度已导出。','Progress exported.'));return;}
    if(action==='import-paste'){const input=$('#import-text').value;const allow=$('#allow-legacy').checked;importData(input,allow);return;}
    if(action==='import-local'){importData(detected.bundle);return;}
    if(action==='check-writing'){state.writing=$('#writing-text').value;save();$('#writing-feedback').innerHTML=`${ui('文字已保存。离线句型参考：','Writing saved. An offline pattern to compare:')}<br>${esc((window.A411.GRAMMAR_DATA || []).find(g=>g.id==='partitif')?.pattern || '')}`;return;}
    if(action==='export-writing'){state.writing=$('#writing-text').value;save();download('mon-texte-day8.txt',state.writing,'text/plain');return;}
    if(action==='attach-scene'){if(noteImages.length<4)noteImages.push($('#scene').toDataURL('image/png'));const text=$('#note-text').value;render();$('#note-text').value=text;return;}
    if(action==='save-note'){const text=$('#note-text').value;if(!text.trim()&&!noteImages.length)return;state.notes ||= [];state.notes.push({id:Date.now(),at:now().toISOString(),scene:currentScene().id,text,images:noteImages});noteImages=[];save();render();notice(ui('便条已保存在本机。','Note kept on this device.'));return;}
    if(action==='export-notes'){download('day8-playtest-notes.json',{kind:'a411-day8-feedback',notes:state.notes || []});return;}
    if(action==='evening-audio'){const s=eveningScene();A.speak(s.text,s.id);return;}
    if(action==='evening-text'){$('#evening-line').hidden=!$('#evening-line').hidden;return;}
    if(action==='check-evening'){const target=eveningScene().text;$('#evening-result').innerHTML=`<div class="letter-feedback">${letterFeedback($('#evening-input').value,normalize(target))}</div><p class="hint">${esc(target)}</p>`;A.speak(target,eveningScene().id);return;}
    if(action==='evening-next'){state.story.eveningIndex=((state.story.eveningIndex || 0)+1)%C.scenes.filter(s=>s.kind==='line'&&s.text&&s.id!=='d8_cam_depuis').length;save();render();return;}
    if(action.startsWith('jump:')&&dev){debug.jump(Number(action.slice(5)));return;}
    if(action.startsWith('debug-type:')&&dev){debug.review(action.slice(11));return;}
    if(action==='debug-day'&&dev){simulatedNow=new Date(now().setDate(now().getDate()+1));settle();screen=growthReveal?'reveal':'garden';render();return;}
    if(['story','garden','wordbook','more','settings','import','grammar','conjugation','writing','notes','evening','atelier'].includes(action)){if(action==='atelier'&&!dev)return;if(action==='grammar')grammarPoint=grammarFor(currentScene());go(action);}
  }
  document.addEventListener('click',event=>{
    const word=event.target.closest('[data-word]');if(word){lookup(word.dataset.word);return;}
    const el=event.target.closest('[data-action]');if(el&&!el.disabled)handle(el.dataset.action,el);
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();
    if(event.target.id==='review-form')answerReview($('#review-input').value);
    if(event.target.id==='reply-form')submitReply($('#reply-input').value);
    if(event.target.id==='voicemail-form'){const input=$('#voice-input').value;replyFeedback={input,...L.gradeAnswer(input,C.voicemail.accepted,C.voicemail.canonical)};render();A.speak('six heures');}
  });
  document.addEventListener('input',event=>{
    if(event.target.dataset.volume){state.settings[event.target.dataset.volume]=Number(event.target.value);A.configure(state.settings);save();}
    if(event.target.id==='word-search'){search=event.target.value;$('#word-list').innerHTML=wordRows();}
    if(event.target.id==='writing-text'){state.writing=event.target.value;save();}
  });
  document.addEventListener('change',async event=>{
    if(event.target.id==='import-file'){
      const files=Array.from(event.target.files);if(files.some(f=>f.size>8*1024*1024)){importMessage=ui('文件太大，请使用小于 8 MB 的存档。','Choose a save smaller than 8 MB.');render();return;}
      try{const values=await Promise.all(files.map(async f=>JSON.parse(await f.text())));importData(values.length===1?values[0]:values,$('#allow-legacy')?.checked);}catch(_){importMessage=ui('这不是有效的 JSON 存档。','This is not valid save JSON.');importReport=null;render();}
    }
    if(event.target.id==='note-files'){
      const text=$('#note-text').value;
      for(const file of Array.from(event.target.files).slice(0,4-noteImages.length)){if(file.size>1024*1024){notice(ui('图片需小于 1 MB。','Images must be smaller than 1 MB.'));continue;}const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});noteImages.push(data);}
      render();$('#note-text').value=text;
    }
  });
  document.addEventListener('pointerdown',event=>{const el=event.target.closest('[data-action=hold-water]');if(el){event.preventDefault();el.setPointerCapture(event.pointerId);beginHold(el);}});
  document.addEventListener('pointerup',cancelHold);document.addEventListener('pointercancel',cancelHold);
  document.addEventListener('keydown',event=>{
    if(event.target.matches('input,textarea,select')){if(event.key==='Escape'){event.target.blur();}return;}
    if(event.key==='Escape'){event.preventDefault();if(screen==='review'){save();screen='garden';render();}else if(screen==='lookup'){screen=lookupReturn;render();}else{screen='story';render();}return;}
    if(/^[1-4]$/.test(event.key)){const choices=panel.querySelectorAll('.answer:not(:disabled)');choices[Number(event.key)-1]?.click();return;}
    if((event.key===' '||event.key==='Enter')&&!event.repeat){
      const hold=panel.querySelector('[data-action=hold-water]');if(hold){event.preventDefault();beginHold(hold);return;}
      if(event.target.tagName==='BUTTON')return;
      const target=panel.querySelector('.primary:not(:disabled)') || $('#hotspots .hotspot:not(.quiet)');if(target){event.preventDefault();target.click();}
    }
  });
  document.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')cancelHold();});
  window.addEventListener('pagehide',save);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let lastFrame=0;
  function animate(t){if(t-lastFrame>(reduced.matches?500:65)){lastFrame=t;window.Day8Art.draw($('#scene'),{...sceneModel,time:reduced.matches?0:t,elapsed:reduced.matches?5000:t-sceneEpoch,basilPlanted:screen==='entry'?undefined:!!(state.story.basilPlanted || state.story.basil_planted),rooftopUnlocked:screen==='entry'?undefined:!!state.story.rooftop});if(sceneModel.water>0&&!holdActive)sceneModel.water=Math.max(0,sceneModel.water-.025);}requestAnimationFrame(animate);}
  const debug={
    getState:()=>state,getScreen:()=>screen,getExercise:()=>exercise,getSession:()=>review,
    jump(id){review=null;feedback=null;replyFeedback=null;chunks=[];lineRevealed=false;state.story.day8Index=typeof id==='number'?id:Math.max(0,C.scenes.findIndex(s=>s.id===id));screen='story';render();},
    show(name){screen=name;render();},
    review(type='R1',mode='garden'){
      const words=allWords();const word=words.find(w=>w.seen && !w.recognitionOnly && w.sentence?.split(' ').length>3) || words.find(w=>w.seen);
      for(const card of Object.values(state.cards))if(card.itemId===word.id)card.due='2000-01-01T00:00:00.000Z';
      review={session:E.createSession(state,words,{mode,now:now(),onlyIds:[word.id],forceType:type,budget:mode==='cat'?6:3}),returnTo:'garden',first:false,feedback:null,danger:0,correct:0};
      feedback=null;chunks=[];reviewStarted=performance.now();screen='review';render();
    },
    answer(input){answerReview(input);},next:()=>feedback?reviewNext():nextScene(),
    reset(){state=S.fresh(C.words,{now:now()});state.settings={uiLang:'en',music:0,voice:0,sfx:0,muted:true};state.story ||= {};review=null;feedback=null;screen='entry';render();},
    lookup:raw=>lookup(raw),setLanguage(lang){state.settings.uiLang=lang;render();},
    setState(next){state=sanitizeState(next);review=state.appSession || null;feedback=review?.feedback || null;render();},
    import:importData,allWords,render
  };
  window.Day8App={ready:true,...(dev?{debug}:{})};
  render();requestAnimationFrame(animate);
  if(!loaded.ok){$('#storage-warning').hidden=false;$('#storage-warning').textContent=ui('无法读取本机进度，当前以新进度开始。请使用导入或导出保留记录。','Local progress could not be read. This is a fresh session; use import/export to keep your records.');}
  if('serviceWorker' in navigator && location.protocol!=='file:' && !dev)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
})();
