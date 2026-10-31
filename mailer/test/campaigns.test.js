import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from './helpers.js';
import { importContacts, upsertContact, unsubscribeContact } from '../src/contacts.js';
import { runCampaign, campaignStats, sendProblems } from '../src/campaigns.js';
import { handleEvent } from '../src/webhook.js';
import { ResendError } from '../src/resend.js';

function seed(app, n) {
  const rows = Array.from({ length: n }, (_, i) => ({ email: `u${i}@x.com`, first_name: `U${i}` }));
  importContacts(app.db, rows, [1]);
  const id = Number(app.db.prepare(`INSERT INTO campaigns(name, subject, from_name, from_email, html, list_id, created_at)
    VALUES ('c','Hola {{first_name}}','Test','hola@test.com','<p>Hola</p>',1,'2026-01-01')`).run().lastInsertRowid);
  return id;
}

test('importar no reactiva bajas, rebotes ni quejas', () => {
  const app = makeApp();
  importContacts(app.db, [{ email: 'a@x.com' }, { email: 'b@x.com' }, { email: 'c@x.com' }], [1]);
  unsubscribeContact(app.db, app.db.prepare("SELECT token FROM contacts WHERE email='a@x.com'").get().token);
  app.db.prepare("UPDATE contacts SET status='bounced' WHERE email='b@x.com'").run();
  const s = importContacts(app.db, [{ email: 'A@X.com' }, { email: 'b@x.com' }, { email: 'c@x.com' }, { email: 'mal' }, { email: 'c@x.com' }], [1]);
  assert.deepEqual(s, { added: 0, updated: 1, blocked: 2, invalid: 1, duplicates: 1 });
  assert.equal(app.db.prepare("SELECT status FROM contacts WHERE email='a@x.com'").get().status, 'unsubscribed');
});

test('alta propia reactiva una baja pero no un rebote', () => {
  const app = makeApp();
  upsertContact(app.db, { email: 'a@x.com', listIds: [1] });
  upsertContact(app.db, { email: 'b@x.com', listIds: [1] });
  unsubscribeContact(app.db, app.db.prepare("SELECT token FROM contacts WHERE email='a@x.com'").get().token);
  app.db.prepare("UPDATE contacts SET status='bounced' WHERE email='b@x.com'").run();
  upsertContact(app.db, { email: 'a@x.com', listIds: [1], selfService: true });
  upsertContact(app.db, { email: 'b@x.com', listIds: [1], selfService: true });
  assert.equal(app.db.prepare("SELECT status FROM contacts WHERE email='a@x.com'").get().status, 'subscribed');
  assert.equal(app.db.prepare("SELECT status FROM contacts WHERE email='b@x.com'").get().status, 'bounced');
});

