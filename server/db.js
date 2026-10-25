import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, process.env.DB_FILE || 'citas.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Maquillaje',
  description TEXT NOT NULL DEFAULT '',
  duration_min INTEGER NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  price_from INTEGER NOT NULL DEFAULT 0,
  allow_home INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL REFERENCES services(id),
  service_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  start_min INTEGER NOT NULL,
  end_min INTEGER NOT NULL,
  location TEXT NOT NULL DEFAULT 'studio',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'web',
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date, status);
CREATE TABLE IF NOT EXISTS blocked_dates (
  date TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const DEFAULT_HOURS = {
  0: [],
  1: [[600, 840], [960, 1200]],
  2: [[600, 840], [960, 1200]],
  3: [[600, 840], [960, 1200]],
  4: [[600, 840], [960, 1200]],
  5: [[600, 840], [960, 1200]],
  6: [[540, 840]]
};

const DEFAULTS = {
  businessName: 'Noelia Duque Make up Artist',
  tagline: 'Maquillaje profesional que realza tu belleza natural',
  city: 'España',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  instagram: 'https://www.instagram.com/',
  notificationEmail: '',
  hours: JSON.stringify(DEFAULT_HOURS),
  slotStep: '30',
  buffer: '15',
  minNoticeHours: '24',
  maxDaysAhead: '120',
  cancelHours: '24',
  autoConfirm: '0',
  depositInfo: '',
  homeFeeInfo: 'Desplazamiento a domicilio con suplemento según zona.'
};

export function getSettings() {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return out;
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, String(value));
}

export function getSecret() {
  let row = db.prepare("SELECT value FROM settings WHERE key='_secret'").get();
  if (!row) {
    setSetting('_secret', crypto.randomBytes(32).toString('hex'));
    row = db.prepare("SELECT value FROM settings WHERE key='_secret'").get();
  }
  return row.value;
}

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [s, h] = stored.split(':');
  const hash = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
  const known = Buffer.from(h, 'hex');
  return known.length === hash.length && crypto.timingSafeEqual(hash, known);
}

export function seed() {
  if (!db.prepare("SELECT 1 FROM settings WHERE key='_seeded'").get()) {
    const svc = db.prepare(`INSERT INTO services
      (name, category, description, duration_min, price_cents, price_from, allow_home, sort)
      VALUES (?,?,?,?,?,?,?,?)`);
    const list = [
      ['Maquillaje social', 'Eventos', 'Look elegante y duradero para cenas, celebraciones y ocasiones especiales. Incluye preparación de la piel y fijación para todo el día.', 60, 6000, 0, 1],
      ['Maquillaje de novia', 'Novias', 'Tu look de boda diseñado a medida, resistente a emociones, fotos y largas horas. Incluye retoque de labios para llevar.', 90, 15000, 0, 1],
      ['Prueba de novia', 'Novias', 'Una sesión previa para definir juntas tu look perfecto antes del gran día, con fotografías de referencia.', 90, 7500, 0, 0],
      ['Maquillaje de invitada', 'Eventos', 'Bodas, comuniones y bautizos: un acabado luminoso y favorecedor que aguanta de la ceremonia al último baile.', 60, 5500, 0, 1],
      ['Sesión de fotografía / editorial', 'Profesional', 'Maquillaje técnico para books, campañas y producciones, pensado para cámara y luz de estudio.', 75, 8000, 1, 1],
      ['Clase de automaquillaje', 'Formación', 'Aprende a maquillarte según tu rostro, tu piel y tu día a día, con tu propia bolsa de maquillaje y una guía personalizada.', 90, 8500, 0, 0]
    ];
    list.forEach((s, i) => svc.run(s[0], s[1], s[2], s[3], s[4], s[5], s[6], i));
    setSetting('_seeded', '1');
  }
  if (!db.prepare("SELECT 1 FROM settings WHERE key='adminHash'").get()) {
    const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
    setSetting('adminHash', hashPassword(pw));
    if (!process.env.ADMIN_PASSWORD) {
      console.log('\n  ┌──────────────────────────────────────────────┐');
      console.log(`  │  Contraseña inicial del panel:  ${pw.padEnd(13)}  │`);
      console.log('  │  Entra en /admin y cámbiala en Ajustes.       │');
      console.log('  └──────────────────────────────────────────────┘\n');
    }
  }
  getSecret();
}
