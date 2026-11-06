import { esc, n, eur, IC } from './util.js';
import { S, guardar, calcular, activo } from './estado.js';
import { facturar, TARIFAS, UNI_POT, UNI_EN, num } from './calculo.js';
import { apilada } from './graficos.js';
import { generarInforme } from './informe.js';

const U_POT = { dia: '€/kW·día', mes: '€/kW·mes', anio: '€/kW·año' };
const U_EN = { eur: '€/kWh', cent: 'cént./kWh', mwh: '€/MWh' };
const sgn = (x) => (x < 0 ? '−' : '') + n(Math.abs(x), 2) + ' €';

// Todas las líneas de una factura con su explicación. Se usa en la pantalla y en el informe.
export function lineas(e, k) {
  const L = e[k], f = facturar(e, L), cl = e.cliente, t = TARIFAS[cl.tarifa];
  const o = facturar(e, e[k === 'actual' ? 'propuesta' : 'actual']);
  const lo = k === 'actual' ? 'la oferta' : 'tu factura de hoy';
  const fp = UNI_POT[L.potencia.unidad] ?? 1, fe = UNI_EN[L.energia.unidad] ?? 1;
  const kw = f.pot.filter((x) => x.kw > 0);
  const out = [];

  out.push({
    id: 'pot', grupo: 'Lo que usas', nombre: 'Potencia contratada', sub: kw.map((x) => `${n(x.kw, 2)} kW`).join(' · ') + ` · ${f.dias} días`, imp: f.potBruto, otro: o.potBruto,
    que: 'Es lo que pagas por tener la potencia disponible en casa, uses luz o no. Dependen de los kW que tienes contratados, del precio por kW y día y de los días de la factura.',
    calc: kw.map((x) => [`${x.etiqueta}: ${n(x.kw, 2)} kW × ${n(x.precio, 4)} ${U_POT[L.potencia.unidad]} × ${f.dias} días${fp !== 1 ? ' (convertido a día)' : ''}`, sgn(x.importe)]),
    tip: 'Si tu potencia contratada es más alta de lo que realmente usas, bajarla reduce esta línea todos los meses.',
  });
  out.push({
    id: 'ene', grupo: 'Lo que usas', nombre: 'Energía consumida', sub: `${n(f.kwh, 0)} kWh`, imp: f.enBruto, otro: o.enBruto,
    que: 'Es la luz que has gastado: los kWh consumidos por el precio de cada kWh. Si tu tarifa distingue horas (punta, llano, valle), cada tramo tiene su precio.',
    calc: f.en.filter((x) => x.kwh > 0).map((x) => [`${x.etiqueta}: ${n(x.kwh, 1)} kWh × ${n(x.precio, 4)} ${U_EN[L.energia.unidad]}`, sgn(x.importe)]),
    tip: 'Poner lavadora, horno o el coche eléctrico en las horas baratas (mira la pestaña Hoy) baja esta línea sin gastar menos.',
  });
  if (f.comp > 0) out.push({
    id: 'exc', grupo: 'Lo que usas', nombre: 'Excedentes de autoconsumo', sub: 'Energía que viertes a la red', imp: -f.comp, otro: -o.comp,
    que: 'Si tienes placas, la energía que no consumes y vuelcas a la red te la compensan. Se descuenta de la energía, nunca puede dejarla por debajo de 0.',
    calc: [[`${n(num(cl.excedentes), 1)} kWh × ${n(num(L.compensacion.precio), 4)} ${U_EN[L.energia.unidad]}`, sgn(-f.comp)]],
    tip: '',
  });
  for (const d of f.descuentos) {
    if (d.importe > 0) out.push({
      id: 'd-' + d.id, grupo: 'Descuentos', nombre: d.nombre, sub: 'Rebaja en la factura', imp: -d.importe, otro: null,
      que: 'Es una rebaja que aplica la comercializadora. Solo cuenta mientras está en vigor y, si depende de un servicio, solo si lo tienes contratado.',
      calc: [[d.nombre, sgn(-d.importe)]], tip: 'Mira cuántos meses dura: cuando termina, la factura sube.',
    });
    else if (d.motivoNo) out.push({
      id: 'd-' + d.id, grupo: 'Descuentos', nombre: d.nombre, sub: 'No se aplica este mes', imp: 0, otro: null, apagada: true,
      que: `Este descuento está en la oferta pero no se aplica: ${d.motivoNo}.`, calc: [], tip: '',
    });
  }
  for (const s of f.servicios) {
    if (s.bruto > 0) out.push({
      id: 's-' + s.id, grupo: 'Servicios y otros', nombre: s.nombre, sub: 'Servicio contratado', imp: s.bruto, otro: null,
      que: 'Es un servicio opcional (mantenimiento, seguro, asistencia…) que no tiene que ver con la energía. Mira si lo necesitas: se puede cancelar o no.',
      calc: [[s.nombre, sgn(s.bruto)]], tip: 'Pregunta si el servicio tiene permanencia antes de contratarlo.',
    });
  }
  if (f.alq > 0) out.push({
    id: 'alq', grupo: 'Servicios y otros', nombre: 'Alquiler del contador', sub: `${f.dias} días`, imp: f.alq, otro: o.alq,
    que: 'Lo cobra la distribuidora por el contador que tienes en casa. Es igual con cualquier comercializadora: no cambia al cambiar de compañía.',
    calc: [[`${n(num((L.alquilerPropio && L.alquilerPropio.activo ? L.alquilerPropio : cl.alquiler).importe), 2)} ${({ mes: '€/mes', dia: '€/día', anio: '€/año' })[(cl.alquiler || {}).unidad] || ''} × ${f.dias} días`, sgn(f.alq)]],
    tip: 'Si el contador es tuyo (comprado), esta línea no debería aparecer.',
  });
  for (const x of f.otros) out.push({
    id: 'o-' + x.nombre, grupo: 'Servicios y otros', nombre: x.nombre, sub: x.comun ? 'Cargo regulado' : 'Otro concepto', imp: x.importe, otro: null,
    que: x.comun ? 'Es un cargo que fija la normativa y que pagas con cualquier comercializadora.' : 'Concepto adicional de la factura (por ejemplo, energía reactiva o exceso de potencia).', calc: [[x.nombre, sgn(x.importe)]], tip: '',
  });
  out.push({
    id: 'iee', grupo: 'Impuestos', nombre: 'Impuesto eléctrico', sub: `${n(num(e.fiscal.iee), 2)} % sobre ${eur(f.baseIee)}`, imp: f.iee, otro: o.iee,
    que: 'Es un impuesto especial sobre la electricidad. Se calcula sobre potencia + energía (ya con descuentos). Tiene un mínimo por cada MWh consumido.',
    calc: [['Base: potencia + energía + otros', sgn(f.baseIee)], [`× ${n(num(e.fiscal.iee), 4)} %`, sgn(f.baseIee * num(e.fiscal.iee) / 100)], ...(f.iee > f.baseIee * num(e.fiscal.iee) / 100 + 0.005 ? [['Se aplica el mínimo legal por MWh', sgn(f.iee)]] : [])],
    tip: '',
  });
  out.push({
    id: 'iva', grupo: 'Impuestos', nombre: 'IVA', sub: `${n(num(e.fiscal.iva), 0)} % sobre ${eur(f.baseIva)}`, imp: f.iva, otro: o.iva,
    que: 'El IVA se aplica sobre todo lo anterior, incluido el impuesto eléctrico y el alquiler del contador.',
    calc: [['Base: todo lo anterior', sgn(f.baseIva)], [`× ${n(num(e.fiscal.iva), 0)} %`, sgn(f.iva)]], tip: '',
  });
  const total = { id: 'tot', nombre: 'Total a pagar', imp: f.total, otro: o.total, que: 'Es la suma de todo lo anterior: lo que verías cargado en tu cuenta para este periodo.', calc: [], tip: '' };
  return { f, filas: out, total, lo, t };
}

