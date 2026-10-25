import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { boot, freeDay, person } from './helpers.js';
import { addDays, nowLocal, quarterOf } from '../server/core/util.js';
import { seedDemo } from '../server/core/demo.js';
import { zip, crc32 } from '../server/core/zip.js';
import { createMailer } from '../server/mail.js';

let t;
before(async () => { t = await boot(); await t.login(); });
after(() => t.close());
const today = nowLocal().date, year = Number(today.slice(0, 4)), q = quarterOf(today);
const inQuarter = (() => { const m0 = (q - 1) * 3 + 1; return `${year}-${String(m0).padStart(2, '0')}-02`; })();

function readZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22; while (dv.getUint32(end, true) !== 0x06054b50) end--;
  const n = dv.getUint16(end + 10, true); let p = dv.getUint32(end + 16, true); const out = {};
  for (let i = 0; i < n; i++) {
    const size = dv.getUint32(p + 24, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true), crc = dv.getUint32(p + 16, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nl));
    const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), data = bytes.subarray(off + 30 + lnl + lel, off + 30 + lnl + lel + size);
    assert.equal(crc32(data), crc, 'CRC de ' + name); out[name] = data; p += 46 + nl + el + cl;
  }
  return out;
}

test('el ZIP propio es válido', () => {
  const z = readZip(zip([{ name: 'a.txt', data: 'hola' }, { name: 'carpeta/b.bin', data: new Uint8Array([1, 2, 3]) }]));
  assert.equal(new TextDecoder().decode(z['a.txt']), 'hola'); assert.deepEqual([...z['carpeta/b.bin']], [1, 2, 3]);
});

test('ingresos con IVA incluido y gastos con factura adjunta', async () => {
  const date = await freeDay(t.call, 1);
  const b = await t.call('/api/admin/bookings', { method: 'POST', body: { ...person, service_id: 1, date, start_min: 600 } });
  // cobro dentro del trimestre actual: fecha pasada forzada
  const past = await t.call('/api/admin/bookings', { method: 'POST', body: { ...person, service_id: 1, date: inQuarter, start_min: 600, force: true } });
  await t.call(`/api/admin/bookings/${past.data.id}`, { method: 'PATCH', body: { status: 'done', paid_cents: 25000, pay_method: 'tarjeta' } });
  assert.equal(b.status, 201);
  const exp = await t.call('/api/admin/expenses', { method: 'POST', body: { supplier: 'Pigmentos SL', supplier_nif: 'B12345678', number: 'F-001', date: inQuarter, category: 'pigmentos', base_cents: 10000, vat_rate: 21 } });
  assert.equal(exp.status, 201); assert.equal(exp.data.total_cents, 12100); assert.equal(exp.data.vat_cents, 2100);
  const pdf = new TextEncoder().encode('%PDF-1.4 prueba');
  const up = await t.call(`/api/admin/expenses/${exp.data.id}/files`, { method: 'POST', raw: pdf, headers: { 'Content-Type': 'application/pdf', 'X-Filename': 'factura.pdf' } });
  assert.equal(up.status, 200); assert.equal(up.data.files.length, 1);
  const dl = await t.call(`/api/admin/files/${up.data.files[0].id}`);
  assert.equal(new TextDecoder().decode(dl.data), '%PDF-1.4 prueba');
  assert.equal((await t.call(`/api/admin/expenses/${exp.data.id}/files`, { method: 'POST', raw: pdf, headers: { 'Content-Type': 'application/x-msdownload' } })).status, 415);
});

test('resumen trimestral: IVA 303 e IRPF 130 coinciden con el cálculo manual', async () => {
  const { data } = await t.call(`/api/admin/accounting?year=${year}&q=${q}`);
  const s = data.summary;
  assert.equal(s.income.total, 25000); assert.equal(s.income.base, 20661); assert.equal(s.m303.repercutido, 4339);
  assert.equal(s.m303.soportado, 2100); assert.equal(s.m303.resultado, 2239);
  assert.equal(s.m130.net_ytd, 20661 - 10000); assert.equal(s.m130.to_pay, Math.round(10661 * 0.2));
  assert.ok(Array.isArray(s.warnings));
});

test('paquete trimestral con libros, resumen y facturas', async () => {
  const r = await t.call(`/api/admin/accounting/package?year=${year}&q=${q}`);
  assert.equal(r.status, 200);
  const z = readZip(r.data);
  const names = Object.keys(z);
  assert.ok(names.some((n) => n.startsWith('libro-ingresos')) && names.some((n) => n.startsWith('libro-gastos')) && names.some((n) => n.startsWith('resumen')));
  assert.ok(names.some((n) => n.startsWith('facturas-recibidas/') && n.endsWith('.pdf')));
  assert.match(new TextDecoder().decode(z[names.find((n) => n.startsWith('libro-gastos'))]), /Pigmentos SL/);
});

