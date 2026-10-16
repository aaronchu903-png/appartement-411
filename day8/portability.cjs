/* Optional browser checks. Uses synthetic fixtures only; never a personal save. */
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg'};
const server=http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');}
  catch(_){response.writeHead(404).end();return;}
  response.writeHead(200,{'content-type':mime[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).on('error',()=>response.end()).pipe(response);
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME || '/usr/bin/google-chrome'});
  try{
    const context=await browser.newContext({acceptDownloads:true,viewport:{width:390,height:844}});
    await context.addInitScript(()=>{
      const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
      const fixture={schema:'a411-learn-1',profileId:'jinyi',cards:{'plante|listening':{itemId:'plante',modality:'listening',stability:19,difficulty:4,due:'2026-01-01T00:00:00.000Z',lastReview:'2025-12-01T00:00:00.000Z',reps:8,lapses:1}},carnet:{v:1,words:[{id:'plante',at:'2025-11-01T00:00:00.000Z'}]}};
      if(!get.call(localStorage,'a411.p.jinyi.learn')){
        set.call(localStorage,'a411.p.jinyi.learn',JSON.stringify(fixture));
        set.call(localStorage,'a411.p.jinyi.story',JSON.stringify({playerName:'Synthetic Jinyi',d7_band:'B',day7Completed:true}));
        set.call(localStorage,'a411.p.jinyi.uiLang','en');
        set.call(localStorage,'a411.p.yuechao.learn','PROTECTED SYNTHETIC FIXTURE');
      }
      window.__reads=[];window.__writes=[];
      window.__peek=key=>get.call(localStorage,key);
      Storage.prototype.getItem=function(key){window.__reads.push(key);if(String(key).includes('yuechao'))throw new Error('Protected read attempted');return get.call(this,key);};
      Storage.prototype.setItem=function(key,value){window.__writes.push(key);if(!String(key).startsWith('a411app.'))throw new Error('Old-key write attempted');return set.call(this,key,value);};
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/app/export.html');
    await page.waitForFunction(()=>document.querySelector('#export-json').value.length>0);
    const exported=JSON.parse(await page.locator('#export-json').inputValue());
    assert.equal(exported.profileId,'jinyi');assert.equal(exported.data['a411.p.jinyi.learn'].cards['plante|listening'].stability,19);
    const download=page.waitForEvent('download');await page.locator('#download-export').click();
    assert.equal((await download).suggestedFilename(),'a411-jinyi-export.json');
    assert.deepEqual(await page.evaluate(()=>window.__writes),[]);
    assert.equal(await page.evaluate(()=>window.__reads.some(key=>key.includes('yuechao'))),false);
    console.log('PASS: one-tap read-only Jinyi export, zero old-key writes and zero protected reads');

    await page.goto(base+'/app/index.html');await page.waitForFunction(()=>window.Day8App?.ready);
    await page.locator('#btnPause').click();
    await page.locator('#overlay-body [data-action="import"]').click();await page.locator('#overlay-body [data-action="import-local"]').click();
    const stored=await page.evaluate(()=>JSON.parse(window.__peek('a411app.v1.state')));
    assert.equal(stored.cards['plante|listening'].stability,19);assert.equal(stored.words.plante.collected,true);assert.equal(stored.story.d7_band,'B');
    assert.equal(await page.evaluate(()=>window.__peek('a411.p.yuechao.learn')),'PROTECTED SYNTHETIC FIXTURE');
    assert.equal(await page.evaluate(()=>JSON.parse(window.__peek('a411.p.jinyi.learn')).cards['plante|listening'].stability),19);
    assert.equal(await page.evaluate(()=>window.__reads.some(key=>key.includes('yuechao'))),false);
    assert.equal(await page.evaluate(()=>window.__writes.every(key=>key.startsWith('a411app.'))),true);
    console.log('PASS: actual same-origin import preserves source records and writes only the new namespace');

    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller && window.Day8App?.ready);
    await context.setOffline(true);
    await page.reload();await page.waitForFunction(()=>window.Day8App?.ready);
    await page.locator('[data-action="continue"]').click();
    assert.ok(await page.locator('#panel').textContent());assert.deepEqual(errors,[]);
    console.log('PASS: installed app shell and inherited data survive a fully offline reload');
    await context.close();
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
