import { esc, n, eur, IC, aviso } from './util.js';
import { S, guardar, racha, kwhMes } from './estado.js';
import { datosDiario, valorRef } from './datos.js';
import { lineaDias } from './graficos.js';

const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;
const esiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

export async function vistaAlertas(el) {
  el.innerHTML = '<header class="tit"><div><small>Tus avisos</small><h1>Alertas</h1></div></header><div class="cargando"><i></i>Cargando…</div>';
  let d;
  try { d = await datosDiario(14); } catch { d = null; }
  pintar(el, d);
}

export function estadoAlerta(d) {
  const precio = num(S.precio);
  if (!d || !(precio > 0)) return null;
  const r = racha(d.dias, precio, S.ref);
  const ahorroMes = r.dias ? Math.max(0, (precio - r.media) * kwhMes()) : 0;
  return { precio, ...r, activa: r.dias >= S.dias, ahorroMes };
}

function pintar(el, d) {
  const a = estadoAlerta(d);
  const dias = d ? d.dias.filter((x) => valorRef(x, S.ref) != null) : [];
  const precio = num(S.precio);
  let estado = '';
  if (!d) estado = '<div class="tarjeta aviso-t"><b>No se pueden leer los precios de REE ahora.</b><p>Prueba de nuevo en un minuto.</p></div>';
  else if (!a) estado = '<div class="tarjeta vacia"><span class="ico">' + IC.ale + '</span><b>Pon tu precio y yo vigilo</b><p>Escribe lo que pagas por kWh y te aviso cuando REE lleve varios días por debajo.</p></div>';
  else if (a.activa) estado = `<div class="tarjeta estado alerta"><span class="ico">${IC.bajo}</span><div><b>REE lleva ${a.dias} días por debajo de tu precio</b><p>Media de estos días: ${n(a.media, 3)} €/kWh frente a tus ${n(a.precio, 3)}. Con tu consumo serían unos <b>${eur(a.ahorroMes, 0)} al mes</b> menos en energía.</p><button class="btn peq" data-a="tab" data-v="simular">Comparar con una oferta</button></div></div>`;
  else estado = `<div class="tarjeta estado ok"><span class="ico">${IC.ok}</span><div><b>${a.dias ? `${a.dias} día${a.dias > 1 ? 's' : ''} seguido${a.dias > 1 ? 's' : ''} por debajo de tu precio` : 'Ahora mismo, sin novedades'}</b><p>${a.dias ? `Te aviso si llega a ${S.dias} días seguidos.` : `REE no está por debajo de tu precio. Te aviso cuando lleve ${S.dias} días seguidos.`}</p></div></div>`;

  const lista = dias.slice(-7).reverse().map((x) => {
    const v = valorRef(x, S.ref);
    const bajo = precio > 0 && v < precio;
    const f = new Date(x.fecha + 'T12:00');
    return `<li><span>${f.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span><b>${n(v, 3)} €/kWh</b>${precio > 0 ? `<i class="${bajo ? 'ok' : 'mal'}">${bajo ? 'Por debajo' : 'Por encima'}</i>` : ''}</li>`;
  }).join('');

  el.innerHTML = `
  <header class="tit"><div><small>Tus avisos</small><h1>Alertas</h1></div>${d && d.demo ? '<span class="chip demo">Datos de ejemplo</span>' : ''}</header>
  ${estado}
  <section class="tarjeta">
    <div class="lista">
      <label class="fila"><span>Tu precio de energía<small>€/kWh sin impuestos, de tu factura</small></span><input class="in" data-a="precio" inputmode="decimal" placeholder="0,145" value="${esc(S.precio)}"></label>
      <div class="fila"><span>Avisarme tras<small>días seguidos por debajo</small></span><div class="paso"><button data-a="dias" data-v="-1" aria-label="Menos">−</button><b>${S.dias}</b><button data-a="dias" data-v="1" aria-label="Más">+</button></div></div>
      <div class="fila"><span>Comparar con<small>${S.ref === 'pvpc' ? 'Luz regulada: lo que paga un hogar en PVPC' : 'Mercado mayorista: solo la energía'}</small></span><div class="seg peq"><button data-a="refA" data-v="pvpc" class="${S.ref === 'pvpc' ? 'on' : ''}">PVPC</button><button data-a="refA" data-v="spot" class="${S.ref === 'spot' ? 'on' : ''}">Mayorista</button></div></div>
      <div class="fila"><span>Avisos en el móvil<small>${S.avisos ? 'Activados' : 'Te enseño una notificación al abrir Mielec'}</small></span><button class="inter ${S.avisos ? 'on' : ''}" data-a="notif" role="switch" aria-checked="${S.avisos}"><i></i></button></div>
    </div>
  </section>
  ${dias.length > 1 ? `<section class="tarjeta"><h2>Últimos ${dias.length} días</h2><p class="sub">Media diaria · puntos verdes: por debajo de tu precio</p>${lineaDias(dias, (x) => valorRef(x, S.ref), { linea: precio || null })}${lista ? `<ul class="dias">${lista}</ul>` : ''}</section>` : ''}
  ${esiOS && !instalada ? `<section class="tarjeta pista"><b>Ponla en tu iPhone</b><p>En Safari pulsa <span class="k">Compartir</span> y luego <span class="k">Añadir a pantalla de inicio</span>. Se abrirá como una app.</p></section>` : ''}
  <p class="fuente">Los avisos se comprueban cuando abres Mielec. Para recibirlos con la app cerrada hace falta activar el envío push desde el servidor (ver README).</p>`;
  el._d = d;
}

export function accionesAlertas(a, v, el, e) {
  if (a === 'precio') {
    S.precio = e.target.value; guardar();
    return 'input';
  }
  if (a === 'dias') { S.dias = Math.max(2, Math.min(10, S.dias + (+v))); guardar(); pintar(el, el._d); return true; }
  if (a === 'refA') { S.ref = v; guardar(); pintar(el, el._d); return true; }
  if (a === 'notif') { alternarAvisos(el); return true; }
  return false;
}

async function alternarAvisos(el) {
  if (S.avisos) { S.avisos = false; guardar(); pintar(el, el._d); return; }
  if (!('Notification' in window)) { aviso('Este navegador no permite notificaciones.', true); return; }
  const p = await Notification.requestPermission();
  if (p !== 'granted') { aviso('No has dado permiso para las notificaciones.', true); return; }
  S.avisos = true; guardar(); pintar(el, el._d);
  aviso('Avisos activados');
}

// Al abrir la app: si hay racha y hoy no se ha avisado, lanza la notificación local
export async function comprobarAviso() {
  if (!S.avisos || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const d = await datosDiario(14);
    const a = estadoAlerta(d);
    const hoy = new Date().toISOString().slice(0, 10);
    if (a && a.activa && S.ultAviso !== hoy) {
      S.ultAviso = hoy; guardar();
      const txt = `REE lleva ${a.dias} días por debajo de tu precio (${n(a.media, 3)} frente a ${n(a.precio, 3)} €/kWh).`;
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) reg.showNotification('Mielec · baja la luz', { body: txt, icon: '/icono-192.png' });
      else new Notification('Mielec · baja la luz', { body: txt });
    }
  } catch { /* sin conexión: se avisará otro día */ }
}
