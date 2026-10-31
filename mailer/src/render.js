import { esc } from './util.js';

const VAR_RE = /\{\{\s*([a-z_]+)\s*(?:\|([^}]*))?\}\}/g;

/** Sustituye {{variable}} y {{variable|valor por defecto}}. */
export function fillVars(text, vars, { escape = false } = {}) {
  return String(text ?? '').replace(VAR_RE, (_, name, fallback) => {
    const v = vars[name];
    const val = v !== undefined && v !== '' ? v : (fallback ?? '').trim();
    return escape && name !== 'unsubscribe_url' ? esc(val) : val;
  });
}

export function htmlToText(html) {
  return String(html)
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
      const t = label.replace(/<[^>]+>/g, '').trim();
      return !t || t === href || href.startsWith('mailto:') ? t || href : `${t} (${href})`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function unsubscribeUrl(baseUrl, token, campaignId) {
  return `${baseUrl}/u/${token}${campaignId ? `?c=${campaignId}` : ''}`;
}

/**
 * Genera html + texto plano para un contacto.
 * Si la plantilla no incluye {{unsubscribe_url}} se añade un pie con la baja y la dirección postal.
 */
export function renderEmail({ html, preheader = '', contact, unsubUrl, address = '' }) {
  const vars = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email,
    unsubscribe_url: unsubUrl,
  };
  const hasUnsub = /\{\{\s*unsubscribe_url\s*\}\}/.test(html);
  let body = fillVars(html, vars, { escape: true });

  if (preheader) {
    const hidden = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(
      fillVars(preheader, vars),
    )}</div>`;
    body = /<body[^>]*>/i.test(body) ? body.replace(/(<body[^>]*>)/i, `$1${hidden}`) : hidden + body;
  }

  if (!hasUnsub) {
    const footer =
      `<div style="margin:32px auto 0;max-width:600px;padding:16px;font:12px/1.5 Arial,sans-serif;color:#888;text-align:center">` +
      (address ? `${esc(address)}<br>` : '') +
      `<a href="${esc(unsubUrl)}" style="color:#888">Darme de baja</a></div>`;
    body = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${footer}</body>`) : body + footer;
  }

  if (!/<html[\s>]/i.test(body)) {
    body = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${body}</body></html>`;
  }
  return { html: body, text: htmlToText(body), unsubscribeUrl: unsubUrl };
}

export const STARTER_TEMPLATE = `<div style="background:#f4f4f5;padding:24px 0;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" align="center" width="100%" style="max-width:600px;background:#ffffff;border-radius:8px;padding:32px">
    <tr><td>
      <h1 style="margin:0 0 16px;font-size:24px;color:#111">Hola {{first_name|amigo}},</h1>
      <p style="font-size:16px;line-height:1.6;color:#333">Escribe aquí el contenido de tu email.</p>
      <p style="margin:24px 0">
        <a href="https://tudominio.com" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">Ver más</a>
      </p>
      <p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
        Recibes este email porque te suscribiste a nuestra lista.
        <a href="{{unsubscribe_url}}" style="color:#888">Darme de baja</a>.
      </p>
    </td></tr>
  </table>
</div>`;
