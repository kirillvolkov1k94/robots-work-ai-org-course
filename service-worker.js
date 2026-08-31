const LEGACY_CACHE_PREFIX = 'uls-legacy-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(LEGACY_CACHE_PREFIX))
        .map((key) => caches.delete(key)),
    )),
  );
});
