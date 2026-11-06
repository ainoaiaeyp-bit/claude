import { $, $$, setP, getP, IC, esc } from './util.js';
import { S, guardar } from './estado.js';
import { vistaHoy, accionesHoy } from './hoy.js';
import { vistaSimular, accionesSimular, barra } from './simular.js';
import { vistaFactura, accionesFactura, hojaConcepto } from './factura.js';
import { vistaAlertas, accionesAlertas, comprobarAviso } from './alertas.js';
import { generarInforme } from './informe.js';

const TABS = [['hoy', 'Hoy', IC.hoy], ['simular', 'Simular', IC.sim], ['factura', 'Factura', IC.fac], ['alertas', 'Alertas', IC.ale]];
const VISTAS = { hoy: vistaHoy, simular: vistaSimular, factura: vistaFactura, alertas: vistaAlertas };
const raiz = () => $('#vista');

function pintarTabs() {
  $('#tabs').innerHTML = TABS.map(([k, t, ic]) => `<button data-a="tab" data-v="${k}" class="${S.tab === k ? 'on' : ''}" aria-label="${t}">${ic}<span>${t}</span></button>`).join('');
}
function ir(tab, { scroll = true } = {}) {
  cerrarHoja();
  S.tab = tab; guardar(); pintarTabs();
  const el = raiz();
  el.className = 'vista v-' + tab;
  VISTAS[tab](el);
  if (scroll) window.scrollTo(0, 0);
}

// ---- hoja inferior ----
function abrirHoja(html) {
  $('#hoja-cont').innerHTML = html;
  $('#hoja').classList.add('on');
  document.body.classList.add('con-hoja');
}
function cerrarHoja() { $('#hoja').classList.remove('on'); document.body.classList.remove('con-hoja'); }

// ---- eventos (delegados) ----
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-a]');
  if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const a = b.dataset.a, v = b.dataset.v, el = raiz();
  if (a === 'tab') return ir(v);
  if (a === 'recargar') return ir(S.tab, { scroll: false });
  if (a === 'cerrar') return cerrarHoja();
  if (a === 'descargar') return generarInforme(b);
  if (a === 'concepto') return abrirHoja(hojaConcepto(v));
  if (a === 'set') { setP(S, b.dataset.p, v); S.tocado = true; guardar(); return VISTAS[S.tab](el); }
  if (a === 'inter') { const p = b.dataset.p; setP(S, p, !getP(S, p)); S.tocado = true; guardar(); return VISTAS[S.tab](el); }
  if (S.tab === 'hoy' && accionesHoy(a, v, el)) return;
  if (S.tab === 'simular' && accionesSimular(a, v, el, ev)) return;
  if (S.tab === 'factura' && accionesFactura(a, v, el)) return;
  if (S.tab === 'alertas') accionesAlertas(a, v, el, ev);
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.p) {
    setP(S, t.dataset.p, t.value);
    if (!t.dataset.p.startsWith('nombre')) S.tocado = true;
    guardar();
    if (S.tab === 'simular') barra();
    return;
  }
  if (t.dataset.a === 'precio') { accionesAlertas('precio', null, raiz(), ev); }
});
document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.tagName === 'SELECT' && t.dataset.p) {
    setP(S, t.dataset.p, t.value); S.tocado = true; guardar();
    if (S.tab === 'simular') barra();
  }
  if (t.dataset.a === 'precio') { accionesAlertas('precio', null, raiz(), ev); ir('alertas', { scroll: false }); }
});
// recordar qué desplegables están abiertos
document.addEventListener('toggle', (ev) => {
  const d = ev.target;
  if (d.tagName === 'DETAILS' && d.dataset.id) { S.abiertas[d.dataset.id] = d.open; guardar(); }
}, true);
$('#hoja').addEventListener('click', (ev) => { if (ev.target.id === 'hoja') cerrarHoja(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cerrarHoja(); });

// ---- arranque ----
pintarTabs();
ir(S.tab, { scroll: false });
comprobarAviso();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
