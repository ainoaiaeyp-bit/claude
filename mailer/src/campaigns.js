import { createHash } from 'node:crypto';
import { tx } from './db.js';
import { fillVars, renderEmail, unsubscribeUrl } from './render.js';
import { formatFrom, isEmail, now, sleep } from './util.js';

const BATCH = 100;
const running = new Set();

export function buildMessage(ctx, campaign, contact) {
  const unsubUrl = unsubscribeUrl(ctx.config.baseUrl, contact.token, campaign.id);
  const { html, text } = renderEmail({
    html: campaign.html,
    preheader: campaign.preheader,
    contact,
    unsubUrl,
    address: ctx.config.companyAddress,
  });
  const vars = { first_name: contact.first_name, last_name: contact.last_name, email: contact.email };
  return {
    from: formatFrom(campaign.from_name, campaign.from_email),
    to: [contact.email],
    subject: fillVars(campaign.subject, vars),
    html,
    text,
    ...(campaign.reply_to ? { reply_to: campaign.reply_to } : {}),
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    tags: [{ name: 'campaign_id', value: String(campaign.id) }],
  };
}

const PENDING_SQL = `
  SELECT c.* FROM contacts c
  JOIN list_contacts lc ON lc.contact_id = c.id AND lc.list_id = ?
  WHERE c.status = 'subscribed'
    AND NOT EXISTS (SELECT 1 FROM sends s WHERE s.campaign_id = ? AND s.contact_id = c.id)
  ORDER BY c.id`;

export const countRecipients = (db, campaign) =>
  db.prepare(`SELECT COUNT(*) n FROM (${PENDING_SQL})`).get(campaign.list_id, campaign.id).n;

/** Comprueba que una campaña se puede enviar. Devuelve una lista de problemas. */
export function sendProblems(db, campaign) {
  const p = [];
  if (campaign.status === 'sent') p.push('La campaña ya se ha enviado.');
  if (campaign.status === 'sending') p.push('La campaña se está enviando ahora mismo.');
  if (!campaign.subject.trim()) p.push('Falta el asunto.');
  if (!isEmail(campaign.from_email)) p.push('El email del remitente no es válido.');
  if (campaign.reply_to && !isEmail(campaign.reply_to)) p.push('El Reply-To no es válido.');
  if (!campaign.html.trim()) p.push('El contenido está vacío.');
  if (!campaign.list_id) p.push('Elige una lista de destinatarios.');
  else if (countRecipients(db, campaign) === 0) p.push('La lista no tiene suscriptores pendientes de recibir esta campaña.');
  return p;
}

/** Envía en segundo plano. Es reanudable: salta quien ya tiene fila en `sends`. */
export async function runCampaign(ctx, id) {
  if (running.has(id)) return;
  running.add(id);
  const { db, resend, config, log } = ctx;
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
    if (!campaign || campaign.status === 'sent') return;
    const done = db.prepare('SELECT COUNT(*) n FROM sends WHERE campaign_id = ?').get(id).n;
    db.prepare("UPDATE campaigns SET status='sending', last_error='', total=? WHERE id=?")
      .run(done + countRecipients(db, campaign), id);

    for (;;) {
      const rows = db.prepare(`${PENDING_SQL} LIMIT ${BATCH}`).all(campaign.list_id, id);
      if (!rows.length) break;
      const messages = rows.map((c) => buildMessage(ctx, campaign, c));
      const key = createHash('sha256').update(`${id}:${rows.map((r) => r.id).join(',')}`).digest('hex').slice(0, 48);
      let ids = null, error = '';
      try {
        ids = await resend.sendBatch(messages, { idempotencyKey: `campaign-${key}` });
      } catch (e) {
        // Fallo del servicio o de red tras reintentos, o credenciales malas: se pausa y se puede reanudar.
        if (e.fatal || !e.status || e.status >= 500 || e.status === 429) throw e;
        error = e.message; // 4xx de validación: el lote se marca como fallido y se sigue con el resto.
      }
      tx(db, () => {
        const ins = db.prepare(
          'INSERT OR IGNORE INTO sends(campaign_id, contact_id, resend_id, status, error, sent_at) VALUES (?,?,?,?,?,?)',
        );
        rows.forEach((c, i) => ins.run(id, c.id, ids ? ids[i] : null, ids ? 'sent' : 'failed', error.slice(0, 500), now()));
      });
      if (config.sendIntervalMs > 0) await sleep(config.sendIntervalMs);
    }
    db.prepare("UPDATE campaigns SET status='sent', sent_at=? WHERE id=?").run(now(), id);
  } catch (e) {
    log.error?.(`Campaña ${id} pausada: ${e.message}`);
    db.prepare("UPDATE campaigns SET status='paused', last_error=? WHERE id=?").run(String(e.message).slice(0, 500), id);
  } finally {
    running.delete(id);
  }
}

/** Reanuda al arrancar las campañas que se quedaron a medias. */
export function resumeInterrupted(ctx) {
  for (const { id } of ctx.db.prepare("SELECT id FROM campaigns WHERE status='sending'").all()) {
    runCampaign(ctx, id);
  }
}

export function campaignStats(db, id) {
  return db.prepare(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(status='sent'),0) AS sent,
      COALESCE(SUM(status='failed'),0) AS failed,
      COALESCE(SUM(delivered_at IS NOT NULL),0) AS delivered,
      COALESCE(SUM(first_open_at IS NOT NULL),0) AS opened,
      COALESCE(SUM(first_click_at IS NOT NULL),0) AS clicked,
      COALESCE(SUM(bounced_at IS NOT NULL),0) AS bounced,
      COALESCE(SUM(complained_at IS NOT NULL),0) AS complained,
      COALESCE(SUM(unsubscribed_at IS NOT NULL),0) AS unsubscribed
    FROM sends WHERE campaign_id = ?`).get(id);
}
