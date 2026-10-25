/* API completa del estudio. Recibe una petición abstracta y devuelve una respuesta abstracta, sin tocar HTTP:
   la usan el servidor de Node y la vista previa del panel en el navegador. */
import { ApiError, addDays, clean, cents, diffDays, EMAIL_RE, fmtMin, isDate, nowLocal, pad, quarterOf, randomHex, sum } from './util.js';
import {
  answerProposal, canCancel, createBooking, findService, getSettings, icsFor, logInteraction, monthAvailability, moveBooking, proposeBooking, publicBooking, setStatus, slotsFor, upsertClient,
} from './booking.js';
import { EXPENSE_CATEGORIES, seedData } from './defaults.js';
import {
  clientStats, dashboard, DEFAULT_TEMPLATES, followups, renderTemplate, reports, segmentMembers, SEGMENTS, STAGES, toCSV, waLink,
} from './crm.js';
import { buildQuarterZip, catLabel, draftFromExtraction, expenseLedger, incomeLedger, normalizeExpense, quarterSummary } from './accounting.js';
import { cfoReport } from './cfo.js';
import { planAutomations, runAutomations, sendNow, templateVars, unsubscribe } from './automations.js';

const ok = (data, status = 200, headers) => ({ status, json: data, headers });
const fail = (msg, status = 400) => ({ status, json: { error: msg } });
const MAX_FILE = 12 * 1024 * 1024;
const FILE_TYPES = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'text/xml': '.xml', 'application/xml': '.xml' };

