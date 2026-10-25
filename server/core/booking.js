/* Reglas de reserva: disponibilidad, alta, cambio de hora, estados y cancelación. Puro y sin dependencias de Node. */
import { ApiError, isDate, addDays, diffDays, dow, fmtMin, nowLocal, clean, EMAIL_RE, randomHex } from './util.js';
import { DEFAULT_SETTINGS } from './defaults.js';

const ACTIVE = ['pending', 'proposed', 'confirmed'];
export const STATUSES = ['pending', 'proposed', 'confirmed', 'cancelled', 'done', 'no_show'];

export function getSettings(store) {
  const cur = store.settings(), out = { ...DEFAULT_SETTINGS };
  for (const [k, v] of Object.entries(cur)) {
    if (k.startsWith('_')) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && typeof DEFAULT_SETTINGS[k] === 'object' && k !== 'hours' ? { ...DEFAULT_SETTINGS[k], ...v } : v;
  }
  return out;
}

export function logInteraction(store, client_id, kind, text, now, extra = {}) {
  if (!client_id) return null;
  return store.insert('interactions', { client_id, kind, text: clean(text, 600), created_at: now.toISOString(), ...extra });
}

export function findService(store, id, onlyActive = true) {
  const s = store.find('services', Number(id));
  return s && (!onlyActive || s.active) ? s : undefined;
}

/** Horas de inicio libres (minutos desde medianoche) para un servicio en una fecha. */
export function slotsFor(store, service, date, { ignoreNotice = false, excludeId = 0, now = new Date() } = {}) {
  const s = getSettings(store), n = nowLocal(now);
  const step = Math.max(5, Number(s.slotStep) || 30), buffer = Math.max(0, Number(s.buffer) || 0);
  const notice = Math.max(0, Number(s.minNoticeHours) || 0) * 60, maxDays = Number(s.maxDaysAhead) || 120;
  if (!isDate(date)) return [];
  const diff = diffDays(n.date, date);
  if (diff < 0 || (!ignoreNotice && diff > maxDays)) return [];
  if (store.find('blocked', date)) return [];
  const hours = (s.hours && s.hours[dow(date)]) || [];
  const busy = store.list('bookings').filter((b) => b.date === date && ACTIVE.includes(b.status) && b.id !== excludeId);
  const out = [];
  for (const [open, close] of hours) {
    for (let t = open; t + service.duration_min <= close; t += step) {
      if (!ignoreNotice && diff === 0 && t < n.minutes + notice) continue;
      if (!ignoreNotice && diff > 0 && diff * 1440 - n.minutes + t < notice) continue;
      const end = t + service.duration_min;
      if (busy.some((b) => t < b.end_min + buffer && end + buffer > b.start_min)) continue;
      out.push(t);
    }
  }
  return out;
}

export function monthAvailability(store, service, month, now = new Date()) {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const days = [];
  let d = month + '-01';
  while (d.startsWith(month)) { if (slotsFor(store, service, d, { now }).length) days.push(d); d = addDays(d, 1); }
  return days;
}

