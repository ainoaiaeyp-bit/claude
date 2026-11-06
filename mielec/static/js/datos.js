import { api } from './util.js';

// Datos de REE (los pide el servidor de Mielec). Se guardan en memoria unos minutos.
const cache = {};
async function pedir(clave, url, ttl = 600000) {
  const c = cache[clave];
  if (c && Date.now() - c.t < ttl) return c.v;
  const v = await api(url);
  cache[clave] = { t: Date.now(), v };
  return v;
}
export const datosHoy = () => pedir('hoy', '/api/ree/hoy');
export const datosDiario = (n = 14) => pedir('dia' + n, '/api/ree/diario?dias=' + n);
export const valorRef = (x, ref) => (ref === 'spot' ? x.spot : x.pvpc);
