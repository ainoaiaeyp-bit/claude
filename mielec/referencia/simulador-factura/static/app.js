import {
  TARIFAS, UNI_EN, APLICA, MESES, MESES_L, estadoVacio, gruposPorDefecto, comparar, escenario, num, nuevoId,
  mesReferencia, calendario, consumoMes, diasDelMes,
} from '/calculo.js';
import { renderInforme, SECCIONES, SECCIONES_AMP } from '/informe.js';
import { htmlControles, htmlSalida } from '/resultado.js';
import { CATALOGO, PRESETS, FRANJAS, SEMANAS, ESTAC, DIAS_MES, aparatoDe, estimar } from '/aparatos.js';

const $ = (s, r = document) => r.querySelector(s);
const raiz = $('#raiz');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fEur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Math.round((n + Number.EPSILON) * 100) / 100 || 0);
const fNum = (n, d = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d }).format(n);

const IC = {
  baja: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
  sube: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>',
  mas: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  guardar: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/></svg>',
  imp: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z"/></svg>',
  atras: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  cal: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  rayo: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>',
  sig: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  bolt: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>',
  sol: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  caja: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8"/></svg>',
  etq: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12l-8 8-9-9V3h8zM7.5 7.5h.01"/></svg>',
  rueda: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
  reloj: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  plug: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/></svg>',
  red: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l4-8 4 5 3-9 4 12M3 21h18"/></svg>',
  casa: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7M6 10v10h12V10"/></svg>',
};

let yo = null;
let E = null; // estado de la simulación abierta
let simId = null;
let nombreSim = '';
let sucio = false;
let ia = new Set(); // campos rellenados por la IA y aún sin revisar
let verTodas = false;
const BORRADOR = 'sim_borrador_v1';

// ---------- utilidades ----------
async function api(url, o = {}) {
  const r = await fetch(url, { ...o, headers: { 'x-sim': '1', ...(o.body ? { 'content-type': 'application/json' } : {}), ...(o.headers || {}) }, credentials: 'same-origin' });
  if (r.status === 401) { location.href = (yo?.hub || 'https://iaunity.ingenieriaaplicada.org') + '/login.html'; throw new Error('Sin sesión'); }
  const t = await r.text();
  let d = null;
  try { d = t ? JSON.parse(t) : null; } catch { /* nada */ }
  if (!r.ok) throw new Error(d?.detail || 'Error ' + r.status);
  return d;
}
let tAviso;
function avisar(txt, err = false) {
  const el = $('#aviso');
  el.textContent = txt; el.className = 'toast' + (err ? ' err' : ''); el.hidden = false;
  clearTimeout(tAviso); tAviso = setTimeout(() => (el.hidden = true), err ? 6000 : 2600);
}
const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function setP(o, p, v) {
  const ks = p.split('.');
  const ult = ks.pop();
  const dst = ks.reduce((a, k) => a[k], o);
  dst[ult] = v;
}
function estadoNuevo() {
  const e = estadoVacio();
  e.propuesta.potencia.igualActual = true;
  e.aparatos = { lista: [], margen: '10' };
  e.informe = { secs: {}, version: 'uno' };
  return e;
}
function normalizar(e) {
  const base = estadoNuevo();
  const m = (a, b) => Object.assign(a, b);
  const r = JSON.parse(JSON.stringify(base));
  m(r.cliente, e.cliente || {}); m(r.fiscal, e.fiscal || {});
  if (!(e.cliente && e.cliente.alquiler)) { const old = (e.actual && e.actual.alquiler) || (e.propuesta && e.propuesta.alquiler); if (old && num(old.importe)) r.cliente.alquiler = old; }
  if (!Array.isArray(r.cliente.cargos)) r.cliente.cargos = [];
  if (e.informe && e.informe.secs) r.informe = { secs: { ...e.informe.secs }, version: e.informe.version === 'ampliado' ? 'ampliado' : 'uno' };
  if (e.aparatos) r.aparatos = { ...r.aparatos, ...e.aparatos, lista: Array.isArray(e.aparatos.lista) ? e.aparatos.lista : [] };
  if (e.perfil) { r.perfil = { ...r.perfil, ...e.perfil }; r.perfil.variacion = [...r.perfil.variacion, ...Array(12).fill('')].slice(0, 12); }
  r.horizonte = e.horizonte ?? 12; r.incluirPenalizacion = e.incluirPenalizacion !== false;
  for (const k of ['actual', 'propuesta']) {
    const s = e[k] || {};
    for (const b of Object.keys(r[k])) {
      if (s[b] === undefined) continue;
      r[k][b] = (r[k][b] && typeof r[k][b] === 'object' && !Array.isArray(r[k][b])) ? { ...r[k][b], ...s[b] } : s[b];
    }
  }
  if (!r.cliente.cargos.length) {
    for (const k of ['actual', 'propuesta']) {
      const resto = [];
      for (const o of (r[k].otros || [])) {
        if (/bono\s*social/i.test(o.nombre || '') && num(o.importe) > 0 && !r.cliente.cargos.length) {
          r.cliente.cargos.push({ nombre: 'Financiación del bono social', tipo: 'fijo', importe: String(+(num(o.importe) / Math.max(1, num(r.cliente.dias))).toFixed(6)), unidad: 'dia', tributaIEE: o.tributaIEE !== false });
        } else if (!/bono\s*social/i.test(o.nombre || '')) resto.push(o);
      }
      r[k].otros = resto;
    }
  }
  for (const k of ['actual', 'propuesta']) r[k].servicios = r[k].servicios.map(servicioNuevo);
  return r;
}
const servicioNuevo = (s = {}) => ({ id: nuevoId(), nombre: '', importe: '', unidad: 'mes', iva: true, meses: '', ...s, desc: { activo: false, tipo: 'pct', valor: '', desde: '', meses: '', ...(s.desc || {}) }, perm: { activa: false, meses: '', penalizacion: '', ...(s.perm || {}) } });
function sincronizar() {
  const p = E.propuesta.potencia;
  if (p.igualActual) p.contratada = [...E.actual.potencia.contratada];
}
function ladoNombre(k) { return k === 'actual' ? 'Factura actual' : 'Propuesta'; }

// ---------- arranque y rutas ----------
function mostrarTT(h) {
  const t = $('#rs-tt'); if (!t) return;
  h.closest('svg').querySelectorAll('.rs-hit.sel').forEach((x) => x.classList.remove('sel'));
  h.classList.add('sel');
  t.innerHTML = h.dataset.tt;
}
async function iniciar() {
  try { yo = await api('/api/yo'); } catch { return; }
  enlazar();
  window.addEventListener('hashchange', ruta);
  window.addEventListener('beforeunload', (ev) => { if (sucio) { ev.preventDefault(); ev.returnValue = ''; } });
  ruta();
}
function cabeza() {
  return `<header class="top no-imp"><a class="marca" href="#/"><img src="/img/isotipo.png" alt="Ingeniería Aplicada"><span><b>Simulador de factura</b><small>IA UNITY</small></span></a>
  <div class="quien"><span>${esc(yo.nombre)}</span><a class="a-unity" href="${esc(yo.hub)}" title="Volver a IA Unity">${IC.casa}</a></div></header>`;
}
async function ruta() {
  const h = location.hash || '#/';
  if (h.startsWith('#/s/')) return abrir(parseInt(h.slice(4), 10));
  if (h === '#/nueva') return nueva();
  return lista();
}

// ---------- lista ----------
async function lista() {
  E = null;
  raiz.innerHTML = cabeza() + '<main><p>Cargando…</p></main>';
  let filas = [];
  try { filas = await api('/api/simulaciones' + (verTodas ? '?todas=1' : '')); } catch (e) { avisar(e.message, true); }
  const puedeTodas = yo.nivel === 'editar' || yo.nivel === 'admin';
  raiz.innerHTML = cabeza() + `<main>
    <div class="cab"><div><h1>Simulaciones</h1><p>Compara una factura de luz con una propuesta: potencia, energía por periodos, servicios, descuentos y permanencia.</p></div>
    <div class="acc">${puedeTodas ? `<label class="chk"><input type="checkbox" id="todas" ${verTodas ? 'checked' : ''}> Ver las de todos</label>` : ''}<a class="btn" href="#/nueva">${IC.mas} Nueva simulación</a></div></div>
    <section class="card hoy" id="hoy"><p class="ayuda">Cargando precios de Red Eléctrica…</p></section>
    ${filas.length ? `<div class="lista">${filas.map(tarjeta).join('')}</div>` : '<div class="vacio-g">Todavía no hay simulaciones guardadas. Crea la primera con "Nueva simulación".</div>'}
  </main>`;
  cardHoy();
  $('#todas')?.addEventListener('change', (ev) => { verTodas = ev.target.checked; lista(); });
  raiz.querySelectorAll('.sim').forEach((el) => el.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-baja]')) return;
    location.hash = '#/s/' + el.dataset.id;
  }));
  raiz.querySelectorAll('[data-baja]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Archivar esta simulación? No se borra, deja de salir en la lista.')) return;
    try { await api(`/api/simulaciones/${b.dataset.baja}/baja`, { method: 'POST' }); lista(); } catch (e) { avisar(e.message, true); }
  }));
}
function tarjeta(s) {
  const r = s.resumen || {};
  const ah = r.ahorro;
  return `<div class="sim" data-id="${s.id}"><b>${esc(s.nombre)}</b>
    <span class="meta">${esc(s.creado_por || '')} · ${esc((s.actualizado || '').slice(0, 16))}${r.solo ? ' · 1 factura' : r.horizonte ? ' · ' + r.horizonte + (r.horizonte === 1 ? ' mes' : ' meses') : ''}</span>
    ${ah !== undefined ? `<div class="nums"><div><small>Actual</small><b>${fEur(r.actual)}</b></div><div><small>Propuesta</small><b>${fEur(r.propuesta)}</b></div><div><small>${ah >= 0 ? 'Ahorro' : 'Sobrecoste'}</small><b class="${ah >= 0 ? 'bien' : 'mal-t'}">${fEur(Math.abs(ah))}</b></div></div>` : ''}
    <div class="pie"><span class="meta">${esc(r.comercializadora || '')}</span><button class="lnk" data-baja="${s.id}">Archivar</button></div></div>`;
}

