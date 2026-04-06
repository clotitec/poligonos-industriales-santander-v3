// Service Worker - Polígonos Industriales de Santander
const CACHE_NAME = 'pi-santander-v8';
const TILE_CACHE = 'pi-santander-tiles-v2';

const PRECACHE_URLS = [
    './',
    './index.html',
    './app.js',
    './data.js',
    './styles.css',
    './manifest.json',
    './panoramas.js'
];

// Install - precache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch - cache strategies
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Map tiles - cache first
    if (url.hostname.includes('cartocdn.com') ||
        url.hostname.includes('arcgisonline.com')) {
        event.respondWith(
            caches.open(TILE_CACHE).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    });
                })
            )
        );
        return;
    }

    // CDN libs - cache first
    if (url.hostname.includes('unpkg.com') ||
        url.hostname.includes('cdn.tailwindcss.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(event.request).then(cached => {
                    if (cached) return cached;
                    return fetch(event.request).then(response => {
                        if (response.ok) cache.put(event.request, response.clone());
                        return response;
                    });
                })
            )
        );
        return;
    }

    // Local files - network first, fallback to cache
    if (url.origin === location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Default - network only
    event.respondWith(fetch(event.request));
});
