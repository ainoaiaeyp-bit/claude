import test from 'node:test';
import assert from 'node:assert/strict';
import { fillVars, renderEmail, htmlToText } from '../src/render.js';
import { contactsFromCsv, parseCsv, csvCell } from '../src/csv.js';
import { ResendClient } from '../src/resend.js';
import { verifyWebhook } from '../src/webhook.js';
import { sign, silent } from './helpers.js';

test('fillVars: valor, fallback y escape HTML', () => {
  assert.equal(fillVars('Hola {{first_name|amigo}}', { first_name: '' }), 'Hola amigo');
  assert.equal(fillVars('Hola {{ first_name }}', { first_name: 'Ana' }), 'Hola Ana');
  assert.equal(fillVars('{{first_name}}', { first_name: '<b>"x"</b>' }, { escape: true }), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  assert.equal(fillVars('{{desconocida|x}}', {}), 'x');
});

test('renderEmail: añade pie con baja y dirección si falta {{unsubscribe_url}}', () => {
  const c = { email: 'a@b.com', first_name: 'Ana', last_name: '' };
  const r = renderEmail({ html: '<p>Hola {{first_name}}</p>', contact: c, unsubUrl: 'http://x/u/t', address: 'Calle 1', preheader: 'pre' });
  assert.match(r.html, /<!doctype html>/i);
  assert.match(r.html, /href="http:\/\/x\/u\/t"/);
  assert.match(r.html, /Calle 1/);
  assert.match(r.html, /display:none[^>]*>pre</);
  assert.match(r.text, /Hola Ana/);
});

test('renderEmail: no duplica el pie si la plantilla ya trae la baja', () => {
  const c = { email: 'a@b.com', first_name: '', last_name: '' };
  const r = renderEmail({ html: '<p><a href="{{unsubscribe_url}}">baja</a></p>', contact: c, unsubUrl: 'http://x/u/t' });
  assert.equal(r.html.match(/http:\/\/x\/u\/t/g).length, 1);
});

test('renderEmail: el nombre del contacto no puede inyectar HTML', () => {
  const c = { email: 'a@b.com', first_name: '<script>alert(1)</script>', last_name: '' };
  const r = renderEmail({ html: '<p>{{first_name}}</p>', contact: c, unsubUrl: 'u' });
  assert.doesNotMatch(r.html, /<script>/);
});

test('htmlToText: enlaces y listas', () => {
  const t = htmlToText('<p>Mira <a href="https://x.com">aquí</a></p><ul><li>uno</li></ul>');
  assert.match(t, /Mira aquí \(https:\/\/x\.com\)/);
  assert.match(t, /• uno/);
});

test('CSV: separador ; con comillas y cabeceras en español', () => {
  const rows = contactsFromCsv('Correo;Nombre;Apellidos\r\nana@x.com;"Ana; María";García\r\nluis@x.com;Luis;\r\n');
  assert.deepEqual(rows, [
    { email: 'ana@x.com', first_name: 'Ana; María', last_name: 'García' },
    { email: 'luis@x.com', first_name: 'Luis', last_name: '' },
  ]);
});
test('CSV: sin cabecera y lista simple de emails', () => {
  assert.deepEqual(contactsFromCsv('a@x.com\nb@x.com').map((r) => r.email), ['a@x.com', 'b@x.com']);
  assert.equal(parseCsv('a,"b ""q"""\n')[0][1], 'b "q"');
});
test('CSV: neutraliza inyección de fórmulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell('normal'), 'normal');
});

test('ResendClient: reintenta en 429 respetando retry-after y manda Idempotency-Key', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (calls.length === 1) return new Response('{"message":"rate"}', { status: 429, headers: { 'retry-after': '0' } });
    return new Response(JSON.stringify({ data: [{ id: 'a' }, { id: 'b' }] }), { status: 200 });
  };
  const c = new ResendClient({ apiKey: 're_x', fetchImpl, log: silent });
  const ids = await c.sendBatch([{ to: ['1@x.com'] }, { to: ['2@x.com'] }], { idempotencyKey: 'k1' });
  assert.deepEqual(ids, ['a', 'b']);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].init.headers['Idempotency-Key'], 'k1');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer re_x');
  assert.match(calls[1].url, /\/emails\/batch$/);
});
test('ResendClient: 422 lanza error con status y no reintenta', async () => {
  let n = 0;
  const c = new ResendClient({ apiKey: 're_x', log: silent, fetchImpl: async () => { n++; return new Response('{"message":"bad from"}', { status: 422 }); } });
  await assert.rejects(c.sendBatch([{ to: ['a@x.com'] }]), (e) => e.status === 422 && /bad from/.test(e.message));
  assert.equal(n, 1);
});
test('ResendClient: sin clave simula y no llama a la red', async () => {
  const c = new ResendClient({ log: silent, fetchImpl: () => { throw new Error('no debería'); } });
  assert.equal(c.dryRun, true);
  assert.equal((await c.sendBatch([{}, {}])).length, 2);
});

test('verifyWebhook: acepta firma válida, rechaza manipulada, caducada y sin secreto', () => {
  const secretB64 = Buffer.from('supersecretkey').toString('base64');
  const secret = `whsec_${secretB64}`;
  const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'x' } });
  const ts = Math.floor(Date.now() / 1000);
  assert.equal(verifyWebhook(secret, sign(secretB64, 'm1', ts, body), body).type, 'email.delivered');
  assert.throws(() => verifyWebhook(secret, sign(secretB64, 'm1', ts, body), body + ' '), /firma/);
  assert.throws(() => verifyWebhook(secret, sign(secretB64, 'm1', ts - 3600, body), body), /tiempo/);
  assert.throws(() => verifyWebhook('', sign(secretB64, 'm1', ts, body), body), /sin configurar/);
  assert.throws(() => verifyWebhook(secret, {}, body), /cabeceras/);
});
