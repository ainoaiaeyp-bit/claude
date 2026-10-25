import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, seed, getSettings, setSetting, getSecret, hashPassword, verifyPassword } from './db.js';
import {
  BookingError, slotsFor, monthAvailability, getService, createBooking, getBookingById, getBookingByToken,
  publicBooking, canCancel, ics, isDate, nowLocal, addDays, fmtMin
} from './booking.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const GALLERY = path.join(PUBLIC, 'img', 'gallery');
const PORT = Number(process.env.PORT) || 3000;
const SECURE = process.env.NODE_ENV === 'production';

seed();
const SECRET = getSecret();

/* ───────── helpers ───────── */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json'
};
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SEC_HEADERS, ...headers });
  res.end(body);
}
const json = (res, status, data, headers = {}) =>
  send(res, status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });

async function readBody(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new BookingError('Contenido demasiado grande.', 413);
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new BookingError('Formato no válido.', 415);
  try { return JSON.parse((await readBody(req)).toString('utf8') || '{}'); } catch { throw new BookingError('JSON no válido.'); }
}

const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= max;
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (!v.some((t) => n - t < 3600e3)) hits.delete(k); }, 600e3).unref();

const ipOf = (req) => (process.env.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || '';

/* ───────── sessions ───────── */
const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('base64url');
function makeSession() {
  const exp = Date.now() + 12 * 3600e3;
  return `${exp}.${sign(String(exp))}`;
}
function isAdmin(req) {
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const cookie = (v, maxAge) => `sid=${v}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;

/* ───────── notifications (outbox + optional webhook) ───────── */
function notify(kind, booking) {
  const payload = { kind, booking: { ...booking, token: undefined }, at: new Date().toISOString() };
  db.prepare('INSERT INTO outbox(kind,payload) VALUES(?,?)').run(kind, JSON.stringify(payload));
  console.log(`[aviso] ${kind}: ${booking.name} · ${booking.service_name} · ${booking.date} ${fmtMin(booking.start_min)}`);
  const hook = process.env.WEBHOOK_URL;
  if (hook) {
    fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, booking }) })
      .catch((e) => console.error('webhook:', e.message));
  }
}

/* ───────── public settings / services ───────── */
const publicSettings = () => {
  const s = getSettings();
  return {
    businessName: s.businessName, tagline: s.tagline, city: s.city, address: s.address, phone: s.phone, whatsapp: s.whatsapp,
    email: s.email, instagram: s.instagram, minNoticeHours: Number(s.minNoticeHours), cancelHours: Number(s.cancelHours),
    maxDaysAhead: Number(s.maxDaysAhead), autoConfirm: s.autoConfirm === '1', depositInfo: s.depositInfo, homeFeeInfo: s.homeFeeInfo,
    hours: JSON.parse(s.hours)
  };
};
const galleryFiles = () => {
  try { return fs.readdirSync(GALLERY).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `/img/gallery/${f}`); } catch { return []; }
};
const svcRow = (r) => ({ ...r, price_from: !!r.price_from, allow_home: !!r.allow_home, active: !!r.active });

/* ───────── API ───────── */
async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;
  const ip = ipOf(req);

  if (m === 'GET' && p === '/api/settings') return json(res, 200, publicSettings());
  if (m === 'GET' && p === '/api/gallery') return json(res, 200, galleryFiles());
  if (m === 'GET' && p === '/api/services') {
    return json(res, 200, db.prepare('SELECT * FROM services WHERE active=1 ORDER BY sort, id').all().map(svcRow));
  }
  if (m === 'GET' && p === '/api/availability') {
    const svc = getService(url.searchParams.get('service_id'));
    if (!svc) return json(res, 404, { error: 'Servicio no encontrado.' });
    const date = url.searchParams.get('date');
    if (date) return json(res, 200, { slots: slotsFor(svc, date).map((t) => ({ start_min: t, label: fmtMin(t) })) });
    return json(res, 200, { days: monthAvailability(svc, url.searchParams.get('month') || '') });
  }
  if (m === 'POST' && p === '/api/bookings') {
    if (!rateLimit('book:' + ip, 8, 3600e3)) return json(res, 429, { error: 'Demasiadas solicitudes. Inténtalo más tarde.' });
    const body = await readJson(req);
    if (body.website) return json(res, 200, { ok: true }); // honeypot
    if (body.consent !== true) throw new BookingError('Debes aceptar la política de privacidad.');
    const b = createBooking(body);
    notify('booking.created', b);
    return json(res, 201, { booking: publicBooking(b) });
  }

  let t = /^\/api\/bookings\/([a-f0-9]{32})(\/cancel|\/ics)?$/.exec(p);
  if (t) {
    const b = getBookingByToken(t[1]);
    if (!b) return json(res, 404, { error: 'Cita no encontrada.' });
    if (m === 'GET' && !t[2]) return json(res, 200, { booking: publicBooking(b), can_cancel: canCancel(b) });
    if (m === 'GET' && t[2] === '/ics') {
      return send(res, 200, ics(b, getSettings()), { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="cita.ics"' });
    }
    if (m === 'POST' && t[2] === '/cancel') {
      if (!canCancel(b)) throw new BookingError('Para cancelar con menos antelación, contacta directamente con nosotras.', 403);
      db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(b.id);
      notify('booking.cancelled_by_client', getBookingById(b.id));
      return json(res, 200, { ok: true });
    }
  }

  /* ── admin ── */
  if (m === 'POST' && p === '/api/admin/login') {
    if (!rateLimit('login:' + ip, 6, 15 * 60e3)) return json(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' });
    const { password } = await readJson(req);
    if (!verifyPassword(String(password || ''), getSettings().adminHash)) return json(res, 401, { error: 'Contraseña incorrecta.' });
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(makeSession(), 12 * 3600) });
  }
  if (m === 'POST' && p === '/api/admin/logout') return json(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
  if (!p.startsWith('/api/admin/')) return json(res, 404, { error: 'No encontrado.' });
  if (!isAdmin(req)) return json(res, 401, { error: 'No autorizado.' });
  if (m === 'GET' && p === '/api/admin/me') return json(res, 200, { ok: true });

  if (m === 'GET' && p === '/api/admin/bookings') {
    const from = url.searchParams.get('from') || nowLocal().date;
    const to = url.searchParams.get('to') || addDays(from, 60);
    if (!isDate(from) || !isDate(to)) throw new BookingError('Rango de fechas no válido.');
    const rows = db.prepare('SELECT * FROM bookings WHERE date BETWEEN ? AND ? ORDER BY date, start_min').all(from, to);
    return json(res, 200, rows);
  }
  if (m === 'GET' && p === '/api/admin/stats') {
    const today = nowLocal().date;
    const month = today.slice(0, 7);
    const one = (sql, ...a) => Object.values(db.prepare(sql).get(...a))[0] || 0;
    return json(res, 200, {
      pending: one("SELECT COUNT(*) FROM bookings WHERE status='pending' AND date>=?", today),
      upcoming: one("SELECT COUNT(*) FROM bookings WHERE status IN ('pending','confirmed') AND date>=?", today),
      today: one("SELECT COUNT(*) FROM bookings WHERE status IN ('pending','confirmed') AND date=?", today),
      monthRevenue: one("SELECT COALESCE(SUM(price_cents),0) FROM bookings WHERE status IN ('confirmed','done') AND date LIKE ?", month + '%'),
      clients: one('SELECT COUNT(DISTINCT lower(email)) FROM bookings')
    });
  }
  if (m === 'POST' && p === '/api/admin/bookings') {
    const b = createBooking(await readJson(req), { admin: true });
    return json(res, 201, b);
  }
  t = /^\/api\/admin\/bookings\/(\d+)$/.exec(p);
  if (t) {
    const b = getBookingById(Number(t[1]));
    if (!b) return json(res, 404, { error: 'Cita no encontrada.' });
    if (m === 'PATCH') {
      const { status } = await readJson(req);
      if (!['pending', 'confirmed', 'cancelled', 'done', 'no_show'].includes(status)) throw new BookingError('Estado no válido.');
      db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status, b.id);
      const nb = getBookingById(b.id);
      if (status !== b.status && ['confirmed', 'cancelled'].includes(status)) notify('booking.' + status, nb);
      return json(res, 200, nb);
    }
    if (m === 'DELETE') { db.prepare('DELETE FROM bookings WHERE id=?').run(b.id); return json(res, 200, { ok: true }); }
  }

  /* services */
  if (p === '/api/admin/services') {
    if (m === 'GET') return json(res, 200, db.prepare('SELECT * FROM services ORDER BY sort, id').all().map(svcRow));
    if (m === 'POST') {
      const v = validService(await readJson(req));
      const r = db.prepare(`INSERT INTO services (name,category,description,duration_min,price_cents,price_from,allow_home,active,sort)
        VALUES (?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(sort),0)+1 FROM services))`)
        .run(v.name, v.category, v.description, v.duration_min, v.price_cents, v.price_from, v.allow_home, v.active);
      return json(res, 201, { id: Number(r.lastInsertRowid) });
    }
  }
  t = /^\/api\/admin\/services\/(\d+)$/.exec(p);
  if (t) {
    if (m === 'PUT') {
      const v = validService(await readJson(req));
      db.prepare(`UPDATE services SET name=?,category=?,description=?,duration_min=?,price_cents=?,price_from=?,allow_home=?,active=? WHERE id=?`)
        .run(v.name, v.category, v.description, v.duration_min, v.price_cents, v.price_from, v.allow_home, v.active, Number(t[1]));
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE') {
      const used = db.prepare('SELECT COUNT(*) c FROM bookings WHERE service_id=?').get(Number(t[1])).c;
      if (used) { db.prepare('UPDATE services SET active=0 WHERE id=?').run(Number(t[1])); return json(res, 200, { ok: true, archived: true }); }
      db.prepare('DELETE FROM services WHERE id=?').run(Number(t[1]));
      return json(res, 200, { ok: true });
    }
  }

  /* settings */
  if (p === '/api/admin/settings') {
    if (m === 'GET') { const { adminHash, _secret, _seeded, ...rest } = getSettings(); return json(res, 200, rest); }
    if (m === 'PUT') {
      const body = await readJson(req);
      const text = ['businessName', 'tagline', 'city', 'address', 'phone', 'whatsapp', 'email', 'instagram', 'notificationEmail', 'depositInfo', 'homeFeeInfo'];
      const nums = { slotStep: [5, 120], buffer: [0, 240], minNoticeHours: [0, 720], maxDaysAhead: [1, 730], cancelHours: [0, 720] };
      for (const k of text) if (k in body) setSetting(k, String(body[k]).slice(0, 300));
      for (const [k, [lo, hi]] of Object.entries(nums)) if (k in body) {
        const n = Number(body[k]);
        if (!Number.isInteger(n) || n < lo || n > hi) throw new BookingError(`Valor no válido: ${k}`);
        setSetting(k, n);
      }
      if ('autoConfirm' in body) setSetting('autoConfirm', body.autoConfirm ? '1' : '0');
      if ('hours' in body) {
        const h = body.hours;
        for (let d = 0; d < 7; d++) {
          const ranges = h?.[d];
          if (!Array.isArray(ranges)) throw new BookingError('Horario no válido.');
          for (const r of ranges) if (!Array.isArray(r) || !(r[0] >= 0 && r[1] <= 1440 && r[0] < r[1])) throw new BookingError('Horario no válido.');
        }
        setSetting('hours', JSON.stringify(h));
      }
      return json(res, 200, { ok: true });
    }
  }
  if (m === 'POST' && p === '/api/admin/password') {
    const { current, next } = await readJson(req);
    if (!verifyPassword(String(current || ''), getSettings().adminHash)) throw new BookingError('La contraseña actual no es correcta.', 403);
    if (String(next || '').length < 8) throw new BookingError('La nueva contraseña debe tener al menos 8 caracteres.');
    setSetting('adminHash', hashPassword(String(next)));
    return json(res, 200, { ok: true });
  }

  /* blocked dates */
  if (p === '/api/admin/blocked') {
    if (m === 'GET') return json(res, 200, db.prepare('SELECT * FROM blocked_dates WHERE date>=? ORDER BY date').all(nowLocal().date));
    if (m === 'POST') {
      const { date, reason } = await readJson(req);
      if (!isDate(date)) throw new BookingError('Fecha no válida.');
      db.prepare('INSERT INTO blocked_dates(date,reason) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET reason=excluded.reason').run(date, String(reason || '').slice(0, 100));
      return json(res, 201, { ok: true });
    }
  }
  t = /^\/api\/admin\/blocked\/(\d{4}-\d{2}-\d{2})$/.exec(p);
  if (t && m === 'DELETE') { db.prepare('DELETE FROM blocked_dates WHERE date=?').run(t[1]); return json(res, 200, { ok: true }); }

  /* gallery upload (raw image body) */
  if (m === 'POST' && p === '/api/admin/gallery') {
    const type = (req.headers['content-type'] || '').split(';')[0];
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[type];
    if (!ext) throw new BookingError('Solo se admiten imágenes JPG, PNG o WebP.', 415);
    const buf = await readBody(req, 8 * 1024 * 1024);
    const magic = buf.subarray(0, 12);
    const ok = (ext === '.jpg' && magic[0] === 0xff && magic[1] === 0xd8) ||
      (ext === '.png' && magic.subarray(1, 4).toString() === 'PNG') ||
      (ext === '.webp' && magic.subarray(0, 4).toString() === 'RIFF' && magic.subarray(8, 12).toString() === 'WEBP');
    if (!ok) throw new BookingError('El archivo no es una imagen válida.', 415);
    fs.mkdirSync(GALLERY, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(GALLERY, name), buf);
    return json(res, 201, { url: `/img/gallery/${name}` });
  }
  t = /^\/api\/admin\/gallery\/([\w.-]+)$/.exec(p);
  if (t && m === 'DELETE') {
    const f = path.join(GALLERY, path.basename(t[1]));
    if (f.startsWith(GALLERY + path.sep) && fs.existsSync(f)) fs.unlinkSync(f);
    return json(res, 200, { ok: true });
  }

  return json(res, 404, { error: 'No encontrado.' });
}

function validService(b) {
  const name = String(b.name || '').trim().slice(0, 80);
  const dur = Number(b.duration_min);
  const price = Math.round(Number(b.price_cents));
  if (!name) throw new BookingError('El servicio necesita un nombre.');
  if (!Number.isInteger(dur) || dur < 10 || dur > 600) throw new BookingError('Duración no válida (10–600 min).');
  if (!Number.isFinite(price) || price < 0) throw new BookingError('Precio no válido.');
  return {
    name, category: String(b.category || 'Maquillaje').trim().slice(0, 40), description: String(b.description || '').trim().slice(0, 500),
    duration_min: dur, price_cents: price, price_from: b.price_from ? 1 : 0, allow_home: b.allow_home ? 1 : 0, active: b.active === false ? 0 : 1
  };
}

/* ───────── static ───────── */
function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  const pretty = { '/admin': '/admin.html', '/cita': '/cita.html', '/privacidad': '/privacidad.html' };
  if (pretty[p]) p = pretty[p];
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep) || p.includes('\0')) return send(res, 403, 'Forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      return send(res, 404, fs.existsSync(path.join(PUBLIC, '404.html')) ? fs.readFileSync(path.join(PUBLIC, '404.html')) : 'Not found',
        { 'Content-Type': 'text/html; charset=utf-8' });
    }
    const ext = path.extname(file).toLowerCase();
    const isAsset = /\.(css|js)$/.test(ext) ? 'public, max-age=300' : /\.(jpe?g|png|webp|svg|ico)$/.test(ext) ? 'public, max-age=86400' : 'no-cache';
    const priv = ['/admin.html', '/cita.html'].includes(p);
    res.writeHead(200, {
      ...SEC_HEADERS, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size,
      'Cache-Control': priv ? 'no-store' : isAsset, ...(priv ? { 'X-Robots-Tag': 'noindex' } : {})
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

export const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) {
      if (!['GET', 'HEAD'].includes(req.method)) {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Origen no permitido.' });
      }
      return await api(req, res, url);
    }
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method not allowed');
    if (url.pathname === '/sitemap.xml') {
      const base = process.env.SITE_URL || `http://${req.headers.host}`;
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc></url><url><loc>${base}/privacidad</loc></url></urlset>`, { 'Content-Type': 'application/xml' });
    }
    if (url.pathname === '/robots.txt') {
      const base = process.env.SITE_URL || `http://${req.headers.host}`;
      return send(res, 200, `User-agent: *\nDisallow: /admin\nDisallow: /cita\nSitemap: ${base}/sitemap.xml\n`, { 'Content-Type': 'text/plain' });
    }
    serveStatic(req, res, url);
  } catch (e) {
    if (e instanceof BookingError) return json(res, e.status, { error: e.message });
    console.error(e);
    json(res, 500, { error: 'Error interno del servidor.' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Noelia Duque · web y citas en http://localhost:${PORT}  (panel: /admin)`));
}
