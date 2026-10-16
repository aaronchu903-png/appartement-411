/* Scope is app/ only. Never replaces or removes the old game's service worker. */
'use strict';
const CACHE='a411-day8-static-v3-pixel';
const CORE=['./','index.html','tokens.css','style.css','icons.js','modules/index.js','modules/M1.js','modules/M2.js','modules/M3.js','modules/M4.js','app.js','art.js','audio.js','engine.js','save.js','content.js','language.js','data/inherited.js','../js/conjugate.js','manifest.webmanifest','export.html','export.js'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('a411-day8-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const url=new URL(event.request.url);
  if(!/\/(?:app|audio)\//.test(url.pathname)&&!url.pathname.endsWith('/js/conjugate.js'))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    // Strip only the preview query when looking up the static shell offline.
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    try{const response=await fetch(event.request);if(response.ok&&!event.request.headers.has('range'))cache.put(event.request,response.clone());return response;}
    catch(_){return new Response('',{status:503,statusText:'Offline; written support remains available'});}
  }));
});
