import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'nd-'));
process.env.ADMIN_PASSWORD = 'test-password-1';

const { server } = await import('../server/index.js');
const { addDays, nowLocal } = await import('../server/booking.js');
let base;
before(() => new Promise((r) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); })));
after(() => server.close());

const j = async (url, opts = {}) => {
  const r = await fetch(base + url, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers }, body: opts.body && JSON.stringify(opts.body) });
  return { status: r.status, data: await r.json().catch(() => null), headers: r.headers };
};

async function firstFreeDay(serviceId) {
  const month = addDays(nowLocal().date, 14).slice(0, 7);
  const { data } = await j(`/api/availability?service_id=${serviceId}&month=${month}`);
  assert.ok(data.days.length, 'hay días libres');
  return data.days[0];
}
const person = { name: 'Ana Pérez', email: 'ana@example.com', phone: '+34 600 111 222', consent: true };

test('lista servicios sembrados', async () => {
  const { data } = await j('/api/services');
  assert.ok(data.length >= 5);
});

test('reserva, evita doble reserva y respeta el buffer', async () => {
  const date = await firstFreeDay(1);
  const { data: a } = await j(`/api/availability?service_id=1&date=${date}`);
  const slot = a.slots[0].start_min;
  const dur = (await j('/api/services')).data.find((x) => x.id === 1).duration_min;
  const r1 = await j('/api/bookings', { method: 'POST', body: { ...person, service_id: 1, date, start_min: slot } });
  assert.equal(r1.status, 201);
  assert.equal(r1.data.booking.status, 'pending');
  const r2 = await j('/api/bookings', { method: 'POST', body: { ...person, service_id: 1, date, start_min: slot } });
  assert.equal(r2.status, 409);
  const { data: b } = await j(`/api/availability?service_id=1&date=${date}`);
  assert.ok(!b.slots.some((s) => s.start_min > slot - dur && s.start_min < slot + dur + 15), 'solape/buffer excluido');
  globalThis.token = r1.data.booking.token;
});

test('validación y honeypot', async () => {
  const date = await firstFreeDay(1);
  const bad = await j('/api/bookings', { method: 'POST', body: { ...person, email: 'nope', service_id: 1, date, start_min: 600 } });
  assert.equal(bad.status, 400);
  const noConsent = await j('/api/bookings', { method: 'POST', body: { ...person, consent: false, service_id: 1, date, start_min: 600 } });
  assert.equal(noConsent.status, 400);
  const past = await j('/api/bookings', { method: 'POST', body: { ...person, service_id: 1, date: '2020-01-01', start_min: 600 } });
  assert.equal(past.status, 409);
});

test('consulta, ics y cancelación por token', async () => {
  const g = await j(`/api/bookings/${globalThis.token}`);
  assert.equal(g.status, 200);
  assert.equal(g.data.can_cancel, true);
  const ics = await fetch(`${base}/api/bookings/${globalThis.token}/ics`);
  assert.match(await ics.text(), /BEGIN:VEVENT/);
  const c = await j(`/api/bookings/${globalThis.token}/cancel`, { method: 'POST', body: {} });
  assert.equal(c.status, 200);
  assert.equal((await j(`/api/bookings/${globalThis.token}`)).data.booking.status, 'cancelled');
});

test('admin exige login y gestiona citas', async () => {
  assert.equal((await j('/api/admin/bookings')).status, 401);
  assert.equal((await j('/api/admin/login', { method: 'POST', body: { password: 'mal' } })).status, 401);
  const l = await j('/api/admin/login', { method: 'POST', body: { password: 'test-password-1' } });
  assert.equal(l.status, 200);
  const cookie = l.headers.get('set-cookie').split(';')[0];
  const h = { Cookie: cookie };
  const date = await firstFreeDay(2);
  const man = await j('/api/admin/bookings', { method: 'POST', headers: h, body: { ...person, service_id: 2, date, start_min: 600 } });
  assert.equal(man.status, 201);
  assert.equal(man.data.status, 'confirmed');
  const upd = await j(`/api/admin/bookings/${man.data.id}`, { method: 'PATCH', headers: h, body: { status: 'done' } });
  assert.equal(upd.data.status, 'done');
  assert.equal((await j('/api/admin/stats', { headers: h })).status, 200);
  // bloquear un día lo quita de la disponibilidad
  await j('/api/admin/blocked', { method: 'POST', headers: h, body: { date, reason: 'vacaciones' } });
  const { data } = await j(`/api/availability?service_id=2&date=${date}`);
  assert.deepEqual(data.slots, []);
});

test('cabeceras de seguridad y rutas estáticas', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('content-security-policy'));
  assert.equal((await fetch(base + '/../server/db.js')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e/server/db.js')).status, 404);
  assert.equal((await fetch(base + '/admin')).status, 200);
});
