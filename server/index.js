import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createStore } from './core/store.js';
import { createApi } from './core/api.js';
import { seedData } from './core/defaults.js';
import { getSettings } from './core/booking.js';
import { runAutomations } from './core/automations.js';
import { quarterRange } from './core/accounting.js';
import { nowLocal, quarterOf } from './core/util.js';
import { openPersist } from './persist.js';
import { diskFiles, galleryFiles } from './files.js';
import { createMailer } from './mail.js';
import { createInvoiceExtractor } from './ai.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json',
};
const SEC = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
};

/* contraseña del panel */
const hashPw = (pw) => { const salt = crypto.randomBytes(16); return `${salt.toString('hex')}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`; };
const checkPw = (pw, stored) => {
  if (!stored) return false; const [s, h] = stored.split(':'); const known = Buffer.from(h, 'hex'), got = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
  return known.length === got.length && crypto.timingSafeEqual(known, got);
};

/** Crea la aplicación completa. Se usa desde `npm start` y desde los tests. */
export async function createApp({ dataDir = process.env.DATA_DIR || path.resolve('data'), adminPassword = process.env.ADMIN_PASSWORD, now = () => new Date(), mailer, extractor, quiet = false } = {}) {
  const persist = openPersist(dataDir);
  const store = createStore(persist.load(), persist.hook);
  if (!store.setting('_seeded')) { const sd = seedData(); for (const s of sd.services) store.insert('services', s); store.setSetting('_seeded', true); }
  if (!store.setting('_seeded_shop')) { if (!store.list('products').length) for (const p of seedData().products) store.insert('products', p); store.setSetting('_seeded_shop', true); }
  if (!store.setting('_secret')) store.setSetting('_secret', crypto.randomBytes(32).toString('hex'));
  if (!store.setting('_adminHash')) {
    const pw = adminPassword || crypto.randomBytes(6).toString('base64url');
    store.setSetting('_adminHash', hashPw(pw));
    if (!adminPassword && !quiet) console.log(`\n  Contraseña inicial del panel: ${pw}\n  Entra en /admin y cámbiala en Ajustes.\n`);
  }
  const SECRET = store.setting('_secret');
  const SECURE = process.env.NODE_ENV === 'production';

  const smtp = mailer || (process.env.SMTP_HOST ? createMailer({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.SMTP_FROM, secure: process.env.SMTP_SECURE === '1' }) : null);
  const aiExtract = extractor !== undefined ? extractor : await createInvoiceExtractor();
  const files = diskFiles(dataDir);
  const gallery = galleryFiles(path.join(PUBLIC, 'img', 'gallery'));
  const ctx = {
    now, files, gallery, siteUrl: process.env.SITE_URL || '',
    mailEnabled: !!smtp, aiEnabled: !!aiExtract, extractInvoice: aiExtract || undefined,
    sendMail: (m) => (smtp ? smtp.send(m) : Promise.reject(new Error('SMTP no configurado'))),
    auth: { change: async (cur, next) => { if (!checkPw(cur, store.setting('_adminHash'))) return false; store.setSetting('_adminHash', hashPw(next)); return true; } },
    notify(kind, payload) {
      if (!quiet) console.log(`[aviso] ${kind}`);
      if (process.env.WEBHOOK_URL) fetch(process.env.WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, payload, at: new Date().toISOString() }) }).catch((e) => console.error('webhook:', e.message));
    },
  };
  const api = createApi(store, ctx);

  /* sesiones */
  const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
  const makeSession = () => { const exp = now().getTime() + 12 * 3600e3; return `${exp}.${sign(String(exp))}`; };
  const isAdmin = (req) => {
    const m = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie || ''); if (!m) return false;
    const [exp, sig] = m[1].split('.'); if (!exp || !sig || Number(exp) < now().getTime()) return false;
    const a = Buffer.from(sig), b = Buffer.from(sign(exp)); return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  const cookie = (v, maxAge) => `sid=${v}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;
  const attempts = new Map();
  const ipOf = (req) => (process.env.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || '';

  async function body(req, limit) {
    const chunks = []; let size = 0;
    for await (const c of req) { size += c.length; if (size > limit) { const e = new Error('Contenido demasiado grande.'); e.status = 413; throw e; } chunks.push(c); }
    return Buffer.concat(chunks);
  }
  const send = (res, status, data, headers = {}) => { res.writeHead(status, { ...SEC, ...headers }); res.end(data); };

  async function handleApi(req, res, url) {
    const m = req.method, p = url.pathname === '/baja' ? '/api/baja' : url.pathname;
    if (!['GET', 'HEAD'].includes(m) && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, JSON.stringify({ error: 'Origen no permitido.' }), { 'Content-Type': 'application/json' });
    if (m === 'POST' && p === '/api/admin/login') {
      const ip = ipOf(req), t = now().getTime(), arr = (attempts.get(ip) || []).filter((x) => t - x < 15 * 60e3); arr.push(t); attempts.set(ip, arr);
      if (arr.length > 6) return send(res, 429, JSON.stringify({ error: 'Demasiados intentos. Espera unos minutos.' }), { 'Content-Type': 'application/json' });
      let pw = ''; try { pw = JSON.parse((await body(req, 4096)).toString()).password || ''; } catch { /* vacío */ }
      if (!checkPw(String(pw), store.setting('_adminHash'))) return send(res, 401, JSON.stringify({ error: 'Contraseña incorrecta.' }), { 'Content-Type': 'application/json' });
      return send(res, 200, JSON.stringify({ ok: true }), { 'Content-Type': 'application/json', 'Set-Cookie': cookie(makeSession(), 12 * 3600) });
    }
    if (m === 'POST' && p === '/api/admin/logout') return send(res, 200, '{"ok":true}', { 'Content-Type': 'application/json', 'Set-Cookie': cookie('', 0) });

    const ct = (req.headers['content-type'] || '').split(';')[0].trim();
    const r = { method: m === 'HEAD' ? 'GET' : m, path: p, query: Object.fromEntries(url.searchParams), admin: isAdmin(req), ip: ipOf(req), contentType: ct, filename: decodeURIComponent(String(req.headers['x-filename'] || '')) };
    if (!['GET', 'HEAD', 'DELETE'].includes(m)) {
      const buf = await body(req, 13 * 1024 * 1024);
      if (ct === 'application/json' || !ct) { try { r.body = buf.length ? JSON.parse(buf.toString('utf8')) : {}; } catch { return send(res, 400, JSON.stringify({ error: 'JSON no válido.' }), { 'Content-Type': 'application/json' }); } }
      else r.raw = new Uint8Array(buf);
    }
    const out = await api(r);
    const h = { 'Cache-Control': 'no-store', ...(out.headers || {}) };
    if (out.json !== undefined) return send(res, out.status, JSON.stringify(out.json), { 'Content-Type': 'application/json; charset=utf-8', ...h });
    if (out.html !== undefined) return send(res, out.status, out.html, { 'Content-Type': 'text/html; charset=utf-8', ...h });
    if (out.bytes) return send(res, out.status, Buffer.from(out.bytes), h);
    return send(res, out.status, out.text ?? '', { 'Content-Type': 'text/plain; charset=utf-8', ...h });
  }

  function serveStatic(req, res, url) {
    let p = decodeURIComponent(url.pathname);
    const pretty = { '/admin': '/admin.html', '/cita': '/cita.html', '/bono': '/bono.html', '/privacidad': '/privacidad.html' };
    if (pretty[p]) p = pretty[p]; if (p.endsWith('/')) p += 'index.html';
    if (!path.extname(p) && /^\/[a-z0-9-]+$/.test(p) && fs.existsSync(path.join(PUBLIC, p + '.html'))) p += '.html';
    const file = path.normalize(path.join(PUBLIC, p));
    if (!file.startsWith(PUBLIC + path.sep) || p.includes('\0')) return send(res, 403, 'Forbidden');
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, fs.existsSync(path.join(PUBLIC, '404.html')) ? fs.readFileSync(path.join(PUBLIC, '404.html')) : 'Not found', { 'Content-Type': 'text/html; charset=utf-8' });
      const ext = path.extname(file).toLowerCase();
      const priv = ['/admin.html', '/cita.html'].includes(p);
      if (ext === '.html' && !priv) {
        const base = (process.env.SITE_URL || `${req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers.host}`).replace(/\/$/, '');
        const body = fs.readFileSync(file, 'utf8').replaceAll('%SITE%', base);
        res.writeHead(200, { ...SEC, 'Content-Type': MIME[ext], 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'public, max-age=300' });
        return req.method === 'HEAD' ? res.end() : res.end(body);
      }
      res.writeHead(200, { ...SEC, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': priv ? 'no-store' : /\.(jpe?g|png|webp|svg|ico)$/.test(ext) ? 'public, max-age=86400' : /\.(css|js)$/.test(ext) ? 'public, max-age=300' : 'no-cache', ...(priv ? { 'X-Robots-Tag': 'noindex' } : {}) });
      if (req.method === 'HEAD') return res.end(); fs.createReadStream(file).pipe(res);
    });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname.startsWith('/api/') || url.pathname === '/baja') return await handleApi(req, res, url);
      if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method not allowed');
      const base = process.env.SITE_URL || `http://${req.headers.host}`;
      if (url.pathname === '/sitemap.xml') {
        const skip = new Set(['admin.html', 'cita.html', 'bono.html', '404.html']);
        const pages = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html') && !skip.has(f)).map((f) => ({ loc: f === 'index.html' ? `${base}/` : `${base}/${f.slice(0, -5)}`, mod: fs.statSync(path.join(PUBLIC, f)).mtime.toISOString().slice(0, 10), prio: f === 'index.html' ? '1.0' : f === 'privacidad.html' ? '0.2' : '0.8' }));
        return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((x) => `<url><loc>${x.loc}</loc><lastmod>${x.mod}</lastmod><priority>${x.prio}</priority></url>`).join('')}</urlset>`, { 'Content-Type': 'application/xml' });
      }
      if (url.pathname === '/robots.txt') return send(res, 200, `User-agent: *\nDisallow: /admin\nDisallow: /cita\nDisallow: /bono\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`, { 'Content-Type': 'text/plain' });
      serveStatic(req, res, url);
    } catch (e) {
      if (e.status) return send(res, e.status, JSON.stringify({ error: e.message }), { 'Content-Type': 'application/json' });
      console.error(e); send(res, 500, JSON.stringify({ error: 'Error interno del servidor.' }), { 'Content-Type': 'application/json' });
    }
  });

  /* tareas periódicas: automatizaciones de correo y paquete trimestral */
  let timer;
  async function tick() {
    try {
      await runAutomations(store, ctx, now());
      const st = getSettings(store), n = nowLocal(now());
      const day = Number(n.date.slice(8, 10)), month = Number(n.date.slice(5, 7));
      if (st.quarterlyAutoSend && ctx.mailEnabled && st.gestoria.email && [1, 4, 7, 10].includes(month) && day >= 2 && day <= 15) {
        const prev = quarterOf(`${n.date.slice(0, 4)}-${String(month - 1 || 12).padStart(2, '0')}-01`), year = month === 1 ? Number(n.date.slice(0, 4)) - 1 : Number(n.date.slice(0, 4));
        const tag = `Paquete T${prev} ${year}`;
        if (!store.list('outbox').some((o) => o.kind === 'gestoria' && o.subject === tag)) await api({ method: 'POST', path: '/api/admin/accounting/send', admin: true, body: { year, q: prev } });
      }
    } catch (e) { console.error('[automatizaciones]', e.message); }
  }
  const start = () => { if (!timer) { timer = setInterval(tick, 10 * 60e3); timer.unref(); setTimeout(tick, 5000).unref(); } };
  const stop = () => { clearInterval(timer); timer = null; };
  return { server, store, api, ctx, tick, start, stop, close: () => { stop(); server.close(); persist.close(); } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await createApp();
  const PORT = Number(process.env.PORT) || 3000;
  app.server.listen(PORT, () => { console.log(`Noelia Duque · web, citas y gestión en http://localhost:${PORT}  (panel: /admin)`); console.log(`Correo: ${app.ctx.mailEnabled ? 'activo' : 'sin configurar (los emails quedan en la bandeja de salida)'} · Lectura de facturas con IA: ${app.ctx.aiEnabled ? 'activa' : 'desactivada'}`); });
  app.start();
}
