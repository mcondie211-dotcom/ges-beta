// GES Service Worker — v2
// Pages: always fetch the latest version; fall back to the saved copy only when offline.
// This means uploading a new page to GitHub reaches every client on their next visit.
// All paths are relative so it works inside the /ges-beta/ folder.

const CACHE_NAME = 'ges-v2';

const PRECACHE = [
  './estate-drone.html',
  './garden-portal.html',
  './veg-plot-portal.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Cache what we can; one missing file must not stop the whole install
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // never touch the assistant's POST calls

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // fonts, weather, video: browser handles them

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit =>
          hit || (req.destination === 'document' ? caches.match('./estate-drone.html') : undefined)
        )
      )
  );
});
