/* Automatizaciones por correo: confirmación, recordatorio, reseña, retoque, cumpleaños y reactivación.
   Se ejecutan periódicamente. Sin SMTP configurado, los mensajes quedan en la bandeja de salida listos para enviar a mano. */
import { addDays, diffDays, fmtMin, nowLocal } from './util.js';
import { getSettings, logInteraction } from './booking.js';
import { clientStats, renderTemplate, segmentMembers } from './crm.js';
import { ensureReferralCode } from './shop.js';

const longDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export function templateVars(st, client, booking, ctx) {
  const web = st.siteUrl || ctx.siteUrl || '';
  return {
    nombre: (client.name || '').split(' ')[0] || 'hola', estudio: st.businessName, direccion: st.address || st.city, web,
    servicio: booking ? booking.service_name : '', fecha: booking ? longDate(booking.date) : '', hora: booking ? fmtMin(booking.start_min) : '',
    mensaje: (booking && booking.proposal_message) || '', fecha_anterior: booking && booking.prev_date ? longDate(booking.prev_date) : '', hora_anterior: booking && booking.prev_start_min != null ? fmtMin(booking.prev_start_min) : '',
    enlace_amiga: client.referral_code && web ? `${web}/?ref=${client.referral_code}` : web, importe_regalo: `${((Number(st.referralRewardCents) || 0) / 100).toFixed(0)} €`,
    enlace: booking && web ? `${web}/cita?t=${booking.token}` : web,
  };
}

const footer = (st, client, ctx, marketing) => {
  const web = st.siteUrl || ctx.siteUrl || '';
  return marketing && web ? `\n\n—\nSi no quieres recibir más novedades, puedes darte de baja aquí: ${web}/baja?t=${client.token}` : '';
};

/** Calcula qué mensajes tocan ahora. No envía nada. */
export function planAutomations(store, ctx, now = new Date()) {
  const st = getSettings(store), A = st.automations, n = nowLocal(now), today = n.date;
  const clients = store.list('clients'), bookings = store.list('bookings'), inter = store.list('interactions');
  const cmap = Object.fromEntries(clients.map((c) => [c.id, c]));
  const sent = new Set(inter.filter((i) => i.kind.startsWith('auto:')).map((i) => i.kind + '|' + (i.ref || '')));
  const plan = [];
  const add = (type, key, client, booking, marketing) => {
    const cfg = A[type];
    if (!cfg || !cfg.on || !client || !client.email || client.archived) return;
    if (marketing && !client.consent_marketing) return;
    if (sent.has(`auto:${type}|${key}`)) return;
    const v = templateVars(st, client, booking, ctx);
    plan.push({ type, key: String(key), client_id: client.id, to: client.email, subject: renderTemplate(cfg.subject, v), text: renderTemplate(cfg.body, v) + footer(st, client, ctx, marketing), marketing: !!marketing, booking_id: booking ? booking.id : null });
  };
  for (const b of bookings) {
    const c = cmap[b.client_id];
    if (b.status === 'confirmed' && b.created_at && diffDays(String(b.created_at).slice(0, 10), today) <= 1) add('confirmation', b.id, c, b, false);
    if (b.status === 'confirmed' && b.date >= today) {
      const minsUntil = diffDays(today, b.date) * 1440 + b.start_min - n.minutes;
      if (minsUntil > 0 && minsUntil <= (A.reminder.hoursBefore || 24) * 60) add('reminder', b.id, c, b, false);
    }
    if (b.status === 'done' && diffDays(b.date, today) >= (A.review.daysAfter || 2) && diffDays(b.date, today) <= (A.review.daysAfter || 2) + 5) add('review', b.id, c, b, false);
  }
  if (A.referral_invite && st.referralOn !== false) for (const b of bookings) {
    const c = cmap[b.client_id], d = A.referral_invite.daysAfter || 7;
    if (b.status === 'done' && c && c.email && diffDays(b.date, today) >= d && diffDays(b.date, today) <= d + 5) { add('referral_invite', c.id, ensureReferralCode(store, c), null, true); }
  }
  for (const c of segmentMembers('retoque', clients, bookings, today)) add('retoque', `${c.id}:${today.slice(0, 7)}`, c, null, false);
  for (const c of clients) {
    if (c.birthday && c.birthday.slice(5) === today.slice(5)) add('birthday', `${c.id}:${today.slice(0, 4)}`, c, null, true);
  }
  for (const c of segmentMembers('inactivas', clients, bookings, today)) add('reactivation', `${c.id}:${today.slice(0, 7)}`, c, null, true);
  return plan;
}

