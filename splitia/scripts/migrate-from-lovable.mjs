#!/usr/bin/env node
// Copia TODOS los datos de "Gastos hogar" (Lovable/Supabase) a tu Supabase propio.
// SOLO LEE de la app vieja. No modifica ni borra nada allí.
//
// Uso:
//   OLD_EMAIL=tu@correo OLD_PASSWORD=... \
//   NEW_URL=https://xxxx.supabase.co NEW_SERVICE_ROLE_KEY=... \
//   node scripts/migrate-from-lovable.mjs [--dry-run]
//
// 1ª ejecución: crea migration/users.json con las personas del grupo; rellena su correo y vuelve a ejecutar.
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import {
  TABLES, chunk, collectUserIds, remapRow, remapAttachmentPath,
  buildUserTemplate, missingEmails, compareCounts,
} from './migrate-core.mjs';

const env = (k, d) => process.env[k] ?? d;
const OLD_URL = env('OLD_URL', 'https://yctgxfcyyzexgaxnyqeg.supabase.co');
const OLD_KEY = env('OLD_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdGd4ZmN5eXpleGdheG55cWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTQ1MjksImV4cCI6MjA4NTU5MDUyOX0.r6MuXowwvt-ZIyg3aZC9ZgnolDre-HnLbLwRCktymNY');
const { OLD_EMAIL, OLD_PASSWORD, NEW_URL, NEW_SERVICE_ROLE_KEY } = process.env;
const DRY = process.argv.includes('--dry-run');
const DIR = 'migration';
const USERS_FILE = `${DIR}/users.json`;

for (const [k, v] of Object.entries({ OLD_EMAIL, OLD_PASSWORD, NEW_URL, NEW_SERVICE_ROLE_KEY })) {
  if (!v && !(DRY && k.startsWith('NEW_'))) { console.error(`Falta la variable ${k}`); process.exit(2); }
}
const log = (...a) => console.log(...a);