export function createApi(store, ctx) {
  const hits = new Map();
  const now = () => ctx.now();
  const rate = (key, max, windowMs) => {
    const t = now().getTime(), arr = (hits.get(key) || []).filter((x) => t - x < windowMs);
    arr.push(t); hits.set(key, arr); return arr.length <= max;
  };
  const today = () => nowLocal(now()).date;

  const publicSettings = () => {
    const s = getSettings(store);
    return {
      businessName: s.businessName, tagline: s.tagline, city: s.city, address: s.address, phone: s.phone, whatsapp: s.whatsapp, email: s.email, instagram: s.instagram,
      minNoticeHours: Number(s.minNoticeHours), cancelHours: Number(s.cancelHours), maxDaysAhead: Number(s.maxDaysAhead), autoConfirm: !!s.autoConfirm, bookingsOpen: s.bookingsOpen !== false, bookingsClosedMessage: s.bookingsClosedMessage,
      depositInfo: s.depositInfo, homeFeeInfo: s.homeFeeInfo, hours: s.hours,
    };
  };

  const bookingsWithCat = () => {
    const cats = Object.fromEntries(store.list('services').map((s) => [s.id, s.category]));
    return store.list('bookings').map((b) => ({ ...b, category: b.category || cats[b.service_id] || '' }));
  };
  const allData = () => ({ clients: store.list('clients'), bookings: bookingsWithCat(), interactions: store.list('interactions'), tasks: store.list('tasks'), records: store.list('records') });
  const withStats = (c, bookings) => ({ ...c, ...clientStats(c, bookings, today()) });
  const notify = (kind, payload) => { try { ctx.notify && ctx.notify(kind, payload); } catch (e) { /* no bloquea */ } };
  const clientVars = (c, b) => templateVars(getSettings(store), c, b, ctx);

  /* ───── público ───── */
  const publicRoutes = [
    ['GET', /^\/api\/settings$/, () => ok(publicSettings())],
    ['GET', /^\/api\/services$/, () => ok(store.list('services').filter((s) => s.active).sort((a, b) => a.sort - b.sort || a.id - b.id))],
    ['GET', /^\/api\/gallery$/, async () => ok(ctx.gallery ? await ctx.gallery.list() : [])],
    ['GET', /^\/api\/availability$/, (r) => {
      const svc = findService(store, r.query.service_id);
      if (!svc) return fail('Servicio no encontrado.', 404);
      if (r.query.date) return ok({ slots: slotsFor(store, svc, r.query.date, { now: now() }).map((t) => ({ start_min: t, label: fmtMin(t) })) });
      return ok({ days: monthAvailability(store, svc, r.query.month || '', now()) });
    }],
    ['POST', /^\/api\/bookings$/, (r) => {
      if (!rate('book:' + r.ip, 8, 3600e3)) return fail('Demasiadas solicitudes. Inténtalo más tarde.', 429);
      const b = r.body || {};
      if (b.website) return ok({ ok: true });
      if (b.consent !== true) throw new ApiError('Debes aceptar la política de privacidad.');
      const bk = createBooking(store, b, { now: now() });
      notify('booking.created', bk);
      return ok({ booking: publicBooking(bk) }, 201);
    }],
    ['POST', /^\/api\/leads$/, (r) => {
      if (!rate('lead:' + r.ip, 5, 3600e3)) return fail('Demasiadas solicitudes. Inténtalo más tarde.', 429);
      const b = r.body || {};
      if (b.website) return ok({ ok: true });
      if (b.consent !== true) throw new ApiError('Debes aceptar la política de privacidad.');
      const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase(), phone = clean(b.phone, 24);
      if (name.length < 2) throw new ApiError('Indica tu nombre.');
      if (!EMAIL_RE.test(email) && !phone) throw new ApiError('Déjanos un email o un teléfono para contestarte.');
      const c = upsertClient(store, { name, email: EMAIL_RE.test(email) ? email : '', phone, source: clean(b.source, 30) || 'web', marketing: !!b.marketing }, now());
      logInteraction(store, c.id, 'mensaje', clean(b.message, 600) || 'Pidió información desde la web', now());
      store.insert('tasks', { client_id: c.id, title: 'Responder a contacto web', due_date: today(), done: false, kind: 'lead', created_at: now().toISOString() });
      notify('lead.created', { name, email, phone, message: b.message });
      return ok({ ok: true }, 201);
    }],
    ['GET', /^\/api\/baja$/, (r) => {
      const c = unsubscribe(store, String(r.query.t || ''), now());
      const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Baja</title><body style="font:18px system-ui;max-width:520px;margin:20vh auto;padding:0 1rem"><h1 style="font-weight:500">${c ? 'Te hemos dado de baja' : 'Enlace no válido'}</h1><p>${c ? 'No recibirás más comunicaciones comerciales. Seguirás recibiendo los avisos de tus citas.' : 'No encontramos esta suscripción.'}</p>`;
      return { status: c ? 200 : 404, html };
    }],
  ];

  const tokenRoute = (r) => {
    const m = /^\/api\/bookings\/([a-f0-9]{32})(\/cancel|\/ics|\/accept|\/decline)?$/.exec(r.path);
    if (!m) return null;
    const b = store.list('bookings').find((x) => x.token === m[1]);
    if (!b) return fail('Cita no encontrada.', 404);
    if (r.method === 'GET' && !m[2]) return ok({ booking: publicBooking(b), can_cancel: canCancel(store, b, now()) });
    if (r.method === 'GET' && m[2] === '/ics') return { status: 200, text: icsFor(b, getSettings(store)), headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="cita.ics"' } };
    if (r.method === 'POST' && (m[2] === '/accept' || m[2] === '/decline')) {
      const nb = answerProposal(store, b, m[2] === '/accept', now());
      notify(m[2] === '/accept' ? 'booking.proposal_accepted' : 'booking.proposal_declined', nb);
      return ok({ ok: true, status: nb.status });
    }
    if (r.method === 'POST' && m[2] === '/cancel') {
      if (!canCancel(store, b, now())) throw new ApiError('Para cancelar con menos antelación, contacta directamente con nosotras.', 403);
      setStatus(store, b.id, 'cancelled', now());
      notify('booking.cancelled_by_client', store.find('bookings', b.id));
      return ok({ ok: true });
    }
    return null;
  };

  /* ───── administración ───── */
  const A = [];
  const route = (method, re, fn) => A.push([method, re, fn]);

  route('GET', /^\/api\/admin\/me$/, () => ok({ ok: true, ai: !!ctx.aiEnabled, mail: !!ctx.mailEnabled }));

  route('GET', /^\/api\/admin\/dashboard$/, () => {
    const d = allData(), st = getSettings(store), t = today();
    const sug = followups({ ...d, today: t });
    return ok({ ...dashboard({ ...d, settings: st, blocked: store.list('blocked'), today: t, sug }), stages_labels: STAGES, ai: !!ctx.aiEnabled, mail: !!ctx.mailEnabled,
      drafts: store.list('expenses').filter((e) => e.draft).length, outbox_pending: store.list('outbox').filter((o) => o.status === 'pendiente').length });
  });

  /* citas */
  route('GET', /^\/api\/admin\/bookings$/, (r) => {
    const from = r.query.from || today(), to = r.query.to || addDays(from, 60);
    if (!isDate(from) || !isDate(to)) throw new ApiError('Rango de fechas no válido.');
    const q = String(r.query.q || '').toLowerCase();
    let rows = bookingsWithCat().filter((b) => b.date >= from && b.date <= to);
    if (q) rows = rows.filter((b) => `${b.name} ${b.email} ${b.phone} ${b.service_name}`.toLowerCase().includes(q));
    if (r.query.status) rows = rows.filter((b) => b.status === r.query.status);
    return ok(rows.sort((a, b) => a.date.localeCompare(b.date) || a.start_min - b.start_min));
  });
  route('POST', /^\/api\/admin\/bookings$/, (r) => ok(createBooking(store, r.body || {}, { admin: true, now: now() }), 201));
  route('GET', /^\/api\/admin\/bookings\/(\d+)$/, (r, m) => {
    const b = store.find('bookings', m[1]); if (!b) return fail('Cita no encontrada.', 404);
    const d = allData(), c = d.clients.find((x) => x.id === b.client_id);
    return ok({ booking: b, client: c ? withStats(c, d.bookings) : null, history: d.bookings.filter((x) => x.client_id === b.client_id && x.id !== b.id).sort((a, c2) => c2.date.localeCompare(a.date)).slice(0, 6) });
  });
  route('PATCH', /^\/api\/admin\/bookings\/(\d+)$/, (r, m) => {
    const id = Number(m[1]), b0 = store.find('bookings', id); if (!b0) return fail('Cita no encontrada.', 404);
    const body = r.body || {}; let b = b0;
    if (body.status !== undefined) { b = setStatus(store, id, body.status, now()); if (['confirmed', 'cancelled'].includes(body.status) && body.status !== b0.status) notify('booking.' + body.status, b); }
    const patch = {};
    if (body.paid_cents !== undefined) { patch.paid_cents = Math.max(0, cents(body.paid_cents)); patch.pay_method = clean(body.pay_method ?? b.pay_method, 30); }
    if (body.internal_notes !== undefined) patch.internal_notes = clean(body.internal_notes, 600);
    if (body.price_cents !== undefined) patch.price_cents = Math.max(0, cents(body.price_cents));
    if (Object.keys(patch).length) {
      b = store.update('bookings', id, patch);
      if (patch.paid_cents !== undefined && patch.paid_cents !== b0.paid_cents) logInteraction(store, b.client_id, 'cobro', `Cobro registrado: ${(patch.paid_cents / 100).toFixed(2)} € por ${b.service_name}`, now(), { booking_id: id });
    }
    return ok(b);
  });
  route('POST', /^\/api\/admin\/bookings\/(\d+)\/propose$/, async (r, m) => {
    const id = Number(m[1]), b = proposeBooking(store, id, r.body || {}, now());
    const mail = await sendNow(store, ctx, 'proposal', b, now());
    notify('booking.proposed', b);
    return ok({ booking: b, mail: mail.status });
  });
  route('POST', /^\/api\/admin\/bookings\/(\d+)\/reject$/, async (r, m) => {
    const id = Number(m[1]), b0 = store.find('bookings', id); if (!b0) return fail('Cita no encontrada.', 404);
    if (!['pending', 'proposed'].includes(b0.status)) throw new ApiError('Solo se pueden rechazar solicitudes pendientes.');
    const b = setStatus(store, id, 'cancelled', now());
    const mail = r.body?.notify === false ? { status: 'omitido' } : await sendNow(store, ctx, 'rejection', b, now(), { mensaje: clean(r.body?.message, 500) });
    notify('booking.cancelled', b);
    return ok({ booking: b, mail: mail.status });
  });
  route('POST', /^\/api\/admin\/bookings\/(\d+)\/move$/, (r, m) => ok(moveBooking(store, Number(m[1]), r.body || {}, now())));
  route('DELETE', /^\/api\/admin\/bookings\/(\d+)$/, (r, m) => { store.remove('bookings', m[1]); return ok({ ok: true }); });

  /* servicios */
  const svcBody = (b) => {
    const name = clean(b.name, 80), dur = Number(b.duration_min), price = cents(b.price_cents);
    if (!name) throw new ApiError('El servicio necesita un nombre.');
    if (!Number.isInteger(dur) || dur < 10 || dur > 600) throw new ApiError('Duración no válida (10–600 min).');
    if (price < 0) throw new ApiError('Precio no válido.');
    return { name, category: clean(b.category, 40) || 'Maquillaje', description: clean(b.description, 500), duration_min: dur, price_cents: price, price_from: !!b.price_from, allow_home: !!b.allow_home,
      material_cost_cents: Math.max(0, cents(b.material_cost_cents)), vat_rate: b.vat_rate === '' || b.vat_rate == null ? 21 : Number(b.vat_rate), active: b.active !== false };
  };
  route('GET', /^\/api\/admin\/services$/, () => ok(store.list('services').sort((a, b) => a.sort - b.sort || a.id - b.id)));
  route('POST', /^\/api\/admin\/services$/, (r) => { const sort = Math.max(0, ...store.list('services').map((s) => s.sort)) + 1; return ok({ id: store.insert('services', { ...svcBody(r.body || {}), sort }).id }, 201); });
  route('PUT', /^\/api\/admin\/services\/(\d+)$/, (r, m) => { store.update('services', m[1], svcBody(r.body || {})); return ok({ ok: true }); });
  route('DELETE', /^\/api\/admin\/services\/(\d+)$/, (r, m) => {
    if (store.list('bookings').some((b) => b.service_id === Number(m[1]))) { store.update('services', m[1], { active: false }); return ok({ ok: true, archived: true }); }
    store.remove('services', m[1]); return ok({ ok: true });
  });

  /* ajustes */
  const TEXT = ['businessName', 'tagline', 'city', 'address', 'phone', 'whatsapp', 'email', 'instagram', 'notificationEmail', 'depositInfo', 'homeFeeInfo', 'siteUrl', 'legalName', 'nif', 'fiscalAddress'];
  const NUMS = { slotStep: [5, 120], buffer: [0, 240], minNoticeHours: [0, 720], maxDaysAhead: [1, 730], cancelHours: [0, 720], defaultVat: [0, 30], irpfFractionRate: [0, 50], targetNetMonthlyCents: [0, 1e8], autonomoFeeMonthlyCents: [0, 1e7], fixedExtraMonthlyCents: [0, 1e8] };
  route('GET', /^\/api\/admin\/settings$/, () => ok({ ...getSettings(store), categories: EXPENSE_CATEGORIES, mail: !!ctx.mailEnabled, ai: !!ctx.aiEnabled }));
  route('PUT', /^\/api\/admin\/settings$/, (r) => {
    const b = r.body || {};
    for (const k of TEXT) if (k in b) store.setSetting(k, clean(b[k], 300));
    for (const [k, [lo, hi]] of Object.entries(NUMS)) if (k in b) { const n = Number(b[k]); if (!Number.isFinite(n) || n < lo || n > hi) throw new ApiError(`Valor no válido: ${k}`); store.setSetting(k, n); }
    if ('bookingsClosedMessage' in b) store.setSetting('bookingsClosedMessage', clean(b.bookingsClosedMessage, 400));
    for (const k of ['autoConfirm', 'bookingsOpen', 'pricesIncludeVat', 'quarterlyAutoSend']) if (k in b) store.setSetting(k, !!b[k]);
    if ('hours' in b) {
      for (let d = 0; d < 7; d++) { const rs = b.hours?.[d]; if (!Array.isArray(rs)) throw new ApiError('Horario no válido.'); for (const x of rs) if (!Array.isArray(x) || !(x[0] >= 0 && x[1] <= 1440 && x[0] < x[1])) throw new ApiError('Horario no válido.'); }
      store.setSetting('hours', b.hours);
    }
    if ('templates' in b) { const t = {}; for (const k of Object.keys(DEFAULT_TEMPLATES)) t[k] = clean(b.templates?.[k] ?? DEFAULT_TEMPLATES[k], 800); store.setSetting('templates', t); }
    if ('gestoria' in b) store.setSetting('gestoria', { name: clean(b.gestoria?.name, 100), email: clean(b.gestoria?.email, 120), cc: clean(b.gestoria?.cc, 120), note: clean(b.gestoria?.note, 400) });
    if ('automations' in b) {
      const cur = getSettings(store).automations, out = {};
      for (const k of Object.keys(cur)) { const x = b.automations?.[k] || {}; out[k] = { ...cur[k], on: !!x.on, subject: clean(x.subject ?? cur[k].subject, 150), body: clean(x.body ?? cur[k].body, 2000) }; if ('hoursBefore' in cur[k]) out[k].hoursBefore = Math.min(168, Math.max(1, Number(x.hoursBefore ?? cur[k].hoursBefore))); if ('daysAfter' in cur[k]) out[k].daysAfter = Math.min(30, Math.max(1, Number(x.daysAfter ?? cur[k].daysAfter))); }
      store.setSetting('automations', out);
    }
    return ok({ ok: true });
  });
  route('POST', /^\/api\/admin\/password$/, async (r) => {
    const { current, next } = r.body || {};
    if (String(next || '').length < 8) throw new ApiError('La nueva contraseña debe tener al menos 8 caracteres.');
    if (!ctx.auth) return fail('No disponible en la vista previa.', 404);
    if (!(await ctx.auth.change(String(current || ''), String(next)))) throw new ApiError('La contraseña actual no es correcta.', 403);
    return ok({ ok: true });
  });

  /* días bloqueados y portfolio */
  route('GET', /^\/api\/admin\/blocked$/, () => ok(store.list('blocked').filter((b) => b.date >= today()).sort((a, b) => a.date.localeCompare(b.date))));
  route('POST', /^\/api\/admin\/blocked$/, (r) => { const { date, reason } = r.body || {}; if (!isDate(date)) throw new ApiError('Fecha no válida.'); store.remove('blocked', date); store.insert('blocked', { id: date, date, reason: clean(reason, 100) }); return ok({ ok: true }, 201); });
  route('DELETE', /^\/api\/admin\/blocked\/(\d{4}-\d{2}-\d{2})$/, (r, m) => { store.remove('blocked', m[1]); return ok({ ok: true }); });
  route('POST', /^\/api\/admin\/gallery$/, async (r) => { if (!ctx.gallery) return fail('No disponible en la vista previa.', 404); return ok({ url: await ctx.gallery.add(r.raw, r.contentType) }, 201); });
  route('DELETE', /^\/api\/admin\/gallery\/([\w.-]+)$/, async (r, m) => { if (ctx.gallery) await ctx.gallery.remove(m[1]); return ok({ ok: true }); });

  /* ───── CRM ───── */
  const clientBody = (b, prev = {}) => {
    const name = clean(b.name ?? prev.name, 80), email = clean(b.email ?? prev.email, 120).toLowerCase(), phone = clean(b.phone ?? prev.phone, 24);
    if (name.length < 2) throw new ApiError('La ficha necesita un nombre.');
    if (email && !EMAIL_RE.test(email)) throw new ApiError('El email no parece válido.');
    const birthday = b.birthday !== undefined ? clean(b.birthday, 10) : prev.birthday || '';
    if (birthday && !isDate(birthday)) throw new ApiError('La fecha de cumpleaños no es válida.');
    const tags = b.tags !== undefined ? (Array.isArray(b.tags) ? b.tags : String(b.tags).split(',')).map((t) => clean(t, 24)).filter(Boolean).slice(0, 12) : prev.tags || [];
    return { name, email, phone, birthday, tags, source: clean(b.source ?? prev.source ?? 'manual', 30), notes: clean(b.notes ?? prev.notes, 2000), health: clean(b.health ?? prev.health, 800),
      allergies: clean(b.allergies ?? prev.allergies, 400), instagram: clean(b.instagram ?? prev.instagram, 60) };
  };
  route('GET', /^\/api\/admin\/clients$/, (r) => {
    const d = allData(), q = String(r.query.q || '').toLowerCase().replace(/^@/, '');
    let list = d.clients.filter((c) => !c.archived);
    if (r.query.segment) { const ids = new Set(segmentMembers(r.query.segment, d.clients, d.bookings, today()).map((c) => c.id)); list = list.filter((c) => ids.has(c.id)); }
    if (q) list = list.filter((c) => `${c.name} ${c.email} ${c.phone} ${(c.tags || []).join(' ')} ${c.instagram || ''}`.toLowerCase().includes(q));
    let out = list.map((c) => withStats(c, d.bookings));
    if (r.query.stage) out = out.filter((c) => c.stage === r.query.stage);
    if (r.query.tag) out = out.filter((c) => (c.tags || []).includes(r.query.tag));
    const last = {}; for (const i of d.interactions) if (!last[i.client_id] || i.created_at > last[i.client_id]) last[i.client_id] = i.created_at;
    return ok(out.map((c) => ({ ...c, last_contact: last[c.id] || '' })).sort((a, b) => String(b.last_visit || b.created_at).localeCompare(String(a.last_visit || a.created_at))));
  });
  route('POST', /^\/api\/admin\/clients$/, (r) => {
    const b = clientBody(r.body || {});
    if (b.email && store.list('clients').some((c) => c.email === b.email)) throw new ApiError('Ya existe una ficha con ese email.', 409);
    const c = store.insert('clients', { ...b, consent_marketing: !!r.body?.consent_marketing, consent_date: r.body?.consent_marketing ? now().toISOString() : '', token: randomHex(12), archived: false, created_at: now().toISOString() });
    logInteraction(store, c.id, 'nota', 'Ficha creada manualmente', now());
    return ok(c, 201);
  });
  route('GET', /^\/api\/admin\/clients\/(\d+)$/, (r, m) => {
    const d = allData(), c = d.clients.find((x) => x.id === Number(m[1])); if (!c) return fail('Clienta no encontrada.', 404);
    const mine = d.bookings.filter((b) => b.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
    return ok({ client: withStats(c, d.bookings), bookings: mine, records: d.records.filter((x) => x.client_id === c.id).sort((a, b) => b.date.localeCompare(a.date)),
      interactions: d.interactions.filter((i) => i.client_id === c.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
      tasks: d.tasks.filter((t) => t.client_id === c.id).sort((a, b) => Number(a.done) - Number(b.done) || String(a.due_date).localeCompare(String(b.due_date))) });
  });
  route('PUT', /^\/api\/admin\/clients\/(\d+)$/, (r, m) => {
    const c = store.find('clients', m[1]); if (!c) return fail('Clienta no encontrada.', 404);
    const patch = clientBody(r.body || {}, c);
    if ('consent_marketing' in (r.body || {})) { patch.consent_marketing = !!r.body.consent_marketing; patch.consent_date = patch.consent_marketing ? (c.consent_date || now().toISOString()) : c.consent_date; }
    return ok(store.update('clients', c.id, patch));
  });
  route('DELETE', /^\/api\/admin\/clients\/(\d+)$/, (r, m) => { store.update('clients', m[1], { archived: true }); return ok({ ok: true, archived: true }); });
  route('POST', /^\/api\/admin\/clients\/(\d+)\/interactions$/, (r, m) => {
    const kind = ['nota', 'llamada', 'whatsapp', 'email', 'visita', 'mensaje'].includes(r.body?.kind) ? r.body.kind : 'nota';
    const text = clean(r.body?.text, 600); if (!text) throw new ApiError('Escribe la anotación.');
    return ok(logInteraction(store, Number(m[1]), kind, text, now()), 201);
  });
  route('DELETE', /^\/api\/admin\/interactions\/(\d+)$/, (r, m) => { store.remove('interactions', m[1]); return ok({ ok: true }); });

  const recBody = (b) => {
    if (!isDate(b.date)) throw new ApiError('La fecha de la sesión no es válida.');
    return { date: b.date, technique: clean(b.technique, 60), areas: clean(b.areas, 100), pigment: clean(b.pigment, 80), device: clean(b.device, 80), skin_type: clean(b.skin_type, 40),
      notes: clean(b.notes, 1200), consent_signed: !!b.consent_signed, booking_id: b.booking_id ? Number(b.booking_id) : null };
  };
  route('POST', /^\/api\/admin\/clients\/(\d+)\/records$/, (r, m) => ok(store.insert('records', { client_id: Number(m[1]), ...recBody(r.body || {}), created_at: now().toISOString() }), 201));
  route('PUT', /^\/api\/admin\/records\/(\d+)$/, (r, m) => ok(store.update('records', m[1], recBody(r.body || {}))));
  route('DELETE', /^\/api\/admin\/records\/(\d+)$/, (r, m) => { store.remove('records', m[1]); return ok({ ok: true }); });

  route('GET', /^\/api\/admin\/tasks$/, (r) => {
    const cm = Object.fromEntries(store.list('clients').map((c) => [c.id, c.name]));
    let list = store.list('tasks'); if (r.query.status === 'open') list = list.filter((t) => !t.done);
    return ok(list.sort((a, b) => Number(a.done) - Number(b.done) || String(a.due_date).localeCompare(String(b.due_date))).map((t) => ({ ...t, client_name: cm[t.client_id] || '' })));
  });
  route('POST', /^\/api\/admin\/tasks$/, (r) => {
    const title = clean(r.body?.title, 160); if (!title) throw new ApiError('Escribe la tarea.');
    const due = r.body?.due_date && isDate(r.body.due_date) ? r.body.due_date : today();
    return ok(store.insert('tasks', { client_id: r.body?.client_id ? Number(r.body.client_id) : null, title, due_date: due, done: false, kind: clean(r.body?.kind, 20) || 'tarea', created_at: now().toISOString() }), 201);
  });
  route('PATCH', /^\/api\/admin\/tasks\/(\d+)$/, (r, m) => ok(store.update('tasks', m[1], { done: !!r.body?.done })));
  route('DELETE', /^\/api\/admin\/tasks\/(\d+)$/, (r, m) => { store.remove('tasks', m[1]); return ok({ ok: true }); });

  route('GET', /^\/api\/admin\/segments$/, () => { const d = allData(); return ok(SEGMENTS.map((s) => ({ ...s, count: segmentMembers(s.id, d.clients, d.bookings, today()).length }))); });
  const campaignRow = (c, b, tpl, st) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, stage: clientStats(c, b, today()).stage,
    text: renderTemplate(st.templates[tpl] || '', clientVars(c, null)), wa: waLink(c.phone, renderTemplate(st.templates[tpl] || '', clientVars(c, null))) });
  route('GET', /^\/api\/admin\/segments\/(\w+)$/, (r, m) => {
    const seg = SEGMENTS.find((s) => s.id === m[1]); if (!seg) return fail('Segmento no encontrado.', 404);
    const d = allData(), st = getSettings(store), tpl = r.query.template || seg.template;
    return ok({ segment: seg, template: tpl, members: segmentMembers(seg.id, d.clients, d.bookings, today()).map((c) => campaignRow(c, d.bookings, tpl, st)) });
  });
  route('GET', /^\/api\/admin\/followups$/, () => {
    const d = allData(), st = getSettings(store), cm = Object.fromEntries(d.clients.map((c) => [c.id, c]));
    return ok(followups({ ...d, today: today() }).map((f) => {
      const c = cm[f.client_id]; if (!c) return null;
      const b = f.booking_id ? d.bookings.find((x) => x.id === f.booking_id) : null;
      const text = renderTemplate(st.templates[f.template] || '', clientVars(c, b));
      return { ...f, client_name: c.name, phone: c.phone, email: c.email, text, wa: waLink(c.phone, text) };
    }).filter(Boolean));
  });
  route('POST', /^\/api\/admin\/followups\/done$/, (r) => {
    const { client_id, type, text } = r.body || {};
    if (!client_id || !type) throw new ApiError('Faltan datos.');
    return ok(logInteraction(store, Number(client_id), `seguimiento:${clean(type, 20)}`, clean(text, 200) || 'Contactada', now()), 201);
  });
  route('POST', /^\/api\/admin\/campaigns\/log$/, (r) => {
    const { template, client_ids } = r.body || {};
    const ids = Array.isArray(client_ids) ? client_ids.slice(0, 500) : [];
    const typeOf = { retoque: 'retoque', inactiva: 'inactiva', cumple: 'cumple', lead: 'lead', recordatorio: 'recordatorio' }[template] || 'campana';
    for (const id of ids) logInteraction(store, Number(id), `seguimiento:${typeOf}`, `Campaña enviada: ${template}`, now());
    return ok({ ok: true, logged: ids.length });
  });

  /* ───── informes y exportación ───── */
  route('GET', /^\/api\/admin\/reports$/, (r) => {
    const to = r.query.to || today(), from = r.query.from || addDays(to, -180);
    if (!isDate(from) || !isDate(to)) throw new ApiError('Rango de fechas no válido.');
    const d = allData();
    return ok(reports({ clients: d.clients, bookings: d.bookings, from, to, today: today() }));
  });
  route('GET', /^\/api\/admin\/export\/(clients|bookings|backup)$/, (r, m) => {
    const d = allData(), t = today();
    if (m[1] === 'backup') return { status: 200, text: JSON.stringify(store.exportAll(), null, 1), headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="copia-${t}.json"` } };
    if (m[1] === 'clients') {
      const rows = d.clients.map((c) => ({ ...c, ...clientStats(c, d.bookings, t) }));
      return { status: 200, text: toCSV(rows, [{ label: 'Nombre', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Teléfono', key: 'phone' }, { label: 'Cumpleaños', key: 'birthday' }, { label: 'Etapa', get: (c) => STAGES[c.stage] }, { label: 'Visitas', key: 'visits' }, { label: 'Gastado €', get: (c) => (c.spent / 100).toFixed(2).replace('.', ',') }, { label: 'Última visita', key: 'last_visit' }, { label: 'Origen', key: 'source' }, { label: 'Etiquetas', get: (c) => (c.tags || []).join(' | ') }, { label: 'Acepta novedades', get: (c) => (c.consent_marketing ? 'Sí' : 'No') }, { label: 'Alta', get: (c) => String(c.created_at).slice(0, 10) }]), headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="clientas-${t}.csv"` } };
    }
    return { status: 200, text: toCSV(d.bookings.sort((a, b) => a.date.localeCompare(b.date)), [{ label: 'Fecha', key: 'date' }, { label: 'Hora', get: (b) => fmtMin(b.start_min) }, { label: 'Clienta', key: 'name' }, { label: 'Servicio', key: 'service_name' }, { label: 'Estado', key: 'status' }, { label: 'Precio €', get: (b) => (b.price_cents / 100).toFixed(2).replace('.', ',') }, { label: 'Cobrado €', get: (b) => ((b.paid_cents || 0) / 100).toFixed(2).replace('.', ',') }, { label: 'Método', key: 'pay_method' }]), headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="citas-${t}.csv"` } };
  });
  route('POST', /^\/api\/admin\/restore$/, (r) => {
    if (r.body?.confirm !== 'RESTAURAR' || !r.body?.data) throw new ApiError('Falta la confirmación.');
    store.replaceAll(r.body.data); return ok({ ok: true });
  });

  /* ───── contabilidad ───── */
  const expView = (e) => ({ ...e, category_label: catLabel(e.category) });
  const duplicate = (e, list) => list.find((x) => x.id !== e.id && !x.draft && x.supplier && e.supplier && x.supplier.toLowerCase() === e.supplier.toLowerCase() && x.number && x.number === e.number && x.total_cents === e.total_cents);
  route('GET', /^\/api\/admin\/expenses$/, (r) => {
    const all = store.list('expenses');
    let list = all; const { from, to, q, draft } = r.query;
    if (from) list = list.filter((e) => e.date >= from); if (to) list = list.filter((e) => e.date <= to);
    if (draft === '1') list = list.filter((e) => e.draft);
    if (q) list = list.filter((e) => `${e.supplier} ${e.concept} ${e.number}`.toLowerCase().includes(String(q).toLowerCase()));
    return ok({ categories: EXPENSE_CATEGORIES, items: list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).map((e) => ({ ...expView(e), duplicate_of: (duplicate(e, all) || {}).id || null })) });
  });
  route('POST', /^\/api\/admin\/expenses$/, (r) => ok(expView(store.insert('expenses', { ...normalizeExpense(r.body || {}, getSettings(store)), draft: false, created_at: now().toISOString() })), 201));
  route('PUT', /^\/api\/admin\/expenses\/(\d+)$/, (r, m) => {
    const cur = store.find('expenses', m[1]); if (!cur) return fail('Gasto no encontrado.', 404);
    const merged = normalizeExpense(r.body || {}, getSettings(store), cur);
    return ok(expView(store.update('expenses', cur.id, { ...merged, files: cur.files, draft: r.body?.confirm ? false : cur.draft })));
  });
  route('DELETE', /^\/api\/admin\/expenses\/(\d+)$/, async (r, m) => {
    const e = store.find('expenses', m[1]);
    if (e && ctx.files) for (const f of e.files || []) await ctx.files.remove(f.id);
    store.remove('expenses', m[1]); return ok({ ok: true });
  });
  const attach = async (r, id) => {
    const e = store.find('expenses', id); if (!e) throw new ApiError('Gasto no encontrado.', 404);
    const ext = FILE_TYPES[r.contentType]; if (!ext) throw new ApiError('Formato no admitido. Sube PDF, JPG, PNG, WebP o XML.', 415);
    if (!r.raw || !r.raw.length) throw new ApiError('El archivo está vacío.');
    if (r.raw.length > MAX_FILE) throw new ApiError('El archivo supera los 12 MB.', 413);
    const name = clean(r.filename || `factura${ext}`, 120);
    const fid = await ctx.files.save(r.raw, r.contentType);
    return store.update('expenses', id, { files: [...(e.files || []), { id: fid, name, mime: r.contentType, size: r.raw.length }] });
  };
  route('POST', /^\/api\/admin\/expenses\/(\d+)\/files$/, async (r, m) => ok(expView(await attach(r, Number(m[1])))));
  route('DELETE', /^\/api\/admin\/expenses\/(\d+)\/files\/([\w-]+)$/, async (r, m) => {
    const e = store.find('expenses', m[1]); if (!e) return fail('Gasto no encontrado.', 404);
    if (ctx.files) await ctx.files.remove(m[2]);
    return ok(expView(store.update('expenses', e.id, { files: (e.files || []).filter((f) => f.id !== m[2]) })));
  });
  route('GET', /^\/api\/admin\/files\/([\w-]+)$/, async (r, m) => {
    const meta = store.list('expenses').flatMap((e) => e.files || []).find((f) => f.id === m[1]);
    const bytes = meta && ctx.files ? await ctx.files.read(m[1]) : null;
    if (!bytes) return fail('Archivo no encontrado.', 404);
    return { status: 200, bytes, headers: { 'Content-Type': meta.mime, 'Content-Disposition': `inline; filename="${meta.name.replace(/"/g, '')}"` } };
  });
  /* Sube una factura, la lee (IA si está activada) y crea un borrador listo para revisar. */
  route('POST', /^\/api\/admin\/expenses\/import$/, async (r) => {
    if (!ctx.files) return fail('No disponible en la vista previa.', 404);
    const ext = FILE_TYPES[r.contentType]; if (!ext) throw new ApiError('Formato no admitido. Sube PDF, JPG, PNG, WebP o XML.', 415);
    if (!r.raw || !r.raw.length) throw new ApiError('El archivo está vacío.');
    if (r.raw.length > MAX_FILE) throw new ApiError('El archivo supera los 12 MB.', 413);
    let extracted = null, note = '';
    if (ctx.extractInvoice) { try { extracted = await ctx.extractInvoice(r.raw, r.contentType); } catch (e) { note = 'No se pudo leer automáticamente: ' + String(e.message || e).slice(0, 160); } }
    else note = 'Lectura automática desactivada: completa los datos a mano.';
    const draft = draftFromExtraction(extracted, getSettings(store), today());
    const fid = await ctx.files.save(r.raw, r.contentType);
    draft.files = [{ id: fid, name: clean(r.filename || `factura${ext}`, 120), mime: r.contentType, size: r.raw.length }];
    draft.notes = note;
    const e = store.insert('expenses', { ...draft, created_at: now().toISOString() });
    return ok({ ...expView(e), duplicate_of: (duplicate(e, store.list('expenses')) || {}).id || null, extracted: !!extracted }, 201);
  });
  route('POST', /^\/api\/admin\/expenses\/confirm$/, (r) => {
    const ids = Array.isArray(r.body?.ids) ? r.body.ids : []; let n = 0;
    for (const id of ids) { const e = store.find('expenses', id); if (e && e.draft && e.supplier && e.total_cents) { store.update('expenses', id, { draft: false }); n++; } }
    return ok({ confirmed: n });
  });

  route('GET', /^\/api\/admin\/accounting$/, (r) => {
    const t = today(), y = Number(r.query.year) || Number(t.slice(0, 4)), q = Number(r.query.q) || quarterOf(t);
    const s = quarterSummary(store, y, q, now());
    return ok({ summary: s, income: incomeLedger(store, s.from, s.to), expenses: expenseLedger(store, s.from, s.to).map(expView), year: y, q, gestoria: getSettings(store).gestoria, mail: !!ctx.mailEnabled });
  });
  route('GET', /^\/api\/admin\/accounting\/package$/, async (r) => {
    const y = Number(r.query.year), q = Number(r.query.q); if (!y || !(q >= 1 && q <= 4)) throw new ApiError('Indica año y trimestre.');
    const { bytes } = await buildQuarterZip(store, y, q, (id) => (ctx.files ? ctx.files.read(id) : null));
    return { status: 200, bytes, headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="Paquete-T${q}-${y}.zip"` } };
  });
  route('POST', /^\/api\/admin\/accounting\/send$/, async (r) => {
    const st = getSettings(store), y = Number(r.body?.year), q = Number(r.body?.q);
    if (!y || !(q >= 1 && q <= 4)) throw new ApiError('Indica año y trimestre.');
    if (!st.gestoria.email) throw new ApiError('Añade el email de la asesoría en Ajustes.');
    if (!ctx.mailEnabled) throw new ApiError('El correo (SMTP) no está configurado en el servidor. Descarga el paquete y envíalo desde tu correo.', 409);
    const { bytes, summary } = await buildQuarterZip(store, y, q, (id) => ctx.files.read(id));
    const body = clean(r.body?.message, 1500) || `Hola${st.gestoria.name ? ' ' + st.gestoria.name : ''},\n\nTe adjunto el paquete del ${q}.º trimestre de ${y} de ${st.legalName || st.businessName}${st.nif ? ' (NIF ' + st.nif + ')' : ''}: libro de ingresos, libro de gastos, resumen y las facturas recibidas.\n\nUn saludo.`;
    await ctx.sendMail({ to: st.gestoria.email, cc: st.gestoria.cc || undefined, subject: `${st.legalName || st.businessName} · Documentación T${q} ${y}`, text: body, attachments: [{ filename: `Paquete-T${q}-${y}.zip`, content: bytes, contentType: 'application/zip' }] });
    store.insert('outbox', { kind: 'gestoria', client_id: null, booking_id: null, to: st.gestoria.email, subject: `Paquete T${q} ${y}`, text: body, status: 'enviado', error: '', created_at: now().toISOString() });
    return ok({ ok: true, to: st.gestoria.email, size: bytes.length, warnings: summary.warnings });
  });

  route('GET', /^\/api\/admin\/cfo$/, () => ok(cfoReport(store, now())));

  /* ───── automatizaciones y bandeja de salida ───── */
  route('GET', /^\/api\/admin\/automations$/, () => {
    const cm = Object.fromEntries(store.list('clients').map((c) => [c.id, c.name]));
    return ok({ config: getSettings(store).automations, mail: !!ctx.mailEnabled, plan: planAutomations(store, ctx, now()).map((p) => ({ ...p, client_name: cm[p.client_id] || '' })),
      outbox: store.list('outbox').sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60).map((o) => ({ ...o, client_name: cm[o.client_id] || '' })) });
  });
  route('POST', /^\/api\/admin\/automations\/run$/, async () => { const r = await runAutomations(store, ctx, now()); return ok({ sent: r.sent, queued: r.queued, failed: r.failed, total: r.plan.length }); });
  route('PATCH', /^\/api\/admin\/outbox\/(\d+)$/, (r, m) => ok(store.update('outbox', m[1], { status: r.body?.status === 'enviado' ? 'enviado' : 'pendiente' })));
  route('POST', /^\/api\/admin\/outbox\/(\d+)\/send$/, async (r, m) => {
    const o = store.find('outbox', m[1]); if (!o) return fail('No encontrado.', 404);
    if (!ctx.mailEnabled) throw new ApiError('El correo (SMTP) no está configurado en el servidor.', 409);
    await ctx.sendMail({ to: o.to, subject: o.subject, text: o.text });
    return ok(store.update('outbox', o.id, { status: 'enviado', error: '' }));
  });

  /* ───── despacho ───── */
  return async function handle(req) {
    const r = { method: req.method, path: req.path, query: req.query || {}, body: req.body, raw: req.raw, contentType: req.contentType || '', filename: req.filename || '', admin: !!req.admin, ip: req.ip || '' };
    try {
      for (const [m, re, fn] of publicRoutes) { if (m === r.method && re.test(r.path)) return await fn(r); }
      const tr = tokenRoute(r); if (tr) return tr;
      if (!r.path.startsWith('/api/admin/')) return fail('No encontrado.', 404);
      if (!r.admin) return fail('No autorizado.', 401);
      for (const [m, re, fn] of A) { if (m !== r.method) continue; const mm = re.exec(r.path); if (mm) return await fn(r, mm); }
      return fail('No encontrado.', 404);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.message, e.status);
      console.error(e);
      return fail('Error interno del servidor.', 500);
    }
  };
}

export { seedData };
