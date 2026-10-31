import { tx } from './db.js';
import { isEmail, newToken, normalizeEmail, now } from './util.js';

const BLOCKED = ['unsubscribed', 'bounced', 'complained'];

/**
 * Crea o actualiza un contacto y lo añade a las listas.
 * - Una importación NUNCA reactiva a quien se dio de baja, rebotó o se quejó.
 * - Una alta hecha por la propia persona (selfService) sí puede reactivar a quien se dio de baja,
 *   pero no a rebotes ni quejas.
 */
export function upsertContact(db, { email, first_name = '', last_name = '', listIds = [], status = 'subscribed', source = '', selfService = false }) {
  email = normalizeEmail(email);
  if (!isEmail(email)) return { result: 'invalid', email };
  first_name = String(first_name).trim().slice(0, 100);
  last_name = String(last_name).trim().slice(0, 100);

  return tx(db, () => {
    let c = db.prepare('SELECT * FROM contacts WHERE email = ?').get(email);
    let result;
    if (!c) {
      const r = db.prepare(
        'INSERT INTO contacts(email, first_name, last_name, status, token, source, created_at, subscribed_at) VALUES (?,?,?,?,?,?,?,?)',
      ).run(email, first_name, last_name, status, newToken(), source, now(), status === 'subscribed' ? now() : null);
      c = db.prepare('SELECT * FROM contacts WHERE id = ?').get(r.lastInsertRowid);
      result = 'added';
    } else {
      const canRevive = selfService ? c.status === 'unsubscribed' : false;
      if (BLOCKED.includes(c.status) && !canRevive) {
        result = 'blocked';
      } else {
        const newStatus = canRevive ? status : c.status === 'pending' && status === 'subscribed' ? 'subscribed' : c.status;
        db.prepare(
          `UPDATE contacts SET first_name = COALESCE(NULLIF(?, ''), first_name), last_name = COALESCE(NULLIF(?, ''), last_name),
           status = ?, subscribed_at = CASE WHEN ? = 'subscribed' AND status != 'subscribed' THEN ? ELSE subscribed_at END,
           unsubscribed_at = CASE WHEN ? = 'subscribed' THEN NULL ELSE unsubscribed_at END WHERE id = ?`,
        ).run(first_name, last_name, newStatus, newStatus, now(), newStatus, c.id);
        c = db.prepare('SELECT * FROM contacts WHERE id = ?').get(c.id);
        result = 'updated';
      }
    }
    if (result !== 'blocked') {
      const add = db.prepare('INSERT OR IGNORE INTO list_contacts(list_id, contact_id) VALUES (?, ?)');
      for (const id of listIds) add.run(id, c.id);
    }
    return { result, contact: c };
  });
}

export function importContacts(db, rows, listIds, source = 'import') {
  const summary = { added: 0, updated: 0, blocked: 0, invalid: 0, duplicates: 0 };
  const seen = new Set();
  for (const r of rows) {
    const key = normalizeEmail(r.email);
    if (key && seen.has(key)) { summary.duplicates++; continue; }
    seen.add(key);
    const { result } = upsertContact(db, { ...r, listIds, source });
    summary[result]++;
  }
  return summary;
}

export function confirmContact(db, token) {
  const c = db.prepare('SELECT * FROM contacts WHERE token = ?').get(token);
  if (!c) return null;
  if (c.status === 'pending') {
    db.prepare("UPDATE contacts SET status='subscribed', subscribed_at=?, unsubscribed_at=NULL WHERE id=?").run(now(), c.id);
  }
  return db.prepare('SELECT * FROM contacts WHERE id = ?').get(c.id);
}

export function unsubscribeContact(db, token, campaignId) {
  const c = db.prepare('SELECT * FROM contacts WHERE token = ?').get(token);
  if (!c) return null;
  if (c.status === 'subscribed' || c.status === 'pending') {
    db.prepare("UPDATE contacts SET status='unsubscribed', unsubscribed_at=? WHERE id=?").run(now(), c.id);
  }
  if (campaignId) {
    db.prepare('UPDATE sends SET unsubscribed_at = COALESCE(unsubscribed_at, ?) WHERE campaign_id = ? AND contact_id = ?')
      .run(now(), Number(campaignId) || 0, c.id);
  }
  return c;
}
