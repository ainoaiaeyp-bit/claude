import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, freeDay, person } from './helpers.js';
import { addDays, nowLocal } from '../server/core/util.js';

let t;
before(async () => { t = await boot(); await t.login(); });
after(() => t.close());
const today = () => nowLocal().date;

test('una reserva crea la ficha de clienta y la etapa evoluciona', async () => {
  const date = await freeDay(t.call, 6);
  const r = await t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, email: 'lucia@example.com', name: 'Lucía Martín', service_id: 6, date, start_min: 600, marketing: true } });
  assert.equal(r.status, 201);
  const list = (await t.call('/api/admin/clients')).data;
  const c = list.find((x) => x.email === 'lucia@example.com');
  assert.ok(c); assert.equal(c.stage, 'nueva'); assert.equal(c.consent_marketing, true);
  const bk = (await t.call(`/api/admin/bookings?from=${date}&to=${date}`)).data[0];
  await t.call(`/api/admin/bookings/${bk.id}`, { method: 'PATCH', body: { status: 'done', paid_cents: 0 } });
  assert.equal((await t.call(`/api/admin/clients/${c.id}`)).data.client.stage, 'cliente');
  const det = (await t.call(`/api/admin/clients/${c.id}`)).data;
  assert.ok(det.interactions.length >= 2, 'el historial registra la cita y el cambio de estado');
});

test('ficha: edición, notas, fichas de micropigmentación y tareas', async () => {
  const c = (await t.call('/api/admin/clients', { method: 'POST', body: { name: 'Carmen Ruiz', phone: '611222333', email: 'carmen@example.com', birthday: '1990-05-17', tags: 'vip, boda', allergies: 'Níquel' } })).data;
  assert.deepEqual(c.tags, ['vip', 'boda']);
  assert.equal((await t.call('/api/admin/clients', { method: 'POST', body: { name: 'Otra', email: 'carmen@example.com' } })).status, 409);
  assert.equal((await t.call(`/api/admin/clients/${c.id}/interactions`, { method: 'POST', body: { kind: 'llamada', text: 'Prefiere tardes' } })).status, 201);
  const rec = await t.call(`/api/admin/clients/${c.id}/records`, { method: 'POST', body: { date: today(), technique: 'Microblading', pigment: 'Moca 03', skin_type: 'Mixta', consent_signed: true } });
  assert.equal(rec.status, 201);
  const task = (await t.call('/api/admin/tasks', { method: 'POST', body: { client_id: c.id, title: 'Enviar cuidados', due_date: today() } })).data;
  await t.call(`/api/admin/tasks/${task.id}`, { method: 'PATCH', body: { done: true } });
  const det = (await t.call(`/api/admin/clients/${c.id}`)).data;
  assert.equal(det.records.length, 1); assert.equal(det.tasks[0].done, true);
  assert.equal((await t.call('/api/admin/clients?q=tardes')).data.length, 0);
  assert.equal((await t.call('/api/admin/clients?q=carmen')).data.length, 1);
  assert.equal((await t.call('/api/admin/clients?tag=vip')).data.length, 1);
});

test('segmentos y seguimiento: retoque pendiente y cumpleaños', async () => {
  const c = (await t.call('/api/admin/clients', { method: 'POST', body: { name: 'Paula Nav', phone: '622333444', email: 'paula@example.com', birthday: '1992-' + today().slice(5) } })).data;
  const old = addDays(today(), -50);
  const b = await t.call('/api/admin/bookings', { method: 'POST', body: { ...person, name: 'Paula Nav', email: 'paula@example.com', phone: '622333444', service_id: 1, date: old, start_min: 600, force: true } });
  assert.equal(b.status, 201);
  await t.call(`/api/admin/bookings/${b.data.id}`, { method: 'PATCH', body: { status: 'done', paid_cents: 25000, pay_method: 'tarjeta' } });
  const seg = (await t.call('/api/admin/segments/retoque')).data;
  assert.ok(seg.members.some((m) => m.name === 'Paula Nav'));
  assert.match(seg.members[0].wa, /^https:\/\/wa\.me\/34/);
  const fu = (await t.call('/api/admin/followups')).data;
  assert.ok(fu.some((f) => f.type === 'retoque' && f.client_name === 'Paula Nav'));
  assert.ok(fu.some((f) => f.type === 'cumple' && f.client_id === c.id));
  await t.call('/api/admin/followups/done', { method: 'POST', body: { client_id: c.id, type: 'cumple' } });
  assert.ok(!(await t.call('/api/admin/followups')).data.some((f) => f.type === 'cumple' && f.client_id === c.id), 'tras contactarla desaparece la sugerencia');
  const segs = (await t.call('/api/admin/segments')).data;
  assert.ok(segs.find((s) => s.id === 'retoque').count >= 1);
});

test('formulario de contacto de la web crea un contacto y una tarea', async () => {
  const r = await t.call('/api/leads', { method: 'POST', admin: false, body: { name: 'Marta Lead', email: 'marta.lead@example.com', message: '¿Precio del microblading?', consent: true } });
  assert.equal(r.status, 201);
  const c = (await t.call('/api/admin/clients?q=marta.lead')).data[0];
  assert.equal(c.stage, 'lead');
  assert.ok((await t.call('/api/admin/tasks?status=open')).data.some((x) => x.title.includes('contacto web')));
  assert.equal((await t.call('/api/leads', { method: 'POST', admin: false, body: { name: 'X', consent: false } })).status, 400);
});

test('panel de resumen, informes y exportación', async () => {
  const d = (await t.call('/api/admin/dashboard')).data;
  assert.ok(d.kpis.clients >= 4); assert.equal(d.weekly.length, 8);
  const rep = (await t.call('/api/admin/reports')).data;
  assert.ok(rep.revenue >= 25000); assert.ok(rep.by_service.length >= 1);
  const csv = (await t.call('/api/admin/export/clients')).data;
  assert.match(csv, /Nombre;Email/);
  const bk = (await t.call('/api/admin/export/backup')).data;
  assert.ok(bk.clients.length >= 4); assert.ok(!('_adminHash' in bk.settings), 'la copia no incluye la contraseña');
});

test('baja de comunicaciones comerciales por enlace', async () => {
  const c = t.app.store.list('clients').find((x) => x.email === 'lucia@example.com');
  const r = await t.call(`/api/baja?t=${c.token}`, { admin: false });
  assert.equal(r.status, 200);
  assert.equal(t.app.store.find('clients', c.id).consent_marketing, false);
});
