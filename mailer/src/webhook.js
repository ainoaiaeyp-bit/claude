import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_S = 300;

/** Verifica la firma Svix que usa Resend. Lanza Error si no es válida. */
export function verifyWebhook(secret, headers, rawBody, nowMs = Date.now()) {
  if (!secret) throw new Error('webhook sin configurar');
  const id = headers['svix-id'], ts = headers['svix-timestamp'], sigs = headers['svix-signature'];
  if (!id || !ts || !sigs) throw new Error('faltan cabeceras svix');
  if (Math.abs(nowMs / 1000 - Number(ts)) > TOLERANCE_S) throw new Error('marca de tiempo fuera de rango');
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest();
  for (const part of String(sigs).split(' ')) {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) continue;
    const got = Buffer.from(sig, 'base64');
    if (got.length === expected.length && timingSafeEqual(got, expected)) return JSON.parse(rawBody);
  }
  throw new Error('firma no válida');
}

/** Aplica un evento de Resend. Idempotente por svix-id. Devuelve qué pasó. */
export function handleEvent(db, evt, eventId) {
  if (eventId) {
    const r = db.prepare('INSERT OR IGNORE INTO events(id, type) VALUES (?, ?)').run(eventId, String(evt.type));
    if (!r.changes) return 'duplicate';
  }
  const emailId = evt.data?.email_id;
  const send = emailId && db.prepare('SELECT * FROM sends WHERE resend_id = ?').get(emailId);
  if (!send) return 'unknown'; // p. ej. emails de prueba o de confirmación
  const at = evt.created_at && !Number.isNaN(Date.parse(evt.created_at)) ? new Date(evt.created_at).toISOString() : new Date().toISOString();

  switch (evt.type) {
    case 'email.delivered':
      db.prepare('UPDATE sends SET delivered_at = COALESCE(delivered_at, ?) WHERE id = ?').run(at, send.id);
      break;
    case 'email.opened':
      db.prepare('UPDATE sends SET opens = opens + 1, first_open_at = COALESCE(first_open_at, ?) WHERE id = ?').run(at, send.id);
      break;
    case 'email.clicked':
      db.prepare('UPDATE sends SET clicks = clicks + 1, first_click_at = COALESCE(first_click_at, ?) WHERE id = ?').run(at, send.id);
      break;
    case 'email.bounced':
      db.prepare('UPDATE sends SET bounced_at = COALESCE(bounced_at, ?) WHERE id = ?').run(at, send.id);
      // Solo los rebotes permanentes sacan al contacto de la lista; los temporales pueden recuperarse.
      if (evt.data?.bounce?.type === 'Permanent') {
        db.prepare("UPDATE contacts SET status='bounced' WHERE id = ? AND status IN ('subscribed','pending')").run(send.contact_id);
      }
      break;
    case 'email.complained':
      db.prepare('UPDATE sends SET complained_at = COALESCE(complained_at, ?) WHERE id = ?').run(at, send.id);
      db.prepare("UPDATE contacts SET status='complained' WHERE id = ? AND status IN ('subscribed','pending')").run(send.contact_id);
      break;
    default:
      return 'ignored';
  }
  return 'applied';
}
