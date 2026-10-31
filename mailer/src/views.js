import { esc, html, raw } from './util.js';

const CSS = `
:root{--bg:#f6f7f9;--card:#fff;--ink:#16181d;--mute:#6b7280;--line:#e5e7eb;--brand:#4f46e5;--ok:#15803d;--warn:#b45309;--bad:#b91c1c}
@media(prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#171a21;--ink:#e8eaee;--mute:#98a1b0;--line:#272b35;--brand:#818cf8;--ok:#4ade80;--warn:#fbbf24;--bad:#f87171}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
a{color:var(--brand)}nav{background:var(--card);border-bottom:1px solid var(--line);padding:0 16px;display:flex;gap:4px;align-items:center;flex-wrap:wrap}
nav b{margin-right:12px}nav a{padding:14px 10px;text-decoration:none;color:var(--ink)}nav a:hover{color:var(--brand)}
main{max-width:1000px;margin:0 auto;padding:24px 16px}h1{font-size:22px;margin:0 0 16px}h2{font-size:17px;margin:28px 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}.stat b{display:block;font-size:26px}.stat span{color:var(--mute);font-size:13px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;color:var(--mute);text-transform:uppercase;letter-spacing:.04em}
.tw{overflow-x:auto}label{display:block;font-size:13px;color:var(--mute);margin:12px 0 4px}
input,select,textarea{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);font:inherit}
textarea{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}input[type=checkbox]{width:auto}
button,.btn{background:var(--brand);color:#fff;border:0;border-radius:6px;padding:9px 16px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
button.ghost,.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}button.danger{background:var(--bad)}
.row{display:flex;gap:12px;flex-wrap:wrap}.row>*{flex:1 1 200px}.badge{font-size:12px;padding:2px 8px;border-radius:99px;border:1px solid var(--line);color:var(--mute)}
.b-subscribed,.b-sent{color:var(--ok);border-color:var(--ok)}.b-pending,.b-paused,.b-sending{color:var(--warn);border-color:var(--warn)}.b-bounced,.b-complained,.b-unsubscribed{color:var(--bad);border-color:var(--bad)}
.msg{background:color-mix(in srgb,var(--brand) 12%,transparent);border:1px solid var(--brand);padding:10px 14px;border-radius:8px;margin-bottom:16px}
.err{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent)}.mute{color:var(--mute)}.right{text-align:right}
iframe{width:100%;height:520px;border:1px solid var(--line);border-radius:8px;background:#fff}code,pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}
pre{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:10px;overflow:auto;white-space:pre-wrap}
.bar{height:6px;background:var(--line);border-radius:3px;overflow:hidden}.bar i{display:block;height:100%;background:var(--brand)}
`;


// String.raw conserva las barras invertidas de la expresión regular tal cual.
const PREVIEW_JS = String.raw`{
  const S = { first_name: 'Ana', last_name: 'García', email: 'ejemplo@correo.com' };
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fill = (t) => t.replace(/\{\{\s*([a-z_]+)\s*(?:\|([^}]*))?\}\}/g, (m, k, f) => (k === 'unsubscribe_url' ? '#' : esc(S[k] || (f || '').trim())));
  document.getElementById('html').addEventListener('input', (e) => { document.getElementById('pv').srcdoc = fill(e.target.value); });
}`;

const newCampaignButton = html`<form method="post" action="/campaigns"><button>Nueva campaña</button></form>`;

export function layout(title, body, { msg, error, nav = true } = {}) {
  return html`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Mailer</title><style>${raw(CSS)}</style></head><body>
${nav ? html`<nav><b>✉ Mailer</b><a href="/">Panel</a><a href="/campaigns">Campañas</a><a href="/contacts">Contactos</a><a href="/lists">Listas</a></nav>` : ''}
<main>${msg ? html`<div class="msg ${error ? 'err' : ''}">${msg}</div>` : ''}${body}</main></body></html>`;
}