export function vistaFactura(el) {
  const e = activo();
  const k = S.lado;
  const c = calcular();
  const { f, filas, total, lo } = lineas(e, k);
  const vacio = !(f.kwh > 0);
  const grupos = [];
  for (const x of filas) {
    let g = grupos.find((y) => y.n === x.grupo);
    if (!g) grupos.push((g = { n: x.grupo, f: [] }));
    g.f.push(x);
  }
  const partes = [
    { n: 'Potencia', v: f.potNeta, c: '#f5a400' },
    { n: 'Energía', v: f.enNeta, c: '#ffd36b' },
    { n: 'Servicios y otros', v: f.servNeto + f.otrosTotal + f.alq, c: '#c9ccd3' },
    { n: 'Impuestos', v: f.iee + f.iva, c: '#6e7380' },
  ];
  el.innerHTML = `
  <header class="tit"><div><small>Toca cada concepto</small><h1>Factura</h1></div></header>
  <div class="seg grande"><button data-a="lado" data-v="actual" class="${k === 'actual' ? 'on' : ''}">Lo que pagas hoy</button><button data-a="lado" data-v="propuesta" class="${k === 'propuesta' ? 'on' : ''}">La oferta</button></div>
  ${vacio ? '<div class="tarjeta vacia"><b>Aún no hay datos</b><p>Rellena el simulador y aquí verás tu factura explicada.</p><button class="btn" data-a="tab" data-v="simular">Ir a Simular</button></div>' : `
  ${c.err ? `<div class="pista-fina">${esc(c.err)} Se muestra con lo que hay.</div>` : ''}
  <article class="factura">
    <div class="f-cab"><div><small>${esc(S.nombre) || (k === 'actual' ? 'Tu factura actual' : 'Con la oferta')}</small><b>${f.dias} días · ${e.cliente.tarifa}</b></div><span class="sello">${S.modo === 'simple' ? 'Simulada' : 'Calculada'}</span></div>
    <div class="f-tot"><small>Total a pagar</small><b>${eur(total.imp)}</b></div>
    ${apilada(partes)}
    <p class="pista-toque">${IC.sig} Toca cualquier línea para ver qué es y cómo se calcula</p>
    ${grupos.map((g) => `<div class="f-grupo"><h3>${g.n}</h3>${g.f.map((x) => `<button class="f-fila ${x.apagada ? 'apagada' : ''}" data-a="concepto" data-v="${esc(x.id)}"><span>${esc(x.nombre)}<small>${esc(x.sub)}</small></span><b class="${x.imp < 0 ? 'neg' : ''}">${sgn(x.imp)}</b>${IC.sig}</button>`).join('')}</div>`).join('')}
    <button class="f-fila f-total" data-a="concepto" data-v="tot"><span>Total a pagar</span><b>${eur(total.imp)}</b>${IC.sig}</button>
  </article>
  <button class="btn grande" data-a="descargar">${IC.pdf} Descargar informe</button>`}`;
}

