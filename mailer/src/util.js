import { randomBytes } from 'node:crypto';

export const now = () => new Date().toISOString();
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const newToken = () => randomBytes(16).toString('hex');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(String(s));

function part(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === null || v === undefined || v === false) return '';
  return esc(v);
}
/** Plantilla etiquetada: escapa todo salvo lo marcado con raw() o devuelto por html``. */
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += part(vals[i]); });
  return new Raw(out);
}

export const EMAIL_RE = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/;
export const normalizeEmail = (e) => String(e ?? '').trim().toLowerCase();
export const isEmail = (e) => e.length <= 254 && EMAIL_RE.test(e);

/** Nombre de remitente seguro para la cabecera From. */
export function formatFrom(name, email) {
  const n = String(name ?? '').replace(/["<>\r\n]/g, '').trim();
  return n ? `${n} <${email}>` : email;
}
