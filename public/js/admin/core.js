/* Utilidades compartidas del panel: API, formato, diálogos, panel lateral, gráficos. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = (n) => String(n).padStart(2, '0');
export const eur = (c, dec = true) => ((c || 0) / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 });
export const eur0 = (c) => eur(c, false);
export const fm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); };
export const today = () => isoLocal(new Date());
export const dateLong = (s) => new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
export const dateShort = (s) => (s ? new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const monthName = (ym) => new Date(ym + '-01T12:00:00').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).replace('.', '');
export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const STATUS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', done: 'Realizada', no_show: 'No asistió' };
export const STAGE = { lead: 'Contacto', nueva: 'Nueva', cliente: 'Clienta', fiel: 'Fiel', vip: 'VIP', inactiva: 'Inactiva' };
export const badge = (kind, text) => `<span class="badge b-${kind}">${esc(text)}</span>`;
export const initials = (n) => String(n).split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

/* ───── API ───── */
let onUnauthorized = () => {};
export const setUnauthorized = (fn) => { onUnauthorized = fn; };
export async function api(url, opts = {}) {
  const { method = 'GET', body, raw, type, filename, blob } = opts;
  const init = { method, headers: {} };
  if (raw) { init.body = raw; init.headers['Content-Type'] = type || raw.type || 'application/octet-stream'; if (filename) init.headers['X-Filename'] = encodeURIComponent(filename); }
  else if (body !== undefined) { init.body = JSON.stringify(body); init.headers['Content-Type'] = 'application/json'; }
  const r = await fetch(url, init);
  if (r.status === 401 && !url.endsWith('/login')) { onUnauthorized(); throw new Error('Sesión caducada'); }
  if (blob) { if (!r.ok) throw new Error('No se pudo descargar'); return r.blob(); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}
export const qs = (o) => Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

/** Descarga un recurso de la API como archivo. */
export async function download(url, filename) {
  if (window.__preview?.download) return window.__preview.download(url, filename);
  const b = await api(url, { blob: true });
  const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ───── avisos y diálogos ───── */
let toastT;
export function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), 3200); }
export const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

const dlg = () => $('#dlg'), dform = () => $('#dlg-form');
export function openDialog(html, onSubmit, { submit = 'Guardar', wide = false } = {}) {
  const f = dform();
  f.innerHTML = html + `<div class="dlg-actions"><button type="button" class="btn ghost" data-x>Cancelar</button>${submit ? `<button class="btn">${esc(submit)}</button>` : ''}</div>`;
  $('[data-x]', f).onclick = () => dlg().close();
  f.onsubmit = guard(async (e) => { e.preventDefault(); await onSubmit(formValues(f), f); dlg().close(); });
  dlg().style.width = wide ? 'min(860px,94vw)' : '';
  dlg().showModal();
  return f;
}
export const closeDialog = () => dlg().close();
export function confirmBox(title, text, action, { danger = true, label = 'Confirmar' } = {}) {
  const f = dform();
  f.innerHTML = `<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p><div class="dlg-actions"><button type="button" class="btn ghost" data-x>Cancelar</button><button class="btn ${danger ? 'danger' : ''}">${esc(label)}</button></div>`;
  $('[data-x]', f).onclick = () => dlg().close();
  f.onsubmit = guard(async (e) => { e.preventDefault(); await action(); dlg().close(); });
  dlg().style.width = ''; dlg().showModal();
}
export function formValues(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked; else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value;
  }
  return o;
}

/* panel lateral */
export function openDrawer(html) {
  const d = $('#drawer'); d.innerHTML = `<button class="btn ghost sm close" data-close>Cerrar ✕</button>` + html;
  d.classList.add('open'); $('#drawer-bg').classList.add('open'); d.setAttribute('aria-hidden', 'false');
  $('[data-close]', d).onclick = closeDrawer; $('#drawer-bg').onclick = closeDrawer;
  return d;
}
export function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-bg').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); }

/* ───── gráficos ───── */
export function barChart(items, { fmt = eur0, cur = -1 } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars">${items.map((i, k) => `<div class="b ${k === cur ? 'cur' : ''}"><u>${i.value ? esc(fmt(i.value)) : ''}</u><i style="height:${Math.max(1, (i.value / max) * 100 * 0.8)}%"></i><em>${esc(i.label)}</em></div>`).join('')}</div>`;
}
export function hbars(items, { fmt = eur0, cls = '' } = {}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return items.map((i) => `<div class="hbar ${i.cls || cls}"><span>${esc(i.label)}</span><div class="track"><i style="width:${(i.value / max) * 100}%"></i></div><b class="mono">${esc(fmt(i.value))}</b></div>`).join('') || '<p class="muted small">Sin datos todavía.</p>';
}
export const delta = (cur, prev) => {
  if (!prev) return '';
  const p = Math.round(((cur - prev) / prev) * 100);
  return `<small class="delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} % vs mes anterior</small>`;
};
export const empty = (title, text) => `<div class="empty"><b>${esc(title)}</b>${esc(text || '')}</div>`;
export const wa = (url, label = 'WhatsApp') => (url ? `<a class="btn sm ghost" href="${esc(url)}" target="_blank" rel="noopener">${label}</a>` : '');
