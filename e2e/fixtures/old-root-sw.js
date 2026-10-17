/* Synthetic predecessor worker for release verification only. */
'use strict';
const SCOPE = '/appartement-411/';
const CACHE = 'a411-v0.14.0-shell';
const STALE = '<!doctype html><title>OLD ROOT BUILD</title><body id="old-sw-stub">stale</body>';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.put(
      new Request(self.location.origin + SCOPE + 'index.html'),
      new Response(STALE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(SCOPE)) return;
  if (url.pathname.includes('/legacy/') || url.pathname.includes('/day8/')) return;
  const nav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (nav) {
      const stale = await cache.match(new Request(self.location.origin + SCOPE + 'index.html'))
        || await cache.match(new Request(self.location.origin + SCOPE));
      if (stale) return stale;
    }
    const hit = await cache.match(event.request);
    return hit || fetch(event.request);
  }));
});