// ---------- editor ----------
function nueva() {
  simId = null; nombreSim = '';
  let borrador = null;
  try { borrador = JSON.parse(localStorage.getItem(BORRADOR) || 'null'); } catch { /* sin acceso */ }
  if (borrador && confirm('Hay una simulación sin guardar de la última vez. ¿Quieres recuperarla?')) { E = normalizar(borrador.e); nombreSim = borrador.nombre || ''; sucio = true; }
  else { E = estadoNuevo(); sucio = false; }
  ia = new Set();
  editor();
}
async function abrir(id) {
  raiz.innerHTML = cabeza() + '<main><p>Cargando…</p></main>';
  try {
    const s = await api('/api/simulaciones/' + id);
    simId = id; nombreSim = s.nombre; E = normalizar(s.datos); sucio = false; ia = new Set();
    editor();
  } catch (e) { avisar(e.message, true); location.hash = '#/'; }
}
let paso = 'cliente';
const PASOS = [['cliente', 'Consumo', 'Consumo'], ['actual', 'Lo que paga hoy', 'Hoy'], ['propuesta', 'La propuesta', 'Oferta'], ['resultado', 'Resultado', 'Resultado'], ['informe', 'Informe', 'Informe']];
const ui = { pct: 0, H: null, pen: true, off: [], vista: 'mes', lado: 'propuesta', tabla: false };
let promesaInforme = Promise.resolve();
const abiertos = new Set();
const reeDatos = {};
const reeMargen = { actual: '', propuesta: '' };
const notasIA = {};

function editor() {
  paso = 'cliente';
  Object.assign(ui, { pct: 0, H: null, pen: true, off: [], vista: 'mes', lado: 'propuesta', tabla: false });
  raiz.innerHTML = cabeza() + `<main>
    <button class="volver no-imp" id="volver">${IC.atras} Simulaciones</button>
    <div class="cab no-imp"><div style="min-width:280px;flex:1;max-width:560px"><label class="c">Nombre de la simulación<input type="text" id="nombreSim" value="${esc(nombreSim)}" placeholder="Se guarda como CUPS_meses, por ejemplo ES0021…_12 meses"></label></div>
      <div class="acc"><button class="btn sec" id="imprimir">${IC.baja} Descargar PDF</button><button class="btn" id="guardar">${IC.guardar} Guardar</button></div></div>
    <nav class="pasos no-imp" id="pasos"></nav>
    <div class="wrap" id="wrap"><div id="cuerpo"></div><aside id="lateral" class="no-imp"></aside></div>
  </main><div class="barra no-imp" id="barra"></div>`;
  $('#volver').onclick = () => { if (!sucio || confirm('Hay cambios sin guardar. ¿Salir igualmente?')) { sucio = false; location.hash = '#/'; } };
  $('#guardar').onclick = guardar;
  $('#imprimir').onclick = descargarPDF;

  $('#nombreSim').oninput = (ev) => { nombreSim = ev.target.value; marcar(); };
  formulario();
}
function setPaso(p) { paso = p; formulario(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function formulario() {
  const y = window.scrollY;
  $('#cuerpo').innerHTML = paso === 'cliente' ? htmlCliente()
    : paso === 'resultado' ? `<section id="res"><div id="rs-ctl">${htmlControles(E, ui)}</div><div id="rs-out"></div></section>`
    : paso === 'informe' ? `<section id="res">${opcionesInforme()}<div id="inf-doc"></div></section>` : htmlLado(paso);
  $('#wrap').classList.toggle('solo', paso === 'resultado' || paso === 'informe');
  calcular();
  window.scrollTo(0, y);
}
const cargarScript = (src) => new Promise((ok, ko) => {
  if (document.querySelector(`script[data-lib="${src}"]`)) return ok();
  const s = document.createElement('script'); s.src = src; s.dataset.lib = src; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar ' + src));
  document.head.appendChild(s);
});
// Genera el PDF en el navegador y lo descarga directamente, sin abrir la impresora: cada página A4 se dibuja y se añade al PDF
async function descargarPDF() {
  if (window.innerWidth < 800) return avisar('Para descargar el PDF abre la simulación en un ordenador.', true);
  paso = 'informe'; formulario(); await promesaInforme;
  avisar('Preparando el PDF…');
  await new Promise((r) => setTimeout(r, 700)); // deja terminar los reajustes de tipografía
  window.__informeBloqueado = true;
  const hoja = $('#inf-doc .hoja');
  try {
    const nombre = (esNombreAuto(nombreSim) ? nombreAuto() : nombreSim.trim()) + (E.informe.version === 'ampliado' ? '_ampliado' : '');
    const fichero = nombre.replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
    // Camino preferido: el servidor genera el PDF con texto real (vectorial, seleccionable)
    try {
      hoja.classList.add('exportando');
      const r = await fetch('/api/pdf', { method: 'POST', headers: { 'content-type': 'application/json', 'x-sim': '1' }, body: JSON.stringify({ html: hoja.outerHTML }) });
      hoja.classList.remove('exportando');
      if (r.ok) {
        const blob = await r.blob();
        if (!window.__pdfPrueba) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fichero; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
        window.__pdfBlob = blob;
        avisar('PDF descargado');
        return;
      }
    } catch { /* se usa el respaldo en imagen */ }
    hoja.classList.remove('exportando');
    await cargarScript('/lib/jspdf.umd.min.js');
    hoja.classList.add('exportando');
    if (document.fonts) await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 150));
    const pags = [...hoja.querySelectorAll('.pag')];
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    // Se dibuja con el propio motor del navegador (texto idéntico al de pantalla). Si el navegador no lo permite, se usa html2canvas
    let imagenes;
    try {
      await cargarScript('/lib/html-to-image.min.js');
      const opc = { pixelRatio: 4, quality: 0.98, backgroundColor: '#ffffff', width: 794, height: 1123 };
      await window.htmlToImage.toJpeg(pags[0], opc); // primer pase: carga tipografías e imágenes (Safari lo necesita)
      imagenes = [];
      for (const p of pags) imagenes.push(await window.htmlToImage.toJpeg(p, opc));
    } catch (err) {
      await cargarScript('/lib/html2canvas.min.js');
      imagenes = [];
      for (const p of pags) imagenes.push((await window.html2canvas(p, { scale: 2.5, backgroundColor: '#ffffff', logging: false, useCORS: true, scrollX: 0, scrollY: -window.scrollY })).toDataURL('image/jpeg', 0.93));
    }
    window.__cv = imagenes;
    imagenes.forEach((u, i) => { if (i) pdf.addPage(); pdf.addImage(u, 'JPEG', 0, 0, 210, 297); });
    window.__pdf = pdf;
    if (!window.__pdfPrueba) pdf.save(fichero);
    avisar('PDF descargado');
  } catch (e) { avisar('No se pudo generar el PDF: ' + e.message, true); }
  finally { window.__informeBloqueado = false; hoja && hoja.classList.remove('exportando'); }
}
function opcionesInforme() {
  const sec = E.informe.secs; const amp = E.informe.version === 'ampliado';
  const caja = (k, n) => `<label class="chk"><input type="checkbox" data-inf="${k}" ${sec[k] !== false ? 'checked' : ''}> ${esc(n)}</label>`;
  return `<section class="card no-imp inf-opc"><h2>Qué incluye el informe</h2>
    <div class="seg" style="margin-bottom:10px"><button type="button" data-a="inf-version" data-v="uno" class="${amp ? '' : 'on'}">Una página</button><button type="button" data-a="inf-version" data-v="ampliado" class="${amp ? 'on' : ''}">Ampliado</button></div>
    <p class="sub">${amp ? 'La primera página es el resumen. Después vienen páginas de detalle con los datos, el cálculo paso a paso, el mes a mes y las condiciones, para clientes que quieren comprobarlo todo.' : 'Una sola hoja A4 con lo importante. Activa o quita las secciones que quieras.'} Los bloques nunca se cortan entre páginas.</p>
    <h3>${amp ? 'Primera página' : 'Secciones'}</h3><div class="inf-sw">${SECCIONES.map(([k, n]) => caja(k, n)).join('')}</div>
    ${amp ? `<h3 style="margin-top:12px">Páginas de detalle</h3><div class="inf-sw">${SECCIONES_AMP.map(([k, n]) => caja(k, n)).join('')}</div>` : ''}
    <div class="rs-reset"><button type="button" class="btn" data-a="imprimir">${IC.baja} Descargar PDF</button></div></section>`;
}
function salidaResultado(base) {
  const out = $('#rs-out'); if (!out) return;
  const c0 = base || comparar(E);
  const E2 = escenario(E, { pct: ui.pct, sinServicios: ui.off, H: ui.H || undefined, penalizacion: ui.pen });
  out.innerHTML = htmlSalida(E2, comparar(E2), c0, ui);
}
function marcar() {
  sucio = true;
  try { localStorage.setItem(BORRADOR, JSON.stringify({ e: E, nombre: nombreSim })); } catch { /* sin acceso */ }
}

