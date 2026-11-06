// Estimador de consumo por aparatos. Funciones puras (sin DOM): se prueban con `node prueba.mjs`.
// Los valores del catálogo son típicos y orientativos: el usuario los edita.
import { TARIFAS, num } from './calculo.js';

export const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const FRANJAS = { '24h': ['Todo el día', 0, 24], valle: ['Noche (0 a 8 h)', 0, 8], manana: ['Mañana (8 a 14 h)', 8, 14], tarde: ['Tarde (14 a 18 h)', 14, 18], tardenoche: ['Tarde-noche (18 a 24 h)', 18, 24], dia: ['Horario comercial (9 a 20 h)', 9, 20] };
export const SEMANAS = { todos: 'Todos los días', lv: 'Lunes a viernes', lvs: 'Lunes a sábado' };
export const ESTAC = { todo: 'Todo el año', verano: 'Verano (jun a sep)', invierno: 'Invierno (nov a mar)', calorfrio: 'Verano e invierno' };
const ACTIVO = { todo: () => true, verano: (m) => [5, 6, 7, 8].includes(m), invierno: (m) => [10, 11, 0, 1, 2].includes(m), calorfrio: (m) => [5, 6, 7, 8, 11, 0, 1].includes(m) };

// Potencia media durante el uso (W), cantidad, horas de uso efectivas al día
const A = (id, g, nombre, w, cant, h, semana, estac, franja) => ({ id, g, nombre, w, cant, h, semana, estac, franja });
export const CATALOGO = [
  A('frigo', 'Hogar', 'Frigorífico combi', 100, 1, 9.6, 'todos', 'todo', '24h'),
  A('congelador', 'Hogar', 'Congelador', 120, 1, 8, 'todos', 'todo', '24h'),
  A('lavadora', 'Hogar', 'Lavadora', 1200, 1, 0.5, 'todos', 'todo', 'manana'),
  A('lavavajillas', 'Hogar', 'Lavavajillas', 1200, 1, 0.5, 'todos', 'todo', 'tardenoche'),
  A('secadora', 'Hogar', 'Secadora', 2000, 1, 0.5, 'todos', 'todo', 'tarde'),
  A('horno', 'Hogar', 'Horno', 2200, 1, 0.4, 'todos', 'todo', 'tardenoche'),
  A('placa', 'Hogar', 'Placa de inducción o vitrocerámica', 2000, 1, 0.8, 'todos', 'todo', 'tardenoche'),
  A('microondas', 'Hogar', 'Microondas', 1000, 1, 0.2, 'todos', 'todo', 'tardenoche'),
  A('tv', 'Hogar', 'Televisor', 100, 1, 4, 'todos', 'todo', 'tardenoche'),
  A('pc', 'Hogar', 'Ordenador o portátil', 80, 1, 5, 'todos', 'todo', 'tardenoche'),
  A('router', 'Hogar', 'Router y wifi', 10, 1, 24, 'todos', 'todo', '24h'),
  A('luz-hogar', 'Hogar', 'Iluminación LED de la vivienda', 80, 1, 5, 'todos', 'todo', 'tardenoche'),
  A('aa-hogar', 'Hogar', 'Aire acondicionado (split)', 1000, 1, 5, 'todos', 'verano', 'tardenoche'),
  A('bc-hogar', 'Hogar', 'Bomba de calor para calefacción', 1200, 1, 6, 'todos', 'invierno', 'tardenoche'),
  A('radiador', 'Hogar', 'Radiador o estufa eléctrica', 1500, 1, 4, 'todos', 'invierno', 'tardenoche'),
  A('termo', 'Hogar', 'Termo eléctrico (agua caliente)', 1500, 1, 2, 'todos', 'todo', 'valle'),
  A('aerotermia-acs', 'Hogar', 'Aerotermia (agua caliente)', 500, 1, 3, 'todos', 'todo', 'valle'),
  A('coche', 'Hogar', 'Coche eléctrico (carga en casa)', 3700, 1, 2.5, 'todos', 'todo', 'valle'),
  A('plancha', 'Hogar', 'Plancha', 1500, 1, 0.3, 'todos', 'todo', 'tarde'),
  A('luz-local', 'Comercio y oficina', 'Iluminación LED del local', 1500, 1, 10, 'lvs', 'todo', 'dia'),
  A('aa-local', 'Comercio y oficina', 'Aire acondicionado del local', 3500, 1, 8, 'lvs', 'calorfrio', 'dia'),
  A('camara', 'Comercio y oficina', 'Cámara frigorífica', 1500, 1, 12, 'todos', 'todo', '24h'),
  A('vitrina', 'Comercio y oficina', 'Vitrina o expositor frigorífico', 400, 1, 12, 'todos', 'todo', '24h'),
  A('puesto', 'Comercio y oficina', 'Puesto de oficina (ordenador y pantalla)', 150, 5, 8, 'lv', 'todo', 'dia'),
  A('tpv', 'Comercio y oficina', 'Caja, TPV y wifi', 100, 1, 12, 'lvs', 'todo', 'dia'),
  A('extractor', 'Comercio y oficina', 'Ventilación o extractor', 750, 1, 8, 'lvs', 'todo', 'dia'),
  A('compresor', 'Industria', 'Compresor de aire', 5500, 1, 4, 'lv', 'todo', 'dia'),
  A('motor', 'Industria', 'Motor o maquinaria (potencia media)', 7500, 1, 6, 'lv', 'todo', 'dia'),
  A('cnc', 'Industria', 'Torno o máquina de control numérico', 10000, 1, 6, 'lv', 'todo', 'dia'),
  A('carretilla', 'Industria', 'Carga de carretilla eléctrica', 3000, 1, 4, 'lv', 'todo', 'valle'),
  A('bomba', 'Industria', 'Bomba de agua o riego', 5500, 1, 4, 'todos', 'todo', 'manana'),
  A('luz-nave', 'Industria', 'Iluminación LED de nave', 4000, 1, 10, 'lv', 'todo', 'dia'),
];
export const PRESETS = {
  vivienda: { nombre: 'Vivienda tipo', ids: ['frigo', 'lavadora', 'lavavajillas', 'horno', 'placa', 'microondas', 'tv', 'pc', 'router', 'luz-hogar', 'aa-hogar', 'termo'] },
  comercio: { nombre: 'Local comercial', ids: ['luz-local', 'aa-local', 'camara', 'vitrina', 'puesto', 'tpv', 'extractor'] },
  nave: { nombre: 'Nave pequeña', ids: ['luz-nave', 'motor', 'compresor', 'puesto', 'carretilla', 'aa-local'] },
};
export const aparatoDe = (id) => { const { g, ...x } = CATALOGO.find((c) => c.id === id); return { ...x }; };