/** Busca o crea la ficha de clienta por email (o teléfono). */
export function upsertClient(store, { name, email, phone, source = 'web', marketing = false }, now) {
  const mail = String(email || '').toLowerCase();
  let c = store.list('clients').find((x) => (mail && x.email === mail) || (!mail && phone && x.phone && x.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')));
  if (c) {
    const patch = {};
    if (!c.name) patch.name = name;
    if (!c.phone && phone) patch.phone = phone;
    if (!c.email && mail) patch.email = mail;
    if (marketing && !c.consent_marketing) { patch.consent_marketing = true; patch.consent_date = now.toISOString(); }
    if (c.archived) patch.archived = false;
    return Object.keys(patch).length ? store.update('clients', c.id, patch) : c;
  }
  return store.insert('clients', {
    name, email: mail, phone: phone || '', birthday: '', source, tags: [], notes: '', health: '', allergies: '', consent_marketing: !!marketing,
    consent_date: marketing ? now.toISOString() : '', token: randomHex(12), archived: false, created_at: now.toISOString(),
  });
}

export function createBooking(store, input, { admin = false, now = new Date() } = {}) {
  const s = getSettings(store);
  if (!admin && s.bookingsOpen === false) throw new ApiError(s.bookingsClosedMessage || 'Las reservas online están pausadas.', 403);
  const service = findService(store, input.service_id);
  if (!service) throw new ApiError('El servicio seleccionado no está disponible.');
  const date = input.date, start = Number(input.start_min);
  if (!isDate(date) || !Number.isInteger(start)) throw new ApiError('Fecha u hora no válida.');
  const name = clean(input.name, 80), email = clean(input.email, 120).toLowerCase(), phone = clean(input.phone, 24);
  if (name.length < 2) throw new ApiError('Indica tu nombre.');
  if (!EMAIL_RE.test(email)) throw new ApiError('El email no parece válido.');
  if (!/^[+\d][\d\s().-]{6,22}$/.test(phone)) throw new ApiError('El teléfono no parece válido.');
  const location = input.location === 'home' && service.allow_home ? 'home' : 'studio';
  const address = location === 'home' ? clean(input.address, 200) : '';
  if (location === 'home' && address.length < 5) throw new ApiError('Indica la dirección del servicio a domicilio.');
  const free = slotsFor(store, service, date, { ignoreNotice: admin, now });
  if (!free.includes(start) && !(admin && input.force)) throw new ApiError('Ese hueco acaba de ocuparse. Por favor, elige otro horario.', 409);
  const client = upsertClient(store, { name, email, phone, source: admin ? 'manual' : 'web', marketing: !!input.marketing }, now);
  const status = admin ? (input.status === 'pending' ? 'pending' : 'confirmed') : (s.autoConfirm ? 'confirmed' : 'pending');
  const b = store.insert('bookings', {
    client_id: client.id, service_id: service.id, service_name: service.name, category: service.category, price_cents: service.price_cents,
    paid_cents: 0, pay_method: '', name, email, phone, date, start_min: start, end_min: start + service.duration_min, location, address,
    notes: clean(input.notes, 600), internal_notes: '', status, source: admin ? 'admin' : 'web', token: randomHex(16), created_at: now.toISOString(),
  });
  logInteraction(store, client.id, 'cita', `${admin ? 'Cita creada' : 'Reserva online'}: ${service.name} el ${date} a las ${fmtMin(start)}`, now, { booking_id: b.id });
  return b;
}

export function setStatus(store, id, status, now = new Date()) {
  const b = store.find('bookings', id);
  if (!b) throw new ApiError('Cita no encontrada.', 404);
  if (!STATUSES.includes(status)) throw new ApiError('Estado no válido.');
  if (b.status === status) return b;
  const nb = store.update('bookings', id, { status });
  const label = { pending: 'pendiente', proposed: 'con propuesta de otra hora', confirmed: 'confirmada', cancelled: 'cancelada', done: 'realizada', no_show: 'no asistió' }[status];
  logInteraction(store, b.client_id, 'cita', `Cita ${label}: ${b.service_name} el ${b.date}`, now, { booking_id: b.id });
  return nb;
}

export function moveBooking(store, id, { date, start_min, force = false }, now = new Date()) {
  const b = store.find('bookings', id);
  if (!b) throw new ApiError('Cita no encontrada.', 404);
  const service = findService(store, b.service_id, false);
  if (!isDate(date) || !Number.isInteger(Number(start_min))) throw new ApiError('Fecha u hora no válida.');
  const t = Number(start_min);
  if (!force && !slotsFor(store, service, date, { ignoreNotice: true, excludeId: b.id, now }).includes(t)) throw new ApiError('Ese hueco no está libre.', 409);
  const nb = store.update('bookings', id, { date, start_min: t, end_min: t + (b.end_min - b.start_min) });
  logInteraction(store, b.client_id, 'cita', `Cita movida: ${b.service_name} pasa a ${date} a las ${fmtMin(t)}`, now, { booking_id: b.id });
  return nb;
}

/** Propone otra fecha u hora: reserva el hueco nuevo y deja la cita a la espera de que la clienta responda. */
export function proposeBooking(store, id, { date, start_min, message = '', force = false }, now = new Date()) {
  const b = store.find('bookings', id);
  if (!b) throw new ApiError('Cita no encontrada.', 404);
  if (!['pending', 'proposed'].includes(b.status)) throw new ApiError('Solo se puede proponer otra hora en una solicitud pendiente.');
  const service = findService(store, b.service_id, false);
  const t = Number(start_min);
  if (!isDate(date) || !Number.isInteger(t)) throw new ApiError('Fecha u hora no válida.');
  if (!force && !slotsFor(store, service, date, { ignoreNotice: true, excludeId: b.id, now }).includes(t)) throw new ApiError('Ese hueco no está libre.', 409);
  const keep = b.status === 'proposed' ? { prev_date: b.prev_date, prev_start_min: b.prev_start_min } : { prev_date: b.date, prev_start_min: b.start_min };
  const nb = store.update('bookings', id, { ...keep, date, start_min: t, end_min: t + (b.end_min - b.start_min), status: 'proposed', proposal_message: clean(message, 500), proposed_at: now.toISOString() });
  logInteraction(store, b.client_id, 'cita', `Propuesta de otra hora: ${b.service_name} el ${date} a las ${fmtMin(t)} (pidió ${keep.prev_date} a las ${fmtMin(keep.prev_start_min)})`, now, { booking_id: b.id });
  return nb;
}

/** La clienta acepta o rechaza la propuesta desde su enlace. */
export function answerProposal(store, b, accept, now = new Date()) {
  if (b.status !== 'proposed') throw new ApiError('Esta cita no tiene ninguna propuesta pendiente.', 409);
  const nb = store.update('bookings', b.id, { status: accept ? 'confirmed' : 'cancelled' });
  logInteraction(store, b.client_id, 'cita', accept ? `Aceptó la nueva hora: ${b.service_name} el ${b.date} a las ${fmtMin(b.start_min)}` : `Rechazó la propuesta y la cita queda cancelada (${b.service_name})`, now, { booking_id: b.id });
  return nb;
}

export function canCancel(store, b, now = new Date()) {
  if (!ACTIVE.includes(b.status)) return false;
  const s = getSettings(store), n = nowLocal(now);
  return diffDays(n.date, b.date) * 1440 + b.start_min - n.minutes >= (Number(s.cancelHours) || 0) * 60;
}

export function publicBooking(b) {
  return { token: b.token, service: b.service_name, price_cents: b.price_cents, name: b.name, date: b.date, start: fmtMin(b.start_min), end: fmtMin(b.end_min), location: b.location, address: b.address, status: b.status, proposal: b.status === 'proposed' ? { message: b.proposal_message || '', prev_date: b.prev_date, prev_start: fmtMin(b.prev_start_min) } : null };
}

export function icsFor(b, settings) {
  const stamp = (date, m) => date.replace(/-/g, '') + 'T' + fmtMin(m).replace(':', '') + '00';
  const esc = (t) => String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Noelia Duque//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${b.token}@noeliaduque`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART;TZID=Europe/Madrid:${stamp(b.date, b.start_min)}`, `DTEND;TZID=Europe/Madrid:${stamp(b.date, b.end_min)}`,
    `SUMMARY:${esc(b.service_name + ' · ' + settings.businessName)}`, `LOCATION:${esc(b.location === 'home' ? b.address : settings.address || settings.city)}`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
