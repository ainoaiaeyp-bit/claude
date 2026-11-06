import assert from 'node:assert/strict';
import { estadoVacio, facturar, proyectar, comparar, consumoMes, nuevoId } from './static/calculo.js';
const cerca = (a, b, t = 0.005) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);

// --- Caso base 2.0TD, 30 días, 4,6 kW, 300 kWh (100/100/100)
const e = estadoVacio();
e.cliente.dias = 30; e.cliente.consumo = [100, 100, 100, '', '', ''];
e.actual.potencia.contratada = [4.6, 4.6]; e.actual.potencia.precios = [0.08, 0.08];
e.actual.energia.nPrecios = 1; e.actual.energia.grupos = [0, 0, 0, 0, 0, 0]; e.actual.energia.precios = [0.12];
let f = facturar(e, e.actual);
cerca(f.potBruto, 4.6 * 2 * 0.08 * 30);          // 22.08
cerca(f.enBruto, 36);
cerca(f.iee, (22.08 + 36) * 0.0511269632);
cerca(f.total, (22.08 + 36 + f.iee) * 1.21);

// --- Potencia en €/kW·año y €/kW·mes equivalen a su €/kW·día
const e2 = structuredClone(e);
e2.actual.potencia.unidad = 'anio'; e2.actual.potencia.precios = [0.08 * 365, 0.08 * 365];
cerca(facturar(e2, e2.actual).potBruto, f.potBruto);
e2.actual.potencia.unidad = 'mes'; e2.actual.potencia.precios = [0.08 * 365 / 12, 0.08 * 365 / 12];
cerca(facturar(e2, e2.actual).potBruto, f.potBruto);
// precio único para todos los periodos de potencia
e2.actual.potencia.unidad = 'dia'; e2.actual.potencia.unico = true; e2.actual.potencia.precios = [0.08, 99];
cerca(facturar(e2, e2.actual).potBruto, f.potBruto);

// --- Energía: céntimos y €/MWh
const e3 = structuredClone(e);
e3.actual.energia.unidad = 'cent'; e3.actual.energia.precios = [12];
cerca(facturar(e3, e3.actual).enBruto, 36);
e3.actual.energia.unidad = 'mwh'; e3.actual.energia.precios = [120];
cerca(facturar(e3, e3.actual).enBruto, 36);

// --- Energía por 3 periodos y por agrupación (2 precios: P1+P2 / P3)
const e4 = structuredClone(e);
e4.actual.energia.grupos = [0, 0, 1, 0, 0, 0]; e4.actual.energia.precios = [0.15, 0.08];
cerca(facturar(e4, e4.actual).enBruto, 200 * 0.15 + 100 * 0.08);

// --- 3.0TD con 6 periodos
const e5 = estadoVacio(); e5.cliente.tarifa = '3.0TD'; e5.cliente.dias = 31; e5.cliente.uso = 'otros';
e5.cliente.consumo = [1000, 2000, 1500, 500, 800, 3000];
e5.actual.potencia.contratada = [20, 20, 20, 20, 20, 30];
e5.actual.potencia.precios = [0.07, 0.04, 0.03, 0.02, 0.015, 0.01];
e5.actual.energia.grupos = [0, 1, 2, 3, 4, 5]; e5.actual.energia.precios = [0.2, 0.18, 0.15, 0.13, 0.11, 0.09];
f = facturar(e5, e5.actual);
cerca(f.potBruto, 31 * (20 * (0.07 + 0.04 + 0.03 + 0.02 + 0.015) + 30 * 0.01));
cerca(f.enBruto, 1000 * 0.2 + 2000 * 0.18 + 1500 * 0.15 + 500 * 0.13 + 800 * 0.11 + 3000 * 0.09);

// --- Servicios y descuentos ligados
const p = structuredClone(e);
p.propuesta = structuredClone(e.actual);
p.propuesta.servicios = [{ id: 'mant', nombre: 'Mantenimiento', importe: 5, unidad: 'mes', iva: true, meses: '' }];
p.propuesta.descuentos = [
  { id: 'd1', nombre: '10% energía si hay mantenimiento', tipo: 'pct', valor: 10, aplica: 'energia', servicioId: '', requiere: 'mant', desde: 1, meses: 3 },
  { id: 'd2', nombre: 'Servicio gratis 2 meses', tipo: 'pct', valor: 100, aplica: 'servicio', servicioId: 'mant', requiere: '', desde: 1, meses: 2 },
];
let a = facturar(p, p.propuesta, 1, 365 / 12);
cerca(a.servBruto, 5); cerca(a.servNeto, 0);                 // gratis mes 1
cerca(a.descuentos[0].importe, 0.1 * 300 * 0.12 * (365 / 12) / 30);
let b = facturar(p, p.propuesta, 3, 365 / 12);
cerca(b.servNeto, 5); assert.ok(b.descuentos[0].importe > 0); assert.equal(b.descuentos[1].importe, 0);
let c = facturar(p, p.propuesta, 4, 365 / 12);
assert.equal(c.descuentos[0].importe, 0);                      // caducó
// Sin el servicio, el descuento ligado no se aplica
const sin = structuredClone(p.propuesta); sin.servicios = [];
assert.equal(facturar(p, sin, 1, 365 / 12).descuentos[0].importe, 0);
const cmp = comparar(p);
cerca(cmp.ahorroSinServ, cmp.pA.total - proyectar(p, sin, 12).total);

