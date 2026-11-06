// Informe de una página para el cliente (pieza comercial).
// Cifra del ahorro, comparación en barras, gráfico mes a mes y la factura línea a línea. Todos los importes salen del mismo
// motor de cálculo (calculo.js) y las líneas de la factura suman exactamente su total. Si no cabe en el A4, se compacta solo.
import { MESES, MESES_L, num, UNI_POT, UNI_EN, TARIFAS, APLICA, mesReferencia } from './calculo.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fEur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(Math.round((n + Number.EPSILON) * 100) / 100 || 0);
export const fEur0 = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(Math.round(n) || 0);
export const fNum = (n, d = 1) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: d }).format(n);

const LOGO = '/img/logo-ia-recortado.png';

export const SECCIONES_AMP = [
  ['datos', 'Datos de partida y precios'], ['calculo', 'El cálculo de la factura paso a paso'], ['anual', 'Tu factura en un año y de dónde sale el consumo'], ['meses', 'Mes a mes en detalle'],
  ['condiciones', 'Permanencia, servicios y descuentos'], ['metodo', 'Cómo se ha calculado y avisos'],
];
export const SECCIONES = [
  ['resumen', 'Cifra del ahorro y comparación'], ['mensual', 'Gráfico mes a mes'], ['detalle', 'La factura línea a línea'],
  ['notas', 'Permanencia, penalización y servicios'], ['contacto', 'Quiénes somos y siguiente paso'],
];

const unM = (n) => `${n} ${n === 1 ? 'mes' : 'meses'}`;
const pT = (c) => (c.soloFactura ? 'esta factura' : unM(c.H));
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Líneas de una factura. La suma de las líneas es igual al total (se comprueba en las pruebas).
export function lineasFactura(f) {
  const L = [['Potencia', f.potBruto], ['Energía', f.enBruto]];
  if (f.comp) L.push(['Compensación de excedentes', -f.comp]);
  if (f.descTotal) L.push(['Descuentos', -f.descTotal]);
  if (f.alq) L.push(['Alquiler del contador', f.alq]);
  const cargos = f.cargosTotal || 0;
  const otros = f.otros.filter((x) => !x.comun).reduce((s, x) => s + x.importe, 0);
  if (cargos) L.push(['Bono social y cargos', cargos]);
  if (otros) L.push(['Otros conceptos', otros]);
  if (f.servBruto) L.push(['Servicios adicionales', f.servBruto]);
  L.push(['Impuesto electricidad', f.iee], ['IVA', f.iva]);
  return L;
}

const euros = (n) => { const t = fEur(n); const i = t.lastIndexOf(','); return `${t.slice(0, i)}<small>${t.slice(i)}</small>`; };

