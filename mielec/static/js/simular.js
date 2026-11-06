import { esc, n, eur, IC, getP, aviso } from './util.js';
import { S, guardar, calcular } from './estado.js';
import { TARIFAS, gruposPorDefecto, nuevoId, num } from './calculo.js';
import { datosDiario } from './datos.js';
import { generarInforme } from './informe.js';

S.fl = S.fl || 'actual';
S.abiertas = S.abiertas || { cons: true, lado: true };

// ---------- piezas ----------
const val = (p) => esc(getP(S, p) ?? '');
const inp = (p, ph = '', cls = '') => `<input class="in ${cls}" inputmode="decimal" autocomplete="off" data-p="${p}" value="${val(p)}" placeholder="${ph}">`;
const fila = (l, ctl, sub = '', ic = '', c = 'a') => `<label class="fila">${ic ? `<i class="ri ${c}">${ic}</i>` : ''}<span>${l}${sub ? `<small>${sub}</small>` : ''}</span>${ctl}</label>`;
const sel = (p, ops) => `<select class="in sel" data-p="${p}">${ops.map(([v, t]) => `<option value="${v}" ${String(getP(S, p)) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
const seg = (p, ops, extra = '') => `<div class="seg ${extra}">${ops.map(([v, t]) => `<button data-a="set" data-p="${p}" data-v="${v}" class="${String(getP(S, p)) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
const inter = (p, on) => `<button class="inter ${on ? 'on' : ''}" data-a="inter" data-p="${p}" role="switch" aria-checked="${!!on}"><i></i></button>`;
const grupo = (id, titulo, cuerpo, resumen = '') => `<details class="tarjeta grupo" data-id="${id}" ${S.abiertas[id] ? 'open' : ''}><summary><span>${titulo}${resumen ? `<small>${resumen}</small>` : ''}</span>${IC.sig}</summary><div class="lista">${cuerpo}</div></details>`;

const U_POT = [['dia', '€/kW·día'], ['mes', '€/kW·mes'], ['anio', '€/kW·año']];
const U_EN = [['eur', '€/kWh'], ['cent', 'cént./kWh'], ['mwh', '€/MWh']];

// ---------- vista ----------
export function vistaSimular(el) {
  el.innerHTML = `
  <header class="tit"><div><small>Compara y descarga</small><h1>Simular</h1></div><span class="logo sm">${IC.panal}</span></header>
  <div class="seg grande" role="tablist"><button data-a="modo" data-v="simple" class="${S.modo === 'simple' ? 'on' : ''}">Simple</button><button data-a="modo" data-v="completo" class="${S.modo === 'completo' ? 'on' : ''}">Completo</button></div>
  <p class="sub centro">${S.modo === 'simple' ? 'Cuatro datos de tu factura y listo.' : 'Tarifas, periodos, servicios, descuentos y permanencia.'}</p>
  ${!S.tocado ? '<div class="pista-fina">Son valores de ejemplo: cámbialos por los de tu factura.</div>' : ''}
  <div id="form">${S.modo === 'simple' ? formSimple() : formCompleto()}</div>
  <div class="espacio-barra"></div>
  <div id="barra" class="barra-desc"></div>`;
  barra();
}

function formSimple() {
  const s = S.simple;
  return `
  <section class="tarjeta"><h2>Tu consumo</h2><div class="lista">
    ${fila('Consumo al mes', `<div class="unid">${inp('simple.kwh', '250')}<em>kWh</em></div>`, 'Mira “Consumo” en tu factura', IC.hoy, 'a')}
    ${fila('Potencia contratada', `<div class="unid">${inp('simple.kw', '4,6')}<em>kW</em></div>`, 'Suele ser 3,45 · 4,6 · 5,75', IC.medidor, 'b')}
  </div></section>
  <section class="tarjeta"><h2>Lo que pagas hoy</h2><div class="lista">
    ${fila('Precio de la energía', `<div class="unid">${inp('simple.mio', '0,145')}<em>€/kWh</em></div>`, '', IC.euro, 'c')}
    ${fila('Precio de la potencia', `<div class="unid">${inp('simple.pot', '0,08')}<em>€/kW·día</em></div>`, '', IC.etiqueta, 'd')}
  </div></section>
  <section class="tarjeta"><h2>La oferta</h2><div class="lista">
    ${fila('Precio de la energía', `<div class="unid">${inp('simple.oferta', '0,115')}<em>€/kWh</em></div>`, '', IC.euro, 'c')}
    <div class="fila"><span>Usar el precio medio de REE<small>PVPC de los últimos 14 días</small></span><button class="btn peq claro" data-a="usar-ree">Usar</button></div>
    <div class="fila"><span>Otro precio de potencia</span>${inter('simple.otraPot', s.otraPot)}</div>
    ${s.otraPot ? fila('Potencia de la oferta', `<div class="unid">${inp('simple.potO', '0,08')}<em>€/kW·día</em></div>`) : ''}
  </div></section>
  ${fila0()}`;
}
const fila0 = () => `<section class="tarjeta"><div class="lista">${fila('Nombre para el informe', `<input class="in txt" data-p="nombre" value="${esc(S.nombre)}" placeholder="Opcional" autocomplete="name">`, '', IC.persona, 'e')}</div></section>`;

function formCompleto() {
  const e = S.e, cl = e.cliente, t = TARIFAS[cl.tarifa];
  const per = (arr, base, nn, nombres, ph) => Array.from({ length: nn }, (_, i) => fila(nombres[i], `<input class="in corto" inputmode="decimal" data-p="${base}.${i}" value="${esc(arr[i] ?? '')}" placeholder="${ph}">`)).join('');
  const consumo = `
    <div class="fila"><span>Tarifa de acceso<small>${t.desc}</small></span>${seg('e.cliente.tarifa', [['2.0TD', '2.0'], ['3.0TD', '3.0'], ['6.1TD', '6.1']], 'peq').replace(/data-a="set"/g, 'data-a="tarifa"')}</div>
    ${fila('Días de la factura', inp('e.cliente.dias', '30', 'corto'))}
    <div class="sep">Consumo del periodo (kWh)</div>
    ${per(cl.consumo, 'e.cliente.consumo', t.nEn, t.en, '0')}
    <div class="sep">Potencia contratada (kW)</div>
    ${per(e.actual.potencia.contratada, 'e.actual.potencia.contratada', t.nPot, t.pot, '4,6')}
    ${fila('Meses a comparar', sel('e.horizonte', [[12, '12 meses'], [24, '24 meses'], [36, '36 meses'], [48, '48 meses']]))}
    ${fila('Nombre para el informe', `<input class="in txt" data-p="nombre" value="${esc(S.nombre)}" placeholder="Opcional" autocomplete="name">`)}`;
  const lado = S.fl;
  const otros = `
    ${fila('Alquiler del contador', `<div class="unid">${inp('e.cliente.alquiler.importe', '0,81', 'corto')}${sel('e.cliente.alquiler.unidad', [['mes', '€/mes'], ['dia', '€/día'], ['anio', '€/año']])}</div>`, 'Igual en las dos facturas')}
    ${fila('IVA', `<div class="unid">${inp('e.fiscal.iva', '21', 'corto')}<em>%</em></div>`)}
    ${fila('Impuesto eléctrico', `<div class="unid">${inp('e.fiscal.iee', '5,11', 'corto')}<em>%</em></div>`)}
    <div class="fila"><span>Restar la penalización de salida</span>${inter('e.incluirPenalizacion', e.incluirPenalizacion)}</div>`;
  return `
  ${grupo('cons', 'Consumo y tarifa', consumo, `${cl.tarifa} · ${cl.dias} días`)}
  <div class="seg grande lado"><button data-a="fl" data-v="actual" class="${lado === 'actual' ? 'on' : ''}">Lo que pagas hoy</button><button data-a="fl" data-v="propuesta" class="${lado === 'propuesta' ? 'on' : ''}">La oferta</button></div>
  ${formLado(lado)}
  ${grupo('otros', 'Otros ajustes', otros, 'Contador, impuestos, penalización')}`;
}

function formLado(k) {
  const e = S.e, L = e[k], t = TARIFAS[e.cliente.tarifa], b = `e.${k}`;
  const porPeriodos = L.energia.nPrecios > 1;
  const pot = `
    ${fila('Unidad', sel(`${b}.potencia.unidad`, U_POT))}
    <div class="fila"><span>Mismo precio en todos los periodos</span>${inter(`${b}.potencia.unico`, L.potencia.unico)}</div>
    ${L.potencia.unico ? fila('Precio', inp(`${b}.potencia.precios.0`, '0,08', 'corto')) : Array.from({ length: t.nPot }, (_, i) => fila(t.pot[i], inp(`${b}.potencia.precios.${i}`, '0,08', 'corto'))).join('')}`;
  const ener = `
    ${fila('Unidad', sel(`${b}.energia.unidad`, U_EN))}
    <div class="fila"><span>Precios</span><div class="seg peq"><button data-a="npre" data-k="${k}" data-v="1" class="${!porPeriodos ? 'on' : ''}">Uno solo</button><button data-a="npre" data-k="${k}" data-v="n" class="${porPeriodos ? 'on' : ''}">Por periodo</button></div></div>
    ${porPeriodos ? Array.from({ length: t.nEn }, (_, i) => fila(t.en[i], inp(`${b}.energia.precios.${i}`, '0,12', 'corto'))).join('') : fila('Precio', inp(`${b}.energia.precios.0`, '0,12', 'corto'))}`;
  const serv = L.servicios.map((s, i) => `
    <div class="subtarjeta"><div class="cab-sub"><b>${esc(s.nombre) || 'Servicio'}</b><button class="mini" data-a="del-serv" data-k="${k}" data-i="${i}" aria-label="Quitar">${IC.x}</button></div>
    ${fila('Nombre', `<input class="in txt" data-p="${b}.servicios.${i}.nombre" value="${esc(s.nombre)}" placeholder="Mantenimiento">`)}
    ${fila('Importe', `<div class="unid">${inp(`${b}.servicios.${i}.importe`, '5', 'corto')}${sel(`${b}.servicios.${i}.unidad`, [['mes', '€/mes'], ['anio', '€/año'], ['dia', '€/día'], ['unico', 'pago único']])}</div>`)}
    ${fila('Duración', `<div class="unid">${inp(`${b}.servicios.${i}.meses`, 'siempre', 'corto')}<em>meses</em></div>`)}</div>`).join('');
  const desc = L.descuentos.map((d, i) => `
    <div class="subtarjeta"><div class="cab-sub"><b>${esc(d.nombre) || 'Descuento'}</b><button class="mini" data-a="del-desc" data-k="${k}" data-i="${i}" aria-label="Quitar">${IC.x}</button></div>
    ${fila('Nombre', `<input class="in txt" data-p="${b}.descuentos.${i}.nombre" value="${esc(d.nombre)}" placeholder="Descuento bienvenida">`)}
    ${fila('Valor', `<div class="unid">${inp(`${b}.descuentos.${i}.valor`, '10', 'corto')}${sel(`${b}.descuentos.${i}.tipo`, [['pct', '%'], ['eur', '€/mes'], ['unico', '€ una vez']])}</div>`)}
    ${fila('Se aplica a', sel(`${b}.descuentos.${i}.aplica`, [['electricidad', 'Potencia + energía'], ['energia', 'Solo energía'], ['potencia', 'Solo potencia'], ['total', 'Toda la factura']]))}
    ${fila('Desde el mes', inp(`${b}.descuentos.${i}.desde`, '1', 'corto'))}
    ${fila('Durante', `<div class="unid">${inp(`${b}.descuentos.${i}.meses`, 'siempre', 'corto')}<em>meses</em></div>`)}</div>`).join('');
  const perm = `
    ${fila('Permanencia', `<div class="unid">${inp(`${b}.permanencia.meses`, '0', 'corto')}<em>meses</em></div>`)}
    ${fila('Penalización por salir', `<div class="unid">${inp(`${b}.permanencia.penalizacion`, '0', 'corto')}<em>€</em></div>`)}`;
  return `
  ${grupo(`pot-${k}`, 'Precio de la potencia', pot)}
  ${grupo(`ene-${k}`, 'Precio de la energía', ener)}
  ${grupo(`ser-${k}`, 'Servicios', `${serv}<button class="btn peq claro anadir" data-a="add-serv" data-k="${k}">${IC.mas} Añadir servicio</button>`, L.servicios.length ? `${L.servicios.length} añadido${L.servicios.length > 1 ? 's' : ''}` : 'Ninguno')}
  ${grupo(`des-${k}`, 'Descuentos', `${desc}<button class="btn peq claro anadir" data-a="add-desc" data-k="${k}">${IC.mas} Añadir descuento</button>`, L.descuentos.length ? `${L.descuentos.length} añadido${L.descuentos.length > 1 ? 's' : ''}` : 'Ninguno')}
  ${grupo(`per-${k}`, 'Permanencia', perm, num(L.permanencia.meses) > 0 ? `${L.permanencia.meses} meses` : 'Sin permanencia')}`;
}

// ---------- barra inferior con el botón de descarga ----------
export function barra() {
  const b = document.getElementById('barra');
  if (!b) return;
  const c = calcular();
  if (c.err) {
    b.innerHTML = `<div class="b-txt err"><small>Falta algo</small><b>${esc(c.err)}</b></div><button class="btn" disabled>${IC.pdf} Informe</button>`;
    return;
  }
  const a = c.r.ahorro;
  b.innerHTML = `<div class="b-txt ${a >= 0 ? 'ok' : 'mal'}"><small>${a >= 0 ? 'Ahorrarías' : 'Pagarías de más'} en ${c.r.H} meses</small><b>${eur(Math.abs(a), 0)}</b></div><button class="btn" data-a="descargar">${IC.pdf} Descargar informe</button>`;
}

// ---------- acciones ----------
export function accionesSimular(a, v, el, ev) {
  const d = ev.target.closest('[data-a]');
  const k = d && d.dataset.k, i = d && +d.dataset.i;
  const L = k && S.e[k];
  switch (a) {
    case 'modo': S.modo = v; guardar(); vistaSimular(el); return true;
    case 'fl': S.fl = v; guardar(); vistaSimular(el); return true;
    case 'tarifa': {
      S.e.cliente.tarifa = v;
      for (const x of ['actual', 'propuesta']) {
        const m = TARIFAS[v].nEn;
        const ya = S.e[x].energia.nPrecios > 1;
        S.e[x].energia.nPrecios = ya ? m : 1;
        S.e[x].energia.grupos = gruposPorDefecto(v, ya ? m : 1);
      }
      S.tocado = true; guardar(); vistaSimular(el); return true;
    }
    case 'npre': {
      const m = TARIFAS[S.e.cliente.tarifa].nEn;
      L.energia.nPrecios = v === '1' ? 1 : m;
      L.energia.grupos = gruposPorDefecto(S.e.cliente.tarifa, L.energia.nPrecios);
      guardar(); vistaSimular(el); return true;
    }
    case 'add-serv': L.servicios.push({ id: nuevoId(), nombre: '', importe: '', unidad: 'mes', meses: '', iva: true }); S.abiertas[`ser-${k}`] = true; guardar(); vistaSimular(el); return true;
    case 'del-serv': L.servicios.splice(i, 1); guardar(); vistaSimular(el); return true;
    case 'add-desc': L.descuentos.push({ id: nuevoId(), nombre: '', tipo: 'pct', valor: '', aplica: 'electricidad', requiere: '', desde: '1', meses: '' }); S.abiertas[`des-${k}`] = true; guardar(); vistaSimular(el); return true;
    case 'del-desc': L.descuentos.splice(i, 1); guardar(); vistaSimular(el); return true;
    case 'usar-ree': usarREE(el); return true;
    case 'descargar': generarInforme(d); return true;
  }
  return false;
}

async function usarREE(el) {
  try {
    const d = await datosDiario(14);
    const v = d.dias.map((x) => x.pvpc).filter((x) => x != null);
    if (!v.length) throw new Error('sin datos');
    S.simple.oferta = (v.reduce((s, x) => s + x, 0) / v.length).toFixed(4).replace('.', ',');
    S.tocado = true; guardar(); vistaSimular(el);
    aviso(`Precio medio de REE: ${S.simple.oferta.slice(0, 5)} €/kWh${d.demo ? ' (datos de ejemplo)' : ''}`);
  } catch { aviso('No se pudo leer REE ahora mismo.', true); }
}
