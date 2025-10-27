const CACHE_NAME = 'floodsense-v2';
const API_CACHE = 'floodsense-api-v2';
const IMAGE_CACHE = 'floodsense-images-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/FloodSenseLogo.png',
  '/favicon.ico',
  '/accessibility.html',
  '/privacy-policy.html',
  '/terms-of-service.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets - Cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((response) => response || fetch(request)
        .then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          });
        })
      )
      .catch(() => {
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE && cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'FloodSense Alert';
  const options = {
    body: data.body || 'New flood alert in your area',
    icon: '/images/FloodSenseLogo.png',
    badge: '/images/FloodSenseLogo.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'close', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