test('subir una factura sin IA crea un borrador que no cuenta hasta confirmarlo', async () => {
  const pdf = new TextEncoder().encode('%PDF-1.4 otra');
  const imp = await t.call('/api/admin/expenses/import', { method: 'POST', raw: pdf, headers: { 'Content-Type': 'application/pdf', 'X-Filename': 'luz.pdf' } });
  assert.equal(imp.status, 201); assert.equal(imp.data.draft, true); assert.equal(imp.data.extracted, false);
  const before = (await t.call(`/api/admin/accounting?year=${year}&q=${q}`)).data.summary;
  assert.equal(before.expenses.count, 1);
  assert.ok(before.warnings.some((w) => /pendiente/.test(w)));
  const put = await t.call(`/api/admin/expenses/${imp.data.id}`, { method: 'PUT', body: { supplier: 'Iberdrola', supplier_nif: 'A95758389', date: inQuarter, category: 'suministros', total_cents: 6050, vat_rate: 21, confirm: true } });
  assert.equal(put.status, 200); assert.equal(put.data.draft, false); assert.equal(put.data.base_cents, 5000);
  assert.equal((await t.call(`/api/admin/accounting?year=${year}&q=${q}`)).data.summary.expenses.count, 2);
});

test('CFO: umbral de rentabilidad y rentabilidad por servicio', async () => {
  await t.call('/api/admin/settings', { method: 'PUT', body: { targetNetMonthlyCents: 150000, autonomoFeeMonthlyCents: 29400 } });
  const c = (await t.call('/api/admin/cfo')).data;
  assert.ok(c.fixed.total >= 29400); assert.ok(c.break_even.bookings > 0); assert.ok(c.capacity_hours > 30);
  assert.ok(c.services.length >= 10); assert.ok(c.services[0].per_hour >= c.services[c.services.length - 1].per_hour);
  const mb = c.services.find((s) => s.name.startsWith('Microblading')); assert.equal(mb.net_price, 20661); assert.equal(mb.contribution, 20661 - 2800);
  assert.ok(Array.isArray(c.advice));
});

test('automatizaciones: se preparan, se envían una sola vez y respetan el permiso de novedades', async () => {
  const date = addDays(nowLocal().date, 1);
  const ok = await t.call('/api/admin/bookings', { method: 'POST', body: { ...person, name: 'Recordada Test', email: 'recordada@example.com', service_id: 7, date, start_min: 600, force: true } });
  assert.equal(ok.status, 201);
  const plan = (await t.call('/api/admin/automations')).data.plan;
  assert.ok(plan.some((p) => p.type === 'confirmation' && p.to === 'recordada@example.com'));
  const r1 = (await t.call('/api/admin/automations/run', { method: 'POST', body: {} })).data;
  assert.ok(r1.queued >= 1 && r1.sent === 0, 'sin SMTP quedan pendientes');
  const r2 = (await t.call('/api/admin/automations/run', { method: 'POST', body: {} })).data;
  assert.equal(r2.total, 0, 'no se repiten');
  assert.ok((await t.call('/api/admin/automations')).data.outbox.length >= 1);
});

test('cliente SMTP: AUTH, adjunto y cuerpo llegan al servidor', async () => {
  const got = { cmds: [], data: '' };
  const srv = net.createServer((s) => {
    s.write('220 fake\r\n'); let inData = false, buf = '';
    s.on('data', (d) => {
      buf += d.toString();
      if (inData) { if (buf.includes('\r\n.\r\n')) { got.data = buf; inData = false; buf = ''; s.write('250 ok\r\n'); } return; }
      for (const line of buf.split('\r\n').slice(0, -1)) {
        got.cmds.push(line.split(' ')[0]);
        if (line.startsWith('EHLO')) s.write('250-fake\r\n250 AUTH PLAIN\r\n'); else if (line.startsWith('AUTH')) s.write('235 ok\r\n');
        else if (line === 'DATA') { s.write('354 go\r\n'); inData = true; buf = ''; return; } else if (line === 'QUIT') { s.write('221 bye\r\n'); s.end(); } else s.write('250 ok\r\n');
      }
      buf = '';
    });
  });
  await new Promise((r) => srv.listen(0, r));
  const m = createMailer({ host: '127.0.0.1', port: srv.address().port, user: 'u@x.es', pass: 'p', from: 'Noelia <u@x.es>', secure: false });
  await m.send({ to: 'asesoria@x.es', subject: 'Paquete T1 · Documentación', text: 'Hola ñ', attachments: [{ filename: 'p.zip', content: new Uint8Array([80, 75, 3, 4]), contentType: 'application/zip' }] });
  srv.close();
  assert.ok(got.cmds.includes('AUTH') && got.cmds.includes('MAIL') && got.cmds.includes('RCPT'));
  assert.match(got.data, /multipart\/mixed/); assert.match(got.data, /filename="p\.zip"/); assert.match(got.data, /UEsDBA==/);
});

test('resultados: año completo y desde el principio', async () => {
  const t2 = await boot(); await t2.login();
  seedDemo(t2.app.store, new Date(), { saveFile: () => 'f'.repeat(32) });
  const all = await t2.call('/api/admin/results?all=1');
  assert.equal(all.status, 200);
  const yr = new Date().getFullYear();
  const y = await t2.call(`/api/admin/results?from=${yr}-01-01&to=${yr}-12-31`);
  assert.equal(y.data.profit, y.data.income - y.data.expenses);
  assert.ok(all.data.income >= y.data.income);
  assert.equal((await t2.call('/api/admin/results?from=2026-05-01&to=2026-01-01')).status, 400);
  await t2.close();
});