/** Ejecuta el plan: envía por SMTP si hay, o deja los mensajes pendientes en la bandeja de salida. */
export async function runAutomations(store, ctx, now = new Date(), { dry = false } = {}) {
  const plan = planAutomations(store, ctx, now);
  if (dry) return { plan, sent: 0, queued: 0, failed: 0 };
  let sent = 0, queued = 0, failed = 0;
  for (const m of plan) {
    let status = 'pendiente', error = '';
    if (ctx.mailEnabled) {
      try { await ctx.sendMail({ to: m.to, subject: m.subject, text: m.text }); status = 'enviado'; sent++; }
      catch (e) { status = 'error'; error = String(e.message || e).slice(0, 200); failed++; }
    } else queued++;
    store.insert('outbox', { kind: m.type, client_id: m.client_id, booking_id: m.booking_id, to: m.to, subject: m.subject, text: m.text, status, error, created_at: now.toISOString() });
    if (status !== 'error') logInteraction(store, m.client_id, `auto:${m.type}`, `${status === 'enviado' ? 'Email enviado' : 'Email preparado'}: ${m.subject}`, now, { ref: m.key });
  }
  return { plan, sent, queued, failed };
}

/** Envía de inmediato un aviso puntual (propuesta, rechazo...). Sin SMTP queda preparado en la bandeja de salida. */
export async function sendNow(store, ctx, type, booking, now = new Date(), extra = {}) {
  const st = getSettings(store), cfg = st.automations[type], client = store.find('clients', booking.client_id);
  const to = (client && client.email) || booking.email;
  if (!cfg || !cfg.on || !to) return { status: 'omitido' };
  const v = { ...templateVars(st, client || { name: booking.name }, { ...booking, ...extra }, ctx), ...(extra.mensaje !== undefined ? { mensaje: extra.mensaje } : {}) };
  const subject = renderTemplate(cfg.subject, v), text = renderTemplate(cfg.body, v).replace(/\n{3,}/g, '\n\n');
  let status = 'pendiente', error = '';
  if (ctx.mailEnabled) { try { await ctx.sendMail({ to, subject, text }); status = 'enviado'; } catch (e) { status = 'error'; error = String(e.message || e).slice(0, 200); } }
  store.insert('outbox', { kind: type, client_id: booking.client_id, booking_id: booking.id, to, subject, text, status, error, created_at: now.toISOString() });
  if (status !== 'error') logInteraction(store, booking.client_id, `auto:${type}`, `${status === 'enviado' ? 'Email enviado' : 'Email preparado'}: ${subject}`, now, { ref: String(booking.id) });
  return { status };
}

/** Envía un aviso con plantilla a una dirección concreta (bonos, regalos...). Sin SMTP queda en la bandeja de salida. */
export async function sendTemplate(store, ctx, type, { to, client_id = null, vars = {} }, now = new Date()) {
  const st = getSettings(store), cfg = st.automations[type];
  if (!cfg || !cfg.on || !to) return { status: 'omitido' };
  const web = st.siteUrl || ctx.siteUrl || '';
  const v = { estudio: st.businessName, web, direccion: st.address || st.city, ...vars };
  const subject = renderTemplate(cfg.subject, v), text = renderTemplate(cfg.body, v).replace(/\n{3,}/g, '\n\n');
  let status = 'pendiente', error = '';
  if (ctx.mailEnabled) { try { await ctx.sendMail({ to, subject, text }); status = 'enviado'; } catch (e) { status = 'error'; error = String(e.message || e).slice(0, 200); } }
  store.insert('outbox', { kind: type, client_id, booking_id: null, to, subject, text, status, error, created_at: now.toISOString() });
  return { status };
}

/** Prueba de baja de comunicaciones comerciales por token. */
export function unsubscribe(store, token, now = new Date()) {
  const c = store.list('clients').find((x) => x.token === token);
  if (!c) return null;
  store.update('clients', c.id, { consent_marketing: false });
  logInteraction(store, c.id, 'nota', 'Se dio de baja de las comunicaciones comerciales', now);
  return c;
}
