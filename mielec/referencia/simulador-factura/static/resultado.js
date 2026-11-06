// Resultado interactivo: se puede probar "¿y si...?" (consumo, meses, servicios) y ver el efecto al momento.
// Funciones puras que devuelven HTML; los eventos los gestiona app.js con los atributos data-rs.
import { MESES, MESES_L, num } from '/calculo.js';
import { esc, fEur, fEur0, fNum } from '/informe.js';

const C = { pot: '#3f6630', otros: '#c9e7b0', serv: '#a8d886', ener: '#6fb74c', imp: '#c3c9c4', A: '#8a8f8b', P: '#6fb74c', kwh: '#0b2a3d' };
const NOMB = { pot: 'Potencia', otros: 'Alquiler y otros', serv: 'Servicios', ener: 'Energía', imp: 'Impuestos' };
const unM = (n) => `${n} ${n === 1 ? 'mes' : 'meses'}`;
const pT = (c) => (c.soloFactura ? 'esta factura' : pT(c));

export function htmlControles(E, ui) {
  const svs = [...E.actual.servicios.map((s) => ['actual', s]), ...E.propuesta.servicios.map((s) => ['propuesta', s])];
  const H = ui.H || (E.horizonte === 'f' ? 'f' : Math.round(num(E.horizonte)) || 12);
  return `<section class="card rs-ctl"><h2>Prueba cómo cambia</h2>
    <p class="sub">Esto no modifica tus datos. Mueve los controles y el resultado se actualiza al momento.</p>
    <div class="rs-g">
      <div class="rs-sl"><div class="rs-sl-t"><span>Consumo respecto al previsto</span><b id="rs-pct-v">${ui.pct > 0 ? '+' : ''}${ui.pct} %</b></div>
        <input type="range" min="-50" max="100" step="5" value="${ui.pct}" data-rs="pct" aria-label="Variación del consumo"></div>
      <div><span class="c-l">Comparar durante</span><div class="seg">${['f', 12, 24, 36, 48].map((h) => `<button type="button" data-rs="H" data-v="${h}" class="${H === h ? 'on' : ''}">${h === 'f' ? 'Esta factura' : h + ' meses'}</button>`).join('')}</div></div>
      <label class="chk"><input type="checkbox" data-rs="pen" ${ui.pen ? 'checked' : ''}> Restar la penalización por salir del contrato actual</label>
    </div>
    ${svs.length ? `<h3 style="margin-top:12px">Servicios (quita uno para ver cuánto pesa)</h3><div class="rs-sv">${svs.map(([k, s]) => `<label class="chk"><input type="checkbox" data-rs="sv" data-k="${k}:${s.id}" ${ui.off.includes(k + ':' + s.id) ? '' : 'checked'}> ${k === 'actual' ? 'Actual' : 'Propuesta'}: ${esc(s.nombre || 'Servicio')}</label>`).join('')}</div>` : ''}
    <div class="rs-reset"><button type="button" class="btn sec mini" data-rs="reset">Volver a mis datos</button></div></section>`;
}