// --- Descuento nunca deja un concepto en negativo, ni en cadena
const q = structuredClone(e);
q.actual.descuentos = [{ id: 'x', nombre: 'a', tipo: 'pct', valor: 80, aplica: 'energia' }, { id: 'y', nombre: 'b', tipo: 'pct', valor: 80, aplica: 'energia' }];
f = facturar(q, q.actual);
cerca(f.enNeta, 0); cerca(f.descTotal, 36);

// --- Descuento por kWh y único
q.actual.descuentos = [{ id: 'x', tipo: 'eurkwh', valor: 0.02, aplica: 'energia' }, { id: 'u', tipo: 'unico', valor: 10, aplica: 'total', desde: 1 }];
f = facturar(q, q.actual, 1);
cerca(f.descTotal, 300 * 0.02 + 10);
cerca(facturar(q, q.actual, 2).descTotal, 6);

// --- Excedentes nunca superan la energía
q.actual.descuentos = []; q.cliente.excedentes = 1000; q.actual.compensacion.precio = 0.1;
cerca(facturar(q, q.actual).comp, 36);

// --- Penalización y retorno
const r = structuredClone(e);
r.propuesta = structuredClone(e.actual); r.propuesta.energia.precios = [0.10];
r.actual.permanencia.penalizacion = 60;
const rc = comparar(r);
assert.ok(rc.ahorro > 0); cerca(rc.neto, rc.ahorro - 60); assert.ok(rc.retorno > 0);

// --- Alquiler común: afecta igual a las dos facturas
const al = structuredClone(e); al.cliente.alquiler = { importe: 0.81, unidad: 'mes' }; al.propuesta = structuredClone(al.actual);
cerca(facturar(al, al.actual).alq, 0.81 * 12 / 365 * 30); cerca(facturar(al, al.propuesta).alq, facturar(al, al.actual).alq);

// --- Servicio con descuento propio y permanencia propia
const sv = structuredClone(e); sv.propuesta = structuredClone(e.actual);
sv.propuesta.servicios = [{ id: 's1', nombre: 'Seguro', importe: 10, unidad: 'mes', iva: true, meses: '', desc: { activo: true, tipo: 'pct', valor: 50, meses: 3 }, perm: { activa: true, meses: 12, penalizacion: 30 } }];
sv.perfil.inicio = '2027-01';
let m1 = facturar(sv, sv.propuesta, 1, 31, { mensual: true });
cerca(m1.servBruto, 10); cerca(m1.servNeto, 5);
cerca(facturar(sv, sv.propuesta, 4, 31, { mensual: true }).servNeto, 10);
const cs = comparar(sv);
assert.equal(cs.permP, 12); cerca(cs.penP, 30);

// --- Calendario real: 12 meses suman 365 días de potencia; alquiler y servicios mensuales no dependen de los días
const cal = structuredClone(e); cal.perfil.inicio = '2027-01'; cal.propuesta = structuredClone(e.actual);
const pp = proyectar(cal, cal.actual, 12);
assert.equal(pp.filas.reduce((s, x) => s + x.dias, 0), 365);
cerca(pp.filas.reduce((s, x) => s + x.pot, 0), 4.6 * 2 * 0.08 * 365, 0.05);
cerca(pp.filas.reduce((s, x) => s + x.kwh, 0), 300 / 30 * 365, 0.05);
cerca(pp.filas[1].dias, 28);

// --- Estacionalidad: +50 % en julio y agosto, -20 % en septiembre
const es = structuredClone(cal); es.perfil.modo = 'variacion'; es.perfil.variacion[6] = 50; es.perfil.variacion[7] = 50; es.perfil.variacion[8] = -20;
const pe = proyectar(es, es.actual, 12);
cerca(pe.filas[6].kwh, 300 / 30 * 31 * 1.5, 0.01); cerca(pe.filas[8].kwh, 300 / 30 * 30 * 0.8, 0.01);
assert.ok(pe.total > pp.total);

