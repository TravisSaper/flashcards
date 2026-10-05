// Offline support: always ask the network first (bypassing the 10-minute HTTP cache GitHub Pages sets,
// so a new index.html never runs with a stale app.js); the cache is only the offline fallback.
const CACHE = 'fc-v6';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'engine.js', 'deck.json', 'manifest.json', 'apple-touch-icon.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const sameOrigin = new URL(e.request.url).origin === location.origin;
  // A navigate-mode Request can't be re-made with options, so fetch same-origin files by URL.
  const fresh = sameOrigin ? fetch(e.request.url, { cache: 'no-cache' }) : fetch(e.request);
  e.respondWith(
    fresh.then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
