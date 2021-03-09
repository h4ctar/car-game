const filesToCache = [
  'https://cdn.jsdelivr.net/npm/socket.io-client@3.1.0/dist/socket.io.js',
];

const staticCacheName = 'cache';

self.addEventListener('install', (event) => {
  console.info('Installing service worker');
  event.waitUntil(
    caches.open(staticCacheName).then(cache => cache.addAll(filesToCache))
  );
});

self.addEventListener('activate', () => {
  console.info('Activating service worker');
});

self.addEventListener('fetch', (event) => {
  console.info(`Fetching ${event.request.url}`);
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.info(`Found ${event.request.url} in cache`);
          return response;
        }
        console.info(`Network request for ${event.request.url}`);
        return fetch(event.request);
      })
      .catch((err) => console.error(`Failed to fetch ${event.request.url}`, err))
  );
});
