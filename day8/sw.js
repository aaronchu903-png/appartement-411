/* Scope is app/ only. Never replaces or removes the old game's service worker. */
'use strict';
const SCOPE=new URL('./',self.location.href);
// The unchanged old worker deletes a411-* caches. Keep this namespace distinct,
// and separate project-path installs that happen to share the same origin.
const PREFIX='day8-static-'+encodeURIComponent(SCOPE.pathname)+'-';
const CACHE=PREFIX+'v14-bonne-nuit';
const CORE=['./','index.html','tokens.css','style.css','icons.js','modules/index.js','modules/M1.js','modules/M2.js','modules/M3.js','modules/M4.js','app.js','art.js','audio.js','engine.js','save.js','content.js','language.js','data/inherited.js','manifest.webmanifest','export.html','export.js'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE.map(path=>new Request(new URL(path,self.location.href),{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const obsolete=(await caches.keys()).filter(key=>(key.startsWith(PREFIX)||key.startsWith('a411-day8-static-'))&&key!==CACHE);
    await Promise.all(obsolete.map(key=>caches.delete(key)));
    await self.clients.claim();
    if(!obsolete.length)return;
    // Legacy pages have no controllerchange listener; load the newly installed shell once.
    const windows=await self.clients.matchAll({type:'window'});
    windows.forEach(client=>{
      const url=new URL(client.url);
      if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
      // Navigation fetches wait for activation, so awaiting them here would deadlock.
      try{client.navigate(client.url).catch(()=>{});}catch(_){/* A closed tab must not fail activation. */}
    });
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const url=new URL(event.request.url);
  if(!url.pathname.startsWith(SCOPE.pathname))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    // Strip only the preview query when looking up the static shell offline.
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    try{const response=await fetch(event.request);if(response.ok&&!event.request.headers.has('range'))cache.put(event.request,response.clone());return response;}
    catch(_){return new Response('',{status:503,statusText:'Offline; written support remains available'});}
  }));
});