// Campos
function inp(p, { cls = '', ph = '', ro = false } = {}) {
  const v = getP(E, p);
  return `<input type="text" inputmode="decimal" data-p="${p}" value="${esc(v ?? '')}" placeholder="${esc(ph)}" class="${cls}${ia.has(p) ? ' leido' : ''}" ${ro ? 'readonly' : ''} autocomplete="off">`;
}
function txt(p, ph = '') {
  return `<input type="text" data-p="${p}" data-t="1" value="${esc(getP(E, p) ?? '')}" placeholder="${esc(ph)}" class="${ia.has(p) ? 'leido' : ''}" autocomplete="off">`;
}
function sel(p, opciones, extra = '') {
  const v = getP(E, p) ?? '';
  return `<select data-p="${p}" data-t="1" ${extra}>${opciones.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}

function htmlCliente() {
  const c = E.cliente; const t = TARIFAS[c.tarifa];
  return `${cajaIA('actual', true)}<section class="card"><h2>${IC.rayo} Cliente y consumo del periodo</h2>
  <p class="sub">Estos datos son comunes a las dos facturas: el consumo es el mismo, cambian los precios.</p>
  <div class="fila f3">
    <label class="c">Cliente${txt('cliente.nombre', 'Nombre o empresa')}</label>
    <label class="c">CUPS (opcional)${txt('cliente.cups', 'ES00…')}</label>
    <label class="c">Tarifa de acceso
      <div class="seg" role="group">${Object.keys(TARIFAS).map((k) => `<button type="button" data-a="tarifa" data-v="${k}" class="${c.tarifa === k ? 'on' : ''}">${k}</button>`).join('')}</div></label>
  </div>
  <p class="ayuda" style="margin:-4px 0 12px">${esc(t.desc)}</p>
  <div class="fila f4">
    <label class="c">Inicio del periodo<input type="date" data-p="cliente.inicio" data-t="1" data-a2="fechas" value="${esc(c.inicio || '')}"></label>
    <label class="c">Fin del periodo<input type="date" data-p="cliente.fin" data-t="1" data-a2="fechas" value="${esc(c.fin || '')}"></label>
    <label class="c">Días facturados${inp('cliente.dias', { cls: ia.has('cliente.dias') ? 'leido' : '' })}</label>
    <label class="c">Tipo de uso${sel('cliente.uso', [['domestico', 'Doméstico'], ['otros', 'Comercial / industrial']])}</label>
  </div>
  <h3>Consumo de energía por periodo (kWh)</h3>
  <div class="fila" style="grid-template-columns:repeat(${t.nEn},1fr)">${t.en.map((n, i) => `<label class="c">${esc(n)}${inp('cliente.consumo.' + i)}</label>`).join('')}
  </div>
  <div class="fila f3">
    <label class="c">Excedentes vertidos (kWh, si hay autoconsumo)${inp('cliente.excedentes')}</label>
    <label class="c" style="grid-column:span 2">Comparar durante (meses)
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="text" inputmode="decimal" data-p="horizonte" value="${E.horizonte === 'f' ? 'factura' : esc(E.horizonte ?? '')}" style="max-width:110px" autocomplete="off">
        <button type="button" class="btn sec mini" data-a="horizonte" data-v="f">Esta factura</button>${[12, 24, 36].map((m) => `<button type="button" class="btn sec mini" data-a="horizonte" data-v="${m}">${m}</button>`).join('')}</div></label>
    <label class="c">Impuestos (se ajustan si cambian)<div style="display:flex;gap:6px">
      <div style="flex:1">${inp('fiscal.iva')}<span class="ayuda">IVA %</span></div><div style="flex:1">${inp('fiscal.iee')}<span class="ayuda">Imp. electricidad %</span></div></div></label>
  </div>
  <div class="fila"><label class="chk"><input type="checkbox" data-p="fiscal.alquilerIEE" data-chk="1" ${E.fiscal.alquilerIEE ? 'checked' : ''}> El alquiler del contador entra en la base del impuesto de electricidad</label></div>
  <p class="ayuda">Las fuentes no coinciden en este punto. Si el cálculo de la factura actual no cuadra con el total real, prueba a cambiarlo. El alquiler del contador y la financiación del bono social se ponen en el paso de cada factura.</p>
  <p class="ayuda">El consumo de este periodo se proyecta a los meses de comparación repartido por igual. Si metes el consumo de todo un año (365 días), la proyección es exacta.</p></section>${htmlAparatos()}${htmlPerfil()}${pie()}`;
}

const estac = { verano: '', invierno: '' };
function graficoPerfil() {
  const p = E.perfil;
  const cal = calendario(E, 12);
  const kw = cal.map((c) => consumoMes(E, c.m, c.dias));
  const mx = Math.max(1, ...kw.map((x) => x.total));
  return `<div class="mini-b">${cal.map((c, i) => `<span title="${MESES_L[c.m]}: ${fNum(kw[i].total, 0)} kWh"><i class="${kw[i].real ? 'r' : ''}" style="height:${Math.max(4, kw[i].total / mx * 100)}%"></i><small>${MESES[c.m][0]}</small></span>`).join('')}</div>
    <p class="ayuda">Consumo estimado de los próximos 12 meses: <b>${fNum(kw.reduce((s, x) => s + x.total, 0), 0)} kWh</b>${p.modo === 'real' ? '. Las barras oscuras son meses con datos reales.' : '.'}</p>`;
}
function htmlPerfil() {
  const p = E.perfil; const t = TARIFAS[E.cliente.tarifa]; const ref = mesReferencia(E);
  const modos = [['plano', 'Reparto igual'], ['variacion', 'Variación por mes'], ['real', 'Consumos reales']];
  const cal = calendario(E, 12);
  const kw = cal.map((c) => consumoMes(E, c.m, c.dias));
  const mx = Math.max(1, ...kw.map((x) => x.total));
  let cuerpo = '';
  if (p.modo === 'variacion') {
    cuerpo = `<div class="ree-u" style="margin:0 0 10px"><button class="btn az mini" data-a="ree-estac">${IC.red} Cargar estacionalidad de REE</button>
      <label class="chk2">Verano (jun-ago) <input type="text" inputmode="decimal" data-estac="verano" value="${esc(estac.verano)}" placeholder="+25"> %</label>
      <label class="chk2">Invierno (dic-feb) <input type="text" inputmode="decimal" data-estac="invierno" value="${esc(estac.invierno)}" placeholder="+15"> %</label>
      <button class="btn sec mini" data-a="estac-aplicar">Aplicar</button></div>
      <div class="mgrid">${MESES.map((m, i) => `<label class="c ${i === ref ? 'ref' : ''}">${m}${i === ref ? ' (factura)' : ''}<div class="suf">${inp(`perfil.variacion.${i}`, { ph: '0' })}<span>%</span></div></label>`).join('')}</div>
      <p class="ayuda">Cada mes respecto al mes de la factura de referencia (${MESES_L[ref]}, que debe quedar en 0 %). Ejemplos: julio +40, septiembre -20.${p.fuente ? ` <b>Origen de los datos: ${esc(p.fuente)}.</b>` : ''}</p>`;
  } else if (p.modo === 'real') {
    cuerpo = `<label class="chk" style="margin-bottom:8px"><input type="checkbox" data-p="perfil.porPeriodos" data-chk="1" ${p.porPeriodos ? 'checked' : ''}> Detallar por periodos (${t.en.map((x) => x.split(' ')[0]).join(', ')})</label>
      <div class="mreal">${MESES.map((m, i) => `<div class="mrow ${i === ref ? 'ref' : ''}"><b>${m}</b>${p.porPeriodos ? t.en.map((_, j) => `<div class="suf">${inp(`perfil.real.${i}.kwh.${j}`, { ph: 'kWh' })}</div>`).join('') : `<div class="suf">${inp(`perfil.real.${i}.total`, { ph: 'kWh del mes' })}<span>kWh</span></div>`}</div>`).join('')}</div>
      <p class="ayuda">Mete los kWh de los meses que tengas (de otras facturas o de la curva de carga). Los meses vacíos se estiman con la variación por mes, si la has puesto, o con el reparto igual. Con el total del mes se usa el reparto por periodos de la factura.</p>
      <details class="opc-mini"><summary>Variación para los meses sin dato</summary><div class="mgrid">${MESES.map((m, i) => `<label class="c">${m}<div class="suf">${inp(`perfil.variacion.${i}`, { ph: '0' })}<span>%</span></div></label>`).join('')}</div></details>`;
  }
  return `<section class="card"><h2><span class="ico">${IC.cal}</span>Consumo a lo largo del año</h2>
    <p class="sub">Para una simulación realista a 12 meses: el consumo no es igual todos los meses. Elige cómo quieres plantearlo.</p>
    <div class="seg" style="margin-bottom:12px">${modos.map(([k, n]) => `<button type="button" data-a="perfil-modo" data-v="${k}" class="${p.modo === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="fila f2"><label class="c">La simulación empieza en${`<input type="month" data-p="perfil.inicio" data-t="1" value="${esc(p.inicio || '')}">`}</label>
      <label class="c">Mes de la factura de referencia${sel('perfil.refMes', [[-1, 'Automático (' + MESES_L[mesReferencia(E)] + ')'], ...MESES_L.map((m, i) => [i, m])])}</label></div>
    ${cuerpo}<div id="perfil-g">${graficoPerfil()}</div></section>`;
}


// ---------- simulador de consumo por aparatos ----------
function htmlAparatos() {
  const ap = E.aparatos; const n = ap.lista.length;
  const grupos = [...new Set(CATALOGO.map((c) => c.g))];
  const cat = grupos.map((g) => `<optgroup label="${esc(g)}">${CATALOGO.filter((c) => c.g === g).map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}</optgroup>`).join('');
  const filas = ap.lista.map((a, i) => {
    const P = (x) => `aparatos.lista.${i}.${x}`;
    return `<div class="item ap-item"><div class="ap-n">${txt(P('nombre'), 'Nombre del aparato')}<button class="lnk" data-a="ap-del" data-i="${i}">Quitar</button></div>
      <div class="ap-g"><label class="c">Potencia (W)${inp(P('w'))}</label><label class="c">Cantidad${inp(P('cant'))}</label><label class="c">Horas al día${inp(P('h'))}</label>
        <label class="c">Días${sel(P('semana'), Object.entries(SEMANAS))}</label><label class="c">Época${sel(P('estac'), Object.entries(ESTAC))}</label><label class="c">Franja${sel(P('franja'), Object.entries(FRANJAS).map(([k, v]) => [k, v[0]]))}</label></div></div>`;
  }).join('');
  return opc('aparatos', IC.plug, 'Simular el consumo con aparatos', n ? n + (n === 1 ? ' aparato' : ' aparatos') : 'sin empezar',
    `<p class="sub">¿No tienes la factura, o quieres saber cuánto puede consumir una vivienda, un local o una nave? Elige los aparatos y se estima el consumo del año, mes a mes y por periodos. Los valores son típicos y orientativos: edítalos con los datos reales.</p>
    <div class="ap-pre">${Object.entries(PRESETS).map(([k, p]) => `<button class="btn sec mini" data-a="ap-preset" data-v="${k}">${esc(p.nombre)}</button>`).join('')}${n ? '<button class="lnk" data-a="ap-preset" data-v="vacio">Vaciar la lista</button>' : ''}</div>
    <div class="ap-add"><select id="ap-cat"><option value="">Añadir un aparato del catálogo…</option>${cat}<option value="otro">Otro aparato (en blanco)</option></select><button class="btn sec mini" data-a="ap-add">${IC.mas} Añadir</button></div>
    ${filas || '<div class="vacio">Todavía no hay aparatos. Empieza con un modelo (vivienda, local o nave) o añade los tuyos.</div>'}
    <div class="fila f3"><label class="c">Margen por aparatos no incluidos (%)${inp('aparatos.margen')}</label></div>
    <div id="ap-res">${resumenAparatos()}</div>`);
}
function resumenAparatos() {
  const ap = E.aparatos; const cl = E.cliente; const t = TARIFAS[cl.tarifa];
  if (!ap.lista.length) return '';
  const est = estimar(ap.lista, ap.margen, cl.tarifa);
  const ref = mesReferencia(E);
  const maxM = Math.max(1, ...est.mensual.map((m) => m.total));
  const maxA = Math.max(1, ...est.porAparato.map((x) => x.kwh));
  const totP = est.periodos.reduce((s, x) => s + x, 0) || 1;
  const kwhRefReal = t.en.reduce((s, _, i) => s + num(cl.consumo[i]), 0);
  const kwhRefEst = est.mensual[ref].total * (num(cl.dias) || 30) / DIAS_MES[ref];
  return `<div class="ap-k"><div><small>Consumo estimado al año</small><b>${fNum(est.anual, 0)} kWh</b></div><div><small>Media al mes</small><b>${fNum(est.anual / 12, 0)} kWh</b></div><div><small>Media al día</small><b>${fNum(est.anual / 365, 1)} kWh</b></div></div>
    <h3 style="margin-top:14px">Mes a mes</h3>
    <div class="mini-b" style="height:96px">${est.mensual.map((m, i) => `<span title="${MESES_L[i]}: ${fNum(m.total, 0)} kWh"><i style="height:${Math.max(4, m.total / maxM * 100)}%"></i><small>${MESES[i][0]}</small></span>`).join('')}</div>
    <h3 style="margin-top:26px">Por periodos de la tarifa ${cl.tarifa}</h3>
    ${t.en.map((n, i) => `<div class="ap-r"><span>${esc(n)}</span><span class="ap-b"><i style="width:${est.periodos[i] / totP * 100}%"></i></span><b>${fNum(est.periodos[i], 0)} kWh · ${fNum(est.periodos[i] / totP * 100, 0)} %</b></div>`).join('')}
    <h3 style="margin-top:14px">Qué consume más</h3>
    ${est.porAparato.slice(0, 8).map((x) => `<div class="ap-r"><span>${esc(x.nombre)}</span><span class="ap-b"><i style="width:${x.kwh / maxA * 100}%"></i></span><b>${fNum(x.kwh, 0)} kWh · ${fNum(x.kwh / (est.anual / (1 + num(ap.margen) / 100) || 1) * 100, 0)} %</b></div>`).join('')}
    ${kwhRefReal > 0 ? `<p class="ayuda">Comparación: la factura de referencia tiene <b>${fNum(kwhRefReal, 0)} kWh</b> y esta estimación daría unos <b>${fNum(kwhRefEst, 0)} kWh</b> para ese mismo periodo (${MESES_L[ref]}).</p>` : ''}
    <p class="ayuda">Estimación orientativa: el consumo real depende del modelo de cada aparato, de cómo se usa y del clima. Para acercarla, ajusta potencias y horas hasta que coincida con una factura real.</p>
    <button class="btn" data-a="ap-aplicar" style="margin-top:8px">Usar este consumo en la simulación</button>
    <p class="ayuda">Rellena el consumo del periodo de la factura (${MESES_L[ref]}) y el consumo mes a mes por periodos, que pasa a modo "Consumos reales".</p>`;
}
function aplicarAparatos() {
  const ap = E.aparatos; const cl = E.cliente;
  if (!ap.lista.length) return;
  const est = estimar(ap.lista, ap.margen, cl.tarifa);
  const ref = mesReferencia(E);
  if (!(num(cl.dias) > 0)) cl.dias = 30;
  const esc2 = num(cl.dias) / DIAS_MES[ref];
  cl.consumo = Array(6).fill('');
  est.mensual[ref].kwh.forEach((v, i) => { cl.consumo[i] = String(Math.round(v * esc2)); });
  E.perfil.modo = 'real'; E.perfil.porPeriodos = true; E.perfil.fuente = 'estimación por aparatos';
  E.perfil.real = est.mensual.map((m) => ({ total: '', kwh: [...m.kwh.map((v) => String(Math.round(v))), ...Array(6 - m.kwh.length).fill('')] }));
  marcar(); formulario();
  avisar(`Consumo aplicado: ${fNum(est.anual, 0)} kWh al año. Revisa el paso "Consumo a lo largo del año".`);
}

const pie = () => {
  const i = PASOS.findIndex((p) => p[0] === paso);
  return `<div class="nav-pie no-imp">${i > 0 ? `<button class="btn sec" data-a="paso" data-v="prev">${IC.atras} Atrás</button>` : '<span></span>'}
    <button class="btn" data-a="paso" data-v="next">${PASOS[i + 1][1] === 'Resultado' ? 'Ver el resultado' : 'Siguiente: ' + PASOS[i + 1][1]} ${IC.sig}</button></div>`;
};
const opc = (id, icono, titulo, badge, cuerpo) => `<details class="card opc" data-op="${id}" ${abiertos.has(id) ? 'open' : ''}><summary><span class="ico">${icono}</span><span class="tt">${titulo}</span>${badge ? `<span class="bd">${esc(badge)}</span>` : ''}<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></summary><div class="opc-c">${cuerpo}</div></details>`;
const rangoTxt = () => {
  const c = E.cliente;
  const f = (x) => new Date(x + 'T00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return c.inicio && c.fin ? `${f(c.inicio)} a ${f(c.fin)}` : `los últimos ${num(c.dias) || 30} días`;
};

function cardCargos(k) {
  const L = E[k]; const esA = k === 'actual'; const cl = E.cliente;
  const unid = [['mes', '€ al mes'], ['dia', '€ al día'], ['anio', '€ al año']];
  const uTxt = { mes: 'al mes', dia: 'al día', anio: 'al año' };
  let alq;
  if (esA) alq = `<div class="fila f2"><label class="c">Alquiler del contador${inp('cliente.alquiler.importe')}</label><label class="c">Se cobra${sel('cliente.alquiler.unidad', unid)}</label></div>`;
  else alq = `<label class="chk"><input type="checkbox" data-p="propuesta.alquilerPropio.activo" data-chk="1" ${L.alquilerPropio.activo ? 'checked' : ''}> El alquiler del contador es distinto al de la factura actual</label>
    ${L.alquilerPropio.activo ? `<div class="fila f2" style="margin-top:8px"><label class="c">Alquiler en la propuesta${inp('propuesta.alquilerPropio.importe')}</label><label class="c">Se cobra${sel('propuesta.alquilerPropio.unidad', unid)}</label></div>`
    : `<p class="ayuda" style="margin-top:4px">Igual que en la factura actual: ${num(cl.alquiler.importe) ? fEur(num(cl.alquiler.importe)) + ' ' + uTxt[cl.alquiler.unidad] : 'sin importe todavía (ponlo en el paso anterior)'}.</p>`}`;
  const cargos = cl.cargos.map((g, i) => `<div class="item"><div class="cab-i"><span>${esc(g.nombre || 'Cargo regulado')}</span><button class="lnk" data-a="cargo-del" data-i="${i}">Quitar</button></div>
    <div class="fila f3"><label class="c">Concepto${txt(`cliente.cargos.${i}.nombre`, 'Financiación del bono social')}</label>
      <label class="c">Tipo${sel(`cliente.cargos.${i}.tipo`, [['fijo', 'Importe fijo'], ['pct', '% sobre potencia + energía']], 'data-r="1"')}</label>
      <label class="c">${g.tipo === 'pct' ? 'Porcentaje (%)' : 'Importe (€)'}${inp(`cliente.cargos.${i}.importe`)}</label></div>
    <div class="fila f2">${g.tipo === 'pct' ? '<span></span>' : `<label class="c">Se cobra${sel(`cliente.cargos.${i}.unidad`, [['dia', '€ al día'], ['mes', '€ al mes'], ['anio', '€ al año']])}</label>`}
      <label class="chk" style="padding-bottom:8px"><input type="checkbox" data-p="cliente.cargos.${i}.tributaIEE" data-chk="1" ${g.tributaIEE !== false ? 'checked' : ''}> Entra en la base del impuesto de electricidad</label></div></div>`).join('');
  return `<section class="card"><h2><span class="ico">${IC.rueda}</span>Alquiler del contador y cargos regulados</h2>
    <p class="sub">Conceptos que fija la normativa o la distribuidora. Son iguales en las dos facturas, salvo que marques lo contrario.</p>
    ${alq}
    <h3 style="margin-top:16px">Cargos regulados (comunes)</h3>
    ${cargos || '<div class="vacio">Sin cargos. Añade la financiación del bono social u otros que aparezcan en la factura.</div>'}
    <div class="ree-u" style="margin-top:8px"><button class="btn sec mini" data-a="cargo-add" data-v="bono">${IC.mas} Financiación del bono social</button><button class="btn sec mini" data-a="cargo-add" data-v="otro">${IC.mas} Otro cargo o tasa</button></div>
    <p class="ayuda">La financiación del bono social es un importe fijo por contrato y día que fija el Ministerio y cambia cada año: copia el importe que aparece en la factura. Por defecto entra en la base del impuesto de electricidad y del IVA. Se cobra igual con cualquier comercializadora.</p></section>`;
}

function htmlLado(k) {
  const L = E[k]; const cl = E.cliente; const t = TARIFAS[cl.tarifa];
  const esA = k === 'actual';
  const P = (s) => `${k}.${s}`;
  const sec = (ico, tit, sub, cuerpo) => `<section class="card"><h2><span class="ico">${ico}</span>${tit}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${cuerpo}</section>`;

  const potFilas = t.pot.map((n, i) => {
    const ro = !esA && L.potencia.igualActual;
    const sin = L.potencia.unico && i > 0;
    return `<div class="per"><span class="pn">${esc(n)}</span>${inp(P('potencia.contratada.' + i), { ro })}${sin ? '<input type="text" value="igual" readonly>' : inp(P('potencia.precios.' + i), { cls: num(L.potencia.precios[i]) === 0 ? 'falta' : '' })}</div>`;
  }).join('');
  const nP = L.energia.nPrecios;
  const nombresGrupo = Array.from({ length: nP }, (_, g) => {
    const cubre = t.en.filter((_, i) => (L.energia.grupos[i] ?? i) === g).map((x) => x.split(' ')[0]);
    if (nP === 1) return 'Precio único';
    if (cl.tarifa === '2.0TD' && nP === 2) return g === 0 ? 'Punta (P1 y P2, de 8 a 24 h)' : 'Valle (P3, de 0 a 8 h y fines de semana)';
    return `Precio ${g + 1}${cubre.length ? ' (' + cubre.join(', ') + ')' : ''}`;
  });
  const unEn = { eur: '€/kWh', cent: 'c€/kWh', mwh: '€/MWh' }[L.energia.unidad];
  const unPot = { dia: '€/kW·día', mes: '€/kW·mes', anio: '€/kW·año' }[L.potencia.unidad];

  const potencia = sec(IC.bolt, 'Potencia', 'Qué potencia tiene contratada y a cuánto se la cobran. El precio puede venir al año, al mes o al día.',
    `<div class="fila f2"><label class="c">El precio viene en${sel(P('potencia.unidad'), [['dia', '€/kW·día'], ['mes', '€/kW·mes'], ['anio', '€/kW·año']])}</label>
    <div style="display:flex;flex-direction:column;gap:6px;justify-content:flex-end;padding-bottom:6px">
      <label class="chk"><input type="checkbox" data-p="${P('potencia.unico')}" data-chk="1" ${L.potencia.unico ? 'checked' : ''}> Mismo precio en todos los periodos</label>
      ${esA ? '' : `<label class="chk"><input type="checkbox" data-p="${P('potencia.igualActual')}" data-chk="1" ${L.potencia.igualActual ? 'checked' : ''}> Misma potencia que la actual</label>`}</div></div>
    <div class="per cab2"><span>Periodo</span><span>kW contratados</span><span>Precio (${unPot})</span></div>${potFilas}`);

  const energia = sec(IC.sol, 'Energía', 'El precio por kWh. Si la oferta tiene 1, 2, 3 o hasta 6 precios, elige cuántos y a qué periodos se aplica cada uno.',
    `<div class="fila f2"><label class="c">El precio viene en${sel(P('energia.unidad'), [['eur', '€/kWh'], ['cent', 'Céntimos €/kWh'], ['mwh', '€/MWh']])}</label>
    <label class="c">Precios distintos
      <div class="seg">${Array.from({ length: t.nEn }, (_, i) => i + 1).map((n) => `<button type="button" data-a="nprecios" data-l="${k}" data-v="${n}" class="${nP === n ? 'on' : ''}">${n === 1 ? 'Único' : n}</button>`).join('')}</div></label></div>
    ${cl.tarifa === '2.0TD' ? `<p class="ayuda" style="margin:-2px 0 10px">Si la oferta solo da <b>punta y valle</b>, elige <b>2</b>: el llano (P2) se cobra al precio de punta, y el valle es el P3. Con <b>3</b> se pone un precio a cada periodo. Si el valle de la oferta tiene otro horario (por ejemplo de 22 a 12 h), el cálculo es aproximado.</p>` : ''}
    ${nP === t.nEn ? `<div class="per cab2"><span>Periodo</span><span>Consumo</span><span>Precio (${unEn})</span></div>
      ${t.en.map((n, i) => `<div class="per"><span class="pn">${esc(n)}</span><input type="text" value="${esc(cl.consumo[i] || '0')} kWh" readonly>${inp(P('energia.precios.' + i), { cls: num(L.energia.precios[i]) === 0 ? 'falta' : '' })}</div>`).join('')}`
    : `<div class="per cab2"><span>Precio</span><span></span><span>${unEn}</span></div>
      ${nombresGrupo.map((n, g) => `<div class="per"><span class="pn" style="grid-column:1/3">${esc(n)}</span>${inp(P('energia.precios.' + g), { cls: num(L.energia.precios[g]) === 0 ? 'falta' : '' })}</div>`).join('')}
      <h3 style="margin-top:12px">Qué precio se aplica a cada periodo</h3>
      ${t.en.map((n, i) => `<div class="per"><span class="pn">${esc(n)}</span><input type="text" value="${esc(cl.consumo[i] || '0')} kWh" readonly>
        <select data-p="${P('energia.grupos.' + i)}" data-int="1" data-r="1">${nombresGrupo.map((g, gi) => `<option value="${gi}" ${(L.energia.grupos[i] ?? i) === gi ? 'selected' : ''}>${esc(g.split(' (')[0])}</option>`).join('')}</select></div>`).join('')}`}
    ${num(cl.excedentes) > 0 ? `<div class="fila" style="margin-top:8px"><label class="c">Compensación de excedentes (${unEn})${inp(P('compensacion.precio'))}</label></div>` : ''}
    ${bloqueREE(k)}`);

  const nServ = L.servicios.length; const nDesc = L.descuentos.length; const nOtros = L.otros.length;
  const servicios = opc(k + '-serv', IC.caja, 'Servicios adicionales', nServ ? nServ + (nServ === 1 ? ' servicio' : ' servicios') : 'ninguno',
    `${L.servicios.length ? L.servicios.map((s, i) => `<div class="item"><div class="cab-i"><span>${esc(s.nombre || 'Servicio')}</span><button class="lnk" data-a="del" data-l="${k}" data-b="servicios" data-i="${i}">Quitar</button></div>
      <div class="fila f2"><label class="c">Nombre${txt(P(`servicios.${i}.nombre`), 'Mantenimiento, seguro…')}</label><label class="c">Importe (sin IVA)${inp(P(`servicios.${i}.importe`))}</label></div>
      <div class="fila f3"><label class="c">Se cobra${sel(P(`servicios.${i}.unidad`), [['mes', '€ al mes'], ['anio', '€ al año'], ['dia', '€ al día'], ['unico', 'Pago único']])}</label>
        <label class="c">Dura (meses, vacío = siempre)${inp(P(`servicios.${i}.meses`))}</label>
        <label class="chk" style="padding-bottom:8px"><input type="checkbox" data-p="${P(`servicios.${i}.iva`)}" data-chk="1" ${s.iva !== false ? 'checked' : ''}> Lleva IVA</label></div>
      <div class="sub-op"><label class="chk"><input type="checkbox" data-p="${P(`servicios.${i}.desc.activo`)}" data-chk="1" ${s.desc.activo ? 'checked' : ''}> Este servicio tiene descuento</label>
        ${s.desc.activo ? `<div class="fila f3"><label class="c">Tipo${sel(P(`servicios.${i}.desc.tipo`), [['pct', 'Porcentaje (%)'], ['eur', 'Importe al mes (€)'], ['unico', 'Pago único (€)']])}</label>
          <label class="c">Valor${inp(P(`servicios.${i}.desc.valor`))}</label><label class="c">Dura (meses, vacío = siempre)${inp(P(`servicios.${i}.desc.meses`))}</label></div>` : ''}</div>
      <div class="sub-op"><label class="chk"><input type="checkbox" data-p="${P(`servicios.${i}.perm.activa`)}" data-chk="1" ${s.perm.activa ? 'checked' : ''}> Este servicio tiene permanencia</label>
        ${s.perm.activa ? `<div class="fila f2"><label class="c">Meses de permanencia${inp(P(`servicios.${i}.perm.meses`))}</label><label class="c">Penalización si se cancela (€)${inp(P(`servicios.${i}.perm.penalizacion`))}</label></div>` : ''}</div></div>`).join('')
    : '<div class="vacio">Sin servicios adicionales.</div>'}
    <button class="btn sec mini" data-a="add" data-l="${k}" data-b="servicios">${IC.mas} Añadir servicio</button>`);
  const descuentos = opc(k + '-desc', IC.etq, 'Descuentos', nDesc ? nDesc + (nDesc === 1 ? ' descuento' : ' descuentos') : 'ninguno',
    `${L.descuentos.length ? L.descuentos.map((d, i) => {
    const op1 = [['', 'Ninguna, siempre se aplica'], ...L.servicios.map((s) => [s.id, 'Solo si contrata: ' + (s.nombre || 'Servicio')])];
    const op2 = [['', 'Elige el servicio'], ...L.servicios.map((s) => [s.id, s.nombre || 'Servicio'])];
    const un = { pct: '%', eur: '€ al mes', eurkwh: '€ por kWh', unico: '€ una vez' }[d.tipo];
    return `<div class="item"><div class="cab-i"><span>${esc(d.nombre || 'Descuento')}</span><button class="lnk" data-a="del" data-l="${k}" data-b="descuentos" data-i="${i}">Quitar</button></div>
      <div class="fila f3"><label class="c">Nombre${txt(P(`descuentos.${i}.nombre`), 'Ej.: 10 % primer año')}</label>
        <label class="c">Tipo${sel(P(`descuentos.${i}.tipo`), [['pct', 'Porcentaje (%)'], ['eur', 'Importe fijo al mes (€)'], ['eurkwh', 'Por kWh (€/kWh)'], ['unico', 'Pago único (€)']], 'data-r="1"')}</label>
        <label class="c">Valor (${un})${inp(P(`descuentos.${i}.valor`))}</label></div>
      <div class="fila f2"><label class="c">Se aplica sobre${sel(P(`descuentos.${i}.aplica`), Object.entries(APLICA), 'data-r="1"')}</label>
        ${d.aplica === 'servicio' ? `<label class="c">Servicio${sel(P(`descuentos.${i}.servicioId`), op2)}</label>` : '<span></span>'}</div>
      <div class="fila f3"><label class="c">Condición${sel(P(`descuentos.${i}.requiere`), op1)}</label>
        <label class="c">Empieza en el mes${inp(P(`descuentos.${i}.desde`), { ph: '1' })}</label>
        <label class="c">Dura (meses, vacío = siempre)${inp(P(`descuentos.${i}.meses`))}</label></div></div>`;
  }).join('') : '<div class="vacio">Sin descuentos.</div>'}
    <button class="btn sec mini" data-a="add" data-l="${k}" data-b="descuentos">${IC.mas} Añadir descuento</button>
    <p class="ayuda">Un descuento puede depender de un servicio (solo se da si lo contrata) y/o aplicarse al propio servicio. Si quitas el servicio, dejan de aplicarse los descuentos que dependen de él.</p>`);
  const otros = opc(k + '-otros', IC.rueda, 'Otros conceptos (reactiva, exceso de potencia…)', nOtros ? nOtros + ' concepto(s)' : 'ninguno',
    `${L.otros.map((o, i) => `<div class="item"><div class="cab-i"><span>${esc(o.nombre || 'Otro concepto')}</span><button class="lnk" data-a="del" data-l="${k}" data-b="otros" data-i="${i}">Quitar</button></div>
      <div class="fila f2"><label class="c">Concepto${txt(P(`otros.${i}.nombre`), 'Reactiva, exceso de potencia…')}</label><label class="c">Importe del periodo (€, sin IVA)${inp(P(`otros.${i}.importe`))}</label></div>
      <label class="chk"><input type="checkbox" data-p="${P(`otros.${i}.tributaIEE`)}" data-chk="1" ${o.tributaIEE !== false ? 'checked' : ''}> Entra en la base del impuesto de electricidad</label></div>`).join('')}
    <button class="btn sec mini" data-a="add" data-l="${k}" data-b="otros">${IC.mas} Añadir otro concepto (reactiva, exceso de potencia…)</button>`);
  const perm = opc(k + '-perm', IC.reloj, esA ? 'Permanencia actual y comprobación' : 'Permanencia de la propuesta', num(L.permanencia.meses) ? L.permanencia.meses + ' meses' : 'sin permanencia',
    `<div class="fila f2"><label class="c">${esA ? 'Meses que le quedan' : 'Meses que exige'}${inp(P('permanencia.meses'))}</label>
      <label class="c">Penalización si se sale antes (€)${inp(P('permanencia.penalizacion'))}</label></div>
    ${esA ? `<label class="chk"><input type="checkbox" data-p="incluirPenalizacion" data-chk="1" ${E.incluirPenalizacion ? 'checked' : ''}> Restar esta penalización del ahorro al cambiar</label>
      <h3 style="margin-top:14px">Comprobación</h3><label class="c">Total real de la factura (€, con impuestos)${inp(P('real.total'))}</label><p class="ayuda">Si lo rellenas, el simulador avisa cuando su cálculo de la factura actual no cuadra.</p>` : ''}`);

  const titulo = esA ? 'Lo que paga hoy' : 'La propuesta';
  const sub = esA ? 'Datos de la factura actual: precios, servicios y descuentos que tiene ahora.' : 'Datos de la oferta que le proponen. El consumo es el mismo que el de la factura actual.';
  return `<div class="paso-t"><span class="etq ${esA ? 'a' : 'p'}">${esA ? 'ACTUAL' : 'PROPUESTA'}</span><div><h1>${titulo}</h1><p>${sub}</p></div></div>
    ${cajaIA(k)}${potencia}${energia}${cardCargos(k)}${servicios}${descuentos}${otros}${perm}${pie()}`;
}

function cajaIA(k, grande = false) {
  const esA = k === 'actual';
  const n = notasIA[k];
  return `<div class="ia-caja no-imp ${grande ? 'grande' : ''}" data-drop="${k}"><div class="t"><b>${esA ? 'Cargar la factura con IA' : 'Cargar la oferta o propuesta con IA'}</b>
    <span>${esA ? 'Arrastra aquí la factura (PDF o fotos) y se rellenan consumos, precios, servicios y descuentos.' : 'Arrastra aquí la oferta (PDF o fotos) y se rellenan precios, servicios y descuentos.'} Revisa lo marcado en verde. Si prefieres, mete los datos a mano.</span></div>
    <button class="btn az" data-a="subir" data-l="${k}">${IC.sube} Subir</button><input type="file" hidden multiple accept="application/pdf,image/*" data-file="${k}"></div>
    ${n ? `<div class="notas-ia no-imp"><b>Leído con IA. Comprueba los datos marcados en verde antes de fiarte.</b>${n.length ? '<ul>' + n.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>' : ''}</div>` : ''}`;
}

// ---------- Red Eléctrica ----------
function bloqueREE(k) {
  const cl = E.cliente; const r = reeDatos[k]; const t = TARIFAS[cl.tarifa];
  const f = (v) => (v === null || v === undefined ? '—' : fNum(v, 4));
  const filas = (clave, nom) => `<tr><td>${nom}</td>${t.en.map((_, i) => `<td>${f(r[clave][i])}<small>${r.horas[clave][i] || 0} h</small></td>`).join('')}</tr>`;
  return `<div class="ree no-imp"><div class="ree-t"><span class="ico rojo">${IC.red}</span><div><b>Precios reales de Red Eléctrica</b><span>Media de las horas de cada periodo entre ${esc(rangoTxt())}. Útil si la factura es PVPC o la oferta va indexada al mercado.</span></div>
    <button class="btn az mini" data-a="ree-fetch" data-l="${k}" ${reeDatos._carga === k ? 'disabled' : ''}>${reeDatos._carga === k ? 'Consultando…' : r ? 'Actualizar' : 'Consultar REE'}</button></div>
    ${r ? `<div class="ree-r"><table class="tb ree-tb"><thead><tr><th>€/kWh</th>${t.en.map((n) => `<th>${esc(n.split(' ')[0])}</th>`).join('')}</tr></thead><tbody>
      ${cl.tarifa === '2.0TD' ? filas('pvpc', 'PVPC (tarifa regulada)') : ''}${filas('spot', 'Mercado spot')}</tbody></table>
      <div class="ree-u">${cl.tarifa === '2.0TD' ? `<button class="btn sec mini" data-a="ree-usar" data-l="${k}" data-v="pvpc">Usar el PVPC</button>` : ''}
        <button class="btn sec mini" data-a="ree-usar" data-l="${k}" data-v="spot">Usar el spot</button>
        <label class="chk2">+ margen <input type="text" inputmode="decimal" data-margen="${k}" value="${esc(reeMargen[k])}" placeholder="0,02"> €/kWh</label></div>
      <p class="ayuda">El PVPC ya incluye peajes y cargos. El spot es solo el precio mayorista: suma el margen de la comercializadora y, si no los lleva, los peajes. Son medias simples por horas, no ponderadas por tu curva de consumo.</p></div>` : ''}</div>`;
}
async function reeConsultar(k) {
  const cl = E.cliente;
  let ini = cl.inicio; let fin = cl.fin;
  if (!ini || !fin) {
    const f = new Date(); f.setDate(f.getDate() - 1);
    const i = new Date(f); i.setDate(i.getDate() - (num(cl.dias) || 30) + 1);
    const iso = (d) => d.toISOString().slice(0, 10);
    ini = iso(i); fin = iso(f);
  }
  reeDatos._carga = k; formulario();
  try {
    reeDatos[k] = await api(`/api/ree/periodos?inicio=${ini}&fin=${fin}&tarifa=${cl.tarifa}`);
  } catch (e) { avisar(e.message, true); }
  reeDatos._carga = null; formulario();
}
function reeUsar(k, que) {
  const r = reeDatos[k]; if (!r) return;
  const L = E[k]; const t = TARIFAS[E.cliente.tarifa];
  const margen = que === 'spot' ? num(reeMargen[k]) : 0;
  const base = r[que].slice(0, t.nEn);
  if (base.every((v) => v === null)) return avisar('Red Eléctrica no tiene datos de ese periodo', true);
  L.energia.unidad = 'eur'; L.energia.nPrecios = t.nEn; L.energia.grupos = [0, 1, 2, 3, 4, 5];
  L.energia.precios = [...base.map((v) => (v === null ? '' : String(+(v + margen).toFixed(6)))), ...Array(6 - t.nEn).fill('')];
  ia = new Set(base.map((_, i) => `${k}.energia.precios.${i}`));
  L.fuente = (que === 'pvpc' ? 'PVPC (REE)' : 'Spot (REE)' + (margen ? ' + ' + fNum(margen, 4) + ' €/kWh' : '')) + ` · ${r.inicio} a ${r.fin}`;
  marcar(); formulario(); avisar('Precios de energía rellenados con datos de REE');
}
async function reeEstacionalidad() {
  try {
    const d = await api('/api/ree/estacionalidad');
    const ref = mesReferencia(E);
    E.perfil.variacion = d.indice.map((x, i) => (i === ref ? '0' : String(+((x / d.indice[ref] - 1) * 100).toFixed(1))));
    E.perfil.modo = 'variacion';
    E.perfil.fuente = `${d.fuente}, ${d.desde.slice(0, 7)} a ${d.hasta.slice(0, 7)}`;
    marcar(); formulario(); avisar('Estacionalidad cargada de REE. Es la del sistema eléctrico, no la de este cliente.');
  } catch (e) { avisar(e.message, true); }
}
async function cardHoy() {
  const el = $('#hoy'); if (!el) return;
  let d; try { d = await api('/api/ree/hoy'); } catch (e) { el.innerHTML = `<p class="ayuda">${esc(e.message)}</p>`; return; }
  const dias = Object.keys(d).sort();
  const pintar = (fecha, serie) => {
    const v = d[fecha].map((x) => x[serie]);
    const ok = v.filter((x) => x !== null);
    if (!ok.length) { $('#hoy-g').innerHTML = '<p class="ayuda">Todavía no hay precios publicados para este día.</p>'; return; }
    const max = Math.max(...ok); const min = Math.min(...ok); const ord = [...ok].sort((a, b) => a - b);
    const t1 = ord[Math.floor(ord.length / 3)]; const t2 = ord[Math.floor(ord.length * 2 / 3)];
    const ahora = new Date().getHours(); const esHoy = fecha === dias[0];
    const hb = (h) => `${h}–${h + 1} h`;
    const media = ok.reduce((s, x) => s + x, 0) / ok.length;
    $('#hoy-g').innerHTML = `<div class="hoy-barras">${d[fecha].map((x, i) => {
      const val = x[serie]; if (val === null) return '<span class="hb"></span>';
      const c = val <= t1 ? 'b' : val <= t2 ? 'm' : 'a';
      return `<span class="hb ${c} ${esHoy && i === ahora ? 'ya' : ''}" title="${hb(i)}: ${fNum(val, 4)} €/kWh"><i style="height:${Math.max(6, val / max * 100)}%"></i><small>${i % 3 === 0 ? i : ''}</small></span>`;
    }).join('')}</div>
    <div class="hoy-k"><div><small>Más barata</small><b class="bien">${hb(v.indexOf(min))}</b><span>${fNum(min, 3)} €/kWh</span></div><div><small>Más cara</small><b class="mal-t">${hb(v.indexOf(max))}</b><span>${fNum(max, 3)} €/kWh</span></div><div><small>Media del día</small><b>${fNum(media, 3)} €/kWh</b></div></div>`;
  };
  let fecha = dias[0]; let serie = 'pvpc';
  const pinta = () => {
    el.querySelectorAll('[data-hd]').forEach((b) => b.classList.toggle('on', b.dataset.hd === fecha));
    el.querySelectorAll('[data-hs]').forEach((b) => b.classList.toggle('on', b.dataset.hs === serie));
    pintar(fecha, serie);
  };
  el.innerHTML = `<div class="hoy-cab"><div><b>La luz hoy</b><span>Datos de Red Eléctrica, por horas</span></div>
    <div class="acc"><div class="seg">${dias.map((x, i) => `<button type="button" data-hd="${x}">${i === 0 ? 'Hoy' : 'Mañana'}</button>`).join('')}</div>
    <div class="seg"><button type="button" data-hs="pvpc">PVPC</button><button type="button" data-hs="spot">Mercado</button></div></div></div><div id="hoy-g"></div>`;
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.hd) fecha = b.dataset.hd; if (b.dataset.hs) serie = b.dataset.hs; pinta();
  });
  pinta();
}

// ---------- eventos ----------
function enlazar() {
  raiz.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.dataset && el.dataset.rs === 'pct') { ui.pct = parseInt(el.value, 10) || 0; const v = $('#rs-pct-v'); if (v) v.textContent = (ui.pct > 0 ? '+' : '') + ui.pct + ' %'; salidaResultado(); }
  });
  raiz.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!el.dataset) return;
    if (el.dataset.rs === 'pen') { ui.pen = el.checked; salidaResultado(); }
    else if (el.dataset.rs === 'sv') { const k = el.dataset.k; ui.off = el.checked ? ui.off.filter((x) => x !== k) : [...ui.off, k]; salidaResultado(); }
    else if (el.dataset.inf) { E.informe.secs[el.dataset.inf] = el.checked; marcar(); calcular(); }
  });
  raiz.addEventListener('click', (ev) => {
    const h = ev.target.closest('.rs-hit');
    if (h) { mostrarTT(h); return; }
    const b = ev.target.closest('[data-rs]');
    if (!b || b.tagName === 'INPUT' || !E) return;
    const a = b.dataset.rs;
    if (a === 'H') ui.H = b.dataset.v === 'f' ? 'f' : parseInt(b.dataset.v, 10);
    else if (a === 'vista') ui.vista = b.dataset.v;
    else if (a === 'lado') ui.lado = b.dataset.v;
    else if (a === 'tabla') ui.tabla = !ui.tabla;
    else if (a === 'reset') Object.assign(ui, { pct: 0, H: null, pen: true, off: [] });
    const ctl = $('#rs-ctl'); if (ctl) ctl.innerHTML = htmlControles(E, ui);
    salidaResultado();
  });
  raiz.addEventListener('mouseover', (ev) => { const h = ev.target.closest && ev.target.closest('.rs-hit'); if (h) mostrarTT(h); });
  raiz.addEventListener('toggle', (ev) => { const d = ev.target; if (d.dataset?.op) { d.open ? abiertos.add(d.dataset.op) : abiertos.delete(d.dataset.op); } }, true);
  raiz.addEventListener('input', (ev) => {
    if (!E) return;
    if (ev.target.dataset?.estac) { estac[ev.target.dataset.estac] = ev.target.value; return; }
    if (ev.target.dataset?.margen) { reeMargen[ev.target.dataset.margen] = ev.target.value; return; }
    const el = ev.target;
    if (!el.dataset?.p || el.dataset.chk || el.dataset.int || el.tagName === 'SELECT' || el.type === 'date') return;
    setP(E, el.dataset.p, el.value);
    if (ia.delete(el.dataset.p)) el.classList.remove('leido');
    if (/^(actual|propuesta)\.energia\.precios/.test(el.dataset.p)) delete E[el.dataset.p.split('.')[0]].fuente;
    if (el.dataset.p.endsWith('.nombre')) el.closest('.item')?.querySelector('.cab-i span')?.replaceChildren(el.value || 'Elemento');
    if (el.dataset.p.startsWith('aparatos.')) { const r = $('#ap-res'); if (r) r.innerHTML = resumenAparatos(); }
    if (/^(perfil\.|cliente\.(consumo|dias|excedentes))/.test(el.dataset.p)) { const g = $('#perfil-g'); if (g) g.innerHTML = graficoPerfil(); }
    marcar(); calcular();
  });
  raiz.addEventListener('change', (ev) => {
    if (!E) return;
    const el = ev.target;
    if (el.dataset?.file) return subirArchivos(el.dataset.file, [...el.files]).then(() => (el.value = ''));
    if (!el.dataset?.p) return;
    let v = el.value;
    if (el.dataset.chk) v = el.checked;
    else if (el.dataset.int || el.dataset.p === 'perfil.refMes') v = parseInt(v, 10);
    setP(E, el.dataset.p, v);
    if (el.dataset.a2 === 'fechas') {
      const a = E.cliente.inicio; const b = E.cliente.fin;
      if (a && b) { const d = Math.round((new Date(b) - new Date(a)) / 86400000); if (d > 0 && d < 400) { E.cliente.dias = d; } }
      marcar(); formulario(); return;
    }
    marcar();
    if (el.dataset.r || el.dataset.chk || el.tagName === 'SELECT' || el.type === 'month') formulario(); else calcular();
  });
  raiz.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]');
    if (!b || !E) return;
    const a = b.dataset.a; const l = b.dataset.l;
    if (a === 'paso') { const i = PASOS.findIndex((p) => p[0] === paso); setPaso(b.dataset.v === 'next' ? PASOS[Math.min(PASOS.length - 1, i + 1)][0] : b.dataset.v === 'prev' ? PASOS[Math.max(0, i - 1)][0] : b.dataset.v); return; }
    if (a === 'perfil-modo') { E.perfil.modo = b.dataset.v; marcar(); formulario(); return; }
    if (a === 'estac-aplicar') {
      const v = num(estac.verano); const w = num(estac.invierno);
      [5, 6, 7].forEach((i) => { if (estac.verano !== '') E.perfil.variacion[i] = String(v); });
      [11, 0, 1].forEach((i) => { if (estac.invierno !== '') E.perfil.variacion[i] = String(w); });
      E.perfil.fuente = 'valores manuales'; marcar(); formulario(); return;
    }
    if (a === 'ree-estac') { reeEstacionalidad(); return; }
    if (a === 'imprimir') { descargarPDF(); return; }
    if (a === 'inf-version') { E.informe.version = b.dataset.v; marcar(); formulario(); return; }
    if (a === 'cargo-add') { E.cliente.cargos.push(b.dataset.v === 'bono' ? { nombre: 'Financiación del bono social', tipo: 'fijo', importe: '', unidad: 'dia', tributaIEE: true } : { nombre: '', tipo: 'fijo', importe: '', unidad: 'mes', tributaIEE: false }); marcar(); formulario(); return; }
    if (a === 'cargo-del') { E.cliente.cargos.splice(parseInt(b.dataset.i, 10), 1); marcar(); formulario(); return; }
    if (a === 'ap-add') { const v = $('#ap-cat')?.value; if (!v) return avisar('Elige un aparato de la lista', true); E.aparatos.lista.push(v === 'otro' ? { nombre: '', w: '', cant: 1, h: '', semana: 'todos', estac: 'todo', franja: '24h' } : aparatoDe(v)); abiertos.add('aparatos'); marcar(); formulario(); return; }
    if (a === 'ap-del') { E.aparatos.lista.splice(parseInt(b.dataset.i, 10), 1); marcar(); formulario(); return; }
    if (a === 'ap-preset') { E.aparatos.lista = b.dataset.v === 'vacio' ? [] : PRESETS[b.dataset.v].ids.map(aparatoDe); abiertos.add('aparatos'); marcar(); formulario(); return; }
    if (a === 'ap-aplicar') { aplicarAparatos(); return; }
    if (a === 'ree-fetch') { reeConsultar(l); return; }
    if (a === 'ree-usar') { reeUsar(l, b.dataset.v); return; }
    if (a === 'tarifa') {
      E.cliente.tarifa = b.dataset.v; delete reeDatos.actual; delete reeDatos.propuesta;
      for (const k of ['actual', 'propuesta']) {
        const n = TARIFAS[b.dataset.v].nEn;
        E[k].energia.nPrecios = n; E[k].energia.grupos = gruposPorDefecto(b.dataset.v, n);
      }
    } else if (a === 'horizonte') E.horizonte = b.dataset.v;
    else if (a === 'nprecios') { const n = parseInt(b.dataset.v, 10); E[l].energia.nPrecios = n; E[l].energia.grupos = gruposPorDefecto(E.cliente.tarifa, n); }
    else if (a === 'add') {
      const arr = E[l][b.dataset.b];
      if (b.dataset.b === 'otros') arr.push({ nombre: '', importe: '', tributaIEE: true });
      if (b.dataset.b === 'servicios') arr.push(servicioNuevo());
      if (b.dataset.b === 'descuentos') arr.push({ id: nuevoId(), nombre: '', tipo: 'pct', valor: '', aplica: 'energia', servicioId: '', requiere: '', desde: '', meses: '' });
    } else if (a === 'del') {
      const i = parseInt(b.dataset.i, 10);
      const arr = E[l][b.dataset.b];
      const [q] = arr.splice(i, 1);
      if (b.dataset.b === 'servicios') E[l].descuentos.forEach((d) => { if (d.requiere === q.id) d.requiere = ''; if (d.servicioId === q.id) d.servicioId = ''; });
    } else if (a === 'subir') { raiz.querySelector(`[data-file="${l}"]`).click(); return; }
    else return;
    marcar(); formulario();
  });
  raiz.addEventListener('dragover', (ev) => { const c = ev.target.closest('[data-drop]'); if (c) { ev.preventDefault(); c.classList.add('arrastre'); } });
  raiz.addEventListener('dragleave', (ev) => { ev.target.closest?.('[data-drop]')?.classList.remove('arrastre'); });
  raiz.addEventListener('drop', (ev) => {
    const c = ev.target.closest('[data-drop]'); if (!c || !E) return;
    ev.preventDefault(); c.classList.remove('arrastre');
    subirArchivos(c.dataset.drop, [...ev.dataTransfer.files]);
  });
}

