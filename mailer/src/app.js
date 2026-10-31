import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { openDb } from './db.js';
import { ResendClient } from './resend.js';
import { esc, formatFrom, html, isEmail, normalizeEmail, now, raw } from './util.js';
import { confirmContact, importContacts, unsubscribeContact, upsertContact } from './contacts.js';
import { buildMessage, campaignStats, countRecipients, resumeInterrupted, runCampaign, sendProblems } from './campaigns.js';
import { contactsFromCsv, toCsv } from './csv.js';
import { renderEmail, STARTER_TEMPLATE } from './render.js';
import { handleEvent, verifyWebhook } from './webhook.js';
import * as V from './views.js';

const MAX_BODY = 2 * 1024 * 1024;
const PAGE = 50;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const sha = (s) => createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => timingSafeEqual(sha(a), sha(b));

function readBody(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Cuerpo demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseBody(text, contentType = '') {
  if (!text) return {};
  if (contentType.includes('application/json')) {
    try { const j = JSON.parse(text); return j && typeof j === 'object' ? j : {}; } catch { throw new HttpError(400, 'JSON no válido'); }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

export function createApp(config, { resend, log = console, db = openDb(config.dbPath) } = {}) {
  resend ??= new ResendClient({ apiKey: config.resendApiKey, log });
  const ctx = { db, config, resend, log, lastJob: null };
  const routes = [];
  const route = (method, path, handler, { auth = true } = {}) => {
    const keys = [];
    const re = new RegExp('^' + path.replace(/:([a-z]+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
    routes.push({ method, re, keys, handler, auth });
  };

  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin', // no filtra los tokens de baja a webs externas, pero el navegador sigue enviando Origin
      ...headers,
    });
    res.end(body);
  };
  const page = (res, view, status = 200, extra = {}) =>
    send(res, status, String(view), { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', ...extra });
  const json = (res, status, obj, extra = {}) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json', ...extra });
  const redirect = (res, to, msg, error) => {
    const sep = to.includes('?') ? '&' : '?';
    send(res, 303, '', { Location: msg ? `${to}${sep}${new URLSearchParams({ msg, ...(error ? { e: '1' } : {}) })}` : to });
  };
  const flash = (q) => ({ msg: q.get('msg') || undefined, error: q.has('e') });

  // ---------- helpers de datos ----------
  const lists = () => db.prepare(`
    SELECT l.*, (SELECT COUNT(*) FROM list_contacts lc WHERE lc.list_id = l.id) AS total,
      (SELECT COUNT(*) FROM list_contacts lc JOIN contacts c ON c.id = lc.contact_id WHERE lc.list_id = l.id AND c.status = 'subscribed') AS subscribed
    FROM lists l ORDER BY l.id`).all();
  const campaign = (id) => db.prepare('SELECT * FROM campaigns WHERE id = ?').get(Number(id));
  const withStats = (rows) => rows.map((c) => ({ ...c, stats: campaignStats(db, c.id) }));
  const need = (x) => { if (!x) throw new HttpError(404, 'No encontrado'); return x; };

  // ---------- límite de altas públicas ----------
  const hits = new Map();
  const limited = (req) => {
    const ip = (config.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
    const t = Date.now(), win = (hits.get(ip) || []).filter((x) => t - x < 600_000);
    win.push(t); hits.set(ip, win);
    if (hits.size > 5000) for (const [k, v] of hits) if (t - v[v.length - 1] > 600_000) hits.delete(k);
    return win.length > 10;
  };

  // ====================== PÚBLICO ======================
  route('GET', '/health', (req, res) => json(res, 200, { ok: true }), { auth: false });

  route('GET', '/subscribe', (req, res, { query }) => {
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(Number(query.get('list'))) || db.prepare('SELECT * FROM lists ORDER BY id LIMIT 1').get();
    send(res, 200, String(V.subscribeFormPage({ list })), { 'Content-Type': 'text/html; charset=utf-8' }); // embebible en iframe
  }, { auth: false });

  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  route('OPTIONS', '/api/subscribe', (req, res) => send(res, 204, '', corsHeaders), { auth: false });
  route('POST', '/api/subscribe', async (req, res) => {
    const wantsJson = String(req.headers['content-type'] || '').includes('json') || String(req.headers.accept || '').includes('json');
    const done = (status, body, view) => (wantsJson ? json(res, status, body, corsHeaders) : page(res, view, status, { 'X-Frame-Options': 'SAMEORIGIN' }));
    if (limited(req)) return done(429, { ok: false, error: 'Demasiados intentos, prueba más tarde.' }, V.publicPage('Error', html`<h1>Demasiados intentos</h1><p>Prueba de nuevo en unos minutos.</p>`));
    const b = parseBody(await readBody(req, 16 * 1024), req.headers['content-type']);
    const ok = () => done(200, { ok: true, pending: config.doubleOptIn },
      V.publicPage('Gracias', config.doubleOptIn
        ? html`<h1>¡Casi listo!</h1><p>Te hemos enviado un email. Haz clic en el enlace para confirmar tu suscripción.</p>`
        : html`<h1>¡Gracias!</h1><p>Ya estás suscrito.</p>`));
    if (b.website) return ok(); // honeypot: los bots reciben el mismo éxito

    const email = normalizeEmail(b.email);
    if (!isEmail(email)) return done(400, { ok: false, error: 'Email no válido' }, V.publicPage('Error', html`<h1>Email no válido</h1><p>Revísalo e inténtalo de nuevo.</p>`));
    const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(Number(b.list)) || db.prepare('SELECT * FROM lists ORDER BY id LIMIT 1').get();
    const { result, contact } = upsertContact(db, {
      email, first_name: b.first_name, last_name: b.last_name, listIds: [list.id],
      status: config.doubleOptIn ? 'pending' : 'subscribed', source: 'formulario', selfService: true,
    });
    if (result !== 'blocked' && contact.status === 'pending') {
      const last = contact.last_confirmation_at ? Date.parse(contact.last_confirmation_at) : 0;
      if (Date.now() - last > 10 * 60_000) {
        db.prepare('UPDATE contacts SET last_confirmation_at = ? WHERE id = ?').run(now(), contact.id);
        try { await sendConfirmation(contact); } catch (e) { log.error?.(`No se pudo enviar la confirmación: ${e.message}`); }
      }
    }
    return ok(); // misma respuesta exista o no el contacto (no revela quién está en la lista)
  }, { auth: false });

  async function sendConfirmation(contact) {
    const url = `${config.baseUrl}/confirm/${contact.token}`;
    const body = html`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Confirma tu suscripción</h2>
<p>Hola${contact.first_name ? ` ${contact.first_name}` : ''}, haz clic para confirmar que quieres recibir nuestros emails:</p>
<p><a href="${url}" style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Confirmar suscripción</a></p>
<p style="color:#888;font-size:12px">Si no has sido tú, ignora este mensaje y no recibirás nada.</p></div>`;
    await resend.send({
      from: formatFrom(config.fromName, config.fromEmail), to: [contact.email], subject: 'Confirma tu suscripción',
      html: String(body), text: `Confirma tu suscripción: ${url}\nSi no has sido tú, ignora este mensaje.`,
    });
  }

  route('GET', '/confirm/:token', (req, res, { params }) => {
    const c = confirmContact(db, params.token);
    if (!c) return page(res, V.publicPage('Enlace no válido', html`<h1>Enlace no válido</h1>`), 404);
    page(res, V.publicPage('Suscripción confirmada', html`<h1>¡Suscripción confirmada!</h1><p>Gracias, ${c.email} ya está en la lista.</p>`));
  }, { auth: false });

  const unsubPage = (token, query) => {
    const q = query.get('c') ? `?c=${encodeURIComponent(query.get('c'))}` : '';
    return V.publicPage('Darme de baja', html`<h1>¿Quieres darte de baja?</h1><p>Dejarás de recibir nuestros emails.</p>
<form method="post" action="/u/${token}${q}"><button>Sí, darme de baja</button></form>`);
  };
  route('GET', '/u/:token', (req, res, { params, query }) => {
    if (!db.prepare('SELECT 1 FROM contacts WHERE token = ?').get(params.token)) return page(res, V.publicPage('Enlace no válido', html`<h1>Enlace no válido</h1>`), 404);
    page(res, unsubPage(params.token, query));
  }, { auth: false });
  route('POST', '/u/:token', async (req, res, { params, query }) => {
    await readBody(req, 4096); // también atiende la baja con un clic (List-Unsubscribe=One-Click)
    const c = unsubscribeContact(db, params.token, query.get('c'));
    if (!c) return page(res, V.publicPage('Enlace no válido', html`<h1>Enlace no válido</h1>`), 404);
    page(res, V.publicPage('Baja confirmada', html`<h1>Te has dado de baja</h1><p>No recibirás más emails nuestros.</p>`));
  }, { auth: false });

  route('POST', '/webhooks/resend', async (req, res) => {
    const body = await readBody(req, 1024 * 1024);
    let evt;
    try { evt = verifyWebhook(config.webhookSecret, req.headers, body); }
    catch (e) { return json(res, 400, { ok: false, error: e.message }); }
    json(res, 200, { ok: true, result: handleEvent(db, evt, req.headers['svix-id']) });
  }, { auth: false });

  // ====================== ADMIN ======================
  route('GET', '/', (req, res, { query }) => {
    const counts = { subscribed: 0, pending: 0, unsubscribed: 0, bounced: 0, complained: 0 };
    for (const r of db.prepare('SELECT status, COUNT(*) n FROM contacts GROUP BY status').all()) counts[r.status] = r.n;
    const campaigns = withStats(db.prepare('SELECT * FROM campaigns ORDER BY id DESC LIMIT 5').all());
    page(res, V.layout('Panel', V.dashboardPage({ counts, campaigns, config, dryRun: resend.dryRun }), flash(query)));
  });

  route('GET', '/lists', (req, res, { query }) => page(res, V.layout('Listas', V.listsPage({ lists: lists(), baseUrl: config.baseUrl }), flash(query))));
  route('POST', '/lists', (req, res, { body }) => {
    const name = String(body.name || '').trim().slice(0, 80);
    if (!name) return redirect(res, '/lists', 'Pon un nombre a la lista.', true);
    db.prepare('INSERT INTO lists(name, created_at) VALUES (?, ?)').run(name, now());
    redirect(res, '/lists', 'Lista creada.');
  });

  route('GET', '/contacts', (req, res, { query }) => {
    const q = (query.get('q') || '').trim(), status = query.get('status') || '', listId = query.get('list') || '';
    const where = [], args = [];
    if (q) { where.push('(instr(lower(c.email), lower(?)) > 0 OR instr(lower(c.first_name || \' \' || c.last_name), lower(?)) > 0)'); args.push(q, q); }
    if (status) { where.push('c.status = ?'); args.push(status); }
    if (listId) { where.push('EXISTS (SELECT 1 FROM list_contacts lc WHERE lc.contact_id = c.id AND lc.list_id = ?)'); args.push(Number(listId)); }
    const W = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = db.prepare(`SELECT COUNT(*) n FROM contacts c ${W}`).get(...args).n;
    const pages = Math.max(1, Math.ceil(total / PAGE));
    const pg = Math.min(pages, Math.max(1, Number(query.get('page')) || 1));
    const contacts = db.prepare(`SELECT c.* FROM contacts c ${W} ORDER BY c.id DESC LIMIT ${PAGE} OFFSET ${(pg - 1) * PAGE}`).all(...args);
    page(res, V.layout('Contactos', V.contactsPage({ contacts, lists: lists(), total, q, status, listId, page: pg, pages }), flash(query)));
  });

  route('GET', '/contacts/export', (req, res) => {
    const rows = db.prepare(`SELECT c.email, c.first_name, c.last_name, c.status, c.created_at,
      (SELECT group_concat(l.name, '|') FROM list_contacts lc JOIN lists l ON l.id = lc.list_id WHERE lc.contact_id = c.id) AS lists
      FROM contacts c ORDER BY c.id`).all();
    send(res, 200, toCsv([['email', 'nombre', 'apellidos', 'estado', 'listas', 'alta'], ...rows.map((r) => [r.email, r.first_name, r.last_name, r.status, r.lists, r.created_at])]),
      { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="contactos.csv"' });
  });

  route('POST', '/contacts/import', (req, res, { body }) => {
    if (!body.consent) return redirect(res, '/contacts', 'Debes confirmar el consentimiento.', true);
    const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(Number(body.list));
    if (!list) return redirect(res, '/contacts', 'Elige una lista.', true);
    const rows = contactsFromCsv(body.data || '');
    if (!rows.length) return redirect(res, '/contacts', 'No he encontrado contactos en el texto.', true);
    if (rows.length > 50_000) return redirect(res, '/contacts', 'Máximo 50.000 contactos por importación.', true);
    const s = importContacts(db, rows, [list.id]);
    redirect(res, '/contacts', `Importados: ${s.added} nuevos, ${s.updated} actualizados, ${s.blocked} omitidos (baja/rebote/queja), ${s.invalid} inválidos, ${s.duplicates} repetidos.`);
  });

  route('POST', '/contacts/:id/delete', (req, res, { params }) => {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(Number(params.id));
    redirect(res, '/contacts', 'Contacto eliminado.');
  });

  route('GET', '/campaigns', (req, res, { query }) =>
    page(res, V.layout('Campañas', V.campaignsPage({ campaigns: withStats(db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all()) }), flash(query))));

  route('POST', '/campaigns', (req, res) => {
    const first = db.prepare('SELECT id FROM lists ORDER BY id LIMIT 1').get();
    const r = db.prepare(`INSERT INTO campaigns(name, subject, from_name, from_email, reply_to, html, list_id, created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run('Campaña sin título', '', config.fromName, config.fromEmail, config.replyTo, STARTER_TEMPLATE, first?.id ?? null, now());
    redirect(res, `/campaigns/${r.lastInsertRowid}`);
  });

  route('GET', '/campaigns/:id', (req, res, { params, query }) => {
    const c = need(campaign(params.id));
    const stats = campaignStats(db, c.id);
    const failedSample = stats.failed ? db.prepare("SELECT error FROM sends WHERE campaign_id = ? AND status='failed' LIMIT 1").get(c.id)?.error : '';
    page(res, V.layout(c.name, V.campaignPage({ c, lists: lists(), stats, config, recipients: c.list_id ? countRecipients(db, c) : 0, failedSample }), flash(query)));
  });

  route('POST', '/campaigns/:id', (req, res, { params, body }) => {
    const c = need(campaign(params.id));
    if (!['draft', 'paused'].includes(c.status)) return redirect(res, `/campaigns/${c.id}`, 'Una campaña enviada no se puede editar.', true);
    const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(Number(body.list_id));
    const s = (k, n) => String(body[k] ?? '').slice(0, n).trim();
    db.prepare(`UPDATE campaigns SET name=?, subject=?, preheader=?, from_name=?, from_email=?, reply_to=?, html=?, list_id=? WHERE id=?`)
      .run(s('name', 120) || 'Campaña sin título', s('subject', 200), s('preheader', 200), s('from_name', 100), normalizeEmail(body.from_email), normalizeEmail(body.reply_to), String(body.html ?? '').slice(0, 500_000), list?.id ?? null, c.id);
    redirect(res, `/campaigns/${c.id}`, 'Guardado.');
  });

  route('POST', '/campaigns/:id/delete', (req, res, { params }) => {
    const c = need(campaign(params.id));
    if (c.status !== 'draft') return redirect(res, `/campaigns/${c.id}`, 'Solo se pueden borrar borradores.', true);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(c.id);
    redirect(res, '/campaigns', 'Borrador eliminado.');
  });

  const sampleContact = (email = 'ejemplo@correo.com') => ({ email, first_name: 'Ana', last_name: 'García', token: 'ejemplo' });
  route('GET', '/campaigns/:id/preview', (req, res, { params }) => {
    const c = need(campaign(params.id));
    const { html: out } = renderEmail({ html: c.html, preheader: c.preheader, contact: sampleContact(), unsubUrl: '#', address: config.companyAddress });
    send(res, 200, out, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': 'sandbox' });
  });

  route('POST', '/campaigns/:id/test', async (req, res, { params, body }) => {
    const c = need(campaign(params.id));
    const to = normalizeEmail(body.to);
    if (!isEmail(to)) return redirect(res, `/campaigns/${c.id}`, 'Email de prueba no válido.', true);
    if (!isEmail(c.from_email)) return redirect(res, `/campaigns/${c.id}`, 'Guarda primero un email de remitente válido.', true);
    try {
      const m = buildMessage(ctx, c, { ...sampleContact(to), first_name: 'Prueba' });
      await resend.send({ ...m, subject: `[PRUEBA] ${m.subject}`, tags: undefined });
      redirect(res, `/campaigns/${c.id}`, resend.dryRun ? 'Prueba simulada (sin clave de Resend).' : `Prueba enviada a ${to}.`);
    } catch (e) { redirect(res, `/campaigns/${c.id}`, `Error al enviar la prueba: ${e.message}`, true); }
  });

  route('GET', '/campaigns/:id/send', (req, res, { params }) => {
    const c = need(campaign(params.id));
    const list = c.list_id ? db.prepare('SELECT name FROM lists WHERE id = ?').get(c.list_id) : null;
    page(res, V.layout('Enviar', V.sendConfirmPage({
      c, listName: list?.name ?? '—', recipients: c.list_id ? countRecipients(db, c) : 0,
      problems: sendProblems(db, c), address: config.companyAddress, dryRun: resend.dryRun,
    })));
  });
  route('POST', '/campaigns/:id/send', (req, res, { params }) => {
    const c = need(campaign(params.id));
    const problems = sendProblems(db, c);
    if (problems.length) return redirect(res, `/campaigns/${c.id}/send`, problems[0], true);
    ctx.lastJob = runCampaign(ctx, c.id);
    redirect(res, `/campaigns/${c.id}`, 'Envío iniciado.');
  });

  // ====================== SERVIDOR ======================
  function authorized(req) {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Basic ')) return false;
    const [u, ...p] = Buffer.from(h.slice(6), 'base64').toString('utf8').split(':');
    return safeEq(u, config.adminUser) && safeEq(p.join(':'), config.adminPassword) && config.adminPassword.length > 0;
  }
  function crossSite(req) {
    // Los navegadores modernos declaran el origen de la petición; es lo más fiable.
    const sfs = req.headers['sec-fetch-site'];
    if (sfs) return sfs !== 'same-origin' && sfs !== 'none';
    const o = req.headers.origin; // navegadores antiguos y clientes no navegador
    if (!o) return false;
    try { return new URL(o).host !== req.headers.host; } catch { return true; }
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let match = null, params = {};
      for (const r of routes) {
        const m = r.method === req.method && r.re.exec(url.pathname);
        if (m) { match = r; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); break; }
      }
      if (!match) return page(res, V.layout('No encontrado', html`<h1>404</h1>`, { nav: false }), 404);
      if (match.auth) {
        if (!authorized(req)) return send(res, 401, 'Autenticación requerida', { 'WWW-Authenticate': 'Basic realm="Mailer", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' });
        if (req.method !== 'GET' && crossSite(req)) return send(res, 403, 'Petición entre sitios bloqueada', { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      let body = {};
      if (match.auth && req.method === 'POST') body = parseBody(await readBody(req), req.headers['content-type']);
      await match.handler(req, res, { params, query: url.searchParams, body });
    } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof HttpError) return page(res, V.layout('Error', html`<h1>${e.status}</h1><p>${e.message}</p>`, { nav: false }), e.status);
      log.error?.(e);
      page(res, V.layout('Error', html`<h1>500</h1><p>Error interno.</p>`, { nav: false }), 500);
    }
  });

  return { server, ctx, start: () => resumeInterrupted(ctx) };
}
