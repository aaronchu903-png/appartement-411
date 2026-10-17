/* Root production worker for L'Appartement 411 (Day 8+). Scope: site root only.
 * Does not control /legacy/ or /day8/. Replaces any prior root-scope worker. */
'use strict';
const SCOPE = new URL('./', self.location.href);
const PREFIX = 'a411-root-static-' + encodeURIComponent(SCOPE.pathname) + '-';
const CACHE = PREFIX + 'v1-production-day8';
const CORE = ['./', 'index.html', 'tokens.css', 'style.css', 'icons.js', 'modules/index.js', 'modules/M1.js', 'modules/M2.js', 'modules/M3.js', 'modules/M4.js', 'app.js', 'art.js', 'audio.js', 'engine.js', 'save.js', 'content.js', 'language.js', 'data/inherited.js', 'manifest.webmanifest', 'js/conjugate.js'];
const EXCLUDED = ['/legacy/', '/day8/'];

function underScope(pathname) {
  if (!pathname.startsWith(SCOPE.pathname)) return false;
  const rest = pathname.slice(SCOPE.pathname.length);
  return !EXCLUDED.some(seg => rest === seg.slice(0, -1) || rest.startsWith(seg.slice(1)));
}

function isObsoleteCache(key) {
  if (key === CACHE) return false;
  if (key.startsWith(PREFIX)) return true;
  if (key.startsWith('a411-') && !key.startsWith('a411-root-static-')) return true;
  if (key.startsWith('day8-static-')) return true;
  return false;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE.map(path => new Request(new URL(path, self.location.href), { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(isObsoleteCache).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!underScope(url.pathname)) return;

  const isNav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isNav) {
      try {
        const network = await fetch(event.request);
        if (network.ok && !event.request.headers.has('range')) {
          cache.put(event.request, network.clone());
        }
        return network;
      } catch (_) {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    }
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok && !event.request.headers.has('range')) cache.put(event.request, response.clone());
      return response;
    } catch (_) {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