export function hojaConcepto(id) {
  const e = activo(), k = S.lado;
  const { filas, total } = lineas(e, k);
  const x = id === 'tot' ? total : filas.find((y) => y.id === id);
  if (!x) return '';
  let comp = '';
  if (x.otro != null) {
    // positivo = la oferta cuesta menos que lo de hoy
    const ahorro = k === 'actual' ? x.imp - x.otro : x.otro - x.imp;
    const txt = Math.abs(ahorro) < 0.005 ? 'Igual en las dos' : `La oferta cuesta ${n(Math.abs(ahorro), 2)} € ${ahorro > 0 ? 'menos' : 'más'}`;
    comp = `<div class="comp"><small>${k === 'actual' ? 'Con la oferta' : 'Hoy'}</small><b>${sgn(x.otro)}</b><em class="${Math.abs(ahorro) < 0.005 ? '' : ahorro > 0 ? 'ok' : 'mal'}">${txt}</em></div>`;
  }
  return `
  <div class="hoja-cab"><small>${esc(x.grupo || 'Resumen')}</small><h2>${esc(x.nombre)}</h2><p class="gran-imp ${x.imp < 0 ? 'neg' : ''}">${sgn(x.imp)}</p></div>
  <p class="que">${esc(x.que)}</p>
  ${x.calc && x.calc.length ? `<div class="calc"><h4>Cómo sale</h4>${x.calc.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>` : ''}
  ${comp}
  ${x.tip ? `<div class="tipbox"><b>Consejo</b><p>${esc(x.tip)}</p></div>` : ''}`;
}

export function accionesFactura(a, v, el) {
  if (a === 'lado') { S.lado = v; guardar(); vistaFactura(el); return true; }
  return false;
}
