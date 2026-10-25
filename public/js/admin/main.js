import { $, $$, api, setUnauthorized, esc, toast, closeDrawer } from './core.js';
import { drawTabs, bindTitle, labelTables, bindGestures } from './shell.js';

const VIEWS = [
  { group: 'Día a día' },
  { id: 'resumen', label: 'Resumen', load: () => import('./resumen.js') },
  { id: 'agenda', label: 'Agenda', load: () => import('./agenda.js'), badge: 'pending' },
  { id: 'clientas', label: 'Clientas', load: () => import('./clientas.js') },
  { id: 'seguimiento', label: 'Seguimiento', load: () => import('./seguimiento.js'), badge: 'followups' },
  { group: 'Dinero' },
  { id: 'resultados', label: 'Resultados', load: () => import('./resultados.js') },
  { id: 'tienda', label: 'Bonos y tienda', load: () => import('./tienda.js'), badge: 'extras' },
  { id: 'contabilidad', label: 'Contabilidad', load: () => import('./contabilidad.js'), badge: 'drafts' },
  { id: 'rentabilidad', label: 'Rentabilidad (CFO)', load: () => import('./cfo.js') },
  { id: 'informes', label: 'Informes', load: () => import('./informes.js') },
  { group: 'Configuración' },
  { id: 'automatizaciones', label: 'Automatizaciones', load: () => import('./automatizaciones.js'), badge: 'outbox_pending' },
  { id: 'servicios', label: 'Servicios y costes', load: () => import('./servicios.js') },
  { id: 'horarios', label: 'Horarios y bloqueos', load: () => import('./horarios.js') },
  { id: 'portfolio', label: 'Portfolio', load: () => import('./portfolio.js') },
  { id: 'ajustes', label: 'Ajustes', load: () => import('./ajustes.js') },
];

const nav = $('#nav'), main = $('#main');
let current = '', counts = {}, token = 0;

function drawNav() {
  drawTabs(current, counts);
  nav.innerHTML = VIEWS.map((v) => v.group ? `<h5>${esc(v.group)}</h5>` : `<a href="#${v.id}" data-id="${v.id}" class="${v.id === current ? 'on' : ''}">${esc(v.label)}${v.badge && counts[v.badge] ? `<span class="count">${counts[v.badge]}</span>` : ''}</a>`).join('');
}
export async function refreshCounts() {
  try {
    const d = await api('/api/admin/dashboard');
    counts = { pending: d.kpis.pending, followups: d.followups, drafts: d.drafts, outbox_pending: d.outbox_pending, extras: d.extras || 0 }; drawNav();
  } catch { /* ignorar */ }
}

function parse() {
  const [id, ...rest] = location.hash.slice(1).split('.');
  return { id: VIEWS.some((v) => v.id === id) ? id : 'resumen', arg: rest.join('.') };
}

async function route() {
  const { id, arg } = parse();
  const v = VIEWS.find((x) => x.id === id), my = ++token;
  current = id; drawNav(); closeDrawer(); $('#side').classList.remove('open');
  main.innerHTML = '<p class="muted">Cargando…</p>';
  try {
    const mod = await v.load();
    if (my !== token) return;
    main.innerHTML = '';
    await mod.render(main, { arg, refreshCounts, go: (hash) => { location.hash = hash; } });
    labelTables(main); bindTitle(main);
    if (!matchMedia('(prefers-reduced-motion:reduce)').matches) main.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.1,1)' });
    document.title = `${v.label} · Panel Noelia Duque`;
  } catch (e) { if (my === token) main.innerHTML = `<div class="empty"><b>No se pudo cargar</b>${esc(e.message)}</div>`; }
  window.scrollTo(0, 0);
}

function showLogin() { $('#app').hidden = true; $('#login').hidden = false; }
setUnauthorized(showLogin);
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  try { await api('/api/admin/login', { method: 'POST', body: { password: $('#pw').value } }); $('#pw').value = ''; boot(); }
  catch (ex) { $('#login-err').innerHTML = `<p class="muted" style="color:var(--bad)">${esc(ex.message)}</p>`; }
};
$('#logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST', body: {} }); showLogin(); };

async function boot() {
  try { await api('/api/admin/me'); } catch { return showLogin(); }
  $('#login').hidden = true; $('#app').hidden = false;
  await refreshCounts(); route();
}
addEventListener('hashchange', route);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
new MutationObserver(() => labelTables(main)).observe(main, { childList: true, subtree: true });
bindGestures(() => { toast('Actualizando…'); route(); refreshCounts(); });
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.__preview) navigator.serviceWorker.register('/sw.js').catch(() => {});
window.__panel = { refreshCounts, toast };
boot();