test('envío en lotes de 100, con cabeceras de baja y personalización', async () => {
  const app = makeApp();
  const id = seed(app, 250);
  await runCampaign(app.ctx, id);
  assert.deepEqual(app.resend.batches.map((b) => b.messages.length), [100, 100, 50]);
  const m = app.resend.batches[0].messages[0];
  assert.equal(m.from, 'Test <hola@test.com>');
  assert.equal(m.subject, 'Hola U0');
  assert.match(m.headers['List-Unsubscribe'], /^<http:\/\/localhost:0\/u\/[0-9a-f]{32}\?c=\d+>$/);
  assert.equal(m.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.match(m.html, /Calle 1, Madrid/);
  assert.ok(app.resend.batches.every((b) => b.opts.idempotencyKey));
  const c = app.db.prepare('SELECT * FROM campaigns WHERE id=?').get(id);
  assert.equal(c.status, 'sent');
  assert.equal(campaignStats(app.db, id).sent, 250);
});

test('no envía a bajas, pendientes ni rebotes', async () => {
  const app = makeApp();
  const id = seed(app, 4);
  app.db.prepare("UPDATE contacts SET status='unsubscribed' WHERE email='u0@x.com'").run();
  app.db.prepare("UPDATE contacts SET status='pending' WHERE email='u1@x.com'").run();
  app.db.prepare("UPDATE contacts SET status='bounced' WHERE email='u2@x.com'").run();
  await runCampaign(app.ctx, id);
  assert.deepEqual(app.resend.batches[0].messages.map((m) => m.to[0]), ['u3@x.com']);
});

test('si Resend cae a mitad, la campaña se pausa y al reanudar no duplica envíos', async () => {
  const app = makeApp({}, { failOn: (n) => (n === 2 ? new ResendError('caído', 503) : null) });
  const id = seed(app, 150);
  await runCampaign(app.ctx, id);
  let c = app.db.prepare('SELECT * FROM campaigns WHERE id=?').get(id);
  assert.equal(c.status, 'paused');
  assert.match(c.last_error, /caído/);
  assert.equal(campaignStats(app.db, id).sent, 100);

  await runCampaign(app.ctx, id); // reanudar
  c = app.db.prepare('SELECT * FROM campaigns WHERE id=?').get(id);
  assert.equal(c.status, 'sent');
  assert.equal(campaignStats(app.db, id).sent, 150);
  // lote 1 (ok) + lote 3 (reintento del fallido): 150 destinatarios distintos, ninguno repetido
  const delivered = [0, 2].flatMap((i) => app.resend.batches[i].messages.map((m) => m.to[0]));
  assert.equal(delivered.length, 150);
  assert.equal(new Set(delivered).size, 150);
});

test('un error 4xx de validación marca el lote como fallido y no bloquea el resto', async () => {
  const app = makeApp({}, { failOn: (n) => (n === 1 ? new ResendError('dominio no verificado', 422) : null) });
  const id = seed(app, 150);
  await runCampaign(app.ctx, id);
  const st = campaignStats(app.db, id);
  assert.equal(st.failed, 100);
  assert.equal(st.sent, 50);
  assert.equal(app.db.prepare('SELECT status FROM campaigns WHERE id=?').get(id).status, 'sent');
});

test('401/403 pausa la campaña de inmediato', async () => {
  const app = makeApp({}, { failOn: () => new ResendError('API key inválida', 401) });
  const id = seed(app, 5);
  await runCampaign(app.ctx, id);
  assert.equal(app.db.prepare('SELECT status FROM campaigns WHERE id=?').get(id).status, 'paused');
  assert.equal(campaignStats(app.db, id).total, 0);
});

test('sendProblems detecta campañas incompletas', () => {
  const app = makeApp();
  const id = Number(app.db.prepare("INSERT INTO campaigns(name, created_at) VALUES ('x','2026-01-01')").run().lastInsertRowid);
  const p = sendProblems(app.db, app.db.prepare('SELECT * FROM campaigns WHERE id=?').get(id));
  assert.ok(p.some((x) => /asunto/i.test(x)) && p.some((x) => /remitente/i.test(x)) && p.some((x) => /lista/i.test(x)));
});

test('webhook: estadísticas, idempotencia y rebote permanente', async () => {
  const app = makeApp();
  const id = seed(app, 2);
  await runCampaign(app.ctx, id);
  const [a, b] = app.db.prepare('SELECT * FROM sends ORDER BY id').all();
  const ev = (type, send, data = {}) => ({ type, created_at: '2026-01-01T10:00:00Z', data: { email_id: send.resend_id, ...data } });

  assert.equal(handleEvent(app.db, ev('email.delivered', a), 'e1'), 'applied');
  assert.equal(handleEvent(app.db, ev('email.delivered', a), 'e1'), 'duplicate');
  handleEvent(app.db, ev('email.opened', a), 'e2');
  handleEvent(app.db, ev('email.opened', a), 'e3');
  handleEvent(app.db, ev('email.clicked', a), 'e4');
  assert.equal(handleEvent(app.db, ev('email.delivered', { resend_id: 'otro' }), 'e5'), 'unknown');
  handleEvent(app.db, ev('email.bounced', b, { bounce: { type: 'Transient' } }), 'e6');
  assert.equal(app.db.prepare('SELECT status FROM contacts WHERE id=?').get(b.contact_id).status, 'subscribed');
  handleEvent(app.db, ev('email.bounced', b, { bounce: { type: 'Permanent' } }), 'e7');
  assert.equal(app.db.prepare('SELECT status FROM contacts WHERE id=?').get(b.contact_id).status, 'bounced');
  handleEvent(app.db, ev('email.complained', a), 'e8');
  assert.equal(app.db.prepare('SELECT status FROM contacts WHERE id=?').get(a.contact_id).status, 'complained');

  const st = campaignStats(app.db, id);
  assert.deepEqual([st.delivered, st.opened, st.clicked, st.bounced, st.complained], [1, 1, 1, 1, 1]);
  assert.equal(app.db.prepare('SELECT opens FROM sends WHERE id=?').get(a.id).opens, 2);
});
