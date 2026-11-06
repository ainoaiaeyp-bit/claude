export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmt = {};
const nf = (d) => fmt[d] || (fmt[d] = new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' }));
export const n = (x, d = 2) => nf(d).format(Number.isFinite(x) ? x : 0).replace('-', '−');
export const eur = (x, d = 2) => n(x, d) + ' €';
export const eurkwh = (x, d = 3) => n(x, d) + ' €/kWh';
export const pct = (x, d = 0) => n(x, d) + ' %';

export const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};

// Cambia por ruta "a.b.0.c" en un objeto
export function setP(o, path, v) {
  const ks = path.split('.');
  let c = o;
  for (let i = 0; i < ks.length - 1; i++) c = c[ks[i]];
  c[ks[ks.length - 1]] = v;
}
export function getP(o, path) {
  return path.split('.').reduce((c, k) => (c == null ? c : c[k]), o);
}

let tt;
export function aviso(txt, err = false) {
  const t = $('#toast');
  t.textContent = txt;
  t.className = 'toast on' + (err ? ' err' : '');
  clearTimeout(tt);
  tt = setTimeout(() => { t.className = 'toast'; }, 3200);
}

export const hoyISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export async function api(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

export const IC = {
  hoy: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  sim: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7.5h7M8.5 12h2M13.5 12h2M8.5 16h2M13.5 16h2"/></svg>',
  fac: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  ale: '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
  pdf: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>',
  mas: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  sig: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  euro: '<svg viewBox="0 0 24 24"><path d="M17 6.5A6 6 0 1 0 17 17.5M4 10h9M4 14h9"/></svg>',
  medidor: '<svg viewBox="0 0 24 24"><path d="M4 16a8 8 0 1 1 16 0M12 16l4-5"/></svg>',
  etiqueta: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/></svg>',
  persona: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  panal: '<svg viewBox="0 0 48 48"><path d="M24 3 42 13.5v21L24 45 6 34.5v-21z" fill="currentColor"/><path d="m26.5 12-9.5 14.5h6.5l-1.5 10 10-15h-6.5z" fill="#fff"/></svg>',
  bajo: '<svg viewBox="0 0 24 24"><path d="M5 8l7 8 3-3 5 5M20 12v5h-5"/></svg>',
};
