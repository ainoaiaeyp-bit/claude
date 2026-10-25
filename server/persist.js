/* Persistencia SQLite del almacén de documentos (node:sqlite, sin dependencias). */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { COLLECTIONS } from './core/store.js';

export function openPersist(dir, file = 'estudio.db') {
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, file));
  db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS docs (col TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY (col, id)); CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, json TEXT NOT NULL);');
  const put = db.prepare('INSERT INTO docs(col,id,json) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET json=excluded.json');
  const del = db.prepare('DELETE FROM docs WHERE col=? AND id=?');
  const setS = db.prepare('INSERT INTO settings(key,json) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json');
  return {
    load() {
      const data = { settings: {} };
      for (const c of COLLECTIONS) data[c] = [];
      for (const r of db.prepare('SELECT col, json FROM docs').all()) if (data[r.col]) data[r.col].push(JSON.parse(r.json));
      for (const r of db.prepare('SELECT key, json FROM settings').all()) data.settings[r.key] = JSON.parse(r.json);
      return data;
    },
    hook(ch) {
      if (ch.op === 'put') put.run(ch.col, String(ch.doc.id), JSON.stringify(ch.doc));
      else if (ch.op === 'del') del.run(ch.col, String(ch.id));
      else if (ch.op === 'setting') setS.run(ch.key, JSON.stringify(ch.value));
      else if (ch.op === 'reset') {
        db.exec('BEGIN'); db.exec('DELETE FROM docs');
        for (const c of COLLECTIONS) for (const d of ch.data[c] || []) put.run(c, String(d.id), JSON.stringify(d));
        db.exec('DELETE FROM settings WHERE key NOT LIKE \'\\_%\' ESCAPE \'\\\'');
        for (const [k, v] of Object.entries(ch.data.settings || {})) setS.run(k, JSON.stringify(v));
        db.exec('COMMIT');
      }
    },
    close: () => db.close(),
  };
}
