/* Lógica de CRM sin dependencias de servidor: la usa la API (datos de SQLite) y la vista previa del panel (datos en memoria). */

import { pad, isoDate, addDays, diffDays, fmtMin } from './util.js';

const ACTIVE = new Set(['pending', 'proposed', 'confirmed']);
const isMicro = (b) => b.category === 'Micropigmentación' && !/retoque/i.test(b.service_name) && !/consulta/i.test(b.service_name);
const isRetoque = (b) => /retoque/i.test(b.service_name);

export { pad, isoDate, addDays, diffDays, fmtMin };
export const STAGES = {
  lead: 'Contacto', nueva: 'Nueva', cliente: 'Clienta', fiel: 'Fiel', vip: 'VIP', inactiva: 'Inactiva'
};

/** Estadísticas de una clienta a partir de sus citas. */
export function clientStats(client, bookings, today) {
  const mine = bookings.filter((b) => b.client_id === client.id);
  const done = mine.filter((b) => b.status === 'done');
  const future = mine.filter((b) => ACTIVE.has(b.status) && b.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start_min - b.start_min);
  const last = [...done].sort((a, b) => b.date.localeCompare(a.date))[0];
  const spent = mine.reduce((a, b) => a + (b.paid_cents || 0), 0);
  const visits = done.length;
  let stage = 'lead';
  if (mine.length) stage = 'nueva';
  if (visits >= 1) stage = 'cliente';
  if (visits >= 3) stage = 'fiel';
  if (visits >= 5 || spent >= 80000) stage = 'vip';
  if (visits >= 1 && !future.length && last && diffDays(last.date, today) > 120) stage = 'inactiva';
  return {
    visits, spent, avg: visits ? Math.round(spent / Math.max(1, mine.filter((b) => b.paid_cents > 0).length)) : 0,
    last_visit: last ? last.date : null, next: future[0] ? { id: future[0].id, date: future[0].date, start_min: future[0].start_min, service_name: future[0].service_name } : null,
    cancelled: mine.filter((b) => b.status === 'cancelled').length, no_show: mine.filter((b) => b.status === 'no_show').length, stage
  };
}

export const SEGMENTS = [
  { id: 'retoque', label: 'Retoque pendiente', desc: 'Se hicieron una micropigmentación hace entre 5 semanas y 4 meses y aún no tienen retoque.', template: 'retoque' },
  { id: 'inactivas', label: 'Sin venir en 4 meses', desc: 'Última visita hace más de 120 días y sin cita futura.', template: 'inactiva' },
  { id: 'vip', label: 'Clientas VIP', desc: 'Cinco visitas o más, o más de 800 € en total.', template: 'vip' },
  { id: 'cumple', label: 'Cumpleaños este mes', desc: 'Cumplen años en el mes en curso.', template: 'cumple' },
  { id: 'leads', label: 'Contactos sin reserva', desc: 'Pidieron información pero todavía no tienen ninguna cita.', template: 'lead' },
  { id: 'nuevas', label: 'Nuevas (30 días)', desc: 'Dadas de alta en los últimos 30 días.', template: 'bienvenida' },
  { id: 'marketing', label: 'Aceptan novedades', desc: 'Han dado permiso para recibir comunicaciones comerciales.', template: 'novedades' },
];

export function segmentMembers(id, clients, bookings, today) {
  const month = today.slice(5, 7);
  return clients.filter((c) => {
    if (c.archived) return false;
    const st = clientStats(c, bookings, today);
    const mine = bookings.filter((b) => b.client_id === c.id);
    switch (id) {
      case 'retoque': {
        const m = mine.filter((b) => b.status === 'done' && isMicro(b)).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (!m) return false;
        const age = diffDays(m.date, today);
        if (age < 35 || age > 120) return false;
        return !mine.some((b) => isRetoque(b) && b.date >= m.date && b.status !== 'cancelled' && b.status !== 'no_show');
      }
      case 'inactivas': return st.stage === 'inactiva';
      case 'vip': return st.stage === 'vip';
      case 'cumple': return !!c.birthday && c.birthday.slice(5, 7) === month;
      case 'leads': return st.stage === 'lead';
      case 'nuevas': return diffDays(String(c.created_at).slice(0, 10), today) <= 30;
      case 'marketing': return !!c.consent_marketing;
      default: return false;
    }
  });
}

