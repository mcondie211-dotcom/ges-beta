// GES Service Worker — v1.0
// Caches the shell so the portal loads instantly and works offline

const CACHE_NAME = 'ges-v1';

// Assets to cache on install
const PRECACHE = [
  '/bird-box-portal.html',
  '/manifest.json'
];

// Install: cache shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for shell
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for API calls (sensor data, AI assistant)
  if (
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else (shell, icons)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.destination === 'document') {
          return caches.match('/bird-box-portal.html');
        }
      });
    })
  );
});