export const pct = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10}%` : '–');
const badge = (s) => html`<span class="badge b-${s}">${{ draft: 'borrador', sending: 'enviando', paused: 'pausada', sent: 'enviada', subscribed: 'suscrito', pending: 'sin confirmar', unsubscribed: 'baja', bounced: 'rebotado', complained: 'queja' }[s] || s}</span>`;
const fdate = (d) => (d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '–');

export function dashboardPage({ counts, campaigns, config, dryRun }) {
  return html`<h1>Panel</h1>
${dryRun ? html`<div class="msg">Modo simulación: no hay <code>RESEND_API_KEY</code>, no se enviará ningún email real.</div>` : ''}
<div class="grid">
  <div class="card stat"><b>${counts.subscribed}</b><span>suscritos</span></div>
  <div class="card stat"><b>${counts.pending}</b><span>sin confirmar</span></div>
  <div class="card stat"><b>${counts.unsubscribed}</b><span>bajas</span></div>
  <div class="card stat"><b>${counts.bounced + counts.complained}</b><span>rebotes y quejas</span></div>
</div>
<h2>Últimas campañas</h2>${campaignTable(campaigns)}
${newCampaignButton}`;
}

function campaignTable(rows) {
  if (!rows.length) return html`<p class="mute">Aún no hay campañas.</p>`;
  return html`<div class="card tw"><table><tr><th>Campaña</th><th>Estado</th><th>Enviados</th><th>Entregados</th><th>Aperturas</th><th>Clics</th></tr>
${rows.map((c) => html`<tr><td><a href="/campaigns/${c.id}">${c.name}</a><br><span class="mute">${c.subject}</span></td><td>${badge(c.status)}</td>
<td>${c.stats.sent}</td><td>${pct(c.stats.delivered, c.stats.sent)}</td><td>${pct(c.stats.opened, c.stats.delivered)}</td><td>${pct(c.stats.clicked, c.stats.delivered)}</td></tr>`)}</table></div>`;
}
export { campaignTable };

export function contactsPage({ contacts, lists, total, q, status, listId, page, pages }) {
  const qs = (p) => `?${new URLSearchParams({ q, status, list: listId || '', page: p })}`;
  return html`<h1>Contactos <span class="mute">(${total})</span></h1>
<form method="get" class="card row"><div><label>Buscar</label><input name="q" value="${q}" placeholder="email o nombre"></div>
<div><label>Estado</label><select name="status"><option value="">Todos</option>${['subscribed', 'pending', 'unsubscribed', 'bounced', 'complained'].map((s) => html`<option value="${s}" ${s === status ? raw('selected') : ''}>${s}</option>`)}</select></div>
<div><label>Lista</label><select name="list"><option value="">Todas</option>${lists.map((l) => html`<option value="${l.id}" ${String(l.id) === String(listId) ? raw('selected') : ''}>${l.name}</option>`)}</select></div>
<div><label>&nbsp;</label><button>Filtrar</button> <a class="btn ghost" href="/contacts/export${qs(1)}">Exportar CSV</a></div></form>
<div class="card tw"><table><tr><th>Email</th><th>Nombre</th><th>Estado</th><th>Alta</th><th></th></tr>
${contacts.map((c) => html`<tr><td>${c.email}</td><td>${c.first_name} ${c.last_name}</td><td>${badge(c.status)}</td><td class="mute">${fdate(c.created_at)}</td>
<td class="right"><form method="post" action="/contacts/${c.id}/delete" onsubmit="return confirm('¿Borrar este contacto y su historial?')"><button class="ghost">Borrar</button></form></td></tr>`)}
${contacts.length ? '' : html`<tr><td colspan="5" class="mute">Sin resultados.</td></tr>`}</table></div>
${pages > 1 ? html`<p>${page > 1 ? html`<a href="${qs(page - 1)}">← Anterior</a>` : ''} Página ${page} de ${pages} ${page < pages ? html`<a href="${qs(page + 1)}">Siguiente →</a>` : ''}</p>` : ''}
<h2>Añadir o importar</h2>
<form method="post" action="/contacts/import" class="card">
  <label>CSV o lista de emails (columnas: email, nombre, apellidos; acepta , ; o tabulador)</label>
  <textarea name="data" id="csv" rows="6" placeholder="email,nombre,apellidos&#10;ana@ejemplo.com,Ana,García"></textarea>
  <label>…o sube un archivo</label><input type="file" accept=".csv,.txt" onchange="const f=this.files[0];if(f)f.text().then(t=>document.getElementById('csv').value=t)">
  <div class="row"><div><label>Añadir a la lista</label><select name="list">${lists.map((l) => html`<option value="${l.id}">${l.name}</option>`)}</select></div></div>
  <label><input type="checkbox" name="consent" required> Confirmo que estas personas me han dado su consentimiento para recibir mis emails.</label>
  <p class="mute" style="font-size:13px">Quien ya se dio de baja, rebotó o se quejó no se reactiva.</p>
  <button>Importar</button></form>`;
}

export function listsPage({ lists, baseUrl }) {
  return html`<h1>Listas</h1>