/** Sugerencias de seguimiento (no se repiten durante 30 días tras contactarla). */
export function followups({ clients, bookings, interactions, today }) {
  const out = [];
  const recent = (cid, kind) => interactions.some((i) => i.client_id === cid && i.kind === `seguimiento:${kind}` && diffDays(String(i.created_at).slice(0, 10), today) <= 30);
  for (const c of segmentMembers('retoque', clients, bookings, today)) if (!recent(c.id, 'retoque')) out.push({ type: 'retoque', client_id: c.id, title: 'Proponer retoque', template: 'retoque' });
  for (const c of clients) {
    if (c.archived || !c.birthday) continue;
    const bd = c.birthday.slice(5);
    const d = diffDays(today, `${today.slice(0, 4)}-${bd}`);
    if (d >= 0 && d <= 7 && !recent(c.id, 'cumple')) out.push({ type: 'cumple', client_id: c.id, title: d === 0 ? 'Cumple hoy' : `Cumple en ${d} ${d === 1 ? 'día' : 'días'}`, template: 'cumple' });
  }
  for (const c of segmentMembers('inactivas', clients, bookings, today)) if (!recent(c.id, 'inactiva')) out.push({ type: 'inactiva', client_id: c.id, title: 'Recuperar clienta', template: 'inactiva' });
  for (const c of segmentMembers('leads', clients, bookings, today)) {
    if (diffDays(String(c.created_at).slice(0, 10), today) >= 2 && !recent(c.id, 'lead')) out.push({ type: 'lead', client_id: c.id, title: 'Contacto sin reserva', template: 'lead' });
  }
  const tomorrow = addDays(today, 1);
  for (const b of bookings) if (b.status === 'confirmed' && b.date === tomorrow && !recent(b.client_id, 'recordatorio')) out.push({ type: 'recordatorio', client_id: b.client_id, booking_id: b.id, title: 'Recordar cita de mañana', template: 'recordatorio' });
  return out;
}

export const DEFAULT_TEMPLATES = {
  confirmacion: 'Hola {nombre}, te confirmo tu cita de {servicio} el {fecha} a las {hora} en {estudio}. ¡Te espero!',
  recordatorio: 'Hola {nombre}, te recuerdo tu cita de mañana, {fecha} a las {hora}, para {servicio}. Si no puedes venir, avísame y la movemos.',
  retoque: 'Hola {nombre}, ya ha pasado el tiempo para afinar tu tratamiento. ¿Te reservo el retoque? Puedes elegir día y hora en {web}.',
  cumple: 'Hola {nombre}, ¡feliz cumpleaños! Te deseamos un día precioso. De parte de {estudio}.',
  inactiva: 'Hola {nombre}, hace tiempo que no te vemos por {estudio}. ¿Te apetece que te busque un hueco? Reserva cuando quieras en {web}.',
  vip: 'Hola {nombre}, gracias por confiar en {estudio}. Tienes prioridad para elegir hueco en las próximas semanas: {web}.',
  lead: 'Hola {nombre}, soy Noelia, de {estudio}. Vi que querías información. ¿Te cuento cómo trabajo y te reservo una consulta de diseño?',
  bienvenida: 'Hola {nombre}, bienvenida a {estudio}. Aquí tienes tu enlace para reservar y gestionar tus citas: {web}.',
  novedades: 'Hola {nombre}, tenemos novedades en {estudio}. Te cuento: ',
  resena: 'Hola {nombre}, gracias por tu visita. Si te ha gustado el resultado, ¿me dejas una reseña? Me ayuda muchísimo.',
};

export function renderTemplate(t, vars) {
  return String(t || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

export function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 9) d = '34' + d;
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : '';
}

const ymd = (s) => String(s).slice(0, 10);
const weekStart = (s) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoDate(d); };