async function readAll(client, table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select('*').range(from, from + 999);
    if (error) throw new Error(`Leyendo ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const old = createClient(OLD_URL, OLD_KEY, { auth: { persistSession: false } });
const { data: auth, error: authErr } = await old.auth.signInWithPassword({ email: OLD_EMAIL, password: OLD_PASSWORD });
if (authErr) { console.error('No se pudo entrar en la app vieja:', authErr.message); process.exit(1); }
const oldMe = auth.user.id;
log(`✔ Sesión en la app vieja como ${OLD_EMAIL}`);

// 1) Leer todo (solo lectura)
const data = {};
for (const t of TABLES) {
  data[t.name] = await readAll(old, t.name);
  log(`  leído ${t.name.padEnd(24)} ${data[t.name].length}`);
}
const profiles = await readAll(old, 'profiles');
const names = Object.fromEntries(profiles.map((p) => [p.user_id, p.display_name]));
const userIds = collectUserIds(data);
if (!userIds.includes(oldMe)) userIds.push(oldMe);

// 2) Plantilla de usuarios
mkdirSync(DIR, { recursive: true });
let tpl;
if (existsSync(USERS_FILE)) tpl = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
else {
  tpl = buildUserTemplate(userIds, names, { [oldMe]: OLD_EMAIL });
  writeFileSync(USERS_FILE, JSON.stringify(tpl, null, 2));
}
const bad = missingEmails(tpl);
if (bad.length) {
  console.error(`\nRellena el correo de estas personas en ${USERS_FILE} y vuelve a ejecutar:`);
  bad.forEach((u) => console.error(`  - ${u.display_name || u.old_id}`));
  process.exit(3);
}
const unknown = userIds.filter((id) => !tpl.some((u) => u.old_id === id));
if (unknown.length) { console.error(`users.json no incluye: ${unknown.join(', ')}`); process.exit(3); }

if (DRY) {
  log('\n(dry-run) Todo listo. No se ha escrito nada. Usuarios a crear/reutilizar:');
  tpl.forEach((u) => log(`  ${u.display_name} <${u.email}>`));
  process.exit(0);
}

// 3) Usuarios en el backend nuevo
const nw = createClient(NEW_URL, NEW_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existing, error: listErr } = await nw.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error('No se pudo listar usuarios nuevos:', listErr.message); process.exit(1); }
const map = {};
const recovery = [];
for (const u of tpl) {
  const email = u.email.toLowerCase();
  let found = existing.users.find((x) => x.email?.toLowerCase() === email);
  if (!found) {
    const { data: created, error } = await nw.auth.admin.createUser({
      email, email_confirm: true, password: randomBytes(18).toString('base64url'),
      user_metadata: { display_name: u.display_name || email.split('@')[0] },
    });
    if (error) { console.error(`No se pudo crear ${email}:`, error.message); process.exit(1); }
    found = created.user;
    recovery.push(email);
  }
  map[u.old_id] = found.id;
}
log(`✔ Usuarios nuevos listos (${Object.keys(map).length}); creados ahora: ${recovery.length}`);

// 4) Copiar tablas (upsert por id: se puede repetir sin duplicar)
for (const t of TABLES) {
  let rows = data[t.name];
  if (!rows.length) continue;
  if (t.name === 'expense_attachments') continue; // se copian aparte, con sus ficheros
  rows = rows.map((r) => remapRow(r, t.users, map, t.deferred ?? []));
  for (const part of chunk(rows, 500)) {
    const q = t.conflict
      ? nw.from(t.name).upsert(part, { onConflict: t.conflict, ignoreDuplicates: true })
      : nw.from(t.name).upsert(part, { onConflict: 'id' });
    const { error } = await q;
    if (error) { console.error(`Error escribiendo ${t.name}:`, error.message); process.exit(1); }
  }
  log(`  copiado ${t.name.padEnd(24)} ${rows.length}`);
}

// 4b) Devoluciones: refund_of (autorreferencia) en segunda pasada
for (const e of data.expenses.filter((x) => x.refund_of)) {
  const { error } = await nw.from('expenses').update({ refund_of: e.refund_of }).eq('id', e.id);
  if (error) console.error(`refund_of ${e.id}:`, error.message);
}

// 4c) Nombres de perfil (el perfil lo crea un trigger al crear el usuario)
for (const u of tpl) {
  if (u.display_name) await nw.from('profiles').update({ display_name: u.display_name }).eq('user_id', map[u.old_id]);
}

// 4d) Adjuntos: fichero + fila
let filesOk = 0, filesFail = 0;
for (const a of data.expense_attachments) {
  const newPath = remapAttachmentPath(a.file_url, map);
  const { data: blob, error: dErr } = await old.storage.from('expense-attachments').download(a.file_url);
  if (dErr) { filesFail++; log(`  ⚠ no se pudo descargar ${a.file_url}: ${dErr.message}`); }
  else {
    const { error: uErr } = await nw.storage.from('expense-attachments').upload(newPath, blob, { upsert: true, contentType: a.file_type ?? undefined });
    if (uErr) { filesFail++; log(`  ⚠ no se pudo subir ${newPath}: ${uErr.message}`); continue; }
    filesOk++;
  }
  await nw.from('expense_attachments').upsert({ ...a, file_url: newPath }, { onConflict: 'id' });
}
log(`  adjuntos: ${filesOk} ficheros copiados, ${filesFail} con problemas (${data.expense_attachments.length} filas)`);

// 5) Verificación de recuentos
const oldCounts = Object.fromEntries(TABLES.map((t) => [t.name, data[t.name].length]));
const newCounts = {};
for (const t of TABLES) {
  const { count, error } = await nw.from(t.name).select('*', { count: 'exact', head: true });
  if (error) { console.error(`Contando ${t.name}:`, error.message); continue; }
  newCounts[t.name] = count;
}
const report = compareCounts(oldCounts, newCounts);
log('\nVerificación (antigua → nueva):');
report.forEach((r) => log(`  ${r.ok ? '✔' : '✘'} ${r.table.padEnd(24)} ${r.old} → ${r.new}`));
const sum = (rows) => rows.reduce((s, r) => s + Number(r.amount), 0);
const { data: nx } = await nw.from('expenses').select('amount');
log(`  Σ importes de gastos: ${sum(data.expenses).toFixed(2)} → ${sum(nx ?? []).toFixed(2)}`);

if (recovery.length) {
  log('\nUsuarios creados: entran con «He olvidado mi contraseña» para fijar la suya:');
  recovery.forEach((e) => log(`  ${e}`));
}
process.exit(report.every((r) => r.ok) ? 0 : 1);
