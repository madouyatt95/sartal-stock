const CACHE_NAME = 'sartal-stock-v14';
const STATIC_ASSETS = [
  './favicon.svg',
  './brand-mark.svg',
  './logo-sartal-stock.svg',
  './pwa-icon-192.png',
  './pwa-icon-512.png',
  './pwa-icon-maskable-512.png',
  './apple-touch-icon.png',
  './manifest.webmanifest',
  './index.html',
  './offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) || caches.match('./offline.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((response) => {
          if (!response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          if (event.request.destination === 'image') return caches.match('./brand-mark.svg');
          return new Response('Contenu indisponible hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        });
    }),
  );
});
