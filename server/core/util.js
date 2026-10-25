/* Utilidades puras (sin APIs de Node) para fechas, importes, ids y validación. */

export const TZ_DEFAULT = 'Europe/Madrid';
export const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
export const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const diffDays = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
export const dow = (s) => new Date(s + 'T12:00:00Z').getUTCDay();
export const fmtMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const monthOf = (s) => String(s).slice(0, 7);
export const quarterOf = (s) => Math.floor((Number(String(s).slice(5, 7)) - 1) / 3) + 1;

export function nowLocal(d = new Date(), tz = TZ_DEFAULT) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}

export class ApiError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export const randomHex = (bytes = 16) => {
  const a = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
export const cents = (v) => Math.round(Number(v) || 0);
export const eur = (c) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const waPhone = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 9) d = '34' + d; return d; };
