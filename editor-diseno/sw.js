/* Service worker de Lienzo: instalable y con modo sin conexión.
   Sube la versión de CACHE cuando publiques cambios para forzar la actualización. */
const CACHE = 'lienzo-v3';
const CORE = ['./', 'index.html', 'config.js', 'fonts.css', 'manifest.webmanifest', 'icons/icon.svg',
  'app.js', 'vendor/fabric.min.js', 'vendor/jspdf.umd.min.js', 'vendor/qrcode.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // Solo recursos propios; nunca cacheamos la API (IA) ni Supabase.
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/config.js');
  if (isPage) {
    // Red primero (siempre lo último), caché si no hay conexión.
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // Resto: caché primero y se actualiza en segundo plano.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ch => ch.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