// ---------- lectura con IA ----------
async function aBase64(f) {
  if (f.type === 'application/pdf') {
    const b = new Uint8Array(await f.arrayBuffer()); let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return { mime: f.type, datos: btoa(s) };
  }
  // Las fotos se reducen a 2000 px para que suban rápido
  const url = URL.createObjectURL(f);
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const k = Math.min(1, 2000 / Math.max(img.width, img.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  URL.revokeObjectURL(url);
  return { mime: 'image/jpeg', datos: cv.toDataURL('image/jpeg', 0.85).split(',')[1] };
}
async function subirArchivos(k, files) {
  files = files.filter((f) => f.type === 'application/pdf' || f.type.startsWith('image/'));
  if (!files.length) return avisar('Sube un PDF o fotos (JPG, PNG)', true);
  if (files.length > 8) return avisar('Máximo 8 archivos', true);
  const caja = raiz.querySelector(`[data-drop="${k}"]`);
  const orig = caja.innerHTML;
  caja.innerHTML = '<div class="leyendo"><span class="giro"></span> Leyendo el documento… puede tardar medio minuto</div>';
  try {
    const archivos = [];
    for (const f of files) archivos.push(await aBase64(f));
    const d = await api('/api/leer', { method: 'POST', body: JSON.stringify({ lado: k, archivos }) });
    aplicarLectura(k, d);
    const aviso = [...(d.notas || [])];
    if (!d.legible) aviso.unshift('La IA no ha podido leerlo con seguridad: revisa todos los datos.');
    notasIA[k] = aviso;
    marcar();
    if (paso === 'cliente' && k === 'actual') paso = 'actual';
    formulario();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    avisar('Documento leído. Revisa los campos marcados en verde.');
  } catch (e) { caja.innerHTML = orig; avisar(e.message, true); }
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const val = (v) => (v === null || v === undefined ? '' : String(v));
function aplicarLectura(k, d) {
  const L = E[k]; const cl = E.cliente; ia = new Set();
  const marca = (p) => ia.add(p);
  const c = d.cliente || {};
  const lee = k === 'actual';
  if (c.tarifa && c.tarifa !== cl.tarifa && (lee || !E.actual.real.total)) {
    cl.tarifa = c.tarifa;
    const n = TARIFAS[cl.tarifa].nEn;
    for (const x of ['actual', 'propuesta']) { E[x].energia.nPrecios = n; E[x].energia.grupos = gruposPorDefecto(cl.tarifa, n); }
  }
  const t = TARIFAS[cl.tarifa];
  if (lee || !num(cl.consumo[0])) {
    if (c.nombre && lee) { cl.nombre = c.nombre; marca('cliente.nombre'); }
    if (c.cups && lee) { cl.cups = c.cups; marca('cliente.cups'); }
    if (c.dias) { cl.dias = c.dias; marca('cliente.dias'); }
    if (c.inicio) cl.inicio = c.inicio;
    if (c.fin) cl.fin = c.fin;
    (d.consumo_kwh || []).slice(0, t.nEn).forEach((v, i) => { if (v !== null) { cl.consumo[i] = val(v); marca('cliente.consumo.' + i); } });
    if (d.excedentes_kwh) { cl.excedentes = val(d.excedentes_kwh); marca('cliente.excedentes'); }
  }
  // Potencia
  const pot = d.potencia || {};
  L.potencia.unidad = pot.unidad || 'dia';
  const pr = (pot.precios || []).slice(0, t.nPot);
  pr.forEach((v, i) => { if (v !== null) { L.potencia.precios[i] = val(v); marca(`${k}.potencia.precios.${i}`); } });
  if (lee) (pot.contratada_kw || []).slice(0, t.nPot).forEach((v, i) => { if (v !== null) { L.potencia.contratada[i] = val(v); marca(`${k}.potencia.contratada.${i}`); } });
  else if (!L.potencia.igualActual) (pot.contratada_kw || []).slice(0, t.nPot).forEach((v, i) => { if (v !== null) { L.potencia.contratada[i] = val(v); marca(`${k}.potencia.contratada.${i}`); } });
  const pv = pr.filter((v) => v !== null);
  L.potencia.unico = pv.length > 1 && pv.every((v) => v === pv[0]);
  if (!lee && (pot.contratada_kw || []).some((v) => v !== null && !E.actual.potencia.contratada.some((x) => num(x) === v))) L.potencia.igualActual = false;
  // Energía: los precios iguales comparten grupo
  const en = d.energia || {};
  L.energia.unidad = en.unidad || 'eur';
  const precios = (en.precios || []).slice(0, t.nEn);
  const vistos = []; const grupos = [];
  precios.forEach((v) => {
    if (v === null) { grupos.push(grupos.length ? grupos[grupos.length - 1] : 0); return; }
    let g = vistos.indexOf(v);
    if (g < 0) { vistos.push(v); g = vistos.length - 1; }
    grupos.push(g);
  });
  if (vistos.length) {
    L.energia.nPrecios = vistos.length;
    L.energia.grupos = [...grupos, ...Array(6 - grupos.length).fill(0)];
    L.energia.precios = [...vistos.map(val), ...Array(6 - vistos.length).fill('')];
    vistos.forEach((_, g) => marca(`${k}.energia.precios.${g}`));
    // Con tantos precios como periodos el formulario enseña un precio por periodo
    if (vistos.length === t.nEn) { L.energia.grupos = Array.from({ length: 6 }, (_, i) => i); L.energia.precios = [...precios.map(val), ...Array(6 - precios.length).fill('')]; }
  }
  if (d.compensacion_excedentes_eur_kwh) { L.compensacion.precio = val(+(d.compensacion_excedentes_eur_kwh / UNI_EN[L.energia.unidad]).toFixed(6)); marca(k + '.compensacion.precio'); }
  if (d.alquiler && d.alquiler.importe !== null && d.alquiler.importe !== undefined && (lee || !num(cl.alquiler.importe))) { cl.alquiler = { importe: val(d.alquiler.importe), unidad: d.alquiler.unidad || 'mes' }; marca('cliente.alquiler.importe'); }
  else if (!lee && d.alquiler && num(d.alquiler.importe) > 0 && (num(d.alquiler.importe) !== num(cl.alquiler.importe) || (d.alquiler.unidad || 'mes') !== cl.alquiler.unidad)) { L.alquilerPropio = { activo: true, importe: val(d.alquiler.importe), unidad: d.alquiler.unidad || 'mes' }; }
  if (lee && Array.isArray(d.cargos_regulados) && d.cargos_regulados.length) {
    cl.cargos = d.cargos_regulados.map((g) => ({ nombre: g.nombre || 'Cargo regulado', tipo: 'fijo', importe: val(g.importe), unidad: ['dia', 'mes', 'anio'].includes(g.unidad) ? g.unidad : 'dia', tributaIEE: true }));
    cl.cargos.forEach((_, i) => marca(`cliente.cargos.${i}.importe`));
  }
  L.otros = (d.otros || []).map((o) => ({ nombre: o.nombre || '', importe: val(o.importe), tributaIEE: o.tributa_iee !== false }));
  L.servicios = (d.servicios || []).map((s) => servicioNuevo({ nombre: s.nombre || '', importe: val(s.importe), unidad: ['dia', 'mes', 'anio', 'unico'].includes(s.unidad) ? s.unidad : 'mes', meses: val(s.meses) }));
  L.descuentos = (d.descuentos || []).map((x) => {
    const sv = L.servicios.find((s) => x.servicio_nombre && norm(s.nombre) === norm(x.servicio_nombre));
    const aplica = Object.keys(APLICA).includes(x.aplica) ? x.aplica : 'electricidad';
    return { id: nuevoId(), nombre: x.nombre || '', tipo: ['pct', 'eur', 'eurkwh', 'unico'].includes(x.tipo) ? x.tipo : 'pct', valor: val(x.valor), aplica: aplica === 'servicio' && !sv ? 'servicios' : aplica,
      servicioId: aplica === 'servicio' && sv ? sv.id : '', requiere: x.depende_de_servicio && sv ? sv.id : '', desde: '', meses: val(x.meses) };
  });
  const pe = d.permanencia || {};
  if (pe.meses !== null && pe.meses !== undefined) { L.permanencia.meses = val(pe.meses); marca(k + '.permanencia.meses'); }
  if (pe.penalizacion !== null && pe.penalizacion !== undefined) { L.permanencia.penalizacion = val(pe.penalizacion); marca(k + '.permanencia.penalizacion'); }
  if (lee) {
    if (d.iva_pct) { E.fiscal.iva = val(d.iva_pct); marca('fiscal.iva'); }
    if (d.iee_pct) { E.fiscal.iee = val(d.iee_pct); marca('fiscal.iee'); }
    if (d.total_factura) { L.real.total = val(d.total_factura); marca(k + '.real.total'); }
  }
}

// ---------- guardar ----------
function resumen() {
  const c = comparar(E);
  return { actual: Math.round(c.pA.total * 100) / 100, propuesta: Math.round(c.pP.total * 100) / 100, ahorro: Math.round(c.ahorro * 100) / 100, horizonte: c.H, solo: !!c.soloFactura, comercializadora: E.propuesta.nombre || '', cliente: E.cliente.nombre || '' };
}
// Nombre automático: CUPS de la factura y duración de la comparación (por ejemplo ES0021..._12 meses)
const nombreAuto = () => {
  const base = (E.cliente.cups || '').trim() || (E.cliente.nombre || '').trim() || 'Simulacion';
  if (E.horizonte === 'f') return `${base}_1 factura`;
  const H = Math.max(1, Math.round(num(E.horizonte)) || 12);
  return `${base}_${H} ${H === 1 ? 'mes' : 'meses'}`;
};
const esNombreAuto = (n) => !n.trim() || / ?_(\d+ (mes|meses)|1 factura)$/.test(n.trim());
async function guardar() {
  sincronizar();
  const nombre = esNombreAuto(nombreSim) ? nombreAuto() : nombreSim.trim();
  const cuerpo = JSON.stringify({ nombre, datos: E, resumen: resumen() });
  try {
    if (simId) await api('/api/simulaciones/' + simId, { method: 'PUT', body: cuerpo });
    else { const r = await api('/api/simulaciones', { method: 'POST', body: cuerpo }); simId = r.id; history.replaceState(null, '', '#/s/' + simId); }
    sucio = false;
    try { localStorage.removeItem(BORRADOR); } catch { /* sin acceso */ }
    nombreSim = nombre; const ni = $('#nombreSim'); if (ni) ni.value = nombre;
    avisar('Guardado');
  } catch (e) { avisar(e.message, true); }
}

// ---------- resultado ----------
function calcular() {
  sincronizar();
  const c = comparar(E);
  const errs = c.avisos.filter(([t]) => t === 'err').map(([, m]) => m);
  const okP = {
    cliente: !errs.some((m) => /^Falta el (número|consumo)/.test(m)),
    actual: !errs.some((m) => m.startsWith('Factura actual')),
    propuesta: !errs.some((m) => m.startsWith('Propuesta')),
    resultado: !errs.length, informe: true,
  };
  $('#pasos').innerHTML = PASOS.map(([k, n, corto], i) => `<button data-a="paso" data-v="${k}" class="${paso === k ? 'on' : ''} ${okP[k] && k !== 'resultado' && k !== 'informe' ? 'ok' : ''}"><span class="n">${okP[k] && k !== 'resultado' && k !== 'informe' ? '✓' : i + 1}</span><span class="lg">${n}</span><span class="sh">${corto}</span></button>`).join('');
  if (paso === 'resultado') salidaResultado(c);
  else if (paso === 'informe') promesaInforme = renderInforme($('#inf-doc'), E, c, nombreSim, E.informe.secs, E.informe.version || 'uno');
  $('#lateral').innerHTML = htmlLateral(c, okP);
  $('#barra').innerHTML = `<div class="barra-i"><div><small>Actual · ${c.H} ${c.H === 1 ? 'mes' : 'meses'}</small><b>${fEur(c.pA.total)}</b></div><div><small>Propuesta · ${c.H} ${c.H === 1 ? 'mes' : 'meses'}</small><b>${fEur(c.pP.total)}</b></div>
    <div class="gr"><small>${c.ahorro >= 0 ? 'Ahorro' : 'Sobrecoste'}${c.penal ? ' (antes de penalización)' : ''}</small><b class="${c.ahorro >= 0 ? 'bien' : 'mal-t'}">${fEur(Math.abs(c.ahorro))} · ${fNum(Math.abs(c.ahorroPct))} %</b></div></div>`;
  $('#barra').style.display = paso === 'resultado' || paso === 'informe' ? 'none' : '';
}
function htmlLateral(c, ok) {
  const listo = ok.cliente && ok.actual && ok.propuesta;
  const bien = c.ahorro >= 0;
  const mx = Math.max(c.pA.total, c.pP.total, 1);
  return `<div class="lat ${listo ? (bien ? '' : 'mal') : 'pend'}">
    <small>${listo ? (bien ? 'Ahorro estimado' : 'Sobrecoste de la propuesta') : 'Resultado en directo'} · ${c.H} ${c.H === 1 ? 'mes' : 'meses'}</small>
    ${listo ? `<div class="gr">${fEur(Math.abs(c.ahorro))}<span>${fNum(Math.abs(c.ahorroPct))} %</span></div>` : '<div class="gr pend-t">Rellena los pasos para ver el ahorro</div>'}
    <div class="lat-b"><div><span>Actual</span><i style="width:${c.pA.total / mx * 100}%" class="g"></i><b>${fEur(c.pA.total)}</b></div><div><span>Propuesta</span><i style="width:${c.pP.total / mx * 100}%" class="v"></i><b>${fEur(c.pP.total)}</b></div></div>
    <div class="lat-k"><div><small>Factura del periodo</small><b>${fEur(c.refA.total)}</b><span>Propuesta ${fEur(c.refP.total)}</span></div>
      <div><small>Ahorro neto</small><b class="${c.neto >= 0 ? 'bien' : 'mal-t'}">${fEur(c.neto)}</b><span>${c.penal ? 'Tras la penalización' : 'Sin penalización'}</span></div></div>
    ${c.avisos.length ? `<div class="lat-av">${c.avisos.filter(([t]) => t !== 'info').length} aviso(s) pendientes de revisar</div>` : ''}
    ${paso !== 'resultado' && paso !== 'informe' ? '<button class="btn mini" data-a="paso" data-v="resultado" style="width:100%;justify-content:center">Ver el resultado completo</button>' : ''}</div>`;
}

iniciar();
