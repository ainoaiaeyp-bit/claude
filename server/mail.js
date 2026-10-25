/* Cliente SMTP mínimo (implícito TLS en 465 o STARTTLS en 587), con adjuntos. Sin dependencias.
   Variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (opcional), SMTP_SECURE=1 para TLS implícito. */
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64');
const wrap = (s) => s.replace(/(.{76})/g, '$1\r\n');
const enc = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

export function buildMessage({ from, to, cc, subject, text, attachments = [] }) {
  const id = crypto.randomBytes(8).toString('hex'), boundary = `b_${id}`;
  const head = [`From: ${from}`, `To: ${to}`, cc ? `Cc: ${cc}` : null, `Subject: ${enc(subject)}`, `Date: ${new Date().toUTCString()}`, `Message-ID: <${id}@${(from.split('@')[1] || 'localhost').replace(/[>\s]/g, '')}>`, 'MIME-Version: 1.0'].filter(Boolean);
  const textPart = ['Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', wrap(b64(text))].join('\r\n');
  if (!attachments.length) return [...head, textPart].join('\r\n');
  const parts = [`--${boundary}`, textPart];
  for (const a of attachments) parts.push(`--${boundary}`, [`Content-Type: ${a.contentType || 'application/octet-stream'}; name="${enc(a.filename)}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${enc(a.filename)}"`, '', wrap(b64(a.content))].join('\r\n'));
  parts.push(`--${boundary}--`, '');
  return [...head, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', ...parts].join('\r\n');
}

export function createMailer({ host, port = 587, user, pass, from, secure = port === 465, timeout = 20000 }) {
  const sender = from || user;
  async function send({ to, cc, subject, text, attachments }) {
    const msg = buildMessage({ from: sender, to, cc, subject, text, attachments });
    let sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let buf = '', waiter = null;
    const onData = (d) => { buf += d.toString('utf8'); tick(); };
    const tick = () => {
      if (!waiter) return;
      const lines = buf.split('\r\n'); if (lines[lines.length - 1] === '') lines.pop(); else if (!/\r\n$/.test(buf)) return;
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) { const w = waiter; waiter = null; const text2 = buf; buf = ''; w.resolve({ code: Number(last.slice(0, 3)), text: text2 }); }
    };
    const attach = () => { sock.on('data', onData); sock.on('error', (e) => waiter && waiter.reject(e)); sock.on('close', () => waiter && waiter.reject(new Error('Conexión SMTP cerrada'))); };
    attach();
    const read = () => new Promise((resolve, reject) => { waiter = { resolve, reject }; tick(); setTimeout(() => waiter && waiter.reject(new Error('Tiempo de espera SMTP')), timeout).unref(); });
    const cmd = async (c, expect) => { sock.write(c + '\r\n'); const r = await read(); if (expect && !expect.includes(r.code)) throw new Error(`SMTP ${r.code}: ${r.text.trim().slice(0, 160)}`); return r; };
    try {
      const g = await read(); if (g.code !== 220) throw new Error('SMTP: saludo inesperado');
      let ehlo = await cmd(`EHLO estudio.local`, [250]);
      if (!secure && /STARTTLS/i.test(ehlo.text)) {
        await cmd('STARTTLS', [220]);
        sock.removeAllListeners('data'); sock.removeAllListeners('close'); sock.removeAllListeners('error');
        sock = tls.connect({ socket: sock, servername: host }); attach(); await new Promise((res, rej) => { sock.once('secureConnect', res); sock.once('error', rej); });
        ehlo = await cmd('EHLO estudio.local', [250]);
      }
      if (user) await cmd(`AUTH PLAIN ${b64(`\0${user}\0${pass}`)}`, [235]);
      const addr = (s) => (s.match(/<([^>]+)>/) || [null, s.trim()])[1];
      await cmd(`MAIL FROM:<${addr(sender)}>`, [250]);
      for (const r of [to, cc].filter(Boolean).join(',').split(',')) await cmd(`RCPT TO:<${addr(r)}>`, [250, 251]);
      await cmd('DATA', [354]);
      sock.write(msg.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..') + '\r\n.\r\n');
      const done = await read(); if (done.code !== 250) throw new Error(`SMTP ${done.code}: ${done.text.trim().slice(0, 160)}`);
      await cmd('QUIT').catch(() => {});
    } finally { sock.destroy(); }
  }
  return { send };
}