export function htmlSalida(E, c, c0, ui) {
  const bien = c.ahorro >= 0;
  const cambiado = ui.pct !== 0 || ui.off.length > 0 || !ui.pen || (ui.H && ui.H !== (E.horizonte === 'f' ? 'f' : Math.round(num(E.horizonte)) || 12));
  const dBase = c.neto - c0.neto;
  const head = `<div class="rs-hero ${bien ? '' : 'mal'}">
    <div><small>${bien ? 'Ahorro estimado' : 'Sobrecoste estimado'} en ${pT(c)}</small><div class="rs-n">${fEur(Math.abs(c.ahorro))}<span>${fNum(Math.abs(c.ahorroPct))} %</span></div>
      <p>Factura actual ${fEur0(c.pA.total)} · propuesta ${fEur0(c.pP.total)}</p></div>
    <div class="rs-k"><div><small>Ahorro neto</small><b>${fEur0(c.neto)}</b><span>${c.penal ? 'tras la penalización' : 'sin penalización'}</span></div>
      <div><small>${c.soloFactura ? 'En esta factura' : 'Al mes'}</small><b>${fEur(Math.abs(c.ahorroMes))}</b><span>${bien ? 'de ahorro' : 'de más'}</span></div>
      <div><small>Consumo</small><b>${fNum(c.kwhAnual, 0)} kWh</b><span>en ${pT(c)}</span></div>
      <div><small>${c.retorno && c.penal ? 'Recuperas la penalización' : 'Permanencia'}</small><b>${c.retorno && c.penal ? 'mes ' + Math.max(1, Math.round(c.retorno)) : (c.permP ? unM(c.permP) : 'ninguna')}</b><span>${c.permP ? 'penaliza ' + fEur0(c.penP) : 'sin ataduras'}</span></div></div>
    ${cambiado ? `<p class="rs-dif">Con tus datos tal cual: ${fEur0(c0.neto)} de ahorro neto. Con este escenario ${dBase >= 0 ? 'ganas' : 'pierdes'} ${fEur0(Math.abs(dBase))} ${dBase >= 0 ? 'más' : 'menos'}.</p>` : ''}</div>`;

  const rc = c0.recon;
  const dMed = c0.refA.dias;
  const comprobacion = `<div class="rs-comp ${rc ? (rc.ok ? 'ok' : 'no') : ''}">${rc
    ? (rc.ok ? `<b>El cálculo cuadra con tu factura.</b> La factura de ${fNum(dMed, 0)} días da ${fEur(rc.calculada)} y la factura real es de ${fEur(rc.real)}.`
      : `<b>El cálculo no cuadra con tu factura:</b> da ${fEur(rc.calculada)} y la real es ${fEur(rc.real)} (${rc.dif > 0 ? '+' : '-'}${fEur(Math.abs(rc.dif))}). Revisa precios, impuestos o conceptos que falten antes de fiarte del resultado.`)
    : 'Si rellenas el total de la factura real en el paso "Lo que paga hoy", aquí se comprueba que el cálculo cuadra.'}
    <span>La media mensual (${fEur(c0.pA.medio)}) no es igual a tu factura (${fEur(c0.refA.total)}) porque un mes medio tiene 30,4 días y no ${fNum(dMed, 0)}, y porque el consumo cambia de un mes a otro.</span></div>`;
  const vistas = [['mes', 'Cada mes'], ['acum', 'Acumulado'], ['fv', 'Fijo y variable']];
  const tabs = `<div class="rs-tabs"><div class="seg">${vistas.map(([k, n]) => `<button type="button" data-rs="vista" data-v="${k}" class="${ui.vista === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    ${ui.vista === 'fv' ? `<div class="seg">${[['actual', 'Actual'], ['propuesta', 'Propuesta']].map(([k, n]) => `<button type="button" data-rs="lado" data-v="${k}" class="${ui.lado === k ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}</div>`;
  const grafico = ui.vista === 'acum' ? chartAcum(c) : ui.vista === 'fv' ? chartFV(c, ui.lado) : chartMes(c);
  const nota = ui.vista === 'fv' ? notaFV(c, ui) : ui.vista === 'mes' ? 'La línea oscura es el consumo de cada mes (kWh). Pasa el ratón o toca una barra para ver el detalle.' : 'Ahorro de cada mes sumado al anterior. Pasa el ratón o toca para ver el detalle.';
  const chart = `<section class="card"><h2>${vistas.find(([k]) => k === ui.vista)[1]}</h2>${tabs}
    ${ui.vista === 'mes' ? '<div class="rs-ley"><span><i style="background:#8a8f8b"></i>Actual</span><span><i style="background:#6fb74c"></i>Propuesta</span><span><i class="ln"></i>Consumo (kWh)</span></div>' : ''}
    ${ui.vista === 'fv' ? `<div class="rs-ley">${['pot', 'otros', 'serv', 'ener', 'imp'].map((k) => `<span><i style="background:${C[k]}"></i>${NOMB[k]}</span>`).join('')}<span><i class="ln"></i>Consumo (kWh)</span></div>` : ''}
    <div class="rs-ch">${grafico}</div><div class="rs-tt" id="rs-tt">${nota}</div></section>`;

  const filas = c.meses.map((f) => `<tr><td>${MESES[f.m]} ${String(f.y).slice(2)}</td><td class="num">${f.dias}</td><td class="num">${fNum(f.kwh, 0)}</td><td class="num">${fEur(f.totalA)}</td><td class="num">${fEur(f.totalP)}</td><td class="num ${f.ahorro >= 0 ? 'bien' : 'mal'}">${fEur(f.ahorro)}</td><td class="num">${fEur(f.acum)}</td></tr>`).join('');
  const tabla = `<section class="card"><h2>Mes a mes <button type="button" class="lnk" data-rs="tabla">${ui.tabla ? 'Ocultar' : 'Mostrar la tabla'}</button></h2>
    ${ui.tabla ? `<div class="tw"><table class="tb"><thead><tr><th>Mes</th><th>Días</th><th>kWh</th><th>Actual</th><th>Propuesta</th><th>Ahorro</th><th>Acumulado</th></tr></thead><tbody>${filas}</tbody></table></div>` : '<p class="ayuda" style="margin:0">Importe de cada mes con sus días y su consumo.</p>'}</section>`;

  const A = c.refA; const P = c.refP;
  const fl = (n, a, p, o = '') => { const d = p - a; return `<tr class="${o}"><td>${n}</td><td class="num">${fEur(a)}</td><td class="num">${fEur(p)}</td><td class="num ${Math.abs(d) < 0.005 ? '' : d < 0 ? 'bien' : 'mal'}">${Math.abs(d) < 0.005 ? 'igual' : (d > 0 ? '+' : '-') + fEur(Math.abs(d))}</td></tr>`; };
  const concepto = `<section class="card"><h2>Una factura, concepto a concepto</h2><p class="sub">Primer periodo (${fNum(A.dias, 0)} días, ${fNum(A.kwh, 0)} kWh).</p>
    <div class="tw"><table class="tb"><thead><tr><th></th><th>Actual</th><th>Propuesta</th><th>Diferencia</th></tr></thead><tbody>
    ${fl('Potencia', A.potBruto, P.potBruto)}${fl('Energía', A.enBruto, P.enBruto)}
    ${A.comp || P.comp ? fl('Excedentes', -A.comp, -P.comp) : ''}${A.descTotal || P.descTotal ? fl('Descuentos', -A.descTotal, -P.descTotal) : ''}
    ${A.alq || P.alq ? fl('Alquiler de contador', A.alq, P.alq) : ''}${A.cargosTotal || P.cargosTotal ? fl('Cargos regulados', A.cargosTotal, P.cargosTotal) : ''}
    ${A.servBruto || P.servBruto ? fl('Servicios', A.servBruto, P.servBruto) : ''}${fl('Impuesto electricidad', A.iee, P.iee)}${fl('IVA', A.iva, P.iva)}${fl('Total factura', A.total, P.total, 'tot')}</tbody></table></div></section>`;

  const avisos = c.avisos.filter(([t]) => t !== 'err').map(([t, m]) => `<div class="av ${t}">${esc(m)}</div>`).join('');
  return `${head}${comprobacion}${avisos ? `<div class="avisos">${avisos}</div>` : ''}${chart}${concepto}${tabla}`;
}

function notaFV(c, ui) {
  const cc = ui.lado === 'actual' ? c.compA : c.compP;
  const pre = cc.pot + cc.ener + cc.serv + cc.otros;
  const sh = pre > 0 ? cc.ener / pre * 100 : 0;
  return `En la factura ${ui.lado === 'actual' ? 'actual' : 'de la propuesta'}, la energía es el <b>${fNum(sh, 0)} %</b> de lo que pagas antes de impuestos. El resto es parte fija (potencia, alquiler, servicios): no cambia con el consumo. Por eso un <b>30 %</b> más de consumo solo sube el total un <b>${fNum(sh * 0.3, 1)} %</b>.`;
}

// ---- gráficos con zonas sensibles (data-tt) ----
function ejes(W, Hh, m, max, n, kwhMax, c) {
  let s = '';
  const ch = Hh - m.t - m.b; const y = (v) => m.t + ch - (v / max) * ch;
  for (let i = 0; i <= 4; i++) { const v = max * i / 4; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e8e5"/><text x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="#8a8f8b">${Math.round(v)} €</text>`; }
  if (kwhMax) for (let i = 0; i <= 2; i++) { const v = kwhMax * i / 2; s += `<text x="${W - m.r + 6}" y="${m.t + ch - (v / kwhMax) * ch + 3}" font-size="10" fill="#0b2a3d">${Math.round(v)}</text>`; }
  const bw = (W - m.l - m.r) / n; const paso = n > 24 ? 4 : n > 14 ? 2 : 1;
  c.meses.forEach((f, i) => { if (i % paso === 0) s += `<text x="${m.l + i * bw + bw / 2}" y="${Hh - 8}" text-anchor="middle" font-size="10" fill="#8a8f8b">${MESES[f.m]}</text>`; });
  return s;
}
const tt = (f, extra) => esc(`<b>${MESES_L[f.m]} ${f.y}</b> · ${fNum(f.kwh, 0)} kWh · ${f.dias} días<br>${extra}`);
function lineaKwh(c, W, Hh, m, kwhMax) {
  const n = c.meses.length; const bw = (W - m.l - m.r) / n; const ch = Hh - m.t - m.b;
  const pts = c.meses.map((f, i) => `${(m.l + i * bw + bw / 2).toFixed(1)},${(m.t + ch - (f.kwh / kwhMax) * ch).toFixed(1)}`);
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${C.kwh}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${n <= 24 ? pts.map((p) => `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="2.6" fill="${C.kwh}"/>`).join('') : ''}`;
}
function chartMes(c) {
  const n = c.meses.length; const W = 760; const Hh = 280; const m = { l: 46, r: 40, t: 12, b: 24 };
  const max = Math.max(1, ...c.meses.map((f) => Math.max(f.totalA, f.totalP))) * 1.12; const kwhMax = Math.max(1, ...c.meses.map((f) => f.kwh)) * 1.1;
  const bw = (W - m.l - m.r) / n; const ch = Hh - m.t - m.b; const y = (v) => m.t + ch - (v / max) * ch;
  let s = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Importe mensual">${ejes(W, Hh, m, max, n, kwhMax, c)}`;
  c.meses.forEach((f, i) => {
    const x = m.l + i * bw; const g = Math.min(18, bw * 0.38);
    s += `<rect x="${x + bw / 2 - g - 1}" y="${y(f.totalA)}" width="${g}" height="${m.t + ch - y(f.totalA)}" rx="3" fill="${C.A}"/><rect x="${x + bw / 2 + 1}" y="${y(f.totalP)}" width="${g}" height="${m.t + ch - y(f.totalP)}" rx="3" fill="${C.P}"/>`;
  });
  s += lineaKwh(c, W, Hh, m, kwhMax);
  c.meses.forEach((f, i) => { s += `<rect class="rs-hit" x="${m.l + i * bw}" y="0" width="${bw}" height="${Hh - m.b}" data-tt="${tt(f, `Actual <b>${fEur(f.totalA)}</b> · Propuesta <b>${fEur(f.totalP)}</b> · ${f.ahorro >= 0 ? 'Ahorro' : 'Sobrecoste'} <b>${fEur(Math.abs(f.ahorro))}</b>`)}"/>`; });
  return s + '</svg>';
}
function chartAcum(c) {
  const n = c.meses.length; const W = 760; const Hh = 280; const m = { l: 46, r: 14, t: 16, b: 24 };
  const pts = [0, ...c.meses.map((f) => f.acum)];
  const mx = Math.max(c.penal, ...pts, 1) * 1.12; const mn = Math.min(0, ...pts) * 1.12;
  const bw = (W - m.l - m.r) / n; const x = (i) => m.l + (W - m.l - m.r) * i / n; const y = (v) => m.t + (Hh - m.t - m.b) * (1 - (v - mn) / (mx - mn));
  const ruta = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  let s = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Ahorro acumulado">`;
  for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e8e5"/><text x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end" font-size="10" fill="#8a8f8b">${Math.round(v)} €</text>`; }
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(0)}" y2="${y(0)}" stroke="#4a4f4b"/><path d="${ruta} L${x(n)},${y(0)} L${x(0)},${y(0)} Z" fill="#e3f2d6"/><path d="${ruta}" fill="none" stroke="#3f6630" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (c.penal > 0) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(c.penal)}" y2="${y(c.penal)}" stroke="#c94b3a" stroke-width="1.4" stroke-dasharray="5 4"/><text x="${W - m.r}" y="${y(c.penal) - 5}" text-anchor="end" font-size="10.5" fill="#c94b3a">Penalización ${fEur0(c.penal)}</text>`;
  if (c.mesRetorno) s += `<circle cx="${x(c.mesRetorno)}" cy="${y(pts[c.mesRetorno])}" r="5.5" fill="#fff" stroke="#3f6630" stroke-width="2.6"/>`;
  c.meses.forEach((f, i) => { if (i % (n > 24 ? 4 : n > 14 ? 2 : 1) === 0) s += `<text x="${x(i + 1)}" y="${Hh - 8}" text-anchor="middle" font-size="10" fill="#8a8f8b">${MESES[f.m]}</text>`; });
  c.meses.forEach((f, i) => { s += `<rect class="rs-hit" x="${x(i + 0.5)}" y="0" width="${bw}" height="${Hh - m.b}" data-tt="${tt(f, `Este mes ${f.ahorro >= 0 ? 'ahorras' : 'pagas de más'} <b>${fEur(Math.abs(f.ahorro))}</b> · Acumulado <b>${fEur(f.acum)}</b>${c.penal && f.acum >= c.penal ? ' (ya cubre la penalización)' : ''}`)}"/>`; });
  return s + '</svg>';
}
function chartFV(c, lado) {
  const n = c.meses.length; const W = 760; const Hh = 280; const m = { l: 46, r: 40, t: 12, b: 24 };
  const clave = lado === 'actual' ? 'A' : 'P';
  const filas = (clave === 'A' ? c.pA : c.pP).filas;
  const max = Math.max(1, ...filas.map((f) => f.total)) * 1.12; const kwhMax = Math.max(1, ...c.meses.map((f) => f.kwh)) * 1.1;
  const bw = (W - m.l - m.r) / n; const ch = Hh - m.t - m.b; const y = (v) => m.t + ch - (v / max) * ch;
  let s = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" role="img" aria-label="Parte fija y variable">${ejes(W, Hh, m, max, n, kwhMax, c)}`;
  filas.forEach((f, i) => {
    const x = m.l + i * bw + bw * 0.15; const w = bw * 0.7; let acc = 0;
    for (const k of ['pot', 'otros', 'serv', 'ener', 'imp']) { const v = f[k]; if (v <= 0) continue; s += `<rect x="${x}" y="${y(acc + v)}" width="${w}" height="${y(acc) - y(acc + v)}" fill="${C[k]}"/>`; acc += v; }
  });
  s += lineaKwh(c, W, Hh, m, kwhMax);
  filas.forEach((f, i) => { const d = c.meses[i]; s += `<rect class="rs-hit" x="${m.l + i * bw}" y="0" width="${bw}" height="${Hh - m.b}" data-tt="${tt(d, `Total <b>${fEur(f.total)}</b>: potencia ${fEur(f.pot)} · energía ${fEur(f.ener)} · servicios ${fEur(f.serv)} · alquiler y otros ${fEur(f.otros)} · impuestos ${fEur(f.imp)}`)}"/>`; });
  return s + '</svg>';
}