<form method="post" action="/lists" class="card row"><div><label>Nueva lista</label><input name="name" required maxlength="80" placeholder="Newsletter"></div><div><label>&nbsp;</label><button>Crear</button></div></form>
${lists.map((l) => html`<div class="card"><div class="row" style="align-items:center"><div><b>${l.name}</b><br><span class="mute">${l.subscribed} suscritos · ${l.total} contactos</span></div>
<div class="right"><a class="btn ghost" href="/subscribe?list=${l.id}" target="_blank">Ver formulario</a></div></div>
<details><summary class="mute">Formulario para tu web</summary><pre>${embedSnippet(baseUrl, l.id)}</pre></details></div>`)}`;
}

export const embedSnippet = (baseUrl, listId) =>
  `<form action="${baseUrl}/api/subscribe" method="post">
  <input type="hidden" name="list" value="${listId}">
  <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
  <input type="text" name="first_name" placeholder="Nombre">
  <input type="email" name="email" placeholder="Tu email" required>
  <button type="submit">Suscribirme</button>
</form>`;

export function campaignsPage({ campaigns }) {
  return html`<h1>Campañas</h1>${campaignTable(campaigns)}${newCampaignButton}`;
}

export function campaignPage({ c, lists, stats, config, recipients, failedSample }) {
  const editable = c.status === 'draft' || c.status === 'paused';
  const dis = editable ? '' : raw('disabled');
  const s = stats;
  return html`<h1>${c.name} ${badge(c.status)}</h1>
${c.last_error ? html`<div class="msg err">Último error: ${c.last_error}</div>` : ''}
${c.status !== 'draft' ? html`<div class="card"><div class="grid">
  <div class="stat"><b>${s.sent}</b><span>enviados${c.total ? ` de ${c.total}` : ''}</span></div>
  <div class="stat"><b>${pct(s.delivered, s.sent)}</b><span>entregados (${s.delivered})</span></div>
  <div class="stat"><b>${pct(s.opened, s.delivered)}</b><span>aperturas (${s.opened})</span></div>
  <div class="stat"><b>${pct(s.clicked, s.delivered)}</b><span>clics (${s.clicked})</span></div>
  <div class="stat"><b>${s.bounced}</b><span>rebotes</span></div>
  <div class="stat"><b>${s.unsubscribed}</b><span>bajas</span></div>
  <div class="stat"><b>${s.complained}</b><span>quejas</span></div>
  <div class="stat"><b>${s.failed}</b><span>fallidos</span></div></div>
  ${c.status === 'sending' ? html`<div class="bar" style="margin-top:12px"><i style="width:${c.total ? Math.min(100, (s.total / c.total) * 100) : 0}%"></i></div><p class="mute">Enviando… <a href="">actualizar</a></p>` : ''}
  ${failedSample ? html`<p class="mute">Ejemplo de error: ${failedSample}</p>` : ''}
  <p class="mute" style="font-size:13px">Las aperturas no son exactas: Apple Mail y otros clientes precargan las imágenes de seguimiento. Aperturas y clics requieren el webhook y activar el seguimiento en tu dominio de Resend.</p></div>` : ''}