const TEMP = { 1: [1, 2], 2: [1, 2], 7: [1, 2], 12: [1, 2], 3: [2, 3], 11: [2, 3], 6: [3, 4], 8: [3, 4], 9: [3, 4], 4: [4, 5], 5: [4, 5], 10: [4, 5] };
// Periodo tarifario (1..6) de una hora; mes 0-11
export function periodoHora(tarifa, mes, laborable, hora) {
  if (tarifa === '2.0TD') return (!laborable || hora < 8) ? 3 : ((hora >= 10 && hora < 14) || (hora >= 18 && hora < 22)) ? 1 : 2;
  if (!laborable || hora < 8) return 6;
  const [punta, llano] = TEMP[mes + 1];
  return ((hora >= 9 && hora < 14) || (hora >= 18 && hora < 22)) ? punta : llano;
}

export function estimar(lista, margen, tarifa) {
  const nP = TARIFAS[tarifa].nEn;
  const mensual = Array.from({ length: 12 }, () => ({ kwh: Array(nP).fill(0), total: 0 }));
  const porAparato = [];
  const k = 1 + num(margen) / 100;
  for (const a of lista) {
    const kwhDia = num(a.w) * num(a.cant) * num(a.h) / 1000;
    const [, h0, h1] = FRANJAS[a.franja] || FRANJAS['24h'];
    let anual = 0;
    for (let m = 0; m < 12; m++) {
      if (!(ACTIVO[a.estac] || ACTIVO.todo)(m)) continue;
      const D = DIAS_MES[m]; const lab = D * 5 / 7; const fin = D * 2 / 7;
      const dias = a.semana === 'lv' ? [lab, 0] : a.semana === 'lvs' ? [lab, fin / 2] : [lab, fin];
      for (const [i, laborable] of [[0, true], [1, false]]) {
        const e = kwhDia * dias[i] * k;
        if (e <= 0) continue;
        const horas = h1 - h0;
        for (let h = h0; h < h1; h++) {
          const p = Math.min(nP, periodoHora(tarifa, m, laborable, h)) - 1;
          mensual[m].kwh[p] += e / horas;
        }
        anual += e;
      }
    }
    porAparato.push({ nombre: a.nombre || 'Aparato', kwh: anual });
  }
  mensual.forEach((x) => { x.total = x.kwh.reduce((s, v) => s + v, 0); });
  const periodos = Array(nP).fill(0);
  mensual.forEach((x) => x.kwh.forEach((v, i) => { periodos[i] += v; }));
  return { mensual, anual: mensual.reduce((s, x) => s + x.total, 0), periodos, porAparato: porAparato.sort((a, b) => b.kwh - a.kwh) };
}
