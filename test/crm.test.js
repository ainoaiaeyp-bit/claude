import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { boot, freeDay, person } from './helpers.js';
import { addDays, nowLocal } from '../server/core/util.js';

let t;
before(async () => { process.env.TRUST_PROXY = '1'; t = await boot(); await t.login(); });
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

test('el formulario de reserva guarda el permiso de novedades', async () => {
  const date = await freeDay(t.call, 7);
  await t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, name: 'Con Permiso', email: 'permiso@example.com', service_id: 7, date, start_min: 600, marketing: true } });
  assert.equal(t.app.store.list('clients').find((c) => c.email === 'permiso@example.com').consent_marketing, true);
  await t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, name: 'Sin Permiso', email: 'sinpermiso@example.com', service_id: 7, date, start_min: 660 } });
  assert.equal(t.app.store.list('clients').find((c) => c.email === 'sinpermiso@example.com').consent_marketing, false);
});

test('reservas pausadas, propuesta de otra hora y respuesta de la clienta', async () => {
  const date = await freeDay(t.call, 6, 20), date2 = await freeDay(t.call, 6, 40);
  const slots = async (d) => (await t.call(`/api/availability?service_id=6&date=${d}`, { admin: false })).data.slots.map((x) => x.start_min);
  const s1 = await slots(date), s2 = await slots(date2);
  const post = (body) => t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, service_id: 6, ...body } });
  await t.call('/api/admin/settings', { method: 'PUT', body: { bookingsOpen: false, bookingsClosedMessage: 'Vuelvo en septiembre' } });
  assert.equal((await t.call('/api/settings', { admin: false })).data.bookingsOpen, false);
  const closed = await post({ date, start_min: s1[0] });
  assert.equal(closed.status, 403); assert.match(closed.data.error, /septiembre/);
  await t.call('/api/admin/settings', { method: 'PUT', body: { bookingsOpen: true } });

  const r1 = await post({ email: 'prop@example.com', name: 'Prop Uesta', date, start_min: s1[0] });
  const b = r1.data.booking;
  assert.equal(b.status, 'pending');
  const id = t.app.store.list('bookings').find((x) => x.token === b.token).id;
  const p = await t.call(`/api/admin/bookings/${id}/propose`, { method: 'POST', body: { date, start_min: s1[s1.length - 1], message: 'Por la mañana no puedo' } });
  assert.equal(p.status, 200); assert.equal(p.data.booking.status, 'proposed'); assert.equal(p.data.booking.start_min, s1[s1.length - 1]);
  assert.ok(t.app.store.list('outbox').some((o) => o.kind === 'proposal' && o.text.includes('Por la mañana no puedo')));
  assert.equal((await t.call(`/api/bookings/${b.token}`, { admin: false })).data.booking.proposal.message, 'Por la mañana no puedo');
  const a = await t.call(`/api/bookings/${b.token}/accept`, { method: 'POST', admin: false, body: {} });
  assert.equal(a.data.status, 'confirmed');
  assert.equal((await t.call(`/api/bookings/${b.token}/accept`, { method: 'POST', admin: false, body: {} })).status, 409);

  const b2 = (await post({ email: 'rech@example.com', name: 'Rechazo Uno', date: date2, start_min: s2[0] })).data.booking;
  const id2 = t.app.store.list('bookings').find((x) => x.token === b2.token).id;
  const rj = await t.call(`/api/admin/bookings/${id2}/reject`, { method: 'POST', body: { message: 'Estaré de vacaciones' } });
  assert.equal(rj.data.booking.status, 'cancelled');
  assert.ok(t.app.store.list('outbox').some((o) => o.kind === 'rejection' && o.text.includes('vacaciones')));
});

