import crypto from 'node:crypto';
import { db, getSettings } from './db.js';

const TZ = process.env.TZ_NAME || 'Europe/Madrid';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIVE = "('pending','confirmed')";

export const isDate = (s) => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

export function nowLocal(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}

export const addDays = (date, n) => {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dow = (date) => new Date(date + 'T00:00:00Z').getUTCDay();
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

export const fmtMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function getService(id) {
  return db.prepare('SELECT * FROM services WHERE id=? AND active=1').get(Number(id));
}

/** Free start times (minutes) for a service on a date. */
export function slotsFor(service, date, { ignoreNotice = false, excludeId = 0 } = {}) {
  const s = getSettings();
  const now = nowLocal();
  const step = Math.max(5, Number(s.slotStep) || 30);
  const buffer = Math.max(0, Number(s.buffer) || 0);
  const notice = Math.max(0, Number(s.minNoticeHours) || 0) * 60;
  const maxDays = Number(s.maxDaysAhead) || 120;

  if (!isDate(date)) return [];
  const diff = dayDiff(now.date, date);
  if (diff < 0 || (!ignoreNotice && diff > maxDays)) return [];
  if (db.prepare('SELECT 1 FROM blocked_dates WHERE date=?').get(date)) return [];

  let hours;
  try { hours = JSON.parse(s.hours)[dow(date)] || []; } catch { hours = []; }

  const busy = db.prepare(
    `SELECT start_min, end_min FROM bookings WHERE date=? AND status IN ${ACTIVE} AND id<>?`
  ).all(date, excludeId);

  const out = [];
  for (const [open, close] of hours) {
    for (let t = open; t + service.duration_min <= close; t += step) {
      if (!ignoreNotice && diff === 0 && t < now.minutes + notice) continue;
      if (!ignoreNotice && diff > 0 && diff * 1440 - now.minutes + t < notice) continue;
      const end = t + service.duration_min;
      if (busy.some((b) => t < b.end_min + buffer && end + buffer > b.start_min)) continue;
      out.push(t);
    }
  }
  return out;
}

export function monthAvailability(service, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const days = [];
  let d = month + '-01';
  while (d.startsWith(month)) {
    if (slotsFor(service, d).length) days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export class BookingError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function createBooking(input, { admin = false } = {}) {
  const s = getSettings();
  const service = getService(input.service_id);
  if (!service) throw new BookingError('El servicio seleccionado no está disponible.');
  const date = input.date;
  const start = Number(input.start_min);
  if (!isDate(date) || !Number.isInteger(start)) throw new BookingError('Fecha u hora no válida.');

  const name = clean(input.name, 80);
  const email = clean(input.email, 120).toLowerCase();
  const phone = clean(input.phone, 24);
  if (name.length < 2) throw new BookingError('Indica tu nombre.');
  if (!EMAIL_RE.test(email)) throw new BookingError('El email no parece válido.');
  if (!/^[+\d][\d\s().-]{6,22}$/.test(phone)) throw new BookingError('El teléfono no parece válido.');

  const location = input.location === 'home' && service.allow_home ? 'home' : 'studio';
  const address = location === 'home' ? clean(input.address, 200) : '';
  if (location === 'home' && address.length < 5) throw new BookingError('Indica la dirección del servicio a domicilio.');

  const token = crypto.randomBytes(16).toString('hex');
  const status = admin ? (input.status === 'pending' ? 'pending' : 'confirmed') : (s.autoConfirm === '1' ? 'confirmed' : 'pending');

  db.exec('BEGIN IMMEDIATE');
  try {
    const free = slotsFor(service, date, { ignoreNotice: admin });
    if (!free.includes(start) && !(admin && input.force)) {
      throw new BookingError('Ese hueco acaba de ocuparse. Por favor, elige otro horario.', 409);
    }
    const r = db.prepare(`INSERT INTO bookings
      (service_id, service_name, price_cents, name, email, phone, date, start_min, end_min, location, address, notes, status, source, token)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      service.id, service.name, service.price_cents, name, email, phone, date, start, start + service.duration_min,
      location, address, clean(input.notes, 600), status, admin ? 'admin' : 'web', token
    );
    db.exec('COMMIT');
    return getBookingById(Number(r.lastInsertRowid));
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const getBookingById = (id) => db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
export const getBookingByToken = (t) =>
  /^[a-f0-9]{32}$/.test(String(t)) ? db.prepare('SELECT * FROM bookings WHERE token=?').get(t) : undefined;

/** Public-safe view of a booking (no internal id). */
export function publicBooking(b) {
  return {
    token: b.token, service: b.service_name, price_cents: b.price_cents, name: b.name, date: b.date,
    start: fmtMin(b.start_min), end: fmtMin(b.end_min), location: b.location, address: b.address, status: b.status
  };
}

export function canCancel(b) {
  if (!['pending', 'confirmed'].includes(b.status)) return false;
  const s = getSettings();
  const now = nowLocal();
  const minsUntil = dayDiff(now.date, b.date) * 1440 + b.start_min - now.minutes;
  return minsUntil >= (Number(s.cancelHours) || 0) * 60;
}

export function ics(b, settings) {
  const stamp = (date, m) => date.replace(/-/g, '') + 'T' + fmtMin(m).replace(':', '') + '00';
  const esc = (t) => String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Noelia Duque Make up Artist//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${b.token}@noeliaduque`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART;TZID=${TZ}:${stamp(b.date, b.start_min)}`, `DTEND;TZID=${TZ}:${stamp(b.date, b.end_min)}`,
    `SUMMARY:${esc(b.service_name + ' · ' + settings.businessName)}`,
    `LOCATION:${esc(b.location === 'home' ? b.address : settings.address || settings.city)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
}
