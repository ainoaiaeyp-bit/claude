/* Vista previa de la web: la API pública corre en el navegador con el mismo núcleo que el servidor. Nada se guarda. */
import { createStore } from '../../server/core/store.js';
import { createApi } from '../../server/core/api.js';
import { seedData } from '../../server/core/defaults.js';

const store = createStore({});
for (const s of seedData().services) store.insert('services', s);
const api = createApi(store, { now: () => new Date(), siteUrl: location.origin, gallery: { list: async () => [] }, files: {}, notify() {} });
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const i = url.pathname.indexOf('/api/');
  if (i < 0) return realFetch(input, init);
  const method = (init.method || 'GET').toUpperCase();
  const req = { method, path: url.pathname.slice(i), query: Object.fromEntries(url.searchParams), admin: false, ip: 'preview', contentType: 'application/json' };
  if (init.body && method !== 'GET') { try { req.body = JSON.parse(init.body); } catch { req.body = {}; } }
  const out = await api(req);
  const body = out.json !== undefined ? JSON.stringify(out.json) : out.text ?? out.html ?? '';
  return new Response(body, { status: out.status, headers: { 'Content-Type': out.json !== undefined ? 'application/json' : 'text/plain' } });
};