// nivel 0 = normal; 1, 2 y 3 compactan el diseño si no cabe en la página
function paginaUna(E, c, nombreSim, secs, nivel, e = 1) {
  const on = (k) => secs[k] !== false;
  const bien = c.ahorro >= 0;
  const ahorro = r2(c.pA.total) - r2(c.pP.total);
  const neto = ahorro - c.penal;
  const A = c.refA; const P = c.refP;
  const cl = E.cliente;
  const nombre = cl.nombre || nombreSim || 'Tu factura de luz';
  const fmtF = (x) => new Date(x + 'T00:00').toLocaleDateString('es-ES');
  const periodo = cl.inicio && cl.fin ? `del ${fmtF(cl.inicio)} al ${fmtF(cl.fin)}` : `${fNum(A.dias, 0)} días`;
  const kwP = [...new Set(E.actual.potencia.contratada.filter((x) => num(x) > 0).map((x) => fNum(num(x), 2)))].join(' / ');
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const fuentes = [E.actual.fuente && 'actual: ' + E.actual.fuente, E.propuesta.fuente && 'propuesta: ' + E.propuesta.fuente].filter(Boolean).join('; ');
  const mx = Math.max(c.pA.total, c.pP.total, 1);

  const cab = `<header class="i-cab"><img class="logo" src="${LOGO}" alt="Ingeniería Aplicada"><div class="i-meta"><span class="eyebrow">Estudio de tu factura de luz</span><b>${fecha}</b></div></header>
    <div class="i-tit"><h1>${esc(nombre)}</h1><p>${cl.cups ? 'CUPS ' + esc(cl.cups) + ' · ' : ''}Tarifa ${cl.tarifa}${kwP ? ' · ' + kwP + ' kW' : ''} · factura ${periodo} (${fNum(A.dias, 0)} días)</p></div>`;

  // --- cifra del ahorro ---
  const decor = Array.from({ length: 10 }, (_, i) => `<rect x="${i * 24}" y="${96 - (i + 1) * 9}" width="17" height="${(i + 1) * 9}" rx="5"/>`).join('');
  const hero = on('resumen') ? `<section class="i-hero ${bien ? '' : 'mal'}"><svg class="i-deco" viewBox="0 0 240 100" aria-hidden="true">${decor}</svg>
    <div class="i-h-l"><span class="i-h-k">${bien ? 'Ahorras' : 'Pagarías de más'} en ${pT(c)}</span><div class="i-h-n">${euros(Math.abs(ahorro))}</div></div>
    <div class="i-h-r"><div><b>${fNum(Math.abs(c.ahorroPct))} %</b><span>${bien ? 'menos' : 'más'} que ahora</span></div>
      ${c.soloFactura ? '' : `<div><b>${fEur(Math.abs(ahorro) / c.H)}</b><span>${bien ? 'de ahorro' : 'de más'} cada mes</span></div>`}
      ${c.penal > 0 ? `<div><b>${fEur(neto)}</b><span>tras pagar la penalización</span></div>` : ''}</div></section>
    <section class="i-barras"><span class="eyebrow">Lo que pagarías en ${pT(c)}</span>
      <div class="i-br"><span class="i-br-n">Hoy</span><div class="i-pista"><i class="gris" style="width:${c.pA.total / mx * 100}%"></i></div><b>${fEur(c.pA.total)}</b></div>
      <div class="i-br"><span class="i-br-n">Con la propuesta</span><div class="i-pista"><i class="${bien ? 'verde' : 'rojo'}" style="width:${c.pP.total / mx * 100}%"></i></div><b>${fEur(c.pP.total)}</b></div></section>` : '';

  // --- gráfico y detalle, en una fila ---
  let graf = '';
  if (on('mensual') && !c.soloFactura) {
    const mxm = c.meses.reduce((a, f) => (f.totalA > a.totalA ? f : a), c.meses[0]); const mnm = c.meses.reduce((a, f) => (f.totalA < a.totalA ? f : a), c.meses[0]);
    const H = [226, 205, 175, 150][nivel];
    graf = `<section class="i-tarj i-graf"><div class="i-graf-t"><h2>Mes a mes</h2><span class="i-graf-l"><i style="background:#b9beba"></i>Hoy <i style="background:#6fb74c"></i>Propuesta</span></div>
      ${nivel < 2 && mxm.m !== mnm.m ? `<p class="i-graf-s">${cap(MESES_L[mxm.m])} es el mes más caro (${fEur(mxm.totalA)} hoy) y ${MESES_L[mnm.m]} el más barato (${fEur(mnm.totalA)}).</p>` : ''}${graficoMensual(c, 420, H)}</section>`;
  }
  let det = '';
  if (on('detalle')) {
    const mapa = (f) => new Map(lineasFactura(f));
    const ma = mapa(A); const mp = mapa(P);
    const orden = ['Potencia', 'Energía', 'Compensación de excedentes', 'Descuentos', 'Alquiler del contador', 'Bono social y cargos', 'Otros conceptos', 'Servicios adicionales', 'Impuesto electricidad', 'IVA'];
    const nombres = orden.filter((n) => ma.has(n) || mp.has(n));
    const dif = r2(P.total) - r2(A.total);
    det = `<section class="i-tarj i-det"><h2>Una factura de ${fNum(A.dias, 0)} días</h2><p class="i-graf-s">Línea a línea, con tu consumo (${fNum(A.kwh, 0)} kWh).</p>
      <table class="i-t"><thead><tr><th></th><th>Hoy</th><th>Propuesta</th></tr></thead><tbody>
      ${nombres.map((n) => `<tr><td>${n}</td><td>${fEur(ma.get(n) ?? 0)}</td><td>${fEur(mp.get(n) ?? 0)}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td>${fEur(A.total)}</td><td>${fEur(P.total)}</td></tr></tbody></table>
      <p class="i-det-p ${dif <= 0 ? 'bien' : 'mal'}">${dif <= 0 ? 'Ahorras' : 'Pagas de más'} ${fEur(Math.abs(dif))} en esta factura (${fNum(Math.abs(dif / r2(A.total) * 100))} %).</p>
      ${c.recon && c.recon.ok ? `<p class="i-det-r">El cálculo de hoy cuadra con tu factura real de ${fEur(c.recon.real)}.</p>` : ''}</section>`;
  }
  const fila = graf || det ? `<div class="i-fila ${graf && det ? 'dos' : ''}">${graf}${det}</div>` : '';

  // --- notas ---
  let notas = '';
  if (on('notas') && nivel < 3) {
    const n = [];
    n.push(['Permanencia', c.permP > 0 ? `La propuesta exige ${unM(c.permP)}${c.penP ? ` y cobra ${fEur(c.penP)} si te vas antes` : ''}.` : 'La propuesta no tiene. Puedes cambiar cuando quieras.']);
    if (c.penal > 0) n.push(['Salir del contrato actual', `Cuesta ${fEur(c.penal)}.${!c.soloFactura ? (c.mesRetorno ? ` Lo recuperas en el mes ${c.mesRetorno}.` : ' En este periodo el ahorro no llega a cubrirlo.') : ''}`]);
    if (E.propuesta.servicios.length) n.push(['Servicios de la propuesta', `${E.propuesta.servicios.map((s) => esc(s.nombre || 'Servicio')).slice(0, 3).join(', ')}: ${fEur(c.compP.serv)} en ${pT(c)}. ${c.ahorroSinServ >= 0 ? `Sin ellos el ahorro sería de ${fEur(c.ahorroSinServ)}.` : `Sin ellos saldría ${fEur(-c.ahorroSinServ)} más cara que ahora.`}`]);
    notas = `<div class="i-notas" style="grid-template-columns:repeat(${n.length},1fr)">${n.map(([t, x]) => `<div class="i-nota"><b>${t}</b><p>${x}</p></div>`).join('')}</div>`;
  }

  const cta = on('contacto') ? `<section class="i-cta"><div><b>Más margen de ahorro</b><span>Ingeniería y ejecución de instalaciones fotovoltaicas, aerotermia y puntos de recarga, con gestión de los Certificados de Ahorro Energético (CAE) asociados.</span></div><div class="i-cta-d"><b>ingenieriaaplicada.com</b><span>Desde 2011 · más de 3.000 proyectos · más de 40 MW · ISO 9001, 14001, 45001 y 50001</span></div></section>` : '';

  const pie = `<footer class="i-pie"><b>Ingeniería Aplicada Estudios y Proyectos S.L.</b> · Estimación con los datos facilitados, sin valor de oferta vinculante. IVA ${fNum(num(E.fiscal.iva), 2)} % e impuesto sobre la electricidad ${fNum(num(E.fiscal.iee), 4)} %.${fuentes ? ` Precios de energía: Red Eléctrica (${esc(fuentes)}).` : ''}</footer>`;

  return `<section class="pag uno n${nivel}" style="--e:${e}">${cab}${hero}${fila}${notas}${cta}${pie}</section>`;
}

// Busca el diseño más aireado de la página 1 que quepa en el A4: primero se reduce el espaciado y, si no basta, la tipografía
function ajustarUna(el, E, c, nombreSim, secs) {
  const pasos = [2.2, 1.9, 1.65, 1.45, 1.25, 1.1, 1, 0.85, 0.7, 0.55];
  for (let nivel = 0; nivel <= 3; nivel++) {
    for (const e of pasos) {
      el.innerHTML = `<div class="hoja">${paginaUna(E, c, nombreSim, secs, nivel, e)}</div>`;
      const pag = el.querySelector('.pag');
      const pie = pag.querySelector('.i-pie'); const prev = pie.previousElementSibling;
      const cabe = pie.offsetTop + pie.offsetHeight <= pag.clientHeight + 1 && pie.offsetTop - (prev.offsetTop + prev.offsetHeight) >= 8;
      if (cabe || window.matchMedia('(max-width:760px)').matches) return { nivel, e };
    }
  }
  return { nivel: 3, e: 0.55 };
}

// version: 'uno' (una página) o 'ampliado' (página 1 + páginas de detalle para clientes exigentes)
export async function renderInforme(el, E, c, nombreSim = '', secs = {}, version = 'uno') {
  const dibujar = () => {
    if (window.__informeBloqueado) return;
    const { nivel, e } = ajustarUna(el, E, c, nombreSim, secs);
    if (version !== 'ampliado') return;
    const pagUna = paginaUna(E, c, nombreSim, secs, nivel, e);
    const det = paginasDetalle(E, c, nombreSim, secs);
    el.innerHTML = `<div class="hoja">${pagUna}${det}</div>`;
  };
  dibujar();
  if (window.__informeFit) { window.removeEventListener('beforeprint', window.__informeFit); }
  window.__informeFit = dibujar;
  window.addEventListener('beforeprint', dibujar);
  if (document.fonts) {
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', dibujar);
    try {
      await Promise.all([document.fonts.load('400 14px Outfit'), document.fonts.load('600 14px Outfit'), document.fonts.load('400 40px "DM Serif Display"'), document.fonts.ready]);
    } catch { /* sin tipografías: se queda como está */ }
    dibujar();
    setTimeout(dibujar, 400);
  }
}

// ---------------------------------------------------------------------------
// Versión ampliada: bloques que se miden y se reparten en páginas A4 sin cortar ninguno
// ---------------------------------------------------------------------------
const UN_POT = { dia: '€/kW·día', mes: '€/kW·mes', anio: '€/kW·año' };
const UN_EN = { eur: '€/kWh', cent: 'c€/kWh', mwh: '€/MWh' };
const UN_FIJA = { dia: 'al día', mes: 'al mes', anio: 'al año' };
const f6 = (n) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 }).format(n);
const tipoTxt = (d) => ({ pct: `${fNum(num(d.valor), 2)} %`, eur: `${fEur(num(d.valor))} al mes`, eurkwh: `${fNum(num(d.valor), 4)} €/kWh`, unico: `${fEur(num(d.valor))} una vez` }[d.tipo] || '');
const servTxt = (s) => `${fEur(num(s.importe))} ${{ mes: 'al mes', anio: 'al año', dia: 'al día', unico: 'pago único' }[s.unidad] || ''}${num(s.meses) > 0 ? ` durante ${s.meses} meses` : ''}`;
const APLICA_TXT = APLICA;

// Líneas del cálculo de una factura, con su fórmula. cat ordena las filas al juntar las dos facturas.
function lineasCalculo(E, lado, f) {
  const cl = E.cliente; const t = TARIFAS[cl.tarifa];
  const fp = UNI_POT[lado.potencia.unidad] ?? 1; const fe = UNI_EN[lado.energia.unidad] ?? 1;
  const L = [];
  f.pot.forEach((p, i) => { if (p.kw > 0 || p.importe) L.push({ cat: 0, ord: i, k: `Potencia ${t.pot[i]}`, f: `${fNum(p.kw, 2)} kW × ${f6(p.precio * fp)} €/kW·día × ${fNum(f.dias, 0)} días`, v: p.importe }); });
  f.en.forEach((p, i) => { L.push({ cat: 1, ord: i, k: `Energía ${t.en[i]}`, f: `${fNum(p.kwh, 0)} kWh × ${f6(p.precio * fe)} €/kWh`, v: p.importe }); });
  if (f.comp) L.push({ cat: 2, ord: 0, k: 'Compensación de excedentes', f: 'kWh vertidos × precio de compensación', v: -f.comp });
  f.descuentos.forEach((d, i) => { if (d.importe) { const def = lado.descuentos.find((x) => x.id === d.id); L.push({ cat: 3, ord: i, k: /^Descuento/i.test(d.nombre) ? d.nombre : `Descuento: ${d.nombre}`, f: def ? `${tipoTxt(def)} sobre ${APLICA_TXT[def.aplica].toLowerCase()}` : 'descuento del servicio', v: -d.importe }); } });
  if (f.alq) { const A = (lado.alquilerPropio && lado.alquilerPropio.activo) ? lado.alquilerPropio : cl.alquiler; L.push({ cat: 4, ord: 0, k: 'Alquiler del contador', f: `${f6(num(A.importe))} € ${UN_FIJA[A.unidad] || ''}`, v: f.alq }); }
  const comunes = f.otros.filter((x) => x.comun);
  comunes.forEach((x, i) => { const g = (cl.cargos || [])[i]; L.push({ cat: 5, ord: i, k: x.nombre, f: g ? (g.tipo === 'pct' ? `${fNum(num(g.importe), 2)} % × (potencia + energía)` : `${f6(num(g.importe))} € ${UN_FIJA[g.unidad] || ''}`) : 'cargo regulado', v: x.importe }); });
  f.otros.filter((x) => !x.comun).forEach((x, i) => L.push({ cat: 6, ord: i, k: x.nombre, f: 'importe del periodo', v: x.importe }));
  f.servicios.forEach((s, i) => { if (s.bruto) { const def = lado.servicios.find((x) => x.id === s.id); L.push({ cat: 7, ord: i, k: `Servicio: ${s.nombre}`, f: def ? servTxt(def) : '', v: s.bruto }); } });
  L.push({ cat: 8, ord: 0, k: 'Base del impuesto de electricidad', f: 'potencia + energía − descuentos + conceptos que tributan', v: f.baseIee, base: true });
  L.push({ cat: 9, ord: 0, k: 'Impuesto sobre la electricidad', f: `${fEur(f.baseIee)} × ${fNum(num(E.fiscal.iee), 4)} %`, v: f.iee });
  L.push({ cat: 10, ord: 0, k: 'Base del IVA', f: 'todo lo anterior más el impuesto de electricidad', v: f.baseIva, base: true });
  L.push({ cat: 11, ord: 0, k: 'IVA', f: `${fEur(f.baseIva)} × ${fNum(num(E.fiscal.iva), 2)} %`, v: f.iva });
  L.push({ cat: 12, ord: 0, k: 'Total de la factura', f: '', v: f.total, tot: true });
  return L;
}

function bloquesDetalle(E, c, nombreSim, secs) {
  const on = (k) => secs[k] !== false;
  const cl = E.cliente; const t = TARIFAS[cl.tarifa];
  const A = c.refA; const P = c.refP;
  const modoTxt = { plano: 'reparto igual del consumo', variacion: 'variación mensual del consumo', real: 'consumos reales y estimados' }[E.perfil.modo];
  const fuentes = [E.actual.fuente && 'actual: ' + E.actual.fuente, E.propuesta.fuente && 'propuesta: ' + E.propuesta.fuente].filter(Boolean).join('; ');
  const fmtF = (x) => new Date(x + 'T00:00').toLocaleDateString('es-ES');
  const B = [];

  if (on('datos')) {
    const filasC = t.en.map((n, i) => `<tr><td>${n}</td><td class="num">${fNum(num(cl.consumo[i]), 0)} kWh</td></tr>`).join('');
    const filasKw = t.pot.map((n, i) => `<tr><td>${n}</td><td class="num">${fNum(num(E.actual.potencia.contratada[i]), 2)} kW</td></tr>`).join('');
    const como = (L) => (i) => { const p = L.potencia.unico ? num(L.potencia.precios[0]) : num(L.potencia.precios[i]); return { raw: `${f6(p)} ${UN_POT[L.potencia.unidad]}`, anio: p * (UNI_POT[L.potencia.unidad] ?? 1) * 365 }; };
    const cA = como(E.actual); const cP = como(E.propuesta);
    const filasPot = t.pot.map((n, i) => `<tr><td>Potencia ${n}</td><td class="num">${cA(i).raw}</td><td class="num">${cP(i).raw}</td><td class="num">${fEur(cA(i).anio)}</td><td class="num">${fEur(cP(i).anio)}</td></tr>`).join('');
    const prEn = (L, i) => { const g = L.energia.grupos[i] ?? i; const raw = num(L.energia.precios[g]); return { raw: `${f6(raw)} ${UN_EN[L.energia.unidad]}`, kwh: raw * (UNI_EN[L.energia.unidad] ?? 1) }; };
    const filasEn = t.en.map((n, i) => `<tr><td>Energía ${n}</td><td class="num">${prEn(E.actual, i).raw}</td><td class="num">${prEn(E.propuesta, i).raw}</td><td class="num">${f6(prEn(E.actual, i).kwh)} €/kWh</td><td class="num">${f6(prEn(E.propuesta, i).kwh)} €/kWh</td></tr>`).join('');
    B.push(['datos-a', `<h2>Datos de partida</h2><p class="i-sub">Lo que se ha tomado de tu factura y de la propuesta. Todo lo que sigue sale de estos datos.</p>
      <div class="i-d2"><div><span class="eyebrow">Factura analizada</span><table class="i-t i-kv"><tbody>
        <tr><td>Cliente</td><td class="num">${esc(cl.nombre || nombreSim || '')}</td></tr>${cl.cups ? `<tr><td>CUPS</td><td class="num">${esc(cl.cups)}</td></tr>` : ''}
        <tr><td>Tarifa de acceso</td><td class="num">${cl.tarifa}</td></tr><tr><td>Periodo</td><td class="num">${cl.inicio && cl.fin ? fmtF(cl.inicio) + ' a ' + fmtF(cl.fin) : ''} (${fNum(A.dias, 0)} días)</td></tr>
        <tr><td>Total de la factura real</td><td class="num">${c.recon ? fEur(c.recon.real) : 'no indicado'}</td></tr></tbody></table></div>
        <div><span class="eyebrow">Consumo y potencia</span><table class="i-t i-kv"><tbody>${filasC}${filasKw}</tbody></table></div></div>`]);
    const cabP = '<thead><tr><th></th><th>Hoy (como lo dan)</th><th>Propuesta (como lo dan)</th><th>Hoy</th><th>Propuesta</th></tr></thead>';
    const todasP = [...filasPot.split('</tr>').filter(Boolean).map((x) => x + '</tr>'), ...filasEn.split('</tr>').filter(Boolean).map((x) => x + '</tr>')];
    const TP = 4;
    for (let i = 0; i < todasP.length; i += TP) {
      const fin = i + TP >= todasP.length;
      B.push([`datos-p${i}`, `<span class="eyebrow">${i === 0 ? 'Precios, como los da cada comercializadora y llevados a una unidad común' : 'Precios, continuación'}</span><table class="i-t">${cabP}<tbody>${todasP.slice(i, i + TP).join('')}</tbody></table>${fin ? `<p class="i-nt">La potencia se compara en €/kW·año y la energía en €/kWh.${E.propuesta.energia.nPrecios < t.nEn ? ' La propuesta agrupa periodos: varios periodos comparten el mismo precio.' : ''}</p>` : ''}`]);
    }
  }

  if (on('calculo')) {
    const la = lineasCalculo(E, E.actual, A); const lp = lineasCalculo(E, E.propuesta, P);
    const mapa = new Map();
    const meter = (L, lado) => L.forEach((x) => { const clave = `${String(x.cat).padStart(2, '0')}|${String(x.ord).padStart(3, '0')}|${x.k}`; const r = mapa.get(clave) || { cat: x.cat, k: x.k }; r[lado] = x; mapa.set(clave, r); });
    meter(la, 'a'); meter(lp, 'p');
    const filas = [...mapa.keys()].sort().map((k) => mapa.get(k)).map((r) => {
      const cls = r.a && r.a.tot || r.p && r.p.tot ? 'tot' : (r.a && r.a.base) || (r.p && r.p.base) ? 'sub' : '';
      return `<tr class="${cls}"><td>${esc(r.k)}</td><td class="fo">${r.a ? esc(r.a.f) : ''}</td><td class="num">${r.a ? fEur(r.a.v) : fEur(0)}</td><td class="fo">${r.p ? esc(r.p.f) : ''}</td><td class="num">${r.p ? fEur(r.p.v) : fEur(0)}</td></tr>`;
    });
    const cabC = '<thead><tr><th>Concepto</th><th>Hoy: cuenta</th><th>Hoy</th><th>Propuesta: cuenta</th><th>Propuesta</th></tr></thead>';
    const nota = '';
    const TC = Math.max(filas.length, 1);
    for (let i = 0; i < filas.length; i += TC) {
      const trozo = filas.slice(i, i + TC); const ultimo = i + TC >= filas.length;
      B.push([`calc${i}`, `${i === 0 ? `<h2>La factura paso a paso</h2><p class="i-sub">Una factura de ${fNum(A.dias, 0)} días con tu consumo (${fNum(A.kwh, 0)} kWh). Cada importe con su cuenta, para que puedas comprobarlo.</p>` : '<span class="eyebrow">La factura paso a paso, continuación</span>'}<table class="i-t i-calc">${cabC}<tbody>${trozo.join('')}</tbody></table>${ultimo ? nota : ''}`]);
    }
  }

  if (on('anual') && !c.soloFactura) {
    const dias = Math.max(1, num(cl.dias)); const kwhF = t.en.reduce((s, _, i) => s + num(cl.consumo[i]), 0);
    const p = E.perfil; const mref = mesReferencia(E);
    const vars = (p.variacion || []).map((v, i) => [i, num(v)]).filter(([i, v]) => v !== 0 && i !== mref);
    const reales = (p.real || []).map((r, i) => [i, r]).filter(([, r]) => num(r.total) > 0 || (r.kwh || []).some((x) => num(x) > 0)).map(([i]) => MESES_L[i]);
    const lista = vars.map(([i, v]) => `${MESES_L[i]} ${v > 0 ? '+' : ''}${fNum(v, 1)} %`).join(', ');
    const por = [`Partimos de tu factura analizada: <b>${fNum(kwhF, 0)} kWh en ${fNum(dias, 0)} días</b>, es decir, <b>${fNum(kwhF / dias, 1)} kWh al día</b>.`];
    if (p.fuente === 'estimación por aparatos') por.push('El consumo de cada mes sale de la estimación por aparatos: potencia de cada aparato × horas de uso × días de cada mes, según la época del año.');
    else if (p.modo === 'plano') por.push('Ese consumo diario se mantiene igual todo el año y se multiplica por los días de cada mes. Por eso solo cambian los meses de 28, 30 y 31 días.');
    else if (p.modo === 'variacion') por.push(`Cada mes se ajusta respecto a ${MESES_L[mref]}, el mes de tu factura${lista ? `: ${lista}` : ''}.${p.fuente ? ` Origen de esas variaciones: ${esc(p.fuente)}.` : ''}`);
    else por.push(`${reales.length ? `Los meses con consumo real (${reales.join(', ')}) usan esos kWh.` : 'No hay consumos reales introducidos.'} El resto se estima con tu consumo diario${lista ? ' ajustado con la variación de cada mes' : ''}.`);
    por.push(`Resultado: <b>${fNum(c.kwhAnual, 0)} kWh</b> en ${unM(c.H)}. El mismo consumo se factura con los precios de hoy y con los de la propuesta.`);
    B.push(['anual', `<h2>Tu factura en un año</h2><p class="i-sub">Lo que pagarías cada mes con la factura actual y con la propuesta, y el consumo de ese mes.</p>
      <div class="i-ley"><span><i style="background:#b9beba"></i>Hoy</span><span><i style="background:#6fb74c"></i>Propuesta</span><span><i class="ln"></i>Consumo (kWh)</span></div>${graficoAnual(c, 706, 236)}
      <div class="i-caja"><span class="eyebrow">De dónde sale el consumo</span><ul>${por.map((x) => `<li>${x}</li>`).join('')}</ul></div>`]);
  }

  if (on('meses') && !c.soloFactura) {
    const tot = c.meses.reduce((s, f) => ({ k: s.k + f.kwh, a: s.a + f.totalA, p: s.p + f.totalP }), { k: 0, a: 0, p: 0 });
    const fila = (f) => `<tr><td>${MESES_L[f.m].charAt(0).toUpperCase() + MESES_L[f.m].slice(1)} ${f.y}</td><td class="num">${f.dias}</td><td class="num">${fNum(f.kwh, 0)}</td><td class="num">${fEur(f.totalA)}</td><td class="num">${fEur(f.totalP)}</td><td class="num dif ${f.ahorro >= 0 ? 'bien' : 'mal'}">${fEur(f.ahorro)}</td><td class="num">${fEur(f.acum)}</td></tr>`;
    const cab = '<thead><tr><th>Mes</th><th>Días</th><th>kWh</th><th>Hoy</th><th>Propuesta</th><th>Ahorro</th><th>Acumulado</th></tr></thead>';
    B.push(['mes-a', `<h2>Mes a mes en detalle</h2><p class="i-sub">Ahorro acumulado y tabla de cada mes con sus días y su consumo.</p>${graficoAcumulado(c, 706, 170)}`]);
    const T = Math.ceil(c.meses.length / Math.ceil(c.meses.length / 7));
    for (let i = 0; i < c.meses.length; i += T) {
      const trozo = c.meses.slice(i, i + T); const ultimo = i + T >= c.meses.length;
      B.push([`mes-t${i}`, `${i === 0 ? '' : '<span class="eyebrow">Mes a mes, continuación</span>'}<table class="i-t i-mes">${cab}<tbody>${trozo.map(fila).join('')}${ultimo ? `<tr class="tot"><td>Total</td><td class="num">${c.meses.reduce((s, f) => s + f.dias, 0)}</td><td class="num">${fNum(tot.k, 0)}</td><td class="num">${fEur(tot.a)}</td><td class="num">${fEur(tot.p)}</td><td class="num">${fEur(tot.a - tot.p)}</td><td class="num"></td></tr>` : ''}</tbody></table>`]);
    }
  }

  if (on('condiciones')) {
    const perm = (l, tt) => l.length ? l.map((x) => `<tr><td>${tt}</td><td>${esc(x.nombre)}</td><td>${x.meses ? x.meses + ' meses' : 'sin plazo'}</td><td class="num">${x.pen ? fEur(x.pen) : 'sin penalización'}</td></tr>`).join('') : `<tr><td>${tt}</td><td colspan="3">Sin permanencia</td></tr>`;
    const lista = (L, tit) => {
      const sv = L.servicios.map((s) => `<li><b>${esc(s.nombre || 'Servicio')}</b>: ${servTxt(s)}${s.desc && s.desc.activo ? `; descuento ${tipoTxt({ tipo: s.desc.tipo, valor: s.desc.valor })}${num(s.desc.meses) > 0 ? ' los primeros ' + s.desc.meses + ' meses' : ''}` : ''}${s.perm && s.perm.activa ? `; permanencia de ${s.perm.meses || '?'} meses` : ''}</li>`);
      const ds = L.descuentos.map((d) => { const dep = d.requiere ? L.servicios.find((x) => x.id === d.requiere) : null; return `<li><b>${esc(d.nombre || 'Descuento')}</b>: ${tipoTxt(d)} sobre ${APLICA_TXT[d.aplica].toLowerCase()}${dep ? `, solo si contratas ${esc(dep.nombre || 'el servicio')}` : ''}${num(d.meses) > 0 ? `, durante ${d.meses} meses` : ''}</li>`; });
      return sv.length || ds.length ? `<div class="i-caja"><span class="eyebrow">${tit}</span><ul>${[...sv, ...ds].join('')}</ul></div>` : '';
    };
    const hayPerm = c.permA.length || c.permPr.length;
    const hayLista = E.propuesta.servicios.length || E.propuesta.descuentos.length || E.actual.servicios.length || E.actual.descuentos.length;
    if (hayPerm) B.push(['cond-t', `<h2>Permanencia y condiciones</h2><table class="i-t i-izq"><thead><tr><th>Contrato</th><th>Concepto</th><th>Plazo</th><th class="num">Penalización</th></tr></thead><tbody>${perm(c.permA, 'Hoy')}${perm(c.permPr, 'Propuesta')}</tbody></table>${c.permP ? `<p class="i-nt">Durante los ${c.permP} meses de permanencia de la propuesta ${c.ahorroPerm >= 0 ? 'ahorrarías' : 'pagarías de más'} ${fEur(Math.abs(c.ahorroPerm))} frente a la factura actual.</p>` : ''}`]);
    let titulado = hayPerm;
    for (const [L, tit] of [[E.propuesta, 'Servicios y descuentos de la propuesta'], [E.actual, 'Servicios y descuentos de tu factura actual']]) {
      const h = lista(L, tit);
      if (h) { B.push([`cond-${tit.length}`, `${titulado ? '' : '<h2>Servicios y descuentos</h2>'}${h}`]); titulado = true; }
    }
    if (hayPerm || hayLista) { if (E.propuesta.servicios.length && c.ahorroSinServ !== c.ahorro) B.push(['cond-n', `<p class="i-nt" style="margin:0">Sin los servicios de la propuesta (y sin los descuentos que dependen de ellos), el ${c.ahorroSinServ >= 0 ? 'ahorro sería de ' + fEur(c.ahorroSinServ) : 'resultado sería ' + fEur(-c.ahorroSinServ) + ' más caro que ahora'}.</p>`]); }
  }

  if (on('metodo')) {
    const s = [
      `IVA del ${fNum(num(E.fiscal.iva), 2)} % e impuesto sobre la electricidad del ${fNum(num(E.fiscal.iee), 4)} %. ${E.propuesta.alquilerPropio && E.propuesta.alquilerPropio.activo ? 'La propuesta tiene un alquiler de contador distinto al actual.' : 'El alquiler del contador y los cargos regulados son iguales en las dos facturas.'}${E.fiscal.alquilerIEE ? ' El alquiler entra en la base del impuesto de electricidad.' : ''}`,
      'Potencia: kW contratados × precio por kW y día × días del periodo. Energía: kWh de cada periodo tarifario × su precio. Los descuentos nunca dejan un concepto por debajo de 0.',
      `Cada mes se calcula con sus días reales. Consumo mensual: ${modoTxt}. Por eso la media mensual no tiene por qué coincidir con el importe de una sola factura.`,
      (E.perfil.fuente && E.perfil.modo !== 'plano') ? `Perfil estacional aplicado: índices mensuales de ${esc(E.perfil.fuente)}.` : '',
      fuentes ? `Precios de energía con datos de Red Eléctrica (${esc(fuentes)}). Son medias por horas de cada periodo, no ponderadas por la curva de consumo.` : '',
      'Estimación con los datos facilitados. No es una oferta vinculante ni sustituye al contrato de la comercializadora.',
    ].filter(Boolean);
    const av = c.avisos.filter(([tt]) => tt !== 'err').map(([tt, m]) => `<li class="${tt}">${esc(m)}</li>`).join('');
    const TM = Math.max(s.length, 1);
    for (let i = 0; i < s.length; i += TM) {
      B.push([`metodo${i}`, `${i === 0 ? '<h2>Cómo se ha calculado</h2>' : ''}<div class="i-caja neutra"><ul>${s.slice(i, i + TM).map((x) => `<li>${x}</li>`).join('')}</ul></div>`]);
    }
    if (av) B.push(['metodo-av', `<div class="i-caja neutra"><span class="eyebrow">Avisos</span><ul class="i-avs" style="margin:4px 0 0!important;border:0;padding:0 0 0 18px">${av}</ul></div>`]);
  }
  return B;
}

const logoDet = (fecha, pg, n, nombre) => `<header class="i-dcab"><img class="logo" src="${LOGO}" alt="Ingeniería Aplicada"><div class="i-meta"><span class="eyebrow">Informe ampliado · ${esc(nombre)}</span><b>${fecha} · página ${pg} de ${n}</b></div></header>`;
const pieDet = `<footer class="i-pie i-dpie"><b>Ingeniería Aplicada Estudios y Proyectos S.L.</b><span>ingenieriaaplicada.com</span></footer>`;

function paginasDetalle(E, c, nombreSim, secs) {
  const bloques = bloquesDetalle(E, c, nombreSim, secs);
  if (!bloques.length) return '';
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const nombre = E.cliente.nombre || nombreSim || '';
  // Sonda fuera de pantalla con el mismo ancho que la hoja impresa: se miden los bloques y se reparten sin cortar ninguno
  const sonda = document.createElement('div');
  sonda.className = 'hoja i-sonda';
  sonda.innerHTML = `<section class="pag det">${logoDet(fecha, 1, 1, nombre)}<div class="i-dcuerpo">${bloques.map(([k, h]) => `<div class="i-dbl">${h}</div>`).join('')}</div>${pieDet}</section>`;
  document.body.appendChild(sonda);
  const pag = sonda.querySelector('.pag'); const cuerpo = sonda.querySelector('.i-dcuerpo');
  const alturas = [...cuerpo.children].map((b) => b.getBoundingClientRect().height);
  const gap = parseFloat(getComputedStyle(cuerpo).rowGap) || 0;
  const cs = getComputedStyle(pag);
  const fijo = parseFloat(cs.paddingTop) + sonda.querySelector('.i-dcab').getBoundingClientRect().height + parseFloat(getComputedStyle(pag).rowGap || 0) + sonda.querySelector('.i-dpie').getBoundingClientRect().height + 14;
  sonda.remove();
  const LIM = 1123 - fijo - 14;
  const paginas = []; let cur = []; let usado = 0;
  const grupo = (k) => (k.startsWith('cond') ? 'cond' : k.startsWith('metodo') ? 'metodo' : k);
  const cola = bloques.map((b, i) => ({ b, h: alturas[i] }));
  while (cola.length) {
    const { b, h } = cola[0];
    if (cur.length && usado + gap + h > LIM) {
      // No cabe: si más adelante hay un bloque de condiciones o método entero que sí cabe, se adelanta para no dejar hueco
      let j = -1;
      for (let q = 1; q < cola.length && j < 0; q++) {
        const g = grupo(cola[q].b[0]);
        if (g !== 'cond' && g !== 'metodo') continue;
        const mismo = cola.filter((x) => grupo(x.b[0]) === g);
        const tot = mismo.reduce((s, x) => s + gap + x.h, 0);
        if (usado + tot <= LIM && cola.slice(0, q).every((x) => grupo(x.b[0]) !== g)) j = q;
      }
      if (j >= 0) {
        const g = grupo(cola[j].b[0]);
        const mover = cola.filter((x) => grupo(x.b[0]) === g);
        mover.forEach((x) => { cur.push(x.b); usado += gap + x.h; cola.splice(cola.indexOf(x), 1); });
        continue;
      }
      paginas.push(cur); cur = []; usado = 0; continue;
    }
    cur.push(b); usado += (cur.length > 1 ? gap : 0) + h; cola.shift();
  }
  if (cur.length) paginas.push(cur);
  const n = paginas.length + 1;
  const extra = paginas.map((p) => { if (p.length < 2) return 0; const u = p.reduce((s, b) => s + alturas[bloques.indexOf(b)], 0) + gap * (p.length - 1); return Math.max(0, Math.min(26, (LIM - u) / (p.length - 1))); });
  return paginas.map((p, i) => `<section class="pag det${i === paginas.length - 1 ? ' ult' : ''}">${logoDet(fecha, i + 2, n, nombre)}<div class="i-dcuerpo" style="row-gap:${gap + extra[i]}px">${p.map(([k, h]) => `<div class="i-dbl">${h}</div>`).join('')}</div>${pieDet}</section>`).join('');
}

// ---------------------------------------------------------------------------
function graficoMensual(c, W, Hh) {
  const n = c.meses.length; const m = { l: 36, r: 4, t: 26, b: 20 };
  const max = Math.max(1, ...c.meses.map((f) => Math.max(f.totalA, f.totalP))) * 1.08;
  const bw = (W - m.l - m.r) / n; const ch = Hh - m.t - m.b; const y = (v) => m.t + ch - (v / max) * ch;
  const iMax = c.meses.reduce((a, f, i) => (f.totalA > c.meses[a].totalA ? i : a), 0);
  const iMin = c.meses.reduce((a, f, i) => (f.totalA < c.meses[a].totalA ? i : a), 0);
  let s = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Importe de cada mes">`;
  for (let i = 0; i <= 3; i++) { const v = max * i / 3; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e8e5"/><text x="${m.l - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#6b716c">${Math.round(v)} €</text>`; }
  const paso = n > 24 ? 4 : n > 14 ? 2 : 1;
  const rr = Math.min(4, bw / 6);
  c.meses.forEach((f, i) => {
    const x = m.l + i * bw; const g = Math.min(11, bw * 0.4);
    s += `<rect x="${x + bw / 2 - g - 1}" y="${y(f.totalA)}" width="${g}" height="${m.t + ch - y(f.totalA)}" rx="${rr}" fill="#b9beba"/><rect x="${x + bw / 2 + 1}" y="${y(f.totalP)}" width="${g}" height="${m.t + ch - y(f.totalP)}" rx="${rr}" fill="#6fb74c"/>`;
    if (i % paso === 0) s += `<text x="${x + bw / 2}" y="${Hh - 5}" text-anchor="middle" font-size="9" fill="#6b716c">${MESES[f.m]}</text>`;
  });
  if (n <= 24) for (const [i, t] of [[iMax, 'más caro'], [iMin, 'más barato']]) { if (iMax === iMin && t === 'más barato') continue; const f = c.meses[i]; const x = Math.min(W - 26, Math.max(m.l + 22, m.l + i * bw + bw / 2)); const top = y(Math.max(f.totalA, f.totalP)); s += `<text x="${x}" y="${top - 5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#1a1f1b">${fEur0(f.totalA)}</text><text x="${x}" y="${top - 15}" text-anchor="middle" font-size="8.5" fill="#6b716c">${t}</text>`; }
  return s + '</svg>';
}

function graficoAcumulado(c, W, Hh) {
  const n = c.meses.length; const m = { l: 40, r: 10, t: 22, b: 20 };
  const pts = [0, ...c.meses.map((f) => f.acum)];
  const mx = Math.max(c.penal, ...pts, 1) * 1.1; const mn = Math.min(0, ...pts) * 1.1;
  const x = (i) => m.l + (W - m.l - m.r) * i / n; const y = (v) => m.t + (Hh - m.t - m.b) * (1 - (v - mn) / (mx - mn));
  const ruta = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Ahorro acumulado mes a mes">`;
  for (let i = 0; i <= 3; i++) { const v = mn + (mx - mn) * i / 3; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e8e5"/><text x="${m.l - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#6b716c">${Math.round(v)} €</text>`; }
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="#4a4f4b"/><path d="${ruta} L${x(n)},${y(0)} L${x(0)},${y(0)} Z" fill="#edf7e4"/><path d="${ruta}" fill="none" stroke="#3f6630" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (c.penal > 0) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(c.penal)}" y2="${y(c.penal)}" stroke="#c94b3a" stroke-width="1.2" stroke-dasharray="5 4"/><text x="${W - m.r}" y="${y(c.penal) - 5}" text-anchor="end" font-size="9.5" fill="#c94b3a">Penalización ${fEur0(c.penal)}</text>`;
  if (c.mesRetorno) s += `<circle cx="${x(c.mesRetorno)}" cy="${y(pts[c.mesRetorno])}" r="5" fill="#fff" stroke="#3f6630" stroke-width="2.4"/><text x="${x(c.mesRetorno)}" y="${y(pts[c.mesRetorno]) - 10}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#3f6630">mes ${c.mesRetorno}</text>`;
  s += `<circle cx="${x(n)}" cy="${y(pts[n])}" r="4.5" fill="#3f6630"/><text x="${x(n) - 9}" y="${y(pts[n]) + (pts[n] >= 0 ? -9 : 17)}" text-anchor="end" font-size="12" font-weight="700" fill="#1a1f1b">${fEur0(pts[n])}</text>`;
  c.meses.forEach((f, i) => { if (n <= 14 || i % 3 === 2) s += `<text x="${x(i + 1)}" y="${Hh - 5}" text-anchor="middle" font-size="9" fill="#6b716c">${MESES[f.m]}</text>`; });
  return s + '</svg>';
}

function graficoAnual(c, W, Hh) {
  const n = c.meses.length; const m = { l: 40, r: 44, t: 24, b: 20 };
  const max = Math.max(1, ...c.meses.map((f) => Math.max(f.totalA, f.totalP))) * 1.1; const kMax = Math.max(1, ...c.meses.map((f) => f.kwh)) * 1.1;
  const bw = (W - m.l - m.r) / n; const ch = Hh - m.t - m.b; const y = (v) => m.t + ch - (v / max) * ch; const yk = (v) => m.t + ch - (v / kMax) * ch;
  let s = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Factura de cada mes con cada propuesta y consumo">`;
  for (let i = 0; i <= 3; i++) { const v = max * i / 3; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e8e5"/><text x="${m.l - 5}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#6b716c">${Math.round(v)} €</text>`; }
  for (let i = 0; i <= 2; i++) { const v = kMax * i / 2; s += `<text x="${W - m.r + 5}" y="${yk(v) + 3}" font-size="9" fill="#1a1f1b">${Math.round(v)}</text>`; }
  const paso = n > 24 ? 4 : n > 14 ? 2 : 1; const rr = Math.min(4, bw / 6);
  c.meses.forEach((f, i) => {
    const x = m.l + i * bw; const g = Math.min(13, bw * 0.4);
    s += `<rect x="${x + bw / 2 - g - 1}" y="${y(f.totalA)}" width="${g}" height="${m.t + ch - y(f.totalA)}" rx="${rr}" fill="#b9beba"/><rect x="${x + bw / 2 + 1}" y="${y(f.totalP)}" width="${g}" height="${m.t + ch - y(f.totalP)}" rx="${rr}" fill="#6fb74c"/>`;
    if (i % paso === 0) s += `<text x="${x + bw / 2}" y="${Hh - 5}" text-anchor="middle" font-size="9" fill="#6b716c">${MESES[f.m]}</text>`;
  });
  const pts = c.meses.map((f, i) => `${(m.l + i * bw + bw / 2).toFixed(1)},${yk(f.kwh).toFixed(1)}`);
  s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#1a1f1b" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (n <= 24) c.meses.forEach((f, i) => { s += `<circle cx="${m.l + i * bw + bw / 2}" cy="${yk(f.kwh)}" r="2.6" fill="${f.real ? '#1a1f1b' : '#fff'}" stroke="#1a1f1b" stroke-width="1.4"/>`; });
  return s + '</svg>';
}

