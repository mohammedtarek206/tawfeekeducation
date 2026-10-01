const CACHE_NAME = 'tawfeek-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/لوجو.jpg',
    '/offline.html',
];

// Install: cache static shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and chrome-extension
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

    // API calls: Network only (don't cache)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({ success: false, message: 'لا يوجد اتصال بالإنترنت' }), { headers: { 'Content-Type': 'application/json' } })));
        return;
    }

    // Static assets (images, fonts, js, css): Cache-first
    if (
        url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|css|js)$/)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return res;
                });
            })
        );
        return;
    }

    // HTML pages: Network-first, fallback to cache then offline page
    event.respondWith(
        fetch(request)
            .then((res) => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return res;
            })
            .catch(() =>
                caches.match(request).then((cached) => cached || caches.match('/offline.html'))
            )
    );
});
