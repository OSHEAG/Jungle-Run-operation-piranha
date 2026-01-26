const CACHE_NAME = 'jungle-run-cache-v1';
const assets = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './icono-192.png',
  './icono-512.png'
];

// Instala el Service Worker y guarda los archivos en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

// Activa el SW y limpia cachés antiguas
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
});

// Responde con los archivos de la caché si no hay internet
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});