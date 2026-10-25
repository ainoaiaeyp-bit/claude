import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index.js';
import { addDays, nowLocal } from '../server/core/util.js';

export async function boot(opts = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nd-'));
  const app = await createApp({ dataDir, adminPassword: 'test-password-1', quiet: true, extractor: null, ...opts });
  await new Promise((r) => app.server.listen(0, r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  let cookie = '';
  const call = async (url, o = {}) => {
    const raw = o.raw;
    const r = await fetch(base + url, { method: o.method || 'GET', headers: { ...(raw ? {} : { 'Content-Type': 'application/json' }), ...(o.headers || {}), ...(cookie && o.admin !== false ? { Cookie: cookie } : {}) }, body: raw || (o.body !== undefined ? JSON.stringify(o.body) : undefined) });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, headers: r.headers, data: ct.includes('json') ? await r.json() : ct.startsWith('text') ? await r.text() : new Uint8Array(await r.arrayBuffer()) };
  };
  const login = async () => { const r = await call('/api/admin/login', { method: 'POST', body: { password: 'test-password-1' }, admin: false }); cookie = r.headers.get('set-cookie').split(';')[0]; return r; };
  return { app, base, call, login, close: () => app.close(), dataDir };
}

export async function freeDay(call, serviceId, offset = 14) {
  const month = addDays(nowLocal().date, offset).slice(0, 7);
  const { data } = await call(`/api/availability?service_id=${serviceId}&month=${month}`, { admin: false });
  return data.days[0];
}
export const person = { name: 'Ana Pérez', email: 'ana@example.com', phone: '+34 600 111 222', consent: true };