<div class="row" style="align-items:flex-start"><div style="flex:1 1 420px">
<form method="post" action="/campaigns/${c.id}" class="card"><fieldset ${dis} style="border:0;padding:0;margin:0">
  <label>Nombre interno</label><input name="name" value="${c.name}" required maxlength="120">
  <label>Asunto (admite {{first_name|amigo}})</label><input name="subject" value="${c.subject}" maxlength="200">
  <label>Texto de previsualización</label><input name="preheader" value="${c.preheader}" maxlength="200">
  <div class="row"><div><label>Nombre del remitente</label><input name="from_name" value="${c.from_name}"></div><div><label>Email del remitente</label><input name="from_email" type="email" value="${c.from_email}"></div></div>
  <label>Responder a (opcional)</label><input name="reply_to" type="email" value="${c.reply_to}">
  <label>Lista</label><select name="list_id"><option value="">— elige —</option>${lists.map((l) => html`<option value="${l.id}" ${l.id === c.list_id ? raw('selected') : ''}>${l.name} (${l.subscribed})</option>`)}</select>
  <label>HTML del email — variables: {{first_name}} {{last_name}} {{email}} {{unsubscribe_url}}</label>
  <textarea name="html" id="html" rows="18">${c.html}</textarea>
  ${editable ? html`<p><button>Guardar</button></p>` : ''}</fieldset></form>
</div><div style="flex:1 1 420px"><h2 style="margin-top:0">Vista previa</h2>
<iframe sandbox id="pv" src="/campaigns/${c.id}/preview"></iframe>
<p class="mute" style="font-size:13px">Datos de ejemplo (Ana García). <a href="/campaigns/${c.id}/preview" target="_blank">Abrir en pestaña</a></p></div></div>
${editable ? html`<script>${raw(PREVIEW_JS)}</script>
<div class="row"><form method="post" action="/campaigns/${c.id}/test" class="card"><b>Enviar prueba</b>
  <label>Email de destino</label><input name="to" type="email" required><p><button class="ghost">Enviar prueba</button></p></form>
<div class="card"><b>Enviar campaña</b><p class="mute">${recipients} destinatarios pendientes.</p><a class="btn" href="/campaigns/${c.id}/send">${c.status === 'paused' ? 'Reanudar envío…' : 'Revisar y enviar…'}</a></div></div>` : ''}
${c.status === 'draft' ? html`<form method="post" action="/campaigns/${c.id}/delete" onsubmit="return confirm('¿Borrar la campaña?')"><button class="ghost">Borrar borrador</button></form>` : ''}`;
}

export function sendConfirmPage({ c, listName, recipients, problems, address, dryRun }) {
  return html`<h1>Revisar y enviar</h1><div class="card">
<table><tr><th>Campaña</th><td>${c.name}</td></tr><tr><th>Asunto</th><td>${c.subject}</td></tr>
<tr><th>Remitente</th><td>${c.from_name} &lt;${c.from_email}&gt;</td></tr><tr><th>Lista</th><td>${listName}</td></tr>
<tr><th>Destinatarios</th><td><b>${recipients}</b></td></tr></table>
${problems.length ? html`<div class="msg err"><b>No se puede enviar todavía:</b><ul>${problems.map((p) => html`<li>${p}</li>`)}</ul></div>` : ''}
${!address ? html`<p class="mute">⚠ No has configurado <code>COMPANY_ADDRESS</code>: el pie no llevará dirección postal.</p>` : ''}
${dryRun ? html`<p class="mute">Modo simulación: no se enviará nada real.</p>` : ''}
<p>${problems.length ? '' : html`<form method="post" action="/campaigns/${c.id}/send" style="display:inline"><button>Enviar a ${recipients} personas</button></form>`}
 <a class="btn ghost" href="/campaigns/${c.id}">Volver</a></p></div>`;
}

export function publicPage(title, inner) {
  return layout(title, html`<div class="card" style="max-width:480px;margin:40px auto">${inner}</div>`, { nav: false });
}

export function subscribeFormPage({ list, error }) {
  return publicPage('Suscríbete', html`<h1>${list.name}</h1>${error ? html`<p class="msg err">${error}</p>` : ''}
<form method="post" action="/api/subscribe"><input type="hidden" name="list" value="${list.id}">
<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
<label>Nombre</label><input name="first_name" autocomplete="given-name"><label>Email</label><input name="email" type="email" required autocomplete="email">
<p><button>Suscribirme</button></p></form>`);
}
