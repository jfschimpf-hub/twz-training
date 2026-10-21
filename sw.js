// Offline cache. Bump VERSION whenever any app file changes so phones pick up the update.
const VERSION = 'twz-v3';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/plan.js', './js/store.js', './js/timer.js', './js/charts.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first (so updates show up when online), cache fallback when offline.
// Only good responses are cached: if the site is taken down (404), the installed app
// keeps running from its last working copy instead of caching the error page.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const cached = () => caches.match(e.request, { ignoreSearch: true })
    .then((r) => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) return cached().then((r) => r || res);
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => cached().then((r) => r || Response.error())),
  );
});
