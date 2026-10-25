import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, freeDay, person } from './helpers.js';

let t, token;
before(async () => { t = await boot(); });
after(() => t.close());

test('lista servicios sembrados', async () => {
  const { data } = await t.call('/api/services', { admin: false });
  assert.ok(data.length >= 15);
});

test('reserva, evita doble reserva y respeta el descanso', async () => {
  const date = await freeDay(t.call, 1);
  const { data: a } = await t.call(`/api/availability?service_id=1&date=${date}`, { admin: false });
  const slot = a.slots[0].start_min;
  const dur = (await t.call('/api/services', { admin: false })).data.find((x) => x.id === 1).duration_min;
  const r1 = await t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, service_id: 1, date, start_min: slot } });
  assert.equal(r1.status, 201);
  assert.equal(r1.data.booking.status, 'pending');
  const r2 = await t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, service_id: 1, date, start_min: slot } });
  assert.equal(r2.status, 409);
  const { data: b } = await t.call(`/api/availability?service_id=1&date=${date}`, { admin: false });
  assert.ok(!b.slots.some((s) => s.start_min > slot - dur && s.start_min < slot + dur + 15));
  token = r1.data.booking.token;
});

test('validación, consentimiento y fechas pasadas', async () => {
  const date = await freeDay(t.call, 1);
  const post = (b) => t.call('/api/bookings', { method: 'POST', admin: false, body: b });
  assert.equal((await post({ ...person, email: 'nope', service_id: 1, date, start_min: 600 })).status, 400);
  assert.equal((await post({ ...person, consent: false, service_id: 1, date, start_min: 600 })).status, 400);
  assert.equal((await post({ ...person, service_id: 1, date: '2020-01-01', start_min: 600 })).status, 409);
});

test('consulta, ics y cancelación por enlace privado', async () => {
  const g = await t.call(`/api/bookings/${token}`, { admin: false });
  assert.equal(g.status, 200); assert.equal(g.data.can_cancel, true);
  const ics = await t.call(`/api/bookings/${token}/ics`, { admin: false });
  assert.match(ics.data, /BEGIN:VEVENT/);
  assert.equal((await t.call(`/api/bookings/${token}/cancel`, { method: 'POST', admin: false, body: {} })).status, 200);
  assert.equal((await t.call(`/api/bookings/${token}`, { admin: false })).data.booking.status, 'cancelled');
});

test('el panel exige sesión y cabeceras de seguridad', async () => {
  assert.equal((await t.call('/api/admin/dashboard', { admin: false })).status, 401);
  assert.equal((await t.call('/api/admin/login', { method: 'POST', admin: false, body: { password: 'mal' } })).status, 401);
  assert.equal((await t.login()).status, 200);
  assert.equal((await t.call('/api/admin/dashboard')).status, 200);
  const r = await fetch(t.base + '/'); assert.equal(r.status, 200); assert.ok(r.headers.get('content-security-policy'));
  assert.equal((await fetch(t.base + '/%2e%2e/server/index.js')).status, 404);
});

test('gestión de citas: estados, cobro, mover y bloquear días', async () => {
  const date = await freeDay(t.call, 2);
  const man = await t.call('/api/admin/bookings', { method: 'POST', body: { ...person, email: 'marta@example.com', service_id: 2, date, start_min: 600 } });
  assert.equal(man.status, 201); assert.equal(man.data.status, 'confirmed');
  const done = await t.call(`/api/admin/bookings/${man.data.id}`, { method: 'PATCH', body: { status: 'done', paid_cents: 25000, pay_method: 'tarjeta' } });
  assert.equal(done.data.status, 'done'); assert.equal(done.data.paid_cents, 25000);
  const free = (await t.call(`/api/availability?service_id=2&date=${date}`, { admin: false })).data.slots;
  const mv = await t.call(`/api/admin/bookings/${man.data.id}/move`, { method: 'POST', body: { date, start_min: free[free.length - 1]?.start_min ?? 840 } });
  assert.ok([200, 409].includes(mv.status));
  await t.call('/api/admin/blocked', { method: 'POST', body: { date, reason: 'vacaciones' } });
  assert.deepEqual((await t.call(`/api/availability?service_id=2&date=${date}`, { admin: false })).data.slots, []);
});