// --- Consumos reales: total por mes (reparto con la mezcla de la factura) y por periodos
const re = structuredClone(cal); re.perfil.modo = 'real'; re.perfil.real[0] = { total: 600, kwh: Array(6).fill('') };
let c0 = consumoMes(re, 0, 31); cerca(c0.total, 600); cerca(c0.kwh[0], 200); assert.ok(c0.real);
re.perfil.porPeriodos = true; re.perfil.real[1] = { total: '', kwh: [50, 60, 70, '', '', ''] };
cerca(consumoMes(re, 1, 28).total, 180);
assert.equal(consumoMes(re, 2, 31).real, false);               // sin dato: usa estimación
// --- El perfil se repite por mes del calendario cuando el horizonte pasa de 12 meses
const largo = structuredClone(es); largo.horizonte = 24;
const pl = proyectar(largo, largo.actual, 24); cerca(pl.filas[18].kwh, pl.filas[6].kwh, 0.01);

// --- Ahorro acumulado y mes de recuperación de la penalización
const rr = structuredClone(cal); rr.propuesta.energia.precios = [0.10]; rr.actual.permanencia.penalizacion = 30;
const cr = comparar(rr); assert.ok(cr.mesRetorno >= 1 && cr.mesRetorno <= 12); cerca(cr.meses[11].acum, cr.ahorro);

// --- Estimador de consumo por aparatos
import { estimar, aparatoDe, periodoHora, PRESETS, CATALOGO } from './static/aparatos.js';
const fr = estimar([aparatoDe('frigo')], 0, '2.0TD');
cerca(fr.anual, 100 * 9.6 / 1000 * 365, 0.5);
cerca(fr.periodos[0] / fr.anual, 8 / 24 * 5 / 7, 0.002); cerca(fr.periodos[2] / fr.anual, 8 / 24 * 5 / 7 + 2 / 7, 0.002);
const aa = estimar([aparatoDe('aa-hogar')], 0, '2.0TD');
cerca(aa.anual, 1.0 * 5 * (30 + 31 + 31 + 30), 0.5);
assert.equal(aa.mensual[0].total, 0); assert.ok(aa.mensual[6].total > 0);
cerca(estimar([aparatoDe('frigo')], 10, '2.0TD').anual, fr.anual * 1.1, 0.01);
// lunes a viernes de día en 3.0TD en octubre: punta P4 (9-14, 18-22) y llano P5 (14-18, 8-9)
assert.equal(periodoHora('3.0TD', 9, true, 11), 4); assert.equal(periodoHora('3.0TD', 9, true, 15), 5); assert.equal(periodoHora('3.0TD', 9, false, 11), 6);
const nave = estimar(PRESETS.nave.ids.map(aparatoDe), 0, '3.0TD');
assert.equal(nave.periodos.length, 6); cerca(nave.periodos.reduce((s, x) => s + x, 0), nave.anual, 0.01);
assert.ok(PRESETS.vivienda.ids.every((i) => CATALOGO.some((c) => c.id === i)));
const viv = estimar(PRESETS.vivienda.ids.map(aparatoDe), 10, '2.0TD');
assert.ok(viv.anual > 1500 && viv.anual < 8000, 'vivienda tipo ' + viv.anual);

// --- Alquiler: común salvo que la propuesta tenga el suyo; cargos regulados comunes; alquiler dentro o fuera de la base del impuesto
const aq = structuredClone(e); aq.cliente.alquiler = { importe: 0.81, unidad: 'mes' }; aq.propuesta = structuredClone(aq.actual);
cerca(facturar(aq, aq.propuesta).alq, facturar(aq, aq.actual).alq);
aq.propuesta.alquilerPropio = { activo: true, importe: 1.5, unidad: 'mes' };
cerca(facturar(aq, aq.propuesta).alq, 1.5 * 12 / 365 * 30); cerca(facturar(aq, aq.actual).alq, 0.81 * 12 / 365 * 30);
const cg = structuredClone(e); cg.propuesta = structuredClone(cg.actual);
cg.cliente.cargos = [{ nombre: 'Financiación del bono social', tipo: 'fijo', importe: 0.04, unidad: 'dia', tributaIEE: true }, { nombre: 'Tasa municipal', tipo: 'pct', importe: 1.5, unidad: 'dia', tributaIEE: false }];
const fa = facturar(cg, cg.actual), fb = facturar(cg, cg.propuesta);
cerca(fa.cargosTotal, 0.04 * 30 + 0.015 * (fa.potNeta + fa.enNeta)); cerca(fa.cargosTotal, fb.cargosTotal);
cerca(fa.baseIee, fa.potNeta + fa.enNeta + 0.04 * 30);
const sinCg = facturar(e, e.actual); assert.ok(fa.total > sinCg.total);
cg.cliente.alquiler = { importe: 1, unidad: 'mes' };
const i0 = facturar(cg, cg.actual).iee; cg.fiscal.alquilerIEE = true; assert.ok(facturar(cg, cg.actual).iee > i0);
// en proyección mensual el cargo diario suma los días reales
const pcg = proyectar(cg, cg.actual, 12); assert.ok(pcg.total > proyectar(e, e.actual, 12).total);

