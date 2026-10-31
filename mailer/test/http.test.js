import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApp, listen, sign } from './helpers.js';

async function boot(over) {
  const app = makeApp(over);
  const h = await listen(app);
  return { app, h };
}

test('el panel exige autenticación y rechaza peticiones entre sitios', async (t) => {
  const { app, h } = await boot();
  t.after(h.close);
  assert.equal((await h.call('/', { authed: false })).status, 401);
  assert.equal((await h.call('/')).status, 200);
  assert.equal((await h.call('/health', { authed: false })).status, 200);
  const bad = await h.call('/', { headers: { Authorization: 'Basic ' + Buffer.from('admin:mal').toString('base64') } });
  assert.equal(bad.status, 401);
  const csrf = await h.call('/lists', { method: 'POST', ...h.form({ name: 'X' }), headers: { ...h.form({}).headers, Origin: 'https://evil.com' } });
  assert.equal(csrf.status, 403);
  const sfs = await h.call('/lists', { method: 'POST', ...h.form({ name: 'Y' }), headers: { ...h.form({}).headers, 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(sfs.status, 403);
  const nullOrigin = await h.call('/lists', { method: 'POST', ...h.form({ name: 'Z' }), headers: { ...h.form({}).headers, Origin: 'null' } });
  assert.equal(nullOrigin.status, 403); // sin Sec-Fetch-Site, un Origin "null" no es de fiar
  const same = await h.call('/lists', { method: 'POST', ...h.form({ name: 'Mismo sitio' }), headers: { ...h.form({}).headers, 'Sec-Fetch-Site': 'same-origin', Origin: 'null' } });
  assert.equal(same.status, 303); // formulario legítimo del navegador
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM lists').get().n, 2); // General + la del mismo sitio
});

test('doble opt-in: alta → email de confirmación → confirmar → baja', async (t) => {
  const { app, h } = await boot();
  t.after(h.close);
  const r = await h.call('/api/subscribe', { method: 'POST', authed: false, ...h.form({ email: 'Ana@Ejemplo.com', first_name: 'Ana', list: '1' }) });
  assert.equal(r.status, 200);
  let c = app.db.prepare('SELECT * FROM contacts').get();
  assert.equal(c.email, 'ana@ejemplo.com');
  assert.equal(c.status, 'pending');
  assert.equal(app.resend.singles.length, 1);
  assert.match(app.resend.singles[0].html, new RegExp(`/confirm/${c.token}`));

  // repetir el alta no reenvía la confirmación (anti-spam) y la respuesta es idéntica
  const again = await h.call('/api/subscribe', { method: 'POST', authed: false, ...h.form({ email: 'ana@ejemplo.com' }) });
  assert.equal(again.status, 200);
  assert.equal(app.resend.singles.length, 1);

  assert.equal((await h.call(`/confirm/${c.token}`, { authed: false })).status, 200);
  assert.equal(app.db.prepare('SELECT status FROM contacts').get().status, 'subscribed');

  // GET de la baja no da de baja (los escáneres de enlaces la abren): solo muestra el botón
  assert.equal((await h.call(`/u/${c.token}?c=1`, { authed: false })).status, 200);
  assert.equal(app.db.prepare('SELECT status FROM contacts').get().status, 'subscribed');
  const u = await h.call(`/u/${c.token}`, { method: 'POST', authed: false, body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(u.status, 200);
  assert.equal(app.db.prepare('SELECT status FROM contacts').get().status, 'unsubscribed');
  assert.equal((await h.call('/u/noexiste', { method: 'POST', authed: false })).status, 404);
});

test('alta pública: JSON, honeypot, email inválido y sin doble opt-in', async (t) => {
  const { app, h } = await boot({ doubleOptIn: false });
  t.after(h.close);
  const j = await h.call('/api/subscribe', { method: 'POST', authed: false, body: JSON.stringify({ email: 'a@b.com' }), headers: { 'Content-Type': 'application/json' } });
  assert.deepEqual(await j.json(), { ok: true, pending: false });
  assert.equal(app.db.prepare('SELECT status FROM contacts').get().status, 'subscribed');
  assert.equal(app.resend.singles.length, 0);
  await h.call('/api/subscribe', { method: 'POST', authed: false, ...h.form({ email: 'bot@b.com', website: 'http://spam' }) });
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM contacts WHERE email='bot@b.com'").get().n, 0);
  const bad = await h.call('/api/subscribe', { method: 'POST', authed: false, ...h.form({ email: 'nope' }) });
  assert.equal(bad.status, 400);
});

test('flujo completo del panel: importar → campaña → enviar → ver estadísticas', async (t) => {
  const { app, h } = await boot();
  t.after(h.close);
  let r = await h.call('/contacts/import', { method: 'POST', ...h.form({ data: 'email,nombre\nana@x.com,Ana\nluis@x.com,Luis', list: '1', consent: 'on' }) });
  assert.equal(r.status, 303);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM contacts WHERE status='subscribed'").get().n, 2);
  // sin consentimiento no importa
  await h.call('/contacts/import', { method: 'POST', ...h.form({ data: 'otro@x.com', list: '1' }) });
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM contacts').get().n, 2);

  r = await h.call('/campaigns', { method: 'POST' });
  const loc = r.headers.get('location');
  const id = loc.split('/').pop();
  await h.call(`/campaigns/${id}`, { method: 'POST', ...h.form({ name: 'Boletín', subject: 'Hola {{first_name}}', from_name: 'Test', from_email: 'hola@test.com', list_id: '1', html: '<p>Hola</p>', preheader: '', reply_to: '' }) });

  const confirm = await (await h.call(`/campaigns/${id}/send`)).text();
  assert.match(confirm, /Enviar a 2 personas/);
  await h.call(`/campaigns/${id}/test`, { method: 'POST', ...h.form({ to: 'yo@x.com' }) });
  assert.match(app.resend.singles.at(-1).subject, /^\[PRUEBA\] Hola Prueba/);

  r = await h.call(`/campaigns/${id}/send`, { method: 'POST' });
  assert.equal(r.status, 303);
  await app.ctx.lastJob;
  assert.equal(app.db.prepare('SELECT status FROM campaigns WHERE id=?').get(id).status, 'sent');
  const pageHtml = await (await h.call(`/campaigns/${id}`)).text();
  assert.match(pageHtml, /enviada/);
  // una campaña enviada no se puede editar ni reenviar
  await h.call(`/campaigns/${id}`, { method: 'POST', ...h.form({ name: 'hack' }) });
  assert.equal(app.db.prepare('SELECT name FROM campaigns WHERE id=?').get(id).name, 'Boletín');
  const resend2 = await h.call(`/campaigns/${id}/send`, { method: 'POST' });
  assert.match(new URL(resend2.headers.get('location'), 'http://x').searchParams.get('msg'), /ya se ha enviado/);

  const csv = await (await h.call('/contacts/export')).text();
  assert.match(csv, /ana@x\.com,Ana/);
});

test('el contenido del contacto no se ejecuta en el panel (XSS)', async (t) => {
  const { app, h } = await boot();
  t.after(h.close);
  await h.call('/contacts/import', { method: 'POST', ...h.form({ data: 'email,nombre\nx@x.com,"<script>alert(1)</script>"', list: '1', consent: 'on' }) });
  const body = await (await h.call('/contacts')).text();
  assert.doesNotMatch(body, /<script>alert\(1\)/);
  assert.match(body, /&lt;script&gt;/);
});

test('webhook HTTP: firma válida actualiza stats; inválida da 400', async (t) => {
  const secretB64 = Buffer.from('k'.repeat(24)).toString('base64');
  const { app, h } = await boot({ webhookSecret: `whsec_${secretB64}` });
  t.after(h.close);
  app.db.prepare("INSERT INTO contacts(email, token, created_at) VALUES ('a@x.com','tok','2026-01-01')").run();
  app.db.prepare("INSERT INTO campaigns(name, created_at) VALUES ('c','2026-01-01')").run();
  app.db.prepare("INSERT INTO sends(campaign_id, contact_id, resend_id, status, sent_at) VALUES (1,1,'em_1','sent','2026-01-01')").run();
  const body = JSON.stringify({ type: 'email.opened', created_at: new Date().toISOString(), data: { email_id: 'em_1' } });
  const ts = Math.floor(Date.now() / 1000);
  const ok = await h.call('/webhooks/resend', { method: 'POST', authed: false, body, headers: sign(secretB64, 'evt_1', ts, body) });
  assert.equal(ok.status, 200);
  assert.equal(app.db.prepare('SELECT opens FROM sends').get().opens, 1);
  const bad = await h.call('/webhooks/resend', { method: 'POST', authed: false, body, headers: { ...sign(secretB64, 'evt_2', ts, body), 'svix-signature': 'v1,AAAA' } });
  assert.equal(bad.status, 400);
  assert.equal(app.db.prepare('SELECT opens FROM sends').get().opens, 1);
});
