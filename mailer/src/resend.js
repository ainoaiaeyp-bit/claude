import { randomUUID } from 'node:crypto';
import { sleep } from './util.js';

export class ResendError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ResendError';
    this.status = status;
    this.body = body;
  }
  /** Errores que no se arreglan reintentando el mismo lote. */
  get fatal() { return this.status === 401 || this.status === 403; }
}

/** Cliente mínimo de la API REST de Resend. Sin clave → modo simulación. */
export class ResendClient {
  constructor({ apiKey = '', baseUrl = 'https://api.resend.com', fetchImpl = fetch, maxRetries = 4, log = console } = {}) {
    Object.assign(this, { apiKey, baseUrl, fetchImpl, maxRetries, log });
  }
  get dryRun() { return !this.apiKey; }

  async #post(path, body, idempotencyKey) {
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchImpl(this.baseUrl + path, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'mailer/0.1',
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) return res.json();
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { /* no es JSON */ }
      if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
        const ra = Number(res.headers.get('retry-after'));
        await sleep(ra > 0 ? ra * 1000 : Math.min(30000, 1000 * 2 ** attempt));
        continue;
      }
      throw new ResendError(parsed?.message || text || res.statusText, res.status, parsed);
    }
  }

  /** Envía un email. Devuelve su id. */
  async send(message) {
    if (this.dryRun) {
      this.log.info?.(`[simulación] → ${message.to.join(',')} «${message.subject}»`);
      return `dry_${randomUUID()}`;
    }
    return (await this.#post('/emails', message)).id;
  }

  /** Envía hasta 100 emails de una vez. Devuelve los ids en el mismo orden. */
  async sendBatch(messages, { idempotencyKey } = {}) {
    if (messages.length === 0) return [];
    if (messages.length > 100) throw new Error('Un lote admite como máximo 100 emails');
    if (this.dryRun) {
      this.log.info?.(`[simulación] lote de ${messages.length} emails`);
      return messages.map(() => `dry_${randomUUID()}`);
    }
    const out = await this.#post('/emails/batch', messages, idempotencyKey);
    const ids = (out.data ?? []).map((d) => d.id);
    if (ids.length !== messages.length) throw new ResendError('Respuesta de lote incompleta', 502, out);
    return ids;
  }
}
