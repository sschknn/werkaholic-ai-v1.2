// Service Worker für Genius AI PWA
const CACHE_NAME = 'genius-ai-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  // Basis-Ressourcen
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install Event - Cache Setup
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Fetch Event - Offline-Fallback
self.addEventListener('fetch', (event) => {
  // Nur für eigene Ressourcen
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Wenn im Cache gefunden, Cache zurückgeben
          if (cachedResponse) {
            return cachedResponse;
          }

          // Sonst Netzwerk-Anfrage
          return fetch(event.request)
            .then((networkResponse) => {
              // Response klonen und im Cache speichern
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              return networkResponse;
            })
            .catch(() => {
              // Offline-Fallback für Seiten
              if (event.request.mode === 'navigate') {
                return caches.match('/');
              }
              // Offline-Fallback für andere Ressourcen
              return new Response('Offline', { status: 503 });
            });
        })
    );
  }
});

// Activate Event - Alte Caches bereinigen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Background Sync für spätere Verarbeitung
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Hier könnte man z.B. gespeicherte Daten synchronisieren
      syncData()
    );
  }
});

function syncData() {
  // Platzhalter für spätere Synchronisationslogik
  return Promise.resolve();
}

// Push Notifications (kann später erweitert werden)
self.addEventListener('push', (event) => {
  const options = {
    body: 'Deine Analyse ist bereit!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Anzeigen'
      },
      {
        action: 'close',
        title: 'Schließen'
      }
    ]
  };

  if (event.data) {
    const message = event.data.json();
    options.body = message.body || options.body;
  }

  event.waitUntil(
    self.registration.showNotification('Genius AI', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});