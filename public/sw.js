const CACHE_NAME = 'hudi-soft-hms-v3';
const STATIC_ASSETS = [
    '/',
    '/manifest.webmanifest',
    '/logo.jpg',
    '/logo-144.png',
    '/logo-192.png',
    '/logo-512.png',
    '/globals.css',
    '/favicon.ico'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🧹 Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchedResponse = fetch(event.request).then((networkResponse) => {
                // Cache the new response
                if (networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fallback for network error
                return cachedResponse;
            });

            return cachedResponse || fetchedResponse;
        })
    );
});

// Push Event - Handle incoming notifications
self.addEventListener('push', (event) => {
    console.log('📡 Push received:', event.data?.text());

    let data = { title: 'Notification', body: 'System alert' };
    try {
        data = event.data?.json();
    } catch (e) {
        data.body = event.data?.text() || data.body;
    }

    const options = {
        body: data.body,
        icon: '/logo.jpg',
        badge: '/logo.jpg',
        vibrate: [100, 50, 100],
        data: {
            url: data.data?.url || '/'
        },
        actions: [
            { action: 'open', title: 'Open HMS' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
