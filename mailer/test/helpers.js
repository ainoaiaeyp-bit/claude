import { createHmac } from 'node:crypto';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';

export const silent = { info() {}, warn() {}, error() {} };

export function fakeResend({ failOn } = {}) {
  const r = {
    dryRun: false, batches: [], singles: [], n: 0,
    async sendBatch(messages, opts) {
      r.batches.push({ messages, opts });
      if (failOn) { const e = failOn(r.batches.length); if (e) throw e; }
      return messages.map(() => `id_${++r.n}`);
    },
    async send(m) { r.singles.push(m); return `id_${++r.n}`; },
  };
  return r;
}

export function makeApp(over = {}, resendOpts) {
  const config = { ...loadConfig({ ADMIN_PASSWORD: 'secret-pass', BASE_URL: 'http://localhost:0', FROM_EMAIL: 'hola@test.com', FROM_NAME: 'Test', COMPANY_ADDRESS: 'Calle 1, Madrid', SEND_INTERVAL_MS: '0' }), ...over };
  const resend = fakeResend(resendOpts);
  const app = createApp(config, { resend, log: silent, db: openDb(':memory:') });
  return { ...app, config, resend, db: app.ctx.db };
}

export async function listen(app) {
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const auth = 'Basic ' + Buffer.from('admin:secret-pass').toString('base64');
  const call = (path, { method = 'GET', body, headers = {}, authed = true } = {}) =>
    fetch(base + path, {
      method, redirect: 'manual',
      headers: { ...(authed ? { Authorization: auth } : {}), ...headers },
      body,
    });
  const form = (obj) => ({ body: new URLSearchParams(obj).toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return { base, call, form, close: () => new Promise((r) => app.server.close(r)) };
}

export function sign(secretB64, id, ts, body) {
  const sig = createHmac('sha256', Buffer.from(secretB64, 'base64')).update(`${id}.${ts}.${body}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': String(ts), 'svix-signature': `v1,${sig}` };
}
