/* Vista previa del panel: ejecuta el MISMO núcleo que el servidor (reglas, CRM, contabilidad, rentabilidad)
   con datos de ejemplo en memoria. Nada se guarda: al recargar vuelve al estado inicial. */
import { createStore } from '../../server/core/store.js';
import { createApi } from '../../server/core/api.js';
import { seedData } from '../../server/core/defaults.js';
import { seedDemo } from '../../server/core/demo.js';
import { randomHex } from '../../server/core/util.js';
import { openDialog, esc } from '../../public/js/admin/core.js';

const store = createStore({});
for (const s of seedData().services) store.insert('services', s);
for (const p of seedData().products) store.insert('products', p);
const mem = new Map();
const saveFile = (bytes) => { const id = randomHex(16); mem.set(id, bytes); return id; };
seedDemo(store, new Date(), { saveFile });

const ctx = {
  now: () => new Date(), siteUrl: 'https://www.ejemplo.es',
  files: { save: async (b) => saveFile(b), read: async (id) => mem.get(id) || null, remove: async (id) => { mem.delete(id); } },
  gallery: { list: async () => (window.__PHOTOS || []), add: async () => { throw new Error('No disponible en la vista previa.'); }, remove: async () => {} },
  mailEnabled: true, sendMail: async () => { /* simulado: no se envía nada */ },
  aiEnabled: false, auth: { change: async () => true }, notify() {},
};
const api = createApi(store, ctx);
let logged = true;

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const i = url.pathname.indexOf('/api/');
  if (i < 0) return realFetch(input, init);
  const path = url.pathname.slice(i), method = (init.method || 'GET').toUpperCase();
  const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const ct = (headers['content-type'] || '').split(';')[0];
  const req = { method, path, query: Object.fromEntries(url.searchParams), admin: logged, ip: 'preview', contentType: ct, filename: decodeURIComponent(headers['x-filename'] || '') };
  if (path === '/api/admin/login') { logged = true; return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } }); }
  if (path === '/api/admin/logout') { logged = false; return new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } }); }
  if (init.body !== undefined && method !== 'GET') {
    if (typeof init.body === 'string') { try { req.body = JSON.parse(init.body); } catch { req.body = {}; } }
    else req.raw = new Uint8Array(await new Response(init.body).arrayBuffer());
  }
  const out = await api(req);
  const h = { ...(out.headers || {}) };
  let body, type;
  if (out.json !== undefined) { body = JSON.stringify(out.json); type = 'application/json'; }
  else if (out.html !== undefined) { body = out.html; type = 'text/html'; }
  else if (out.bytes) { body = out.bytes; type = h['Content-Type'] || 'application/octet-stream'; }
  else { body = out.text ?? ''; type = 'text/plain'; }
  return new Response(body, { status: out.status, headers: { ...h, 'Content-Type': h['Content-Type'] || type } });
};

/* En la vista previa las descargas no son posibles: se muestra qué contendría el archivo. */
function zipNames(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22; while (end > 0 && dv.getUint32(end, true) !== 0x06054b50) end--;
  const n = dv.getUint16(end + 10, true); let p = dv.getUint32(end + 16, true); const out = [];
  for (let k = 0; k < n; k++) { const size = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true); out.push({ name: new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nl)), size }); p += 46 + nl + el + cl; }
  return out;
}
window.__preview = {
  async download(url, filename) {
    const r = await fetch(url); const buf = new Uint8Array(await r.arrayBuffer());
    if (filename.endsWith('.zip')) {
      const files = zipNames(buf);
      openDialog(`<h3>${esc(filename)}</h3><p class="muted">En la vista previa no se puede descargar. Esto es lo que contendría el archivo (${(buf.length / 1024).toFixed(0)} KB):</p><div class="table-wrap"><table><tbody>${files.map((f) => `<tr><td>${esc(f.name)}</td><td class="num">${(f.size / 1024).toFixed(1)} KB</td></tr>`).join('')}</tbody></table></div>`, async () => {}, { submit: '' });
    } else {
      const text = new TextDecoder().decode(buf);
      openDialog(`<h3>${esc(filename)}</h3><p class="muted">Vista previa del contenido (no se descarga aquí):</p><pre style="white-space:pre-wrap;max-height:50vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1rem;margin:0;font-size:.78rem">${esc(text.slice(0, 3500))}${text.length > 3500 ? '\n…' : ''}</pre>`, async () => {}, { submit: '' });
    }
  },
};
