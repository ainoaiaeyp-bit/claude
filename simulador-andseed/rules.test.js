'use strict';
/*
 * Pruebas de la función evaluate() del simulador.
 * Uso: node rules.test.js
 * Carga el motor (script#as-engine) directamente desde index.html, de modo que se prueba el mismo código que se publica.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script id="as-engine">([\s\S]*?)<\/script>/);
if (!m) { console.error('No se encuentra <script id="as-engine"> en index.html'); process.exit(1); }
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox);
const Sim = sandbox.window.AndseedSim;

// Fecha fija para que los resultados no dependan del día en que se ejecuten las pruebas.
const NOW = new Date('2026-10-27T10:00:00Z');
const base = {
  anio_constitucion: 2024, constituida: true, capital_tramo: '20-50k', fondos_propios: 400000,
  tecnologia: 'propia', importe_tramo: '100-300k', ampliacion: 'reciente'
};
const run = (over) => Sim.evaluate(Object.assign({}, base, over), { now: NOW });
const codes = (res) => res.reasons.map((r) => r.code);

const cases = [
  ['1. Encaja en ENISA y NEOTEC, score 100 y lead cualificado', () => {
    const r = run({});
    assert.strictEqual(r.enisa.status, 'encaja');
    assert.strictEqual(r.enisa.maxAmount, 300000);
    assert.strictEqual(r.neotec.status, 'encaja');
    assert.strictEqual(r.neotec.maxAid, 325000);
    assert.strictEqual(r.neotec.closed, true);
    assert.strictEqual(r.score, 100);
    assert.strictEqual(r.qualified, true);
  }],
  ['2. ENISA no encaja por fondos propios; NEOTEC encaja pero el score (45) no llega al umbral', () => {
    const r = run({ fondos_propios: 10000, ampliacion: 'no' });
    assert.strictEqual(r.enisa.status, 'no_encaja');
    assert.ok(codes(r.enisa).includes('FONDOS_PROPIOS_INSUFICIENTES'));
    assert.strictEqual(r.enisa.maxAmount, null);
    assert.strictEqual(r.neotec.status, 'encaja');
    assert.strictEqual(r.score, 45);
    assert.strictEqual(r.qualified, false);
  }],
  ['3. NEOTEC no encaja por antigüedad (constituida en 2020)', () => {
    const r = run({ anio_constitucion: 2020 });
    assert.strictEqual(r.neotec.status, 'no_encaja');
    assert.ok(codes(r.neotec).includes('ANTIGUEDAD_EXCEDIDA'));
    assert.strictEqual(r.neotec.maxAid, null);
    assert.strictEqual(r.enisa.status, 'encaja');
  }],
  ['4. NEOTEC no encaja si el modelo se basa sobre todo en servicios', () => {
    const r = run({ tecnologia: 'servicios' });
    assert.strictEqual(r.neotec.status, 'no_encaja');
    assert.ok(codes(r.neotec).includes('TECNOLOGIA_SERVICIOS'));
    assert.strictEqual(r.score, 35 + 15 + 10 + 20);
  }],
  ['5. NEOTEC queda a confirmar en 2023 (depende de la fecha exacta) y no encaja en 2026 (escritura reciente)', () => {
    const r23 = run({ anio_constitucion: 2023 });
    assert.strictEqual(r23.neotec.status, 'a_confirmar');
    assert.ok(codes(r23.neotec).includes('ANTIGUEDAD_REVISAR'));
    const r25 = run({ anio_constitucion: 2025 });
    assert.strictEqual(r25.neotec.status, 'a_confirmar');
    assert.ok(codes(r25.neotec).includes('ESCRITURA_REVISAR'));
    const r26 = run({ anio_constitucion: 2026 });
    assert.strictEqual(r26.neotec.status, 'no_encaja');
    assert.ok(codes(r26.neotec).includes('ESCRITURA_RECIENTE'));
  }],
  ['6. NEOTEC no encaja con capital inferior a 20.000 €', () => {
    const r = run({ capital_tramo: 'lt20k' });
    assert.strictEqual(r.neotec.status, 'no_encaja');
    assert.ok(codes(r.neotec).includes('CAPITAL_INSUFICIENTE'));
  }],
  ['7. ENISA por encima de 300.000 €: avisa de la auditoría y deja el importe a confirmar', () => {
    const r = run({ fondos_propios: 1000000, importe_tramo: '300-1500k' });
    assert.strictEqual(r.enisa.status, 'a_confirmar');
    assert.strictEqual(r.enisa.line, 'Crecimiento');
    assert.strictEqual(r.enisa.maxAmount, 1000000);
    assert.ok(codes(r.enisa).includes('AUDITORIA'));
  }],
  ['8. Empresa no constituida: ENISA no evaluable, NEOTEC no encaja, score bajo y no cualificado', () => {
    const r = run({ constituida: false, anio_constitucion: null, fondos_propios: 0, tecnologia: 'no', ampliacion: 'no' });
    assert.strictEqual(r.enisa.status, 'no_evaluable');
    assert.strictEqual(r.neotec.status, 'no_encaja');
    assert.ok(codes(r.neotec).includes('NO_CONSTITUIDA'));
    assert.strictEqual(r.score, 0);
    assert.strictEqual(r.qualified, false);
  }]
];

let failed = 0;
for (const [name, fn] of cases) {
  try { fn(); console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
console.log('\n' + (cases.length - failed) + '/' + cases.length + ' casos correctos');
process.exit(failed ? 1 : 0);
