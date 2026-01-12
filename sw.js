// Service Worker for VO2 Max Coach PWA
// Version is embedded here - update when releasing new version
const APP_VERSION = '0.8.0';
const CACHE_NAME = `vo2-coach-${APP_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/workout-data.js',
  '/workout-logic.js',
  '/workout-storage.js',
  '/workout-summary.js',
  '/zone-calculator.js',
  '/profile.js',
  '/ui-controls.js',
  '/sisu-sync.js',
  '/pwa-install.js',
  '/version.js',
  '/data.json',
  '/manifest.json',
  '/heart.png',
  '/bike.png',
  '/elliptical.png',
  '/dumbbell.png',
  '/logo.png',
  '/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache failed:', error);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Network-first strategy for HTML documents to get updates immediately
  if (event.request.destination === 'document' || 
      event.request.url.endsWith('.html') ||
      event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              // If cache fails too, return index.html for navigation requests
              if (!cachedResponse && event.request.destination === 'document') {
                return caches.match('/index.html');
              }
              return cachedResponse;
            });
        })
    );
  } else {
    // Cache-first strategy for assets (CSS, JS, images, etc.)
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          // Not in cache, fetch from network
          return fetch(event.request)
            .then((networkResponse) => {
              // Cache the response for future use
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
              return networkResponse;
            })
            .catch(() => {
              // Network failed and not in cache
              return new Response('Offline', { status: 503 });
            });
        })
    );
  }
});