test('bonos regalo: compra, activación, canje parcial y saldo', async () => {
  const buy = await t.call('/api/vouchers', { method: 'POST', admin: false, body: { amount_cents: 5000, buyer_name: 'Elena Gil', buyer_email: 'elena@example.com', recipient_name: 'Sara', recipient_email: 'sara@example.com', message: 'Feliz cumple', consent: true } });
  assert.equal(buy.status, 201); assert.equal(buy.data.voucher.status, 'pendiente');
  const code = buy.data.voucher.code; assert.match(code, /^NOE-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal((await t.call('/api/vouchers', { method: 'POST', admin: false, body: { amount_cents: 100, buyer_name: 'x y', buyer_email: 'a@b.co', consent: true } })).status, 400);
  const id = t.app.store.list('vouchers').find((v) => v.code === code).id;
  // no se puede canjear mientras no esté pagado
  const date = await freeDay(t.call, 6, 25);
  const slots = (await t.call(`/api/availability?service_id=6&date=${date}`, { admin: false })).data.slots;
  const bk = (await t.call('/api/bookings', { method: 'POST', admin: false, body: { ...person, email: 'sara@example.com', name: 'Sara Gil', service_id: 6, date, start_min: slots[0].start_min } })).data.booking;
  const bid = t.app.store.list('bookings').find((b) => b.token === bk.token).id;
  assert.equal((await t.call(`/api/admin/bookings/${bid}`, { method: 'PATCH', body: { voucher_code: code } })).status, 409);
  const act = await t.call(`/api/admin/vouchers/${id}`, { method: 'PATCH', body: { action: 'activate', pay_method: 'bizum' } });
  assert.equal(act.data.status, 'activo');
  assert.ok(t.app.store.list('outbox').some((o) => o.kind === 'voucher' && o.to === 'sara@example.com' && o.text.includes(code)));
  const price = t.app.store.find('bookings', bid).price_cents;
  const r = await t.call(`/api/admin/bookings/${bid}`, { method: 'PATCH', body: { voucher_code: code, voucher_cents: 2000 } });
  assert.equal(r.data.paid_cents, 2000); assert.equal(r.data.pay_method, 'bono'); assert.equal(r.data.status, 'done');
  const view = (await t.call(`/api/vouchers/${code}`, { admin: false })).data.voucher;
  assert.equal(view.balance_cents, 3000); assert.equal(view.status, 'activo');
  assert.ok(price >= 0);
  const list = (await t.call('/api/admin/vouchers')).data; assert.ok(list.outstanding >= 3000);
});

test('tienda: pedido, stock, cobro y paso a ingresos', async () => {
  const prods = (await t.call('/api/products', { admin: false })).data; assert.ok(prods.length >= 3);
  const p = (await t.call('/api/admin/products', { method: 'POST', body: { name: 'Crema prueba', price_cents: 2000, stock: 3, vat_rate: 21 } })).data;
  const bad = await t.call('/api/orders', { method: 'POST', admin: false, body: { name: 'Pepa Luz', email: 'pepa@example.com', items: [{ product_id: p.id, qty: 5 }], consent: true } });
  assert.equal(bad.status, 409);
  const ord = await t.call('/api/orders', { method: 'POST', admin: false, body: { name: 'Pepa Luz', email: 'pepa@example.com', items: [{ product_id: p.id, qty: 2 }], consent: true } });
  assert.equal(ord.status, 201); assert.equal(ord.data.order.total_cents, 4000);
  assert.equal(t.app.store.find('products', p.id).stock, 1);
  const oid = t.app.store.list('orders').at(-1).id;
  await t.call(`/api/admin/orders/${oid}`, { method: 'PATCH', body: { paid: true, pay_method: 'efectivo', status: 'entregado' } });
  const ym = today().slice(0, 4), led = (await t.call(`/api/admin/accounting?from=${ym}-01-01&to=${ym}-12-31`)).data.income;
  const row = led.find((x) => x.concept === 'Crema prueba'); assert.ok(row); assert.equal(row.total, 4000); assert.equal(row.base, 3306);
  await t.call(`/api/admin/orders/${oid}`, { method: 'PATCH', body: { status: 'cancelado' } });
  assert.equal(t.app.store.find('products', p.id).stock, 3);
});

test('referidos: código, validación y premio doble al realizarse la cita', async () => {
  const sponsor = (await t.call('/api/admin/clients', { method: 'POST', body: { name: 'Marina Ruiz', email: 'marina@example.com', phone: '611000111' } })).data;
  const det = (await t.call(`/api/admin/clients/${sponsor.id}`)).data; const code = det.referral.code; assert.match(code, /^MARINA\d\d$/);
  const date = await freeDay(t.call, 6, 30);
  const slots = (await t.call(`/api/availability?service_id=6&date=${date}`, { admin: false })).data.slots;
  const post = (body) => t.call('/api/bookings', { method: 'POST', admin: false, headers: { 'X-Forwarded-For': '9.9.9.9' }, body: { ...person, service_id: 6, date, ...body } });
  assert.equal((await post({ email: 'nueva@example.com', name: 'Nueva Amiga', start_min: slots[0].start_min, referral: 'NOEXISTE99' })).status, 400);
  const ok1 = await post({ email: 'nueva@example.com', name: 'Nueva Amiga', start_min: slots[0].start_min, referral: code.toLowerCase() }); assert.equal(ok1.status, 201);
  const bid = t.app.store.list('bookings').find((b) => b.token === ok1.data.booking.token).id;
  assert.ok(t.app.store.find('bookings', bid).referred_by === sponsor.id);
  const before = t.app.store.list('vouchers').length;
  await t.call(`/api/admin/bookings/${bid}`, { method: 'PATCH', body: { status: 'done' } });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(t.app.store.list('vouchers').length, before + 2);
  await t.call(`/api/admin/bookings/${bid}`, { method: 'PATCH', body: { internal_notes: 'x' } });
  assert.equal(t.app.store.list('vouchers').length, before + 2, 'el premio se da una sola vez');
  const rf = (await t.call('/api/admin/referrals')).data; assert.equal(rf.referrers[0].friends.length, 1);
});

test('SEO: páginas por tratamiento, canonical con la URL real, sitemap y robots', async () => {
  const home = await t.call('/', { admin: false });
  assert.match(home.data, /<link rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/">/);
  assert.match(home.data, /"@type":"FAQPage"/); assert.doesNotMatch(home.data, /%SITE%/);
  const mb = await t.call('/microblading-alcantarilla-murcia', { admin: false });
  assert.equal(mb.status, 200); assert.match(mb.data, /<h1>Microblading en Alcantarilla, Murcia<\/h1>/); assert.match(mb.data, /rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/microblading-alcantarilla-murcia"/);
  const sm = new TextDecoder().decode((await t.call('/sitemap.xml', { admin: false })).data);
  assert.match(sm, /powder-brows-murcia/); assert.doesNotMatch(sm, /admin|cita<|bono/);
  assert.match((await t.call('/robots.txt', { admin: false })).data, /Disallow: \/admin/);
});