// --- Escenario "¿y si...?": consumo, servicios fuera y horizonte, sin tocar el original
import { escenario } from './static/calculo.js';
const baseE = structuredClone(p); baseE.propuesta.servicios = [{ id: 'm', nombre: 'Mant', importe: '10', unidad: 'mes', iva: true, meses: '', desc: { activo: false }, perm: { activa: false } }];
const ce0 = comparar(baseE);
const mas = comparar(escenario(baseE, { pct: 20 }));
cerca(mas.kwhAnual, ce0.kwhAnual * 1.2, 0.5); assert.ok(mas.pA.total > ce0.pA.total);
const sinS = comparar(escenario(baseE, { sinServicios: ['propuesta:m'] }));
assert.ok(sinS.pP.total < ce0.pP.total);
assert.equal(comparar(escenario(baseE, { H: 24 })).H, 24);
assert.equal(baseE.propuesta.servicios.length, 1);   // el original no cambia

// --- Regresión con una factura real 2.0TD de 29 días (cuadra al céntimo con el total de 37,05 €)
const fr1 = estadoVacio();
Object.assign(fr1.cliente, { dias: 29, consumo: ['15', '10', '27', '', '', ''], alquiler: { importe: '0.02663', unidad: 'dia' }, cargos: [{ nombre: 'Financiación bono social', tipo: 'fijo', importe: String(0.72 / 29), unidad: 'dia', tributaIEE: true }] });
fr1.actual.potencia = { unidad: 'dia', unico: false, contratada: ['4.5', '4.5', '', '', '', ''], precios: ['0.113621', '0.048023', '', '', '', ''] };
fr1.actual.energia = { unidad: 'eur', nPrecios: 1, grupos: [0, 0, 0, 0, 0, 0], precios: ['0.126561', '', '', '', '', ''] };
fr1.actual.real.total = '37.05'; fr1.propuesta = structuredClone(fr1.actual);
const rf = facturar(fr1, fr1.actual);
cerca(rf.potBruto, 21.09, 0.01); cerca(rf.enBruto, 6.58, 0.01); cerca(rf.alq, 0.77, 0.01); cerca(rf.iee, 1.45, 0.01); cerca(rf.iva, 6.43, 0.01); cerca(rf.total, 37.05, 0.01);
const rcf = comparar(fr1); assert.ok(rcf.recon && rcf.recon.ok);

// --- Comparar solo esta factura: los totales son los de la factura analizada, sin proyectar
const unaF = structuredClone(fr1); unaF.horizonte = 'f'; unaF.propuesta.energia.precios = ['0.10', '', '', '', '', ''];
const cuf = comparar(unaF);
assert.equal(cuf.H, 1); assert.equal(cuf.soloFactura, true);
cerca(cuf.pA.total, 37.05, 0.01); cerca(cuf.pA.total, cuf.refA.total); cerca(cuf.pP.total, cuf.refP.total);

// --- Las líneas de cada factura del informe suman exactamente su total (con servicios, descuentos, cargos, excedentes y otros)
import { lineasFactura } from './static/informe.js';
const sumaOk = (E2, lado) => { const f = facturar(E2, lado); const s = lineasFactura(f).reduce((a, [, v]) => a + v, 0); cerca(s, f.total, 0.005); };
sumaOk(fr1, fr1.actual); sumaOk(e, e.actual);
const rico = structuredClone(sv); rico.cliente.excedentes = '40'; rico.propuesta.compensacion.precio = '0.05';
rico.cliente.cargos = [{ nombre: 'Bono social', tipo: 'fijo', importe: '0.03', unidad: 'dia', tributaIEE: true }, { nombre: 'Tasa', tipo: 'pct', importe: '1.5', unidad: 'dia', tributaIEE: false }];
rico.propuesta.otros = [{ nombre: 'Reactiva', importe: '3.2', tributaIEE: true }];
rico.propuesta.descuentos.push({ id: 'z', nombre: 'x', tipo: 'pct', valor: 10, aplica: 'electricidad', servicioId: '', requiere: '', desde: 1, meses: '' });
sumaOk(rico, rico.propuesta); sumaOk(rico, rico.actual);
for (const mes of [1, 2, 5]) { const f = facturar(rico, rico.propuesta, mes, 30.4, { mensual: true }); cerca(lineasFactura(f).reduce((a, [, v]) => a + v, 0), f.total, 0.005); }
console.log('Vivienda tipo:', Math.round(viv.anual), 'kWh/año');
console.log('OK: todas las pruebas del motor pasan');
