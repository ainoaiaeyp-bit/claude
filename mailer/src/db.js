import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'subscribed'
    CHECK (status IN ('subscribed','pending','unsubscribed','bounced','complained')),
  token TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  subscribed_at TEXT,
  unsubscribed_at TEXT,
  last_confirmation_at TEXT
);
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS list_contacts (
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (list_id, contact_id)
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  reply_to TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','paused','sent')),
  total INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE TABLE IF NOT EXISTS sends (
  id INTEGER PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  resend_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  error TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL,
  delivered_at TEXT,
  first_open_at TEXT,
  first_click_at TEXT,
  opens INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  bounced_at TEXT,
  complained_at TEXT,
  unsubscribed_at TEXT,
  UNIQUE (campaign_id, contact_id)
);
CREATE INDEX IF NOT EXISTS idx_sends_resend ON sends(resend_id);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  if (!db.prepare('SELECT 1 FROM lists LIMIT 1').get()) {
    db.prepare('INSERT INTO lists(name, created_at) VALUES (?, ?)').run('General', new Date().toISOString());
  }
  return db;
}

export function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
