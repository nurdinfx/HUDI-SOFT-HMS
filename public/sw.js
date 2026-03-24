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


// Push Event — WhatsApp-style notifications
self.addEventListener('push', (event) => {
    console.log('📡 Push received');
    let data = { title: 'Hudi HMS Alert', body: 'You have a new update', badge: 1, url: '/', tag: 'general' };
    try {
        Object.assign(data, event.data?.json());
    } catch (e) {
        data.body = event.data?.text() || data.body;
    }

    const options = {
        body: data.body,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        image: data.image || undefined,
        vibrate: [100, 50, 100, 50, 100],
        tag: data.tag || `hudi-${Date.now()}`,
        renotify: true,
        requireInteraction: false,
        silent: false,
        timestamp: Date.now(),
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: '👁 View', icon: '/logo-144.png' },
            { action: 'close', title: '✕ Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
        .then(() => {
            // Forward to open windows as in-app alert
            return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        })
        .then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'hudi-notification', title: data.title, body: data.body, url: data.url });
            });
        })
    );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;

    const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url === targetUrl && 'focus' in client) return client.focus();
            }
            return clients.openWindow ? clients.openWindow(targetUrl) : null;
        })
    );
});

// Message handler — allows app to trigger in-app alerts from SW push
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
