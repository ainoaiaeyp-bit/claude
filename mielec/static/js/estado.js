import { estadoVacio, num, comparar, facturar, TARIFAS } from './calculo.js';
import { store } from './util.js';

const CLAVE = 'mielec.v1';

function ejemploCompleto() {
  const e = estadoVacio();
  e.cliente.dias = 30;
  e.cliente.consumo = ['80', '70', '100', '', '', ''];
  e.cliente.alquiler = { importe: '0.81', unidad: 'mes' };
  e.horizonte = 12;
  const a = e.actual;
  a.potencia.contratada = ['4.6', '4.6', '', '', '', ''];
  a.potencia.precios = ['0.08', '0.08', '', '', '', ''];
  a.energia.nPrecios = 1; a.energia.grupos = [0, 0, 0, 0, 0, 0]; a.energia.precios = ['0.145', '', '', '', '', ''];
  const p = e.propuesta;
  p.potencia.contratada = ['4.6', '4.6', '', '', '', ''];
  p.potencia.precios = ['0.075', '0.075', '', '', '', ''];
  p.energia.nPrecios = 3; p.energia.grupos = [0, 1, 2, 0, 0, 0]; p.energia.precios = ['0.15', '0.12', '0.08', '', '', ''];
  return e;
}

function nuevo() {
  return {
    modo: 'simple', tab: 'hoy', lado: 'actual', nombre: '', tocado: false,
    precio: '', ref: 'pvpc', dias: 3, avisos: false, ultAviso: '',
    simple: { kwh: '250', kw: '4,6', pot: '0,08', mio: '0,145', oferta: '0,115', otraPot: false, potO: '' },
    e: ejemploCompleto(),
  };
}

const guardado = store.get(CLAVE, null);
export const S = guardado && guardado.simple && guardado.e ? { ...nuevo(), ...guardado } : nuevo();
export const guardar = () => store.set(CLAVE, S);

// El modo simple se traduce al mismo motor que el completo: 2.0TD, 30 días, un único precio de energía.
export function estadoSimple(s, nombre = '') {
  const e = estadoVacio();
  const k = num(s.kwh);
  e.cliente.nombre = nombre;
  e.cliente.dias = 30;
  e.cliente.consumo = [+(k * 0.3).toFixed(2), +(k * 0.3).toFixed(2), +(k * 0.4).toFixed(2), '', '', ''];
  e.cliente.alquiler = { importe: '0.81', unidad: 'mes' };
  e.horizonte = 12;
  const lados = [['actual', s.mio, s.pot], ['propuesta', s.oferta, s.otraPot && s.potO !== '' ? s.potO : s.pot]];
  for (const [lado, pe, pp] of lados) {
    const L = e[lado];
    L.potencia.contratada = [s.kw, s.kw, '', '', '', ''];
    L.potencia.unico = true; L.potencia.precios = [pp, '', '', '', '', ''];
    L.energia.nPrecios = 1; L.energia.grupos = [0, 0, 0, 0, 0, 0]; L.energia.precios = [pe, '', '', '', '', ''];
  }
  return e;
}

export const activo = () => {
  if (S.modo === 'simple') return estadoSimple(S.simple, S.nombre);
  S.e.cliente.nombre = S.nombre;
  return S.e;
};

// Devuelve {err} si falta algún precio (un precio vacío contaría como 0 y falsearía la comparación)
export function calcular() {
  try {
    const e = activo();
    for (const [k, nom] of [['actual', 'tu factura de hoy'], ['propuesta', 'la oferta']]) {
      const f = facturar(e, e[k]);
      if (!f.pot.some((x) => x.kw > 0)) return { err: 'Falta la potencia contratada (kW).' };
      if (f.pot.some((x) => x.kw > 0 && !(x.precio > 0))) return { err: `Falta el precio de la potencia en ${nom}.` };
      if (!(f.kwh > 0)) return { err: 'Falta el consumo (kWh).' };
      if (f.en.some((x) => x.kwh > 0 && !(x.precio > 0))) return { err: `Falta el precio de la energía en ${nom}.` };
    }
    return { e, r: comparar(e) };
  } catch (x) {
    return { err: 'No se ha podido calcular con estos datos.' };
  }
}

// kWh al mes de la simulación activa (para estimar ahorros en las alertas)
export function kwhMes() {
  const e = activo();
  const t = TARIFAS[e.cliente.tarifa];
  const total = e.cliente.consumo.slice(0, t.nEn).reduce((s, v) => s + num(v), 0);
  return total * 30.4 / Math.max(1, num(e.cliente.dias));
}

// Racha de días recientes con la media diaria de REE por debajo del precio del usuario
export function racha(dias, precio, ref) {
  const v = (d) => (ref === 'spot' ? d.spot : d.pvpc);
  const ok = dias.filter((d) => v(d) != null).sort((a, b) => a.fecha.localeCompare(b.fecha));
  let n = 0;
  for (let i = ok.length - 1; i >= 0; i--) {
    if (v(ok[i]) < precio) n++; else break;
  }
  const ult = ok.slice(ok.length - n);
  const media = n ? ult.reduce((s, d) => s + v(d), 0) / n : null;
  return { dias: n, media, ok };
}
