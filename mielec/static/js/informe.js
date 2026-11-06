import { esc, n, eur, aviso } from './util.js';
import { S, calcular } from './estado.js';
import { facturar, TARIFAS, MESES_L, num } from './calculo.js';
import { barrasMeses } from './graficos.js';

const sg = (x) => (x < 0 ? '−' : '') + n(Math.abs(x), 2) + ' €';

function cargar(src) {
  if (document.querySelector(`script[data-lib="${src}"]`)) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src; s.dataset.lib = src; s.onload = ok; s.onerror = () => ko(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}

// Líneas de la factura del primer mes, alineadas hoy / oferta
function tabla(e) {
  const a = facturar(e, e.actual), p = facturar(e, e.propuesta);
  const sum = (f) => ({
    pot: f.potBruto, ene: f.enBruto, exc: -f.comp, desc: -f.descTotal, serv: f.servBruto,
    alq: f.alq, otros: f.otrosTotal, iee: f.iee, iva: f.iva, total: f.total,
  });
  const A = sum(a), P = sum(p);
  const defs = [['pot', 'Potencia contratada'], ['ene', 'Energía consumida'], ['exc', 'Excedentes de autoconsumo'], ['desc', 'Descuentos'], ['serv', 'Servicios'], ['alq', 'Alquiler del contador'], ['otros', 'Otros conceptos'], ['iee', 'Impuesto eléctrico'], ['iva', 'IVA']];
  return { filas: defs.filter(([k]) => Math.abs(A[k]) + Math.abs(P[k]) > 0.004), A, P, a, p };
}

export function htmlInforme(e, r) {
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const gana = r.ahorro >= 0;
  const t = tabla(e);
  const cl = e.cliente, tar = TARIFAS[cl.tarifa];
  const kw = e.actual.potencia.contratada.slice(0, tar.nPot).map(num).filter((x) => x > 0);
  const penal = r.permA.reduce((s, x) => s + x.pen, 0);
  const marca = '<div class="i-marca"><svg viewBox="0 0 48 48" width="34" height="34"><path d="M24 3 42 13.5v21L24 45 6 34.5v-21z" fill="#f5a400"/><path d="m26 12-9 14h6l-1 10 9-14h-6z" fill="#fff"/></svg><b>Mielec</b></div>';
  const pie = (np) => `<div class="i-pie"><span>Informe generado con Mielec · ${fecha}</span><span>${np}</span></div>`;

  const condiciones = [];
  for (const [lado, lista] of [['Hoy', r.permA], ['Oferta', r.permPr]]) {
    lista.forEach((x) => condiciones.push(`<li><b>${lado}:</b> ${esc(x.nombre)} · ${x.meses ? x.meses + ' meses' : 'sin plazo'}${x.pen ? ` · penalización ${eur(x.pen, 0)}` : ''}</li>`));
  }
  if (r.sinServ && Math.abs(r.ahorroSinServ - r.ahorro) > 1) condiciones.push(`<li>Sin los servicios de la oferta, el ahorro sería de <b>${eur(r.ahorroSinServ, 0)}</b> en ${r.H} meses.</li>`);
  if (r.retorno) condiciones.push(`<li>Recuperas la penalización de salida en unos <b>${n(r.retorno, 0)} meses</b>.</li>`);
  const avisos = (r.avisos || []).map((a) => `<li class="${a[0]}">${esc(a[1])}</li>`).join('');

  return `
  <section class="i-hoja">
    <div class="i-barra"></div>
    <div class="i-cab">${marca}<div class="i-fecha">${fecha}${S.nombre ? `<br><b>${esc(S.nombre)}</b>` : ''}</div></div>
    <h1 class="i-tit">${gana ? 'Con la oferta' : 'La oferta'} <em>${gana ? 'ahorras' : 'te sale más cara'}</em></h1>
    <p class="i-big ${gana ? '' : 'mal'}">${eur(Math.abs(r.ahorro), 0)}</p>
    <p class="i-sub">${gana ? 'menos' : 'más'} en ${r.H} meses · ${eur(Math.abs(r.ahorroMes), 2)} al mes · ${n(Math.abs(r.ahorroPct), 1)} %</p>
    <div class="i-mets">
      <div><small>Hoy pagas</small><b>${eur(r.pA.medio, 2)}</b><span>al mes de media</span></div>
      <div class="dest"><small>Con la oferta</small><b>${eur(r.pP.medio, 2)}</b><span>al mes de media</span></div>
      <div><small>Total ${r.H} meses</small><b>${eur(r.pP.total, 0)}</b><span>frente a ${eur(r.pA.total, 0)}</span></div>
    </div>
    <h2 class="i-h2">Mes a mes${r.H > 12 ? ' (primer año)' : ''}</h2>
    <div class="i-graf">${barrasMeses(r.meses)}</div>
    <div class="i-ley"><span><b style="background:#b9bcc4"></b>Hoy</span><span><b style="background:#f5a400"></b>Con la oferta</span></div>
    <h2 class="i-h2">De dónde sale la diferencia</h2>
    <div class="i-orig">${origen(r)}</div>
    ${condiciones.length ? `<h2 class="i-h2">Condiciones a tener en cuenta</h2><ul class="i-lista">${condiciones.join('')}</ul>` : ''}
    ${avisos ? `<ul class="i-avisos">${avisos}</ul>` : ''}
    ${pie('1 / 2')}
  </section>
  <section class="i-hoja">
    <div class="i-barra"></div>
    <div class="i-cab">${marca}<div class="i-fecha">Detalle de la factura</div></div>
    <h1 class="i-tit">Tu factura, <em>línea a línea</em></h1>
    <p class="i-sub izq">Un periodo de ${t.a.dias} días · tarifa ${cl.tarifa} · ${n(t.a.kwh, 0)} kWh${kw.length ? ` · ${kw.map((x) => n(x, 2)).join(' / ')} kW` : ''}</p>
    <table class="i-tab">
      <thead><tr><th>Concepto</th><th>Hoy</th><th>Oferta</th><th>Diferencia</th></tr></thead>
      <tbody>
      ${t.filas.map(([k, nom]) => { const d = t.P[k] - t.A[k]; return `<tr><td>${nom}</td><td>${sg(t.A[k])}</td><td>${sg(t.P[k])}</td><td class="${Math.abs(d) < 0.005 ? '' : d < 0 ? 'ok' : 'mal'}">${Math.abs(d) < 0.005 ? '—' : sg(d)}</td></tr>`; }).join('')}
      <tr class="tot"><td>Total a pagar</td><td>${sg(t.A.total)}</td><td>${sg(t.P.total)}</td><td class="${t.P.total - t.A.total < 0 ? 'ok' : 'mal'}">${sg(t.P.total - t.A.total)}</td></tr>
      </tbody>
    </table>
    <h2 class="i-h2">Precios usados</h2>
    <table class="i-tab peq">
      <thead><tr><th></th><th>Hoy</th><th>Oferta</th></tr></thead>
      <tbody>
        <tr><td>Potencia</td><td>${resumenPot(e.actual, tar)}</td><td>${resumenPot(e.propuesta, tar)}</td></tr>
        <tr><td>Energía</td><td>${resumenEn(e.actual, tar)}</td><td>${resumenEn(e.propuesta, tar)}</td></tr>
      </tbody>
    </table>
    <div class="i-nota"><b>Cómo se ha calculado.</b> Potencia = kW × precio × días. Energía = kWh de cada periodo × su precio. A ello se suman el alquiler del contador, servicios y otros conceptos, se restan los descuentos, y se aplican el impuesto eléctrico (${n(num(e.fiscal.iee), 2)} %) y el IVA (${n(num(e.fiscal.iva), 0)} %). Los ${r.H} meses se calculan con el calendario real y el mismo consumo anual. Es una estimación con los datos introducidos; la factura real puede variar con el consumo y los precios de cada periodo.</div>
    ${pie('2 / 2')}
  </section>`;
}

function origen(r) {
  const A = r.compA, P = r.compP;
  const filas = [['Energía', A.ener - P.ener], ['Potencia', A.pot - P.pot], ['Servicios', A.serv - P.serv], ['Otros conceptos y alquiler', A.otros - P.otros], ['Impuestos', A.imp - P.imp]].filter(([, v]) => Math.abs(v) >= 0.5);
  const max = Math.max(...filas.map(([, v]) => Math.abs(v)), 1);
  return filas.map(([nom, v]) => `<div class="i-o"><span>${nom}</span><i><u class="${v >= 0 ? '' : 'mal'}" style="width:${(Math.abs(v) / max * 100).toFixed(0)}%"></u></i><b class="${v >= 0 ? 'ok' : 'mal'}">${v >= 0 ? '−' : '+'}${n(Math.abs(v), 0)} €</b></div>`).join('') + '<p class="i-peq">Positivo en verde: lo que dejas de pagar con la oferta en ' + r.H + ' meses.</p>';
}

const U_POT = { dia: '€/kW·día', mes: '€/kW·mes', anio: '€/kW·año' };
const U_EN = { eur: '€/kWh', cent: 'cént./kWh', mwh: '€/MWh' };
function resumenPot(L, tar) {
  const v = L.potencia.unico ? [L.potencia.precios[0]] : L.potencia.precios.slice(0, tar.nPot);
  return v.map((x) => n(num(x), 4)).join(' · ') + ' ' + U_POT[L.potencia.unidad];
}
function resumenEn(L, tar) {
  const g = L.energia.nPrecios;
  const v = L.energia.precios.slice(0, g);
  return v.map((x) => n(num(x), 4)).join(' · ') + ' ' + U_EN[L.energia.unidad];
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return url;
}

export async function generarInforme(btn) {
  const c = calcular();
  if (c.err) { aviso(c.err, true); return; }
  const textoOriginal = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="rueda"></i> Preparando…'; }
  try {
    await Promise.all([cargar('/lib/html2canvas.min.js'), cargar('/lib/jspdf.umd.min.js')]);
    const cont = document.getElementById('informe');
    cont.innerHTML = htmlInforme(c.e, c.r);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'p', compress: true });
    const hojas = [...cont.querySelectorAll('.i-hoja')];
    for (let i = 0; i < hojas.length; i++) {
      const cv = await window.html2canvas(hojas[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i) pdf.addPage();
      pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    }
    const base = (S.nombre || 'informe').trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'informe';
    const blob = pdf.output('blob');
    descargar(blob, `Mielec_${base}_${c.r.H}m.pdf`);
    cont.innerHTML = '';
    aviso('Informe descargado');
  } catch (x) {
    console.error(x);
    aviso('No se pudo crear el PDF. Inténtalo otra vez.', true);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = textoOriginal; }
  }
}
