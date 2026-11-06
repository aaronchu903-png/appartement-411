'use strict';
// NODE_PATH=/tmp/kilo/node_modules node app/tools/v4-screenshots.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {start, views} = require('./round3-screenshots.cjs');
require('../data/inherited.js');
const C = require('../content.js'), S = require('../save.js'), E = require('../engine.js');
const output = path.resolve(__dirname,'../screenshots');
const action = (page,name) => page.locator(`[data-action="${name}"]:visible`).last();
const click = (page,name) => action(page,name).tap();
const debug = (page,method,...args) => page.evaluate(({method,args})=>Day8App.debug[method](...args),{method,args});
const screen = page => page.locator('#app').getAttribute('data-screen');
const saved = page => page.evaluate(key=>JSON.parse(localStorage.getItem(key)),S.KEY);
function fixture(type) {
  const state = S.fresh(C.words), index=C.scenes.findIndex(s=>s.kind==='water');
  state.story={day8Version:C.version,day8Index:index,day8SceneId:C.scenes[index].id,has_key:true,rooftop:true,basilPlanted:true};
  state.settings={uiLang:'en',music:0,voice:0,sfx:0,muted:true};
  state.words={};state.cards={};
  for(const id of ['porte','fenetre','table','plante','basilic','chaise']){
    state.words[id]={met:true,introduced:true,collected:true};
    state.cards[id+'|listening']={itemId:id,modality:'listening',stability:2,difficulty:5,reps:5,lapses:0,due:'2000-01-01T00:00:00.000Z',lastReview:'2000-01-01T00:00:00.000Z'};
  }
  if(type)state.appSession={version:4,session:E.createSession(state,C.words,{mode:'test',dueOnly:true,forceType:type,storyDay:8}),returnTo:'story',originSceneId:C.scenes[index].id,potId:null,feedback:null,correct:0};
  if(state.appSession)state.appSession.session.mode='garden';
  return state;
}
async function open(env,viewport,dev=false,state=fixture()){
  const context=await env.browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1,serviceWorkers:'block'});
  await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:S.KEY,state});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(env.base+'/app/'+(dev?'?dev=1':''));await page.waitForFunction(()=>Day8App?.ready);
  return {page,async close(){await context.close();assert.deepEqual(errors,[]);}};
}
async function geometry(page){
  const result=await page.evaluate(()=>{
    const app=document.querySelector('#app'),r=app.getBoundingClientRect(),panel=document.querySelector('#panel');
    const visible=el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&!el.closest('[inert]');
    const controls=[...app.querySelectorAll('button:not(.word)')].filter(visible);
    const bad=controls.filter(el=>!el.closest('.sheet')).filter(el=>{const b=el.getBoundingClientRect();return b.width<43.9||b.height<43.9||b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1;}).map(el=>el.dataset.action);
    return {bad,overflow:document.documentElement.scrollWidth>innerWidth,frame:r.toJSON(),vw:innerWidth,vh:innerHeight,panelOverflow:panel.scrollHeight>panel.clientHeight+2,panelHeight:panel.clientHeight,scrollHeight:panel.scrollHeight,panelTop:panel.getBoundingClientRect().top,content:panel.innerText};
  });
  assert.deepEqual(result.bad,[],'Touch controls fit the portrait frame');assert.equal(result.overflow,false);
  assert(result.frame.width<=390.1&&result.frame.height<=844.1);
  assert(Math.abs(result.frame.x*2+result.frame.width-result.vw)<2);
  assert(Math.abs(result.frame.y*2+result.frame.height-result.vh)<2);
  if(await screen(page)==='review')assert(!result.panelOverflow,'Question and answers fit without internal clipping: '+JSON.stringify(result));
}
async function exercise(page){return page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));return Day8Engine.current(s.appSession.session,s,[...Day8Content.words,...Object.values(s.customWords||{})]);},S.KEY);}
async function answer(page,correct=true){
  const ex=await exercise(page);
  if(ex.type==='E3'){
    for(const [i,p] of ex.pairs.entries()){await click(page,'pair-word:'+p.id);await click(page,'pair-picture:'+(correct?p.id:ex.pairs[(i+1)%ex.pairs.length].id));}
  }else if(ex.type==='R3'){
    const order=[];let target=ex.sentence;
    while(order.length<ex.chunks.length){const i=ex.chunks.findIndex((c,i)=>!order.includes(i)&&target.startsWith(c));assert(i>=0,'Sentence chunks reconstruct');order.push(i);target=target.slice(ex.chunks[i].length).trimStart();}
    if(!correct)order.reverse();
    for(const i of order)await click(page,'chunk:'+i);
  }else if(ex.options){const option=ex.options.find(o=>correct?o.id===ex.wordId:o.id!==ex.wordId);assert(option);await click(page,'answer:'+option.id);}
  else {await page.locator('#review-input').fill(correct?ex.answer:'incorrect');await page.locator('#review-input').press('Enter');}
  assert.equal((await saved(page)).appSession.feedback.correct,correct);
  const layout=await page.locator('#panel').evaluate(el=>{
    const strip=document.querySelector('#review-progress').getBoundingClientRect(),panel=el.getBoundingClientRect();
    return {gap:panel.top-strip.bottom,height:panel.height,phone:document.querySelector('#app').clientHeight};
  });
  assert(layout.gap>=0&&layout.gap<20,'Review card starts just below the strip, not at the foot of an empty screen');
  assert(layout.height/layout.phone>.45,'Review uses a large card');
  assert.equal(await page.locator('.feedback-sentence').count(),1,'Show the corrected sentence once');
  const colours=await page.locator('.feedback-sentence').evaluate(el=>({background:getComputedStyle(el).backgroundColor,text:[el,...el.querySelectorAll('.word')].map(node=>getComputedStyle(node).color)}));
  assert(colours.text.every(colour=>colour==='rgb(36, 80, 59)'),'Correct text stays dark green, including gender-coloured words');
  const luminance=colour=>colour.match(/\d+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const light=luminance(colours.background),dark=luminance(colours.text[0]);
  assert((Math.max(light,dark)+.05)/(Math.min(light,dark)+.05)>=4.5,'Correct sentence meets WCAG AA normal-text contrast');
  const text=await page.locator('.feedback').innerText();
  assert.equal(E.normalize(text).split(E.normalize(ex.sentence)).length-1,1,'No duplicate plain correction under the highlighted sentence');
  await geometry(page);return ex;
}
async function garden(page){await click(page,'settings');await click(page,'garden');if(await action(page,'after-reveal').count())await click(page,'after-reveal');assert.equal(await screen(page),'garden');}
async function run(env,view,shot=async()=>{}){
  const viewport=views[view];
  const production=await open(env,viewport,false,fixture('R1')),p=production.page;
  try{
    await garden(p);await geometry(p);await shot(p,'rooftop');
    assert.equal(await p.locator('#panel').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.doesNotMatch(await p.locator('#scene-actions').innerText(),/Continuer/);
    assert.equal(await p.locator('#panel [data-action="start-garden"]').count(),0,'Only the painted can starts mixed review');
    const exit=action(p,'leave-garden');assert.equal(await exit.innerText(),'Plus tard');
    assert(await exit.evaluate(el=>el.getBoundingClientRect().width<100&&getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'),'Exit is a small text control');
    const drops=await p.locator('.pot-hotspot').evaluateAll(els=>els.map(el=>({pot:Number(el.dataset.pot),count:Number(el.dataset.drops),icons:el.querySelectorAll('[data-pixel-icon="drop"]').length})));
    assert.deepEqual(drops.map(x=>x.count),[4,2]);assert(drops.every(x=>x.count===x.icons));
    assert.equal(await p.locator('.pot-hint').getAttribute('data-pot'),'1','The pot with the most drops is the hint');
    await shot(p,'pot-drops');
    await click(p,'select-pot:2');assert.equal(await screen(p),'review');
    let state=await saved(p);assert(state.appSession.session.queue.every(q=>C.words.find(w=>w.id===q.wordId).potId===2));
    await click(p,'review-exit');assert.equal(await screen(p),'garden');
    await p.locator('[data-target="can"]').tap();state=await saved(p);assert.equal(state.appSession.session.initial,6);
    await geometry(p);await shot(p,'review-question');
    await answer(p,false);await shot(p,'review-wrong');
    assert(await p.locator('.correct-answer').isVisible());
    const answered=await saved(p);await click(p,'review-exit');
    assert.deepEqual((await saved(p)).cards,answered.cards,'Exit never changes a grade');
    assert.equal(await p.locator('.pot-hotspot').evaluateAll(els=>els.reduce((n,el)=>n+Number(el.dataset.drops),0)),6,'Wrong answer retains its drop');
    await p.reload();await p.waitForFunction(()=>Day8App?.ready);await garden(p);await click(p,'start-garden');
    const correct=await answer(p);await shot(p,'review-correct');
    assert.notDeepEqual((await saved(p)).cards[correct.cardKey],fixture().cards[correct.cardKey],'Answer saved before automatic next');
    assert.equal(await action(p,'review-next').count(),0);
    for(let i=0;i<25&&await screen(p)==='review';i++){
      const current=await saved(p);
      if(current.appSession?.feedback?.correct)await p.waitForFunction(key=>!JSON.parse(localStorage.getItem(key)).appSession?.feedback,S.KEY,{timeout:5000});
      if(await screen(p)!=='review')break;
      await answer(p);
    }
    assert.equal(await screen(p),'story','Completion resumes the story automatically');
    assert.equal((await saved(p)).story.day8SceneId,'n_d10_arrose');
    await shot(p,'story-resumed');
    await garden(p);assert.equal(await p.locator('.pot-hotspot.thirsty').count(),0);await shot(p,'rooftop-watered');
  }finally{await production.close();}
  const art=await open(env,viewport,true),page=art.page;
  try{
    await debug(page,'jump','d10_lef_jardin');await debug(page,'frame',1400);await shot(page,'key-handover');
    await debug(page,'jump','d8_cam_depuis');await shot(page,'dialogue-help');
    await click(page,'story-translation');await shot(page,'dialogue-translation');
    await click(page,'grammar');await click(page,'keep-grammar');await shot(page,'grammar-saved');await page.keyboard.press('Escape');
    await debug(page,'jump','n_d8_matin');await click(page,'wordbook');await shot(page,'overlay-carnet');
    for(const name of ['settings','notes','import','writing','grammar','evening']){
      await page.keyboard.press('Escape');await debug(page,'show',name);
      const dims=await page.locator('#overlay-body').evaluate(el=>({height:el.clientHeight,frame:document.querySelector('#app').clientHeight,scroll:getComputedStyle(el).overflowY}));
      assert(dims.height/dims.frame>.7,name+' uses the large carnet');assert.equal(dims.scroll,'auto');
    }
    await page.keyboard.press('Escape');await debug(page,'lookup','basilic');await shot(page,'overlay-lookup');
    await page.keyboard.press('Escape');await debug(page,'lookup','être');await debug(page,'show','conjugation');
    assert(await page.locator('#overlay-body').evaluate(el=>el.scrollHeight>el.clientHeight),'Long carnet scrolls vertically');
    await page.locator('#overlay-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    assert(await page.locator('#overlay-body').evaluate(el=>el.scrollTop>0));
    await click(page,'back');await page.keyboard.press('Escape');
    await debug(page,'jump','d8_cat');await click(page,'start-cat');
    const before=await debug(page,'getState');await click(page,'cat-bop');
    await page.waitForFunction(()=>Day8App.debug.getScreen()==='catdone',null,{timeout:2500});
    assert.deepEqual((await debug(page,'getState')).cards,before.cards);await shot(page,'cat-carried');
    await debug(page,'reset');await shot(page,'facade-day');
  }finally{await art.close();}
}
async function main(){
  const selectedViews=process.env.V4_VIEW?[process.env.V4_VIEW]:Object.keys(views);
  assert(selectedViews.every(view=>views[view]),'V4_VIEW must name a supported mobile viewport');
  const shots=process.env.V4_SHOTS?.split(',');
  const prefix=process.env.V4_PREFIX||'v4';
  const env=await start(process.env.V4_BROWSER||'chromium'),report={browser:env.browserName,screenshots:[],passed:[],hashes:{}};
  await fs.mkdir(output,{recursive:true});
  const files=['app.js','style.css','art.js','content.js','engine.js','save.js','sw.js'];
  for(const f of files)report.hashes[f]=createHash('sha256').update(await fs.readFile(path.resolve(__dirname,'..',f))).digest('hex');
  try{
    for(const view of selectedViews){
      await run(env,view,async(page,name)=>{if(shots&&!shots.includes(name))return;await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await geometry(page);const file=`${prefix}-${view}-${name}.png`;await page.screenshot({path:path.join(output,file)});report.screenshots.push({file,viewport:views[view]});});
      report.passed.push(view);console.log('PASS',view);
    }
    for(const f of files)assert.equal(createHash('sha256').update(await fs.readFile(path.resolve(__dirname,'..',f))).digest('hex'),report.hashes[f],'Sources stable during capture: '+f);
  }finally{await env.close();await fs.writeFile(path.join(output,`${prefix}-report.json`),JSON.stringify(report,null,2)+'\n');}
}
module.exports={run,geometry,fixture,open,answer,garden};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