export function dashboard({ clients, bookings, tasks, interactions, settings, blocked, today, sug, orders = [] }) {
  const act = bookings.filter((b) => ACTIVE.has(b.status) && b.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start_min - b.start_min);
  const month = today.slice(0, 7);
  const prevMonth = (() => { const d = new Date(today + 'T12:00:00'); d.setMonth(d.getMonth() - 1, 1); return isoDate(d).slice(0, 7); })();
  const paid = (m) => bookings.filter((b) => b.date.startsWith(m)).reduce((a, b) => a + (b.paid_cents || 0), 0) + orders.filter((o) => (o.paid_date || '').startsWith(m)).reduce((a, o) => a + (o.paid_cents || 0), 0);
  const finished = bookings.filter((b) => ['done', 'no_show'].includes(b.status));
  const last90 = finished.filter((b) => diffDays(b.date, today) <= 90 && diffDays(b.date, today) >= 0);
  const noShow = last90.length ? Math.round((last90.filter((b) => b.status === 'no_show').length / last90.length) * 100) : 0;
  const withPay = bookings.filter((b) => b.paid_cents > 0 && diffDays(b.date, today) <= 90);
  const ticket = withPay.length ? Math.round(withPay.reduce((a, b) => a + b.paid_cents, 0) / withPay.length) : 0;
  const ws0 = weekStart(today);
  const weekly = [];
  for (let i = 7; i >= 0; i--) {
    const s = addDays(ws0, -7 * i), e = addDays(s, 6);
    const inW = bookings.filter((b) => b.date >= s && b.date <= e);
    weekly.push({ week: s, revenue: inW.reduce((a, b) => a + (b.paid_cents || 0), 0), count: inW.filter((b) => ['done', 'confirmed', 'pending'].includes(b.status)).length });
  }
  const byS = {};
  for (const b of bookings.filter((x) => x.date.startsWith(month) && ['done', 'confirmed'].includes(x.status))) { byS[b.service_name] = (byS[b.service_name] || 0) + (b.paid_cents || b.price_cents || 0); }
  const topServices = Object.entries(byS).map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents).slice(0, 5);
  // ocupación de los próximos 7 días
  let openMin = 0, usedMin = 0;
  const hours = typeof settings.hours === 'string' ? JSON.parse(settings.hours) : settings.hours || {};
  const blockedSet = new Set((blocked || []).map((b) => b.date));
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    if (blockedSet.has(d)) continue;
    const dow = new Date(d + 'T12:00:00').getDay();
    openMin += (hours[dow] || []).reduce((a, [s, e]) => a + (e - s), 0);
    usedMin += bookings.filter((b) => b.date === d && ACTIVE.has(b.status)).reduce((a, b) => a + (b.end_min - b.start_min), 0);
  }
  const stages = {};
  for (const c of clients.filter((x) => !x.archived)) { const s = clientStats(c, bookings, today).stage; stages[s] = (stages[s] || 0) + 1; }
  const cmap = Object.fromEntries(clients.map((c) => [c.id, c]));
  return {
    today: act.filter((b) => b.date === today).length,
    next: act.slice(0, 6).map((b) => ({ ...b, client_name: (cmap[b.client_id] || {}).name || b.name })),
    kpis: {
      pending: act.filter((b) => b.status === 'pending').length, proposed: act.filter((b) => b.status === 'proposed').length, upcoming: act.length,
      month_revenue: paid(month), prev_revenue: paid(prevMonth),
      to_collect: bookings.filter((b) => b.status === 'done' && (b.paid_cents || 0) < b.price_cents).reduce((a, b) => a + (b.price_cents - (b.paid_cents || 0)), 0),
      ticket, no_show_rate: noShow,
      occupancy: openMin ? Math.round((usedMin / openMin) * 100) : 0,
      clients: clients.filter((c) => !c.archived).length,
      new_clients_30: clients.filter((c) => diffDays(ymd(c.created_at), today) <= 30).length,
    },
    weekly, top_services: topServices, stages,
    tasks: tasks.filter((t) => !t.done).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 8).map((t) => ({ ...t, client_name: (cmap[t.client_id] || {}).name || '' })),
    followups: (sug || []).length,
    activity: [...interactions].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10).map((i) => ({ ...i, client_name: (cmap[i.client_id] || {}).name || '' })),
  };
}

export function reports({ clients, bookings, from, to, today }) {
  const inR = bookings.filter((b) => b.date >= from && b.date <= to);
  const real = inR.filter((b) => ['done', 'confirmed', 'pending'].includes(b.status));
  const revenue = inR.reduce((a, b) => a + (b.paid_cents || 0), 0);
  const byMonth = {}, byService = {}, byDow = [0, 0, 0, 0, 0, 0, 0], status = {}, bySource = {};
  for (const b of inR) {
    status[b.status] = (status[b.status] || 0) + 1;
    if (!['done', 'confirmed', 'pending'].includes(b.status)) continue;
    const m = b.date.slice(0, 7);
    byMonth[m] = byMonth[m] || { revenue: 0, count: 0 }; byMonth[m].revenue += b.paid_cents || 0; byMonth[m].count++;
    const s = (byService[b.service_name] ||= { count: 0, revenue: 0, minutes: 0 }); s.count++; s.revenue += b.paid_cents || 0; s.minutes += b.end_min - b.start_min;
    byDow[(new Date(b.date + 'T12:00:00').getDay() + 6) % 7]++;
  }
  for (const c of clients) { const k = c.source || 'otro'; bySource[k] = (bySource[k] || 0) + 1; }
  const firstSeen = {};
  for (const b of bookings.filter((x) => ['done', 'confirmed', 'pending'].includes(x.status))) if (!firstSeen[b.client_id] || b.date < firstSeen[b.client_id]) firstSeen[b.client_id] = b.date;
  const clientsIn = new Set(real.map((b) => b.client_id));
  const newC = [...clientsIn].filter((id) => firstSeen[id] >= from && firstSeen[id] <= to).length;
  const top = clients.map((c) => ({ id: c.id, name: c.name, ...clientStats(c, bookings, today) })).sort((a, b) => b.spent - a.spent).slice(0, 8).filter((c) => c.spent > 0);
  return {
    from, to, bookings: real.length, revenue, avg_ticket: real.filter((b) => b.paid_cents > 0).length ? Math.round(revenue / real.filter((b) => b.paid_cents > 0).length) : 0,
    new_clients: newC, returning_clients: clientsIn.size - newC,
    by_month: Object.entries(byMonth).sort().map(([month, v]) => ({ month, ...v })),
    by_service: Object.entries(byService).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue || b.count - a.count),
    by_weekday: byDow, status, by_source: Object.entries(bySource).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count), top_clients: top,
  };
}

export function toCSV(rows, cols) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '﻿' + [cols.map((c) => esc(c.label)).join(';'), ...rows.map((r) => cols.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(';'))].join('\r\n');
}
