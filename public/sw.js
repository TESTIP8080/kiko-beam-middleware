// Service Worker для KIKO MATRIX
const CACHE_NAME = 'kiko-matrix-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/hyperjump.css',
  '/js/config.js',
  '/js/ui.js',
  '/js/speech.js',
  '/js/youtube.js',
  '/js/camera.js',
  '/js/gemini.js',
  '/js/teleport.js',
  '/js/commands.js',
  '/js/webrtc.js',
  '/js/contacts.js',
  '/js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
}); 