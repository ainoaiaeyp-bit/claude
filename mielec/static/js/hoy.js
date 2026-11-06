import { esc, n, eur, IC } from './util.js';
import { S, guardar, racha } from './estado.js';
import { datosHoy, datosDiario, valorRef } from './datos.js';
import { barrasHoras } from './graficos.js';

let dia = 'hoy';

const ahora = () => new Date().getHours();
const hh = (h) => String(h).padStart(2, '0') + ':00';

export async function vistaHoy(el) {
  el.innerHTML = `<header class="tit"><div><small>${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>Hoy</h1></div></header><div class="cargando"><i></i>Consultando Red Eléctrica…</div>`;
  let h, d;
  try {
    [h, d] = await Promise.all([datosHoy(), datosDiario(14)]);
  } catch {
    el.innerHTML += '';
    el.querySelector('.cargando').outerHTML = `<div class="tarjeta aviso-t"><b>No se pueden leer los precios ahora mismo.</b><p>Comprueba tu conexión e inténtalo de nuevo en un minuto.</p><button class="btn" data-a="recargar">Reintentar</button></div>`;
    return;
  }
  pintar(el, h, d);
}

function pintar(el, h, d) {
  const claves = Object.keys(h.dias).sort();
  const hoyK = claves[0], manK = claves[1];
  if (dia === 'man' && !manK) dia = 'hoy';
  const k = dia === 'man' ? manK : hoyK;
  const horas = h.dias[k].map((x) => ({ h: x.h, v: valorRef(x, S.ref) })).filter((x) => x.v != null);
  const precio = parseFloat(String(S.precio).replace(',', '.')) || 0;
  const hActual = ahora();
  const act = dia === 'hoy' ? horas.find((x) => x.h === hActual) : null;
  const vs = horas.map((x) => x.v);
  const med = vs.reduce((s, v) => s + v, 0) / vs.length;
  const mn = horas.reduce((a, b) => (b.v < a.v ? b : a));
  const mx = horas.reduce((a, b) => (b.v > a.v ? b : a));
  const sorted = [...vs].sort((a, b) => a - b);
  const nivel = (v) => (v <= sorted[Math.floor(sorted.length / 3)] ? ['barata', 'Barata'] : v <= sorted[Math.floor((sorted.length * 2) / 3)] ? ['media', 'Normal'] : ['cara', 'Cara']);

  // mejor franja de 3 horas seguidas
  let mejor = null;
  for (let i = 0; i + 2 < horas.length; i++) {
    const m = (horas[i].v + horas[i + 1].v + horas[i + 2].v) / 3;
    if (!mejor || m < mejor.m) mejor = { h: horas[i].h, m };
  }

  const principal = act || { v: med };
  const [nc, nt] = nivel(principal.v);
  let vsTuyo = '';
  if (precio > 0) {
    const dif = (principal.v - precio) / precio * 100;
    vsTuyo = dif <= 0
      ? `<span class="chip ok">${n(Math.abs(dif), 0)} % por debajo de tu precio</span>`
      : `<span class="chip mal">${n(dif, 0)} % por encima de tu precio</span>`;
  }

  const r = racha(d.dias, precio, S.ref);
  const alerta = precio > 0 && r.dias >= S.dias;
  const banner = alerta
    ? `<button class="tarjeta banner" data-a="tab" data-v="alertas"><span class="ico">${IC.bajo}</span><span><b>Llevas ${r.dias} días por debajo de tu precio</b><small>REE ha costado de media ${n(r.media, 3)} €/kWh. Puede que te salga mejor otra tarifa.</small></span>${IC.sig}</button>`
    : precio > 0
      ? `<button class="tarjeta banner suave" data-a="tab" data-v="alertas"><span class="ico">${IC.ale}</span><span><b>${r.dias ? `${r.dias} día${r.dias > 1 ? 's' : ''} seguido${r.dias > 1 ? 's' : ''} por debajo de tu precio` : 'Hoy no baja de tu precio'}</b><small>Te aviso al llegar a ${S.dias} días seguidos.</small></span>${IC.sig}</button>`
      : `<button class="tarjeta banner suave" data-a="tab" data-v="alertas"><span class="ico">${IC.ale}</span><span><b>Dime cuánto pagas tú por kWh</b><small>Así te aviso cuando el precio de REE baje del tuyo.</small></span>${IC.sig}</button>`;

  el.innerHTML = `
  ${cabecera(h.demo)}
  ${banner}
  <section class="tarjeta hero ${nc}">
    <div class="seg peq"><button data-a="ref" data-v="pvpc" class="${S.ref === 'pvpc' ? 'on' : ''}">Luz regulada (PVPC)</button><button data-a="ref" data-v="spot" class="${S.ref === 'spot' ? 'on' : ''}">Mayorista</button></div>
    <p class="et">${act ? `Ahora · ${hh(hActual)}` : dia === 'man' ? 'Media de mañana' : 'Media de hoy'}</p>
    <p class="gran"><b data-v="${principal.v}">${n(principal.v, 3)}</b><span> €/kWh</span></p>
    <div class="marcador" aria-hidden="true"><i style="left:${Math.max(3, Math.min(97, (principal.v - mn.v) / ((mx.v - mn.v) || 1) * 100)).toFixed(0)}%"></i></div>
    <div class="m-ext"><span>${hh(mn.h)} · ${n(mn.v, 3)}</span><span>${n(mx.v, 3)} · ${hh(mx.h)}</span></div>
    <div class="fila-chips"><span class="chip niv ${nc}">${nt}</span>${vsTuyo}</div>
  </section>
  <section class="tarjeta">
    <div class="cab-t"><h2>Precio por horas</h2>
      <div class="seg peq"><button data-a="dia" data-v="hoy" class="${dia === 'hoy' ? 'on' : ''}">Hoy</button><button data-a="dia" data-v="man" ${manK ? '' : 'disabled'} class="${dia === 'man' ? 'on' : ''}">Mañana</button></div></div>
    ${barrasHoras(horas, { linea: precio || null, ahora: act ? hActual : -1 })}
    <div class="leyenda"><span><b class="lo"></b>Barata</span><span><b class="mid"></b>Normal</span><span><b class="hi"></b>Cara</span></div>
    ${!manK && dia === 'hoy' ? '<p class="nota">El precio de mañana se publica sobre las 20:15.</p>' : ''}
  </section>
  <section class="rejilla">
    <div class="tarjeta dato"><small>Mejor momento</small><b>${hh(mejor.h)}–${hh((mejor.h + 3) % 24)}</b><em>${n(mejor.m, 3)} €/kWh</em><p>Lavadora, horno, coche eléctrico…</p></div>
    <div class="tarjeta dato"><small>Evita</small><b>${hh(mx.h)}</b><em>${n(mx.v, 3)} €/kWh</em><p>La hora más cara del día.</p></div>
    <div class="tarjeta dato"><small>Media del día</small><b>${n(med, 3)}</b><em>€/kWh</em><p>Mínimo ${n(mn.v, 3)} a las ${hh(mn.h)}.</p></div>
    <div class="tarjeta dato"><small>Diferencia</small><b>${n(mx.v / mn.v, 1)}×</b><em>entre hora cara y barata</em><p>Mover consumos ahorra.</p></div>
  </section>
  <button class="btn grande" data-a="tab" data-v="simular">${IC.sim} Comparar mi factura con una oferta</button>
  <p class="fuente">Fuente: Red Eléctrica (REE). ${S.ref === 'spot' ? 'El precio mayorista es solo el coste de la energía, sin peajes ni cargos.' : 'El PVPC es el término de energía de la tarifa regulada 2.0TD.'}</p>`;
  el._ctx = { h, d };
  contar(el.querySelector('.gran b'));
}

function cabecera(demo) {
  const hr = new Date().getHours();
  const saludo = hr < 6 ? 'Buenas noches' : hr < 14 ? 'Buenos días' : hr < 21 ? 'Buenas tardes' : 'Buenas noches';
  return `<header class="cab-app"><div class="marca"><span class="logo">${IC.panal}</span><b>Mielec</b></div>${demo ? '<span class="chip demo">Datos de ejemplo</span>' : '<span class="chip vivo"><i></i>En directo</span>'}</header>
  <div class="saludo"><small>${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>${saludo}</h1></div>`;
}

// el precio "sube" hasta su valor al abrir la pantalla
function contar(b) {
  if (!b || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fin = parseFloat(b.dataset.v), t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
    b.textContent = n(fin * e, 3);
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

export function accionesHoy(a, v, el) {
  if (a === 'dia') { dia = v; pintar(el, el._ctx.h, el._ctx.d); return true; }
  if (a === 'ref') { S.ref = v; guardar(); pintar(el, el._ctx.h, el._ctx.d); return true; }
  return false;
}
