// Mielec: guarda la app para abrirla sin conexión. Los datos de REE (/api/) siempre van a la red.
const V = 'mielec-v1';
const BASE = ['/', '/app.css?v=1', '/js/app.js?v=1', '/icono.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(V).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
