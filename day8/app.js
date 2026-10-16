(function () {
  'use strict';
  const C = window.Day8Content, E = window.Day8Engine, S = window.Day8Save, A = window.Day8Audio, L=window.Day8Language;
  const $ = selector => document.querySelector(selector);
  const storyPanel = $('#panel'), game = $('#app');
  let panel = storyPanel;
  const overlayScreens = new Set(['lookup','wordbook','grammar','conjugation','settings','import','notes','writing','atelier','more','evening']);
  const overlays = [];
  let baseScreen = 'entry', audioUnavailable = false, hintOpen = false, moduleController = null, moduleKey = '';
  let gardenBay = 0, gardenFixture = null, catGame = null, lastTick = 0, snapshotTime = null, walkMotion = null;
  const dev = new URLSearchParams(location.search).get('dev') === '1';
  let storage;
  try { storage = localStorage; } catch (_) { storage = null; }
  let loaded = S.load(storage, C.words);
  let state = loaded?.state || loaded || S.fresh(C.words);
  function sanitizeState(value) {
    const object=x=>x && typeof x==='object' && !Array.isArray(x);
    value.story=object(value.story)?value.story:{};value.settings=object(value.settings)?value.settings:{};
    let index=Number(value.story.day8Index);
    const stable=C.scenes.findIndex(s=>s.id===value.story.day8SceneId);
    if(stable>=0)index=stable;
    else if(value.story.day8Version!==2&&Number.isInteger(index)&&index>0&&index<49)index--;
    value.story.day8Index=Number.isInteger(index)?Math.max(0,Math.min(C.scenes.length-1,index)):0;
    value.story.day8Version=2;
    value.settings.uiLang=value.settings.uiLang==='en'?'en':'zh';value.settings.muted=value.settings.muted===true;
    for(const [key,fallback] of [['music',.24],['voice',.85],['sfx',.5]])value.settings[key]=typeof value.settings[key]==='number'&&Number.isFinite(value.settings[key])?Math.max(0,Math.min(1,value.settings[key])):fallback;
    for(const key of ['words','cards','days','customWords'])if(!object(value[key]))value[key]={};
    for(const [id,word] of Object.entries(value.words)){if(!object(word)){delete value.words[id];continue;}word.scenes=Array.isArray(word.scenes)?word.scenes.filter(x=>typeof x==='string'):[];}
    for(const [id,word] of Object.entries(value.customWords))if(!object(word)||word.id!==id||typeof word.fr!=='string')delete value.customWords[id];
    for(const [day,record] of Object.entries(value.days)){if(!object(record)){delete value.days[day];continue;}for(const key of ['introduced','attempted','due','reviewed'])record[key]=Array.isArray(record[key])?record[key].filter(x=>typeof x==='string'):[];}
    value.grammar=Array.isArray(value.grammar)?value.grammar.filter(x=>typeof x==='string'):[];
    value.notes=Array.isArray(value.notes)?value.notes.filter(object):[];
    const review=value.appSession,s=review?.session;
    if(!object(review)||!object(s)||s.mode!=='garden'||(!value.story.rooftop&&!value.story.day8Complete)||!Array.isArray(s.queue)||!s.queue.every(x=>object(x)&&typeof x.wordId==='string')||!Number.isInteger(s.index)||s.index<0||!Array.isArray(s.types))value.appSession=null;
    return value;
  }
  state=sanitizeState(state);
  state.story ||= {}; state.words ||= {}; state.cards ||= {}; state.settings ||= {};
  state.settings = Object.assign({uiLang:'zh',music:.24,voice:.85,sfx:.5,muted:false}, state.settings);
  let screen = 'entry', selectedWord = null;
  let review = state.appSession || null, feedback = review?.feedback || null, exercise = null;
  let reviewStarted = performance.now(), reviewReturn = 'story', chunks = [], lineRevealed = false;
  let glossVisible = false, replyAttempts = 0, replyFeedback = null, transcript = false;
  let currentPot = 1, expandedWord = null, search = '', simulatedNow = null, noteImages = [];
  let sceneModel = {scene:'roof',night:false,cat:true,danger:0,reaction:'idle',water:0,growth:[1,0]};
  let holdFrame = 0, holdStart = 0, holdActive = false, noticeTimer = 0, sceneTimer = 0, sceneEpoch=performance.now(),activeSceneId='';
  let importMessage = '', importReport = null, detected = null, growthReveal = null;
  const hint = (zh, en) => state.settings.uiLang === 'en' ? en : zh;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now = () => simulatedNow ? new Date(simulatedNow) : new Date();
  const names = {noe:'Noé',camille:'Camille',lefevre:'Madame Lefèvre',voisine:'Madame Lefèvre',gaspard:'Gaspard',player:'Moi'};
  const icon = name => window.Day8Icons.icon(name);
  const button = (label, action, cls='primary', extra='') => `<button class="${esc(cls)}" data-action="${esc(action)}" ${extra}>${label}</button>`;
  const primary = (label, action='next') => button(`${label}${icon('arrow')}`, action, 'primary pulse');
  const back = (action='back') => button(icon('close'), action, 'back-button', 'aria-label="Fermer" title="Fermer"');
  const eyebrow = text => `<div class="eyebrow">${text}</div>`;
  const status = () => '<div class="audio-status" hidden></div>';
  function save() {
    state.appSession = review;
    state.story.day8SceneId=currentScene().id;state.story.day8Version=2;
    if (dev) return;
    try {
      const result = S.save(storage,state);
      if (result === false || result?.ok === false) throw new Error(result?.error || 'Storage unavailable');
    } catch (_) {
      $('#storage-warning').hidden = false;
      $('#storage-warning').textContent = 'Sauvegarde locale indisponible. Exportez votre progression depuis Pause.';
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
    $('#scene').setAttribute('aria-label', `${sceneModel.scene}, ${sceneModel.night?'nuit':'jour'}. Camille en vert, Noé en orange et Croissant.`);
  }
  function nav() {
    const count = Object.values(state.words).filter(w=>w.collected).length;
    if (!$('#btnWordbook')) $('#nav').innerHTML = [
      ['btnWordbook','wb-fab','wordbook','wordbook','Carnet'],['btnFeedbackBar','fb-fab','notes','note','Note'],
      ['btnMusic','mu-fab','music','music','Musique'],['btnPause','pause-fab','settings','pause','Pause']
    ].map(([id,cls,action,ico,label])=>button(icon(ico),action,cls,`id="${id}" aria-label="${label}" title="${label}"`)).join('');
    $('#btnWordbook').dataset.count=count;
    $('#btnWordbook').setAttribute('aria-label',`Carnet, ${count} mots`);
    $('#btnMusic').setAttribute('aria-pressed',String(state.settings.music>0));
    $('#btnMusic').innerHTML=icon(state.settings.music>0?'music':'mute');
    $('#btnPause').classList.toggle('audio-unavailable',audioUnavailable);
    $('#scene-actions').innerHTML = '';
  }
  function render() {
    const modal=overlayScreens.has(screen);
    panel=modal?$('#overlay-body'):storyPanel;
    if(!modal){
      cancelHold(); clearTimeout(sceneTimer); baseScreen=screen;
      $('#hotspots').innerHTML='';$('#scene-title').innerHTML='';$('#scene-caption').innerHTML='';
      game.className=`game ${screen==='entry'?'entry':''} ${sceneModel.night?'night':''}`;
      game.dataset.screen=screen;
      panel.className=`panel ${screen==='story'?'dialogue':screen}-panel`;
    }
    const screens = {entry:renderEntry,story:renderStory,garden:renderGarden,review:renderReview,reviewdone:renderReviewDone,catdone:renderCatDone,wordbook:renderWordbook,lookup:renderLookup,settings:renderSettings,import:renderImport,more:renderMore,grammar:renderGrammar,conjugation:renderConjugation,notes:renderNotes,writing:renderWriting,atelier:renderAtelier,end:renderEnd,reveal:renderReveal,evening:renderEvening};
    (screens[screen] || renderStory)();
    if(!modal){baseScreen=screen;game.dataset.screen=screen;}
    typesetFrench();
    if(modal&&!panel.querySelector('[data-action="back"],[data-action="close-lookup"],[data-action="close-conjugation"]'))panel.insertAdjacentHTML('afterbegin',back());
    nav(); A.configure(state.settings); document.documentElement.lang = 'fr';
    game.classList.toggle('overlay-open',modal);storyPanel.inert=modal;$('#hotspots').inert=modal;
    $('#overlay').hidden=!modal;
    $('#overlay').setAttribute('aria-label',({wordbook:'Carnet',lookup:'Dictionnaire',settings:'Pause',notes:'Note',grammar:'Grammaire'})[screen] || 'Outils');
    $('#overlay-body').setAttribute('aria-label',$('#overlay').getAttribute('aria-label'));
    game.style.setProperty('--text-scale',state.settings.largeText?'1.15':'1');
    $('#location .dev-badge')?.remove();
    if (dev) $('#location').insertAdjacentHTML('beforeend','<span class="dev-badge">ATELIER</span>');
  }
  // Like the legacy overlay, keep the actual scene and utility nodes, not a rerendered snapshot.
  function openOverlay(target) {
    if(screen===target)return;
    cancelHold();
    const frame={screen,focus:document.activeElement,scroll:panel.scrollTop,word:selectedWord,grammar:grammarPoint,hint:hintOpen};
    if(overlayScreens.has(screen)){frame.nodes=document.createDocumentFragment();while(panel.firstChild)frame.nodes.append(panel.firstChild);}
    overlays.push(frame);screen=target;render();
    panel.querySelector('button,input,textarea,[tabindex="0"]')?.focus({preventScroll:true});
  }
  function closeOverlay() {
    if(!overlayScreens.has(screen))return;
    const frame=overlays.pop();screen=frame?.screen || baseScreen;selectedWord=frame?.word || selectedWord;grammarPoint=frame?.grammar || null;hintOpen=frame?.hint || false;
    panel=overlayScreens.has(screen)?$('#overlay-body'):storyPanel;
    if(frame?.nodes){panel.replaceChildren(frame.nodes);panel.scrollTop=frame.scroll;}
    else $('#overlay-body').replaceChildren();
    const modal=overlayScreens.has(screen);$('#overlay').hidden=!modal;game.classList.toggle('overlay-open',modal);storyPanel.inert=modal;$('#hotspots').inert=modal;
    nav();frame?.focus?.isConnected&&frame.focus.focus({preventScroll:true});lastTick=performance.now();
  }
  function closeAllOverlays(){while(overlayScreens.has(screen))closeOverlay();}
  function typesetFrench() {
    for(const element of panel.querySelectorAll('[lang="fr"]')){
      if(element.matches('input,textarea'))continue;
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      while(walker.nextNode())if(!walker.currentNode.parentElement.closest('input,textarea'))walker.currentNode.nodeValue=L.typography(walker.currentNode.nodeValue);
    }
  }
  function setLocation(place, time='Lundi') { $('#location').innerHTML = `<span>411</span><span>${esc(place)}</span><span>${esc(time)}</span>`; }
  function renderEntry() {
    setScene({scene:'roof',night:false,reaction:'idle',water:0,focus:null}); setLocation('PARIS','18:42');
    $('#scene-title').innerHTML='<div class="entry-title">L’Appartement 411<br><strong>Le basilic.</strong></div>';
    panel.innerHTML = `${primary(state.story.day8Complete?'Retour au jardin':'Continuer · Jour 8','continue')}${button('Importer ma progression','import','text-button')}`;
    try { detected ||= S.detect(storage); } catch (_) {}
    if (detected?.available && !state.imports?.length && !state.story.importDismissed) {
      panel.querySelector('[data-action="import"]').textContent='Importer la progression de Jinyi';
    }
  }
  function storyTop(scene) {
    return names[scene.speaker]?`<div class="speaker ${esc(scene.speaker)}">${esc(names[scene.speaker])}</div>`:'';
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
    if(activeSceneId!==s.id){activeSceneId=s.id;sceneEpoch=performance.now();moduleController=null;moduleKey='';catGame=null;}
    setScene({scene:s.scene || 'kitchen',night:!!s.night || s.lighting==='evening' || ['lefevre','stairs','roof','facade'].includes(s.scene),direction:s.direction || 'down',action:s.action || (s.cat==='sleepBetweenPots'?'sleepBetweenPots':''),focus:null,focusZoom:0,water:0,reaction:'idle',walkProgress:0,garden:null,catGame:null,speaker:s.speaker});
    setLocation(s.scene==='roof'?'Le toit':s.scene==='stairs'?'L’escalier':s.scene==='lefevre'?'Chez Madame Lefèvre':s.scene==='doorway'?'La porte':'La cuisine',s.time || (sceneModel.night?'21:08':'07:30'));
    if (s.flags) { Object.assign(state.story,s.flags); save(); }
    if (s.wordIds) markMet(s.wordIds,s);
    if (s.kind === 'water') {
      if (s.mode==='first') return renderFirstWater(s);
      return nextScene();
    }
    if (s.kind === 'cat') {
      if(catGame?.active)return renderCat();
      panel.innerHTML = storyTop({...s,speaker:'noe'}) + `<div class="dialogue" lang="fr">${tokenize(s.text || 'Non, Croissant !')}</div><div class="line-tools">${button(icon('sound'),'replay','icon-button','aria-label="Réécouter"')}${button(icon('play'),'start-cat','primary','aria-label="Jouer avec Croissant"')}</div>`;
      setScene({cat:true,reaction:'anticipate',danger:0});return;
    }
    if (s.kind === 'voicemail') return renderVoicemail(s);
    if (s.kind === 'chat') return renderChat(s);
    if (s.kind === 'end') { screen='end'; return renderEnd(); }
    if (s.kind === 'choice' || s.kind === 'reply') return renderReply(s);
    const controller=sceneModule('M1',s);controller.current();
    let text = s.text;
    if (s.variants) { const variant = s.variants[state.story.d7_band] || s.variants.default || s.variants.null; text = typeof variant==='string'?variant:variant?.text || text; }
    if(s.kind==='focus')return renderFocus(s,controller);
    const interactive=s.kind==='point'||s.kind==='walk';
    panel.innerHTML = storyTop(s) + (!s.silent?`<div class="dialogue" lang="fr">${tokenize(text)}</div>`:'') +
      `<div class="line-tools">${!s.silent?button(icon('sound'),'replay','icon-button','aria-label="Réécouter"'):''}${grammarFor(s)?button(icon('bulb'),'grammar','icon-button','aria-label="Grammaire"'):''}${interactive?button(icon('arrow'),'point-next','primary','aria-label="Continuer"'):primary('Continuer')}</div>${status()}`;
    if (s.kind==='point' || s.kind==='walk') {
      const target = s.hotspot || (s.kind==='walk'?'door':'pot');
      hotspot(typeof target==='string'?target:target.id || 'pot','point-next');
      if (s.kind==='walk' && s.direction!=='up') hotspot('roofDoor','rattle',true);
    }
    if (s.id==='n_d10_cle') { hotspot('window','optional-window',true); hotspot('chair','optional-chair',true); }
    if (s.id==='d8_noe_plante' || s.id==='d8_noe_danger') {
      const delay = s.id==='d8_noe_danger'?1500:1000;
      const next = panel.querySelector('[data-action=next]');
      if (next) { next.disabled = true; sceneTimer = setTimeout(() => { next.disabled=false; },delay); }
    }
  }
  function sceneModule(id,item){
    const key=id+':'+item.id;
    if(moduleKey!==key){moduleKey=key;moduleController=window.Day8Modules.run(id,{items:[item],skin:{scene:item.scene},sceneHooks:{state}});}
    return moduleController;
  }
  function renderFocus(s,controller){
    const target=s.hotspot==='plant'?'pot':s.hotspot || (s.wordIds?.includes('basilic')?'basil':'pot');
    setScene({focus:target,focusZoom:lineRevealed?1:0});controller.pulse();
    if(!lineRevealed){panel.innerHTML=`<div class="focus-guess">${button('?', 'focus-reveal','primary','aria-label="Révéler le mot"')}</div>`;hotspot(target,'focus-reveal');return;}
    panel.classList.add('focus-card');
    const words=(s.wordIds || []).map(wordById).filter(Boolean);
    panel.innerHTML=words.map(w=>`<div class="focus-word gender ${esc(w.gender)}" lang="fr">${tokenize(w.fr)}</div><div class="line-tools">${button(icon('sound'),`focus-audio:${w.id}`,'icon-button','aria-label="Écouter le mot"')}${button(state.words[w.id]?.collected?`${icon('check')} Dans le carnet`:'Ajouter au carnet',`collect-id:${w.id}`,'secondary')}</div>`).join('')+primary('OK','focus-next');
  }
  function hotspot(target, action, quiet=false) {
    const aliases = {plant:'pot',basilic:'basil',pot_empty:'basil',emptyPot:'basil',catChair:'chair',lefevreDoor:'down',roofDoor:'up',rooftop:'door',lfd_chaises:'chair',lfd_fenetre:'window'};
    const key = aliases[target] || target;
    const positions = window.Day8Art.projectHotspots($('#scene'),{...sceneModel,v2:true}) || {};
    const fallback = {pot:[55,67],basil:[57,62],chair:[74,66],door:[68,40],roofDoor:[83,23],window:[28,40]};
    const p = positions[key] || fallback[key] || fallback.pot;
    let x = Array.isArray(p)?p[0]:p.x, y=Array.isArray(p)?p[1]:p.y;
    if (x<=1 && y<=1) { x*=100;y*=100; }
    x=Math.max(10,Math.min(90,x));y=Math.max(15,Math.min(82,y));
    if (!quiet) {
      const stage=$('#stage').getBoundingClientRect(), dialogue=panel.getBoundingClientRect();
      const px=stage.left+stage.width*x/100, py=stage.top+stage.height*y/100;
      // Keep the painted object reachable instead of placing its touch target over dialogue.
      if (px+22>dialogue.left && px-22<dialogue.right && py+22>dialogue.top && py-22<dialogue.bottom) panel.classList.add('panel-top-docked');
    }
    const label=({pot:'La plante',basil:'Le basilic',chair:'La chaise',down:'La porte',up:'La porte du toit',window:'La fenêtre',garden:'Le jardin',cat:'Croissant'})[key] || 'Continuer';
    $('#hotspots').insertAdjacentHTML('beforeend',button(`<span class="sr-only">${esc(label)}</span>`,action,`hotspot ${quiet?'quiet':''}`,`style="left:${x}%;top:${y}%" data-target="${esc(key)}" aria-label="${esc(label)}"`));
  }
  function nextScene() {
    if(overlayScreens.has(screen))return;
    moduleController?.advance?.();
    A.stop(); lineRevealed=false; glossVisible=false; hintOpen=false;replyAttempts=0;replyFeedback=null;chunks=[];transcript=false;catGame=null;
    state.story.day8Index = Math.min(Number(state.story.day8Index || 0)+1,C.scenes.length-1);
    const s = currentScene();
    if (s.id==='d10_lef_jardin') state.story.has_key=true;
    if (s.id==='n_d10_monte') state.story.rooftop=true;
    if (s.id==='n_d10_plante') state.story.basilPlanted=true;
    save();screen='story';render();
    if (s.sfx) A.sfx(s.sfx);
    if ((s.kind==='line' || !s.kind) && !s.silent) A.speak(s.text,s.id);
    if (['stairs','roof','lefevre','facade'].includes(s.scene)) A.ambience(true);
  }
  function renderGarden(inStory=false) {
    if(!state.story.rooftop&&!state.story.day8Complete){screen='story';return renderStory();}
    setScene({scene:'roof',night:true,water:0,focus:null,focusZoom:0,reaction:'idle',action:'',catGame:null,garden:gardenModel()});setLocation('Le jardin','21:30');
    const slots=sceneModel.garden.slots,bays=Math.max(1,Math.ceil(slots.length/24));
    panel.innerHTML=`<div class="garden-controls">${gardenBay>0?button(icon('back'),'garden-prev','icon-button','aria-label="Étagère précédente"'):''}${button(icon('water'),'start-garden','primary','aria-label="Arroser"')}${gardenBay<bays-1?button(icon('arrow'),'garden-next','icon-button','aria-label="Étagère suivante"'):''}${button(icon('book'),'selected-pot','icon-button','aria-label="Mots de cette plante"')}${!state.story.day8Complete?button('Continuer','story','secondary'):''}</div>`;
    const positions=window.Day8Art.projectHotspots($('#scene'),{...sceneModel,v2:true}) || {};
    slots.filter(p=>p.bay===gardenBay).forEach(p=>{
      const projected=positions['pot:'+p.id],fallback=[12+p.col*10.5,35+p.row*14];
      let x=projected?.x??projected?.[0]??fallback[0],y=projected?.y??projected?.[1]??fallback[1];
      if(x<=1&&y<=1){x*=100;y*=100;}
      $('#hotspots').insertAdjacentHTML('beforeend',button('',`select-pot:${p.id}`,`hotspot pot-hotspot ${String(currentPot)===String(p.id)?'selected':''}`,`style="left:${x}%;top:${y}%" data-pot="${p.id}" aria-label="${esc(p.name || 'Plante '+p.id)}" aria-pressed="${String(currentPot)===String(p.id)}"`));
    });
  }
  function gardenModel(){
    const ids=gardenFixture?Array.from({length:gardenFixture},(_,i)=>i+1):[...new Set([1,2,...allWords().filter(w=>state.words[w.id]?.met||state.words[w.id]?.collected).map(w=>Number(w.potId||w.pot||1))])].filter(Number.isFinite).sort((a,b)=>a-b);
    gardenBay=Math.max(0,Math.min(gardenBay,Math.ceil(ids.length/24)-1));
    return {bay:gardenBay,selectedPot:currentPot,zoom:'bay',slots:ids.map((id,i)=>({id,bay:Math.floor(i/24),row:Math.floor(i%24/8),col:[3,4,2,5,1,6,0,7][i%8],name:id===1?'Chez nous':id===2?'Le basilic':'Plante '+id,growth:gardenFixture?2+i%4:Math.max(id<=2?2:0,state.growth?.pots?.[id]?.shownStage||0),due:gardenFixture?i%3===0:allWords().some(w=>Number(w.potId||w.pot)===id&&Object.values(state.cards).some(c=>c.itemId===w.id&&!c.suspended&&(!c.due||new Date(c.due)<=now())))}))};
  }
  let gardenController=null;
  function gardenModule(session){
    return window.Day8Modules.run('M2',{items:allWords(),skin:{scene:'roof',lighting:'night'},sceneHooks:{state,session}});
  }
  function startReview(mode='garden',first=false) {
    if(mode==='cat'){startCat();return;}
    if(!state.story.rooftop&&!state.story.day8Complete)return;
    reviewReturn = screen==='story'?'story':'garden';
    if (!review || review.session?.mode!=='garden' || first) {
      gardenController=gardenModule();
      const opts=first?{firstWordId:currentScene().firstWordId || 'basilic',duePotId:1,budget:9,now:now()}:{now:now(),budget:8,onlyIds:allWords().filter(w=>Number(w.potId||w.pot)===Number(currentPot)).map(w=>w.id)};
      const session=gardenController.create(opts);
      review={session,returnTo:reviewReturn,first,feedback:null,danger:0,correct:0};
    }else gardenController=gardenModule(review.session);
    reviewReturn=review.returnTo; feedback=review.feedback || null; chunks=[];reviewStarted=performance.now();screen='review';save();render();
    playReviewPrompt();
  }
  function renderReview() {
    if (!review) {screen='garden';return renderGarden();}
    if(review.session.mode!=='garden'){review=null;feedback=null;screen='story';return renderStory();}
    gardenController ||= gardenModule(review.session);
    exercise = feedback ? review.lastExercise : gardenController.current();
    setScene({scene:'roof',night:true,cat:true,reaction:feedback?'happy':'idle',action:'',focus:null,focusZoom:0,catGame:null,garden:gardenModel()});
    setLocation('Le jardin','21:30');
    if (!exercise && !feedback) {screen='reviewdone';save();return renderReviewDone();}
    const ex=exercise;
    currentPot=Number(ex.potId || ex.word?.potId || ex.word?.pot || 1);
    const slot=sceneModel.garden.slots.find(p=>p.id===currentPot);if(slot)gardenBay=slot.bay;
    sceneModel.garden={...sceneModel.garden,bay:gardenBay,selectedPot:currentPot};sceneModel.targetPotId=currentPot;
    panel.innerHTML='';
    if (feedback) {
      panel.innerHTML = `<div class="feedback ${feedback.correct?'':'soft'}" role="status"><p lang="fr">${tokenize(feedback.sentence)}</p></div><div class="line-tools">${button(icon('sound'),'review-audio','icon-button','aria-label="Réécouter"')}${primary('Continuer','review-next')}</div>${status()}`;
      return;
    }
    const meaning=hint(ex.word?.zh || '',ex.word?.en || '');
    if (ex.type==='R1') {
      panel.innerHTML += listenButton('review-audio')+`${(!A.canSpeak() && !ex.word?.recorded || A.isMuted())?`<p class="audio-fallback" lang="fr">${tokenize(ex.sentence)}</p>`:''}${status()}`;
    } else if (ex.type==='R2' || ex.type==='P1') {
      panel.innerHTML += `<div class="question" lang="fr">${tokenize(ex.prompt || ex.word?.cloze || '')}</div>`;
    } else if (ex.type==='R3') {
      panel.innerHTML += `${listenButton('review-audio')}<div class="ordered" lang="fr" aria-label="Votre phrase">${chunks.map((index,i)=>button(esc(ex.chunks[index]),`unchunk:${i}`,'chunk')).join('')}</div><div class="chunks" lang="fr">${ex.chunks.map((chunk,i)=>button(esc(chunk),`chunk:${i}`,`chunk ${chunks.includes(i)?'selected':''}`,chunks.includes(i)?'disabled':'')).join('')}</div>`;
    } else {
      const usable=(ex.word?.recorded || A.canSpeak()) && !A.isMuted();
      panel.innerHTML += listenButton('review-audio')+`${usable?'':`<div class="question audio-fallback" lang="fr">${tokenize(ex.word?.cloze || ex.prompt || '')}</div>`}${status()}`;
    }
    if (ex.type==='R1' || ex.type==='R2') {
      panel.innerHTML += `<div class="answer-grid" lang="fr">${(ex.options || []).map(option=>button(`<span>${esc(ex.type==='R1'?(option.fr || wordById(option.id)?.fr || ''):option.text)}</span>`,`answer:${option.id}`,'answer')).join('')}</div>`;
    } else if (ex.type!=='R3') {
      panel.innerHTML += `<form id="review-form" class="input-row"><input id="review-input" aria-label="Réponse en français" lang="fr" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${esc(ex.firstLetter || '')}…"><button type="submit" class="primary" aria-label="Vérifier">${icon('arrow')}</button></form>`;
    }
    panel.innerHTML+=button('?','exercise-hint','icon-button','aria-label="Indice"')+(hintOpen?`<p class="exercise-hint" data-hint>${esc(meaning)}</p>`:'');
  }
  function listenButton(action) { return button(icon('sound'),action,'listen-button','aria-label="Écouter" title="Écouter"'); }
  function playReviewPrompt() { if (!feedback && exercise && ['R1','R3','P2'].includes(exercise.type)) A.speak(exercise.sentence,exercise.audioId,exercise.word?.clipPath); }
  document.addEventListener('day8-audio-unavailable',()=>{
    audioUnavailable=true;nav();
    if(screen!=='review'||feedback||!exercise||!['R1','P2'].includes(exercise.type)||panel.querySelector('.audio-fallback'))return;
    const text=exercise.type==='R1'?exercise.sentence:exercise.word.cloze || exercise.sentence.replace(exercise.answer,'___');
    const anchor=panel.querySelector('.audio-status');if(anchor)anchor.insertAdjacentHTML('afterend',`<p class="hint audio-fallback" lang="fr">${esc(C.french(text))}</p>`);
  });
  function answerReview(input) {
    if (feedback || !exercise || !String(Array.isArray(input)?input.join(''):input).trim()) return;
    review.lastExercise=exercise;
    feedback=gardenController.answer(input,{now:now(),elapsed:(performance.now()-reviewStarted)/1000});
    if (feedback.error) {notice(feedback.error);return;}
    review.feedback=feedback;
    if (feedback.correct) review.correct++;
    sceneModel.water=1;sceneModel.targetPotId=exercise.potId || exercise.word?.pot || 1;A.sfx('water');
    save();render();
    A.speak(feedback.sentence,feedback.audioId);
  }
  function reviewNext() {
    feedback=null;review.feedback=null;chunks=[];hintOpen=false;sceneModel.water=0;reviewStarted=performance.now();save();render();playReviewPrompt();
  }
  function renderReviewDone() {
    panel.innerHTML = button(icon('arrow'),'finish-review','primary','aria-label="Continuer"');
    setScene({water:0,reaction:'happy'});
  }
  function renderCatDone() {
    setScene({scene:'kitchen',night:false,reaction:'lift',action:'lift',danger:0,water:0,focus:null,garden:null,catGame:catGame});
    panel.innerHTML=button(icon('arrow'),'finish-cat','primary','aria-label="Continuer"');
  }
  function startCat(){
    review=null;feedback=null;exercise=null;gardenController=null;
    catGame={active:true,elapsed:0,approachElapsed:performance.now()-sceneEpoch,duration:16000,reach:0,blocked:0,phase:'approach',phaseElapsed:0,bops:0,targetReach:.85};
    sceneEpoch=performance.now();lastTick=sceneEpoch;screen='story';render();A.sfx('meow');
  }
  function renderCat(){
    panel.className='panel cat-panel';panel.innerHTML='';
    setScene({scene:'kitchen',night:false,cat:true,catGame,garden:null,focus:null,focusZoom:0,water:0,reaction:'anticipate'});
    hotspot('cat','cat-bop');$('#hotspots [data-action="cat-bop"]').classList.add('cat-target');
  }
  function bopCat(){
    if(!catGame?.active)return;
    catGame.targetReach=Math.max(0,catGame.reach-.48);catGame.phase='retreat';catGame.phaseElapsed=0;catGame.blocked=1;catGame.bops++;
    A.sfx(catGame.bops%3===0?'purr':'click');sceneModel.reaction=['offended','lick','lookAway'][catGame.bops%3];
  }
  function finishCat(){
    if(!catGame?.active)return;
    const pose=window.Day8Art.motion?.(artModel(performance.now()))?.cat;
    catGame={...catGame,active:false,elapsed:16000,phase:'lift',phaseElapsed:0,liftFrom:pose};
    screen='catdone';sceneEpoch=performance.now();render();A.sfx('purr');
  }
  function finishReview() {
    const next=review?.returnTo==='story';gardenController?.finish();gardenController=null;review=null;feedback=null;save();
    if(next)nextScene();else{screen='garden';render();}
  }
  function renderFirstWater(s) {
    currentPot=2;game.classList.add('hold','first-water');setScene({scene:'roof',night:true,reaction:'idle',water:0,garden:gardenModel(),targetPotId:2});
    panel.innerHTML=button(icon('water'),'hold-water','primary hold-button','aria-label="Maintenir pour arroser" title="Maintenir pour arroser"');
  }
  function beginHold(el) {
    if(holdActive)return;holdActive=true;holdStart=performance.now();game.classList.add('holding');A.sfx('water');A.speak('Il faut de l’eau.','d8_noe_eau');
    const tick=t=>{if(!holdActive)return;const progress=Math.min(1,(t-holdStart)/3000);el.style.setProperty('--hold',progress);sceneModel.water=progress;if(progress>=1){holdActive=false;state.story.basilPlanted=true;state.story.rooftop=true;markMet([currentScene().firstWordId || 'basilic'],currentScene());startReview('garden',true);}else holdFrame=requestAnimationFrame(tick);};
    holdFrame=requestAnimationFrame(tick);
  }
  function cancelHold(){holdActive=false;cancelAnimationFrame(holdFrame);game.classList.remove('holding');document.querySelector('.hold-button')?.style.setProperty('--hold',0);}
  function renderVoicemail(s) {
    const v=C.voicemail || s;const lines=v.lines || [];const full=lines.map(l=>typeof l==='string'?l:l.text).join(' ');
    sceneModule('M3',v).current();setLocation('Noé','12:30');setScene({scene:'kitchen',night:false});
    panel.innerHTML=storyTop(s)+`<div class="line-tools">${listenButton('voicemail-audio')}${button('?','transcript','icon-button','aria-label="Afficher le message"')}</div>${transcript?`<div class="voice-transcript exercise-hint" data-hint lang="fr">${tokenize(full)}</div>`:''}<div class="question" lang="fr">À ______, en bas.</div>${replyFeedback?`<div class="letter-feedback">${letterFeedback(replyFeedback.correct?'six heures':replyFeedback.input,'six heures')}</div>${replyFeedback.correct?`<p class="canonical-answer" lang="fr">${tokenize(replyFeedback.canonical)}</p>${primary('Continuer')}`:''}`:''}${!replyFeedback?.correct?`<form id="voicemail-form" class="input-row"><input id="voice-input" lang="fr" placeholder="s… h…" aria-label="Réponse en français" autocomplete="off" spellcheck="false"><button type="submit" class="primary" aria-label="Vérifier">${icon('arrow')}</button></form>`:''}${status()}`;
  }
  function letterFeedback(input,target) { const normalized=E.normalize?E.normalize(input):input.toLowerCase();return [...target].map((c,i)=>`<span class="${normalized[i]===c?'':'missing'}">${esc(c===' '?'\u00a0':c)}</span>`).join(''); }
  function chatData(s) { return s.prompt ? s : (C.chats || []).find(c=>c.id===s.chatId || c.id===s.id) || s; }
  function renderChat(s) {
    const chat=chatData(s);const prompt=chat.prompt || chat.text;setLocation('COLOC 411',s.time || '14:32');
    sceneModule('M4',chat).current();
    const accepted=chat.accepted || chat.answers || [];const target=typeof accepted[0]==='string'?accepted[0]:accepted[0]?.text || '';
    const choices=chat.chunks || target.split(' ');
    panel.innerHTML=`<div class="chat-header">Coloc 411</div>`+storyTop(s)+`<div class="chat-thread"><div class="bubble" lang="fr">${tokenize(prompt)}</div>${replyFeedback?`<div class="bubble mine ${replyFeedback.correct?'canonical-answer':''}" lang="fr">${tokenize(C.french(replyFeedback.correct?replyFeedback.canonical:replyFeedback.input))}</div><div class="bubble" lang="fr">${tokenize(replyFeedback.feedback?.text || replyFeedback.feedback || (replyFeedback.correct?chat.success?.text || 'D’accord !':'Hein ?'))}</div>`:''}</div>${replyFeedback?.correct?primary('Continuer'):`<div class="ordered">${chunks.map((i,n)=>button(esc(choices[i]),`reply-unchunk:${n}`,'chunk')).join('')}</div><div class="chunks">${choices.map((c,i)=>button(esc(c),`reply-chunk:${i}`,`chunk ${chunks.includes(i)?'selected':''}`,chunks.includes(i)?'disabled':'')).join('')}</div><form id="reply-form" class="input-row"><input id="reply-input" aria-label="Réponse en français" placeholder="Répondre…" lang="fr" autocomplete="off"><button type="submit" class="primary" aria-label="Envoyer">${icon('arrow')}</button></form>${button('?','exercise-hint','icon-button','aria-label="Indice"')}${hintOpen?`<p class="exercise-hint" data-hint>${esc(hint(chat.zh,chat.en))}</p>`:''}`}`;
  }
  function renderReply(s) {
    sceneModule('M4',s).current();
    if(replyFeedback?.correct||replyFeedback?.continue){panel.innerHTML=storyTop({...s,speaker:'player'})+`<div class="feedback"><p class="${replyFeedback.correct?'canonical-answer':''}" lang="fr">${tokenize(replyFeedback.correct?replyFeedback.canonical:replyFeedback.input)}</p></div>${replyFeedback.after?`<div class="speaker lefevre">Madame Lefèvre</div><div class="dialogue" lang="fr">${tokenize(replyFeedback.after.text)}</div>`:''}${primary('Continuer')}`;return;}
    panel.innerHTML=storyTop({...s,speaker:'lefevre'})+`<div class="dialogue" lang="fr">${tokenize(s.text || s.prompt || '')}</div><div class="answer-grid">${(s.options || []).map((o,i)=>button(esc(typeof o==='string'?o:o.text),`reply-option:${i}`,'answer')).join('')}</div>${s.kind==='reply'?`<form id="reply-form" class="input-row"><input id="reply-input" aria-label="Réponse en français" placeholder="Répondre…" lang="fr"><button type="submit" class="primary" aria-label="Vérifier">${icon('arrow')}</button></form>`:''}${replyFeedback&&!replyFeedback.correct?`<div class="feedback soft" lang="fr">${tokenize(replyFeedback.feedback?.text || replyFeedback.feedback || 'Hein ?')}</div>`:''}${button('?','exercise-hint','icon-button','aria-label="Indice"')}${hintOpen?`<p class="exercise-hint" data-hint>${esc(hint(s.zh,s.en))}</p>`:''}`;
  }
  function normalize(s) {return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’']/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
  function submitReply(input) {
    if(!String(input).trim()||replyFeedback?.correct||replyFeedback?.continue)return;
    const s=currentScene(),d=s.kind==='chat'?chatData(s):s;
    const result=sceneModule(s.kind==='voicemail'?'M3':'M4',d).grade(input);
    replyFeedback={...result,input};replyAttempts=result.attempts;A.sfx(result.correct?'notif':'paper');
    if(result.correct||result.continue){state.story.replies ||= {};state.story.replies[s.id]=result.correct?result.canonical:input;save();if(result.correct)A.speak(result.canonical);}
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
    return exact || {id:lemma,fr:lemma,zh:data?.[0] || '',en:data?.[1] || '',definition:data?.[2] || '',pos:data?.[5]?.includes('v')?'verb':data?.[5]?.includes('n')?'noun':'other',recognitionOnly:!data || data[3]<10,rare:!data || data[3]<10,sentence:currentScene().text || raw,scene:currentScene().id,pot:state.story.rooftop?2:1,potId:state.story.rooftop?2:1,seen:true,wordClip:`w_${lemma}`,infinitive:conj?.infinitive,raw};
  }
  function lookup(raw) {
    raw=String(raw).trim();if(!raw)return;
    const previous=selectedWord;selectedWord={...findWord(raw),raw};
    if(screen==='lookup')render();else{openOverlay('lookup');overlays[overlays.length-1].word=previous;}
    A.sfx('paper');
  }
  function renderLookup() {
    const w=selectedWord;if(!w){screen='wordbook';return renderWordbook();}
    const collected=state.words[w.id]?.collected;
    const glossary=window.A411?.GLOSSARY_DATA || {};const data=(glossary.entries || glossary.E || {})[w.id];
    panel.innerHTML=`${header('Dictionnaire',back('close-lookup'))}<div class="lookup-title"><h2 class="gender ${esc(w.gender)}" lang="fr">${esc(C.french(w.fr))}</h2>${button(icon('sound'),'word-audio','icon-button','aria-label="Prononciation"')}</div><div class="lookup-form" lang="fr">${w.raw?`${esc(C.french(w.raw))} → ${esc(C.french(w.lemma || w.fr))} · `:''}<span class="gender ${esc(w.gender)}">${w.gender==='m'?'masculin':w.gender==='f'?'féminin':esc(({verb:'verbe',noun:'nom',adj:'adjectif',chunk:'expression'})[w.pos] || '')}</span> ${esc(w.morphology || (w.number==='p'?'pluriel':''))}</div><div class="lookup-gloss"><p lang="fr">${tokenize(w.definition || w.para || data?.[2] || 'Définition non disponible hors ligne.')}</p><p lang="zh-Hans">${esc(w.zh || '')}</p><p lang="en">${esc(w.en || '')}</p></div><p class="sentence" lang="fr">${tokenize(w.sentence || currentScene().text)}</p>${status()}${window.A411?.Conj?.lemmaOf(w.fr) || w.infinitive?button('Voir la conjugaison','conjugation','text-button'):''}<div class="lookup-actions">${button(`${collected?icon('check'):icon('book')}${collected?'Dans le carnet':'Ajouter au carnet'}`,'collect',collected?'secondary':'primary',collected?'aria-pressed="true"':'')}</div>`;
  }
  function collect() {
    const w=selectedWord;if(!w)return;
    state.words[w.id] ||= {}; Object.assign(state.words[w.id],{met:true,collected:true});state.words[w.id].at ||= now().toISOString();
    state.words[w.id].scenes ||= [];if(!state.words[w.id].scenes.includes(currentScene().id))state.words[w.id].scenes.push(currentScene().id);
    if(!C.words.some(x=>x.id===w.id)){state.customWords ||= {};state.customWords[w.id]={...w,legacyIds:[],answer:w.fr,chunks:(w.sentence || w.fr).split(' ')};}
    A.sfx('paper');save();render();
  }
  function renderWordbook() {
    const pots=[...new Set([1,2,...allWords().filter(w=>state.words[w.id]?.met||state.words[w.id]?.collected).map(w=>Number(w.potId||w.pot||1))])];
    panel.innerHTML=header('Carnet',back())+`<div class="line-tools">${button(icon('bulb'),'grammar','icon-button','aria-label="Grammaire"')}<label>Plante <select id="word-pot" aria-label="Plante">${pots.map(n=>`<option value="${n}" ${n===currentPot?'selected':''}>${n===1?'Chez nous':n===2?'Le basilic':'Plante '+n}</option>`).join('')}</select></label></div><input class="search-input" id="word-search" placeholder="Chercher un mot…" aria-label="Chercher dans le carnet" value="${esc(search)}"><div class="word-list wb-list" id="word-list">${wordRows()}</div>`;
  }
  function wordRows() {
    const words=allWords().filter(w=>(w.pot || w.potId)===currentPot && (w.seen || state.words[w.id]?.met || state.words[w.id]?.collected) && normalize(`${w.fr} ${w.zh} ${w.en}`).includes(normalize(search))).map(w=>({...w,fr:C.french(w.fr)}));
    if(!words.length)return '<p>Aucun mot ici.</p>';
    return words.map(w=>{const cards=Object.values(state.cards).filter(c=>c.wordId===w.id || c.itemId===w.id);const stability=cards[0]?.stability || 0;return `<div class="word-row"><div class="word-row-head"><button data-action="expand:${esc(w.id)}" aria-expanded="${expandedWord===w.id}"><span class="gender ${esc(w.gender)}">${w.gender==='m'?'m.':w.gender==='f'?'f.':''}</span> ${esc(w.fr)}</button><span class="mastery">${stability>=14?'Familier':stability>=3?'En cours':'Rencontré'}</span></div>${expandedWord===w.id?`<div class="word-detail"><p class="word-gloss">${esc(hint(w.zh,w.en))}</p><div class="sentence" lang="fr">${tokenize(w.sentence)}</div><div class="line-tools">${button(icon('sound'),`word-sentence:${esc(w.id)}`,'icon-button','aria-label="Écouter la phrase"')}${button(state.words[w.id]?.collected?`${icon('check')} Dans le carnet`:'Ajouter au carnet',`collect-id:${esc(w.id)}`,'text-button')}</div>${(state.words[w.id]?.scenes || []).map(id=>{const scene=C.scenes.find(s=>s.id===id);return scene?button(`${esc(scene.text)} ${icon('sound')}`,`source:${esc(id)}`,'text-button'):'';}).join('')}</div>`:''}</div>`;}).join('');
  }
  let grammarPoint=null, conjugationTense='present';
  function renderGrammar() {
    const points=window.A411?.GRAMMAR_DATA || [];grammarPoint ||= grammarFor(currentScene()) || points.find(p=>p.id==='partitif') || points[0];
    const g=grammarPoint;
    if(!g){panel.innerHTML=back()+'<p>Aucun point enregistré.</p>';return;}
    panel.innerHTML=header('Grammaire',back())+`<h3 lang="fr">${tokenize(g.pattern)}</h3>${button('?','exercise-hint','icon-button','aria-label="Explication"')}${hintOpen?`<p class="exercise-hint" data-hint>${esc(hint(g.zh,g.en))}</p>`:''}${(g.ex || []).map(ex=>`<div class="word-row"><p lang="fr">${tokenize(ex[0])}</p>${hintOpen?`<p class="exercise-hint" data-hint>${esc(ex[state.settings.uiLang==='en'?2:1])}</p>`:''}</div>`).join('')}${button(state.grammar?.includes(g.id)?`${icon('check')} Gardé`:'Garder','keep-grammar','primary')}<h3>Mes points de grammaire</h3><div class="atlas-links">${(state.grammar || []).map(id=>{const p=points.find(x=>x.id===id);return p?button(esc(p.pattern),`grammar:${id}`,'soft-button'):'';}).join('')}</div>`;
  }
  function keepGrammar() {
    const g=grammarPoint;state.grammar ||= [];if(!state.grammar.includes(g.id))state.grammar.push(g.id);
    const id=`grammar:${g.id}`;state.customWords ||= {};state.customWords[id]={id,fr:g.pattern,zh:g.zh,en:g.en,pos:'grammar',pot:currentPot,potId:currentPot,sentence:g.ex[0][0],answer:g.ex[0][0],chunks:g.ex[0][0].split(' '),recognitionOnly:true,seen:true,field:'grammar'};
    state.words[id]={met:true,collected:true,at:now().toISOString()};save();render();
  }
  function renderConjugation() {
    const inf=selectedWord?.infinitive || window.A411.Conj.lemmaOf(selectedWord?.fr)?.infinitive || selectedWord?.fr;
    const conjugated=window.A411.Conj.conjugate(inf);
    panel.innerHTML=header('Conjugaison',back('close-conjugation'))+`<h2>${esc(inf)}</h2>`;
    if(!conjugated){panel.innerHTML+='<p>Ce verbe n’est pas disponible hors ligne.</p>';return;}
    panel.innerHTML+=(conjugated.tenses || []).map(tense=>`<h3 style="margin-top:24px">${esc(tense.fr)}</h3><table class="conjugation">${tense.rows.map(r=>`<tr><th>${esc(r.person)}</th><td>${esc(r.form)}</td></tr>`).join('')}</table>`).join('');
    panel.innerHTML+=Object.entries(conjugated.participles || {}).filter(([,v])=>v).map(([key,value])=>`<p class="hint">${esc(key)} · ${esc(value.text)}</p>`).join('');
  }
  function renderSettings() {
    panel.innerHTML=header('Pause',back())+`<div class="settings-group"><div class="setting-line"><span>Langue des indices</span><div class="segmented">${button('Chinois','lang:zh',state.settings.uiLang==='zh'?'selected':'secondary')}${button('Anglais','lang:en',state.settings.uiLang==='en'?'selected':'secondary')}</div></div><div class="setting-line"><span>Son</span>${button(state.settings.muted?'Activer':'Couper','mute','secondary')}</div>${[['music','Musique'],['voice','Voix'],['sfx','Effets']].map(([key,label])=>`<label>${label}<input type="range" min="0" max="1" step=".05" value="${state.settings[key]}" data-volume="${key}" aria-label="${label}"></label>`).join('')}${audioUnavailable?`<p>${icon('mute')} La voix n’est pas disponible. Le texte reste accessible.</p>`:''}${button('Aa','text-size','secondary',`aria-label="Taille du texte" aria-pressed="${!!state.settings.largeText}"`)}</div><div class="settings-group">${button(`${icon('download')}Exporter ma progression`,'export','secondary')}${button('Importer une progression','import','secondary')}${state.story.rooftop||state.story.day8Complete?button(`${icon('pot')}Jardin`,'garden','secondary'):''}</div>${button('Écouter','evening','secondary')}${button('Écrire','writing','secondary')}${button('Grammaire','grammar','secondary')}${button('Note','notes','secondary')}${dev?button('Atelier','atelier','secondary'):''}`;
  }
  function renderImport() {
    try{detected=S.detect(storage);}catch(_){detected=null;}
    panel.innerHTML=header('Importer une progression',back())+`${detected?.available?`<div class="import-info">Jinyi · ${detected.counts?.words || 0} mots · ${detected.counts?.cards || 0} cartes${button('Importer la progression de Jinyi','import-local','primary')}</div>`:'<p>Aucune ancienne progression de Jinyi détectée. Choisissez un fichier ou collez son contenu.</p>'}<label class="file-label">${icon('download')} Fichier JSON<input id="import-file" type="file" accept="application/json,.json" multiple></label><textarea class="textarea" id="import-text" aria-label="Progression JSON" placeholder="Coller le contenu JSON…"></textarea><label class="check-line"><input id="allow-legacy" type="checkbox">Cette ancienne sauvegarde sans nom m’appartient.</label>${button('Importer','import-paste','primary')}${importMessage?`<div class="${importReport?'success-message':'error-message'}" role="status">${esc(importMessage)}</div>`:''}${importReport?`<details class="notes-list"><summary>Rapport d’importation</summary><pre>${esc(JSON.stringify(importReport,null,2))}</pre></details>`:''}<p class="protected-note">Les sauvegardes de Yuechao sont protégées et refusées. L’original n’est jamais modifié.</p><p>Sur iOS, Safari et l’application peuvent avoir des espaces séparés. Exportez depuis l’environnement d’origine. <a href="export.html">Exportateur en lecture seule</a></p>`;
  }
  function importData(raw,allowLegacy=false) {
    const catalog=Object.keys(window.A411.GLOSSARY_DATA.E).map(lemma=>C.lookup(lemma)).filter(Boolean);
    const result=S.importData(raw,state,allWords(),{allowLegacy,now:now(),catalog});
    if(result.ok){state=sanitizeState(result.state);review=state.appSession;gardenController=null;feedback=review?.feedback || null;importReport=result.report;importMessage='Progression importée. L’original est inchangé.';save();}
    else{importReport=null;importMessage=/yuechao/i.test(result.error || '')?'La sauvegarde de Yuechao est protégée.':'Importation impossible. Vérifiez le fichier et son profil.';}
    render();
  }
  function download(name,data,type='application/json') {const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderMore() {
    renderSettings();
  }
  function renderWriting() {
    panel.innerHTML=header('Écrire',back())+`<p>La vérification hors ligne propose des modèles de phrases, pas une correction de texte libre.</p><textarea id="writing-text" class="textarea" lang="fr" aria-label="Mon texte" placeholder="Aujourd’hui…">${esc(state.writing || '')}</textarea>${button('Vérifier','check-writing','primary')}<div id="writing-feedback" class="notes-list"></div>${button(`${icon('download')}Exporter le texte`,'export-writing','secondary')}`;
  }
  function renderNotes() {
    panel.innerHTML=header('Note',back())+`<p>Vos notes restent sur cet appareil. Exportez-les pour les partager. Rien n’est envoyé automatiquement.</p><textarea id="note-text" class="textarea" aria-label="Votre note" placeholder="Votre remarque…"></textarea><label class="file-label">Ajouter des images (4 maximum)<input type="file" accept="image/*" multiple id="note-files"></label><div class="feedback-images">${noteImages.map(src=>`<img src="${esc(src)}" alt="Image jointe">`).join('')}</div>${button('Joindre la scène','attach-scene','secondary')}${button('Enregistrer la note','save-note','primary')}<p class="notes-list">${(state.notes || []).length} notes sur cet appareil.</p>${button('Exporter les notes','export-notes','secondary')}`;
  }
  function renderEvening() {
    const choices=C.scenes.filter(s=>s.kind==='line' && s.text && s.id!=='d8_cam_depuis');
    const s=choices[state.story.eveningIndex || 0] || choices[0];
    panel.innerHTML=header('Écouter',back())+`${listenButton('evening-audio')}${button('?','evening-text','icon-button','aria-label="Afficher le texte"')}<div id="evening-line" class="voice-transcript" hidden>${tokenize(s.text)}</div><form id="evening-form"><textarea class="textarea" id="evening-input" lang="fr" aria-label="Dictée"></textarea>${button('Vérifier','check-evening','primary')}</form><div id="evening-result"></div>${button('Autre phrase','evening-next','text-button')}${status()}`;
  }
  function eveningScene(){return C.scenes.filter(s=>s.kind==='line' && s.text && s.id!=='d8_cam_depuis')[state.story.eveningIndex || 0];}
  function renderEnd() {
    state.story.day8Complete=true;state.story.rooftop=true;state.story.basilPlanted=true;save();
    setScene({scene:'facade',night:true,reaction:'idle',water:0});setLocation('CHEZ NOUS','22:03');
    const hook=C.scenes.find(s=>s.kind==='end');
    sceneModule('M1',hook).current();
    panel.innerHTML=`<div class="dialogue" lang="fr">${tokenize(hook?.text || '')}</div><div class="line-tools">${button(icon('sound'),'replay','icon-button','aria-label="Réécouter"')}${button(icon('pot'),'garden','primary','aria-label="Jardin"')}</div>`;
  }
  function settle() {try{const result=E.settleGrowth(state,allWords(),{now:now()});if(result?.state)state=result.state;growthReveal=result?.reveal;sceneModel.growth=[1,2].map(id=>state.growth?.pots?.[id]?.shownStage || 0);save();}catch(error){console.warn('Growth settlement unavailable:',error.message);}}
  function renderReveal() {game.classList.add('reveal');setScene({scene:'roof',night:true,garden:gardenModel(),growth:[1,2].map(id=>state.growth?.pots?.[id]?.shownStage || 0),action:'leafLifts'});panel.innerHTML=button(icon('arrow'),'after-reveal','primary','aria-label="Continuer"');}
  function renderAtelier() {
    panel.innerHTML=header('Atelier',back())+`<p>Aperçu isolé, sans écriture dans les sauvegardes.</p>${button('+1 jour','debug-day','secondary')}<div class="atlas-links">${[2,24,60].map(n=>button(`${n} plantes`,`debug-garden:${n}`,'secondary')).join('')}${['R1','R2','R3','P1','P2'].map(type=>button(type,`debug-type:${type}`,'soft-button')).join('')}</div><div class="atlas-links">${C.scenes.map((s,i)=>button(`${i+1} ${s.id}`,`jump:${i}`,'soft-button')).join('')}</div>`;
  }
  function go(target) {if(overlayScreens.has(target)){openOverlay(target);return;}closeAllOverlays();screen=target;render();}
  function handle(action,el) {
    A.unlock();if(!['hold-water','mute','cat-bop'].includes(action))A.sfx('click');
    if(action==='next'){nextScene();return;}
    if(action==='continue') {settle();if(review){gardenController=gardenModule(review.session);screen='review';}else screen=growthReveal&&state.story.rooftop?'reveal':state.story.day8Complete?'garden':'story';render();return;}
    if(action==='after-reveal'){growthReveal=null;screen=state.story.day8Complete?'garden':'story';render();return;}
    if(['back','close-lookup','close-conjugation'].includes(action)){closeOverlay();return;}
    if(action==='mute'){state.settings.muted=!state.settings.muted;A.configure(state.settings);save();if(overlayScreens.has(screen))render();else nav();return;}
    if(action==='music'){if(state.settings.music>0){state.settings.musicVolume=state.settings.music;state.settings.music=0;}else state.settings.music=state.settings.musicVolume || .24;A.configure(state.settings);save();nav();return;}
    if(action==='text-size'){state.settings.largeText=!state.settings.largeText;save();render();return;}
    if(action==='language'||action.startsWith('lang:')){state.settings.uiLang=action==='language'?(state.settings.uiLang==='zh'?'en':'zh'):action.split(':')[1];save();render();return;}
    if(action==='replay'){A.speak(currentScene().text,currentScene().id);return;}
    if(action==='exercise-hint'){hintOpen=!hintOpen;render();return;}
    if(action==='reveal-line'){lineRevealed=true;render();A.speak(currentScene().text,currentScene().id);return;}
    if(action==='point-next'){if(walkMotion)return;A.sfx(currentScene().kind==='walk'?'steps':'paper');if(currentScene().kind==='walk'){game.classList.add('walking');walkMotion={elapsed:0};}else nextScene();return;}
    if(action==='rattle'){A.sfx('door');return;}
    if(action==='focus-reveal'||action==='focus-word'){lineRevealed=true;sceneModule('M1',currentScene()).reveal();render();const w=wordById(currentScene().wordIds?.[0]);if(w)A.speak(w.fr,w.wordClip);return;}
    if(action==='focus-next'){nextScene();return;}
    if(action.startsWith('focus-audio:')){const w=wordById(action.slice(12));if(w)A.speak(w.fr,w.wordClip);return;}
    if(action.startsWith('optional-')){const text=action==='optional-window'?'À la fenêtre, une plante. Elle a soif.':'À côté de la table, une chaise vide.';notice(text);A.speak(text,action==='optional-window'?'lfd_fenetre':'lfd_chaises');return;}
    if(action==='start-garden'){startReview();return;}
    if(action==='start-cat'){startCat();return;}
    if(action==='cat-bop'){bopCat();return;}
    if(action==='finish-cat'){catGame=null;nextScene();return;}
    if(action==='garden-next'||action==='garden-prev'){gardenBay+=action==='garden-next'?1:-1;render();return;}
    if(action.startsWith('select-pot:')){currentPot=Number(action.slice(11));A.sfx('paper');render();return;}
    if(action==='selected-pot'){search='';openOverlay('wordbook');return;}
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
    if(action.startsWith('reply-option:')){const s=currentScene(),o=s.options[Number(action.split(':')[1])];state.story[s.id]=o.id || String(Number(action.split(':')[1]));state.story.choices ||= {};state.story.choices[s.id]=o.id || o.text;submitReply(o.text);return;}
    if(action==='collect'){collect();return;}
    if(action==='word-audio'){A.speak(selectedWord.fr,selectedWord.wordClip || `w_${selectedWord.id}`);return;}
    if(action==='pot-one'||action==='pot-two'){currentPot=action==='pot-one'?1:2;search='';if(screen==='wordbook')render();else openOverlay('wordbook');return;}
    if(action.startsWith('expand:')){expandedWord=expandedWord===action.slice(7)?null:action.slice(7);render();return;}
    if(action.startsWith('collect-id:')){selectedWord=wordById(action.slice(11));collect();return;}
    if(action.startsWith('word-sentence:')){const w=wordById(action.slice(14));A.speak(w.sentence,w.audioId || w.clip);return;}
    if(action.startsWith('source:')){const s=C.scenes.find(s=>s.id===action.slice(7));A.speak(s.text,s.id);return;}
    if(action.startsWith('grammar:')){grammarPoint=(window.A411.GRAMMAR_DATA || []).find(g=>g.id===action.slice(8));hintOpen=false;if(screen==='grammar')render();else openOverlay('grammar');return;}
    if(action==='keep-grammar'){keepGrammar();return;}
    if(action==='export'){download('appartement-411-day8.json',S.exportData(state));notice('Fichier de progression préparé.');return;}
    if(action==='import-paste'){const input=$('#import-text').value;const allow=$('#allow-legacy').checked;importData(input,allow);return;}
    if(action==='import-local'){importData(detected.bundle);return;}
    if(action==='check-writing'){state.writing=$('#writing-text').value;save();$('#writing-feedback').innerHTML=`Texte enregistré. Modèle de phrase hors ligne :<br>${esc((window.A411.GRAMMAR_DATA || []).find(g=>g.id==='partitif')?.pattern || '')}`;return;}
    if(action==='export-writing'){state.writing=$('#writing-text').value;save();download('mon-texte-day8.txt',state.writing,'text/plain');return;}
    if(action==='attach-scene'){if(noteImages.length<4)noteImages.push($('#scene').toDataURL('image/png'));const text=$('#note-text').value;render();$('#note-text').value=text;return;}
    if(action==='save-note'){const text=$('#note-text').value;if(!text.trim()&&!noteImages.length)return;state.notes ||= [];state.notes.push({id:Date.now(),at:now().toISOString(),scene:currentScene().id,text,images:noteImages});noteImages=[];save();render();notice('Note enregistrée sur cet appareil.');return;}
    if(action==='export-notes'){download('day8-playtest-notes.json',{kind:'a411-day8-feedback',notes:state.notes || []});return;}
    if(action==='evening-audio'){const s=eveningScene();A.speak(s.text,s.id);return;}
    if(action==='evening-text'){$('#evening-line').hidden=!$('#evening-line').hidden;return;}
    if(action==='check-evening'){const target=eveningScene().text;$('#evening-result').innerHTML=`<div class="letter-feedback">${letterFeedback($('#evening-input').value,normalize(target))}</div><p class="hint">${esc(target)}</p>`;A.speak(target,eveningScene().id);return;}
    if(action==='evening-next'){state.story.eveningIndex=((state.story.eveningIndex || 0)+1)%C.scenes.filter(s=>s.kind==='line'&&s.text&&s.id!=='d8_cam_depuis').length;save();render();return;}
    if(action.startsWith('jump:')&&dev){debug.jump(Number(action.slice(5)));return;}
    if(action.startsWith('debug-type:')&&dev){debug.review(action.slice(11));return;}
    if(action.startsWith('debug-garden:')&&dev){debug.garden(Number(action.slice(13)));return;}
    if(action==='debug-day'&&dev){closeAllOverlays();simulatedNow=new Date(now().setDate(now().getDate()+1));settle();screen=growthReveal&&state.story.rooftop?'reveal':state.story.rooftop?'garden':'story';render();return;}
    if(['story','garden','wordbook','more','settings','import','grammar','conjugation','writing','notes','evening','atelier'].includes(action)){if(action==='atelier'&&!dev)return;if(action==='grammar'){grammarPoint=grammarFor(currentScene());hintOpen=false;}go(action);}
  }
  let press=null,pressTimer=0,suppressClickUntil=0;
  function selectedText(){
    const selection=window.getSelection();if(!selection||selection.isCollapsed)return '';
    const node=selection.anchorNode?.parentElement;
    return node?.closest('.dialogue,.sentence,.lookup-gloss,.word-detail,.voice-transcript,.bubble,.question,.focus-word')?selection.toString().trim():'';
  }
  function wordAtPoint(x,y){
    const range=document.caretRangeFromPoint?.(x,y);
    const caret=range?{offsetNode:range.startContainer,offset:range.startOffset}:document.caretPositionFromPoint?.(x,y);
    if(!caret||caret.offsetNode.nodeType!==Node.TEXT_NODE)return '';
    const element=caret.offsetNode.parentElement;
    if(!element.closest('[lang="fr"]')||element.closest('[data-action],input,textarea'))return '';
    const text=caret.offsetNode.textContent,regex=/[\p{L}]+(?:[’'-][\p{L}]+)*/gu;
    for(const match of text.matchAll(regex))if(caret.offset>=match.index&&caret.offset<=match.index+match[0].length)return match[0];
    return '';
  }
  document.addEventListener('click',event=>{
    if(performance.now()<suppressClickUntil){event.preventDefault();return;}
    const selected=selectedText();if(selected){event.preventDefault();window.getSelection().removeAllRanges();lookup(selected);return;}
    const word=event.target.closest('[data-word]');if(word){lookup(word.dataset.word);return;}
    const el=event.target.closest('[data-action]');if(el&&!el.disabled){handle(el.dataset.action,el);return;}
    if(event.target===$('#overlay')){closeOverlay();return;}
    if(event.target.closest('.dialogue,.sentence,.lookup-gloss,.voice-transcript,.bubble,.question')){const raw=wordAtPoint(event.clientX,event.clientY);if(raw){lookup(raw);return;}}
    if(screen==='story'&&!catGame&&!walkMotion&&['line','end'].includes(currentScene().kind)&&event.target.closest('#scene,#panel'))storyPanel.querySelector('[data-action="next"]:not(:disabled)')?.click();
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();
    if(event.target.id==='review-form')answerReview($('#review-input').value);
    if(event.target.id==='reply-form')submitReply($('#reply-input').value);
    if(event.target.id==='voicemail-form'){const input=$('#voice-input').value;if(!input.trim())return;replyFeedback=sceneModule('M3',C.voicemail || currentScene()).grade(input);render();A.speak(replyFeedback.sentence,replyFeedback.audioId);}
  });
  document.addEventListener('input',event=>{
    if(event.target.dataset.volume){state.settings[event.target.dataset.volume]=Number(event.target.value);A.configure(state.settings);save();nav();}
    if(event.target.id==='word-search'){search=event.target.value;$('#word-list').innerHTML=wordRows();}
    if(event.target.id==='writing-text'){state.writing=event.target.value;save();}
  });
  document.addEventListener('change',async event=>{
    if(event.target.id==='word-pot'){currentPot=Number(event.target.value);search='';render();return;}
    if(event.target.id==='import-file'){
      const files=Array.from(event.target.files);if(files.some(f=>f.size>8*1024*1024)){importMessage='Choisissez un fichier de moins de 8 Mo.';render();return;}
      try{const values=await Promise.all(files.map(async f=>JSON.parse(await f.text())));importData(values.length===1?values[0]:values,$('#allow-legacy')?.checked);}catch(_){importMessage='Ce fichier JSON n’est pas valide.';importReport=null;render();}
    }
    if(event.target.id==='note-files'){
      const text=$('#note-text').value;
      for(const file of Array.from(event.target.files).slice(0,4-noteImages.length)){if(file.size>1024*1024){notice('Chaque image doit faire moins de 1 Mo.');continue;}if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))continue;const data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>resolve(null);reader.readAsDataURL(file);});if(data)noteImages.push(data);}
      if(screen==='notes'){render();$('#note-text').value=text;}
    }
  });
  document.addEventListener('pointerdown',event=>{
    const el=event.target.closest('[data-action=hold-water]');if(el){event.preventDefault();A.unlock();el.setPointerCapture(event.pointerId);beginHold(el);return;}
    const cat=event.target.closest('[data-action="cat-bop"]');
    if(cat&&catGame?.active){event.preventDefault();A.unlock();cat.setPointerCapture(event.pointerId);press={cat:true,x:event.clientX,y:event.clientY,last:performance.now()};bopCat();suppressClickUntil=performance.now()+600;return;}
    if(event.target.closest('[data-action],input,textarea,select'))return;
    const raw=event.target.closest('[data-word]')?.dataset.word || wordAtPoint(event.clientX,event.clientY);
    if(raw){press={x:event.clientX,y:event.clientY,raw};pressTimer=setTimeout(()=>{if(!press)return;suppressClickUntil=performance.now()+700;window.getSelection()?.removeAllRanges();lookup(press.raw);press=null;},550);}
  });
  document.addEventListener('pointermove',event=>{
    if(!press)return;
    if(press.cat){if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>14&&performance.now()-press.last>180){bopCat();press={...press,x:event.clientX,y:event.clientY,last:performance.now()};}return;}
    if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>12){clearTimeout(pressTimer);press=null;}
  });
  function releasePointer(event){
    cancelHold();clearTimeout(pressTimer);
    if(press?.cat)suppressClickUntil=performance.now()+600;
    press=null;
    if(event.type==='pointercancel')return;
    const raw=selectedText();if(raw){suppressClickUntil=performance.now()+600;window.getSelection().removeAllRanges();lookup(raw);}
  }
  document.addEventListener('pointerup',releasePointer);document.addEventListener('pointercancel',releasePointer);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();if(overlayScreens.has(screen))closeOverlay();else openOverlay('settings');return;}
    if(event.key==='Tab'&&overlayScreens.has(screen)){
      const controls=[...panel.querySelectorAll('button,input,textarea,select,a[href],[tabindex="0"]'),...$('#nav').querySelectorAll('button')].filter(el=>!el.disabled&&el.getClientRects().length);
      const i=controls.indexOf(document.activeElement);if(event.shiftKey&&(i<=0)){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&(i===controls.length-1||i<0)){event.preventDefault();controls[0]?.focus();}return;
    }
    if(event.target.matches('input,textarea,select'))return;
    if(/^[1-4]$/.test(event.key)){const choices=panel.querySelectorAll('.answer:not(:disabled)');choices[Number(event.key)-1]?.click();return;}
    if((event.key===' '||event.key==='Enter')&&!event.repeat){
      const hold=panel.querySelector('[data-action=hold-water]');if(hold&&(!event.target.closest('button')||event.target===hold)){event.preventDefault();A.unlock();beginHold(hold);return;}
      if(event.target.tagName==='BUTTON')return;
      const target=panel.querySelector('.primary:not(:disabled)') || $('#hotspots .hotspot:not(.quiet)');if(target){event.preventDefault();target.click();}
    }
  });
  document.addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter')cancelHold();});
  window.addEventListener('pagehide',save);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let lastFrame=0;
  function artModel(t){
    const age=snapshotTime===null?t-sceneEpoch:snapshotTime;
    const visualCat=catGame || (baseScreen==='story'&&currentScene().kind==='cat'?{active:true,elapsed:age,approachElapsed:age,duration:16000,reach:0,blocked:0,phase:'approach'}:null);
    return {...sceneModel,v2:true,reducedMotion:reduced.matches,catGame:visualCat,time:snapshotTime===null?(reduced.matches?0:t):snapshotTime,elapsed:reduced.matches&&!catGame?5000:age,basilPlanted:baseScreen==='entry'?undefined:!!(state.story.basilPlanted || state.story.basil_planted),rooftopUnlocked:baseScreen==='entry'?undefined:!!state.story.rooftop};
  }
  function animate(t){
    const dt=lastTick?Math.min(100,t-lastTick):0;lastTick=t;
    const paused=overlayScreens.has(screen)||document.hidden||snapshotTime!==null;
    if(!paused&&catGame){
      catGame.phaseElapsed+=dt;
      if(catGame.active){
        catGame.elapsed+=dt;
        catGame.approachElapsed+=dt;
        if(catGame.phase==='retreat'&&catGame.phaseElapsed>600){catGame.phase='approach';catGame.phaseElapsed=0;catGame.targetReach=.95;}
        if(catGame.phase==='approach'&&catGame.elapsed>1500)catGame.targetReach=Math.min(1,catGame.targetReach+dt/12000);
        catGame.reach+=(catGame.targetReach-catGame.reach)*Math.min(1,dt/(catGame.phase==='retreat'?180:950));
        catGame.blocked=Math.max(0,catGame.blocked-dt/700);
        if(catGame.reach>.82&&catGame.phase!=='retreat')catGame.phase='push';
        if(catGame.elapsed>=catGame.duration)finishCat();
      }
      sceneModel.catGame=catGame;
    }
    if(!paused&&walkMotion){walkMotion.elapsed+=dt;sceneModel.walkProgress=Math.min(1,walkMotion.elapsed/700);if(sceneModel.walkProgress>=1){walkMotion=null;nextScene();}}
    if(t-lastFrame>(reduced.matches?200:40)){
      lastFrame=t;window.Day8Art.draw($('#scene'),artModel(t));
      if(catGame?.active&&!overlayScreens.has(screen)){
        const target=$('#hotspots .cat-target'),p=window.Day8Art.projectHotspots($('#scene'),artModel(t)).cat;
        if(target&&p){let x=p.x??p[0],y=p.y??p[1];if(x<=1&&y<=1){x*=100;y*=100;}target.style.left=`${Math.max(8,Math.min(92,x))}%`;target.style.top=`${Math.max(10,Math.min(78,y))}%`;}
      }
      if(sceneModel.water>0&&!holdActive&&!paused)sceneModel.water=Math.max(0,sceneModel.water-.025);
    }
    requestAnimationFrame(animate);
  }
  const debug={
    getState:()=>state,getScreen:()=>screen,getExercise:()=>exercise,getSession:()=>review,
    getSceneModel:()=>artModel(performance.now()),getCat:()=>catGame?{...catGame}:null,
    jump(id){closeAllOverlays();review=null;gardenController=null;feedback=null;replyFeedback=null;chunks=[];lineRevealed=false;hintOpen=false;catGame=null;walkMotion=null;snapshotTime=null;activeSceneId='';state.story.day8Index=typeof id==='number'?Math.max(0,Math.min(C.scenes.length-1,id)):Math.max(0,C.scenes.findIndex(s=>s.id===id));screen='story';render();},
    show(name){go(name);},
    review(type='R1',mode='garden'){
      closeAllOverlays();if(mode==='cat'){debug.jump(C.scenes.findIndex(s=>s.kind==='cat'));startCat();return;}
      state.story.rooftop=true;state.story.basilPlanted=true;
      const words=allWords();const word=words.find(w=>w.seen && !w.recognitionOnly && w.sentence?.split(' ').length>3) || words.find(w=>w.seen);
      for(const card of Object.values(state.cards))if(card.itemId===word.id)card.due='2000-01-01T00:00:00.000Z';
      gardenController=gardenModule();
      review={session:gardenController.create({now:now(),onlyIds:[word.id],forceType:type,budget:3}),returnTo:'garden',first:false,feedback:null,danger:0,correct:0};
      feedback=null;chunks=[];reviewStarted=performance.now();screen='review';render();
    },
    answer(input){answerReview(input);},next:()=>feedback?reviewNext():nextScene(),
    reset(){closeAllOverlays();state=sanitizeState(S.fresh(C.words,{now:now()}));state.settings={uiLang:'en',music:0,voice:0,sfx:0,muted:true};review=null;gardenController=null;feedback=null;catGame=null;walkMotion=null;gardenFixture=null;gardenBay=0;activeSceneId='';moduleKey='';snapshotTime=null;screen='entry';render();},
    lookup:raw=>lookup(raw),setLanguage(lang){state.settings.uiLang=lang;render();},
    setState(next){state=sanitizeState(next);review=state.appSession || null;gardenController=null;feedback=review?.feedback || null;render();},
    garden(count=2,bay=0){closeAllOverlays();gardenFixture=Math.max(2,Math.min(60,Math.floor(count)));gardenBay=Math.max(0,Math.floor(bay));state.story.rooftop=true;state.story.basilPlanted=true;catGame=null;screen='garden';render();},
    catFinish:finishCat,frame(elapsed){snapshotTime=Number.isFinite(elapsed)?elapsed:null;window.Day8Art.draw($('#scene'),artModel(performance.now()));},
    import:importData,allWords,render
  };
  window.Day8App={ready:true,...(dev?{debug}:{})};
  render();requestAnimationFrame(animate);
  if(loaded?.ok===false){$('#storage-warning').hidden=false;$('#storage-warning').textContent='Lecture de la progression locale impossible. Utilisez l’importation ou l’exportation dans Pause.';}
  if('serviceWorker' in navigator && location.protocol!=='file:' && !dev)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
})();
