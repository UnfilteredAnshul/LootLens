/* Service worker — self-destruct to clear stale caches */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.unregister())
  );
});

self.addEventListener('fetch', () => {});
