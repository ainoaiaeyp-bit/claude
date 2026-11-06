// Pruebas de la lógica de Mielec: node prueba.mjs
import assert from 'node:assert/strict';
import { racha, estadoSimple, calcular, S } from './static/js/estado.js';
import { comparar, facturar } from './static/js/calculo.js';

// --- racha: días seguidos más recientes por debajo del precio del usuario
const d = (f, v) => ({ fecha: f, pvpc: v, spot: v / 2 });
const dias = [d('2026-11-01', 0.12), d('2026-11-02', 0.16), d('2026-11-03', 0.14), d('2026-11-04', 0.13), d('2026-11-05', 0.11)];
let r = racha(dias, 0.15, 'pvpc');
assert.equal(r.dias, 3);                       // el 02 (0,16) la corta: cuentan 03, 04 y 05
assert.ok(Math.abs(r.media - (0.14 + 0.13 + 0.11) / 3) < 1e-9);
assert.equal(racha(dias, 0.10, 'pvpc').dias, 0); // hoy no baja
assert.equal(racha(dias, 0.10, 'spot').dias, 5); // mayorista: todo por debajo
assert.equal(racha([d('2026-11-01', 0.1), { fecha: '2026-11-02', pvpc: null, spot: null }, d('2026-11-03', 0.1)], 0.15, 'pvpc').dias, 2); // días sin dato se saltan

// --- simple: mismo motor que el completo
const e = estadoSimple({ kwh: '250', kw: '4,6', pot: '0,08', mio: '0,145', oferta: '0,115', otraPot: false, potO: '' });
const f = facturar(e, e.actual);
assert.ok(Math.abs(f.potBruto - 4.6 * 2 * 0.08 * 30) < 1e-9);
assert.ok(Math.abs(f.enBruto - 250 * 0.145) < 1e-9);
const c = comparar(e);
assert.ok(c.ahorro > 0 && c.H === 12);
// las líneas visibles de la factura suman el total
assert.ok(Math.abs(f.potBruto + f.enBruto - f.comp + f.servBruto + f.otrosTotal + f.alq - f.descTotal + f.iee + f.iva - f.total) < 1e-9);

// --- falta un precio: no se calcula (un hueco contaría como 0 y falsearía el resultado)
S.modo = 'simple'; S.simple.oferta = '';
assert.match(calcular().err, /energía en la oferta/);
console.log('Todo correcto');
