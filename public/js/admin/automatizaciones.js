import { $, $$, api, esc, dateTime, badge, openDialog, toast, guard, empty } from './core.js';

const NAMES = {
  confirmation: ['Confirmación de cita', 'Se envía cuando una cita queda confirmada.', false],
  reminder: ['Recordatorio previo', 'Unas horas antes de la cita, para reducir las no asistencias.', false],
  review: ['Petición de reseña', 'Unos días después de una cita realizada.', false],
  retoque: ['Aviso de retoque', 'A las clientas con una micropigmentación que ya necesita retoque.', false],
  birthday: ['Felicitación de cumpleaños', 'Solo a quien ha dado permiso para novedades.', true],
  reactivation: ['Recuperar clientas', 'A quien lleva más de 4 meses sin venir. Solo con permiso de novedades.', true],
};

export async function render(el, ctx) {
  const redraw = () => render(el, ctx);
  const a = await api('/api/admin/automations');
  const cfg = a.config;
  el.innerHTML = `<div class="top"><div><h2>Automatizaciones</h2><p class="sub">Correos que se envían solos para que no se te olvide nada. Se revisan cada 10 minutos.</p></div>
      <div class="actions"><button class="btn" id="run">Ejecutar ahora</button></div></div>
    <div class="card" style="margin-bottom:1rem;background:${a.mail ? 'var(--ok-bg)' : 'var(--warn-bg)'};border-color:${a.mail ? '#b9d6c3' : '#e3cc96'}"><b>${a.mail ? 'Correo conectado' : 'Correo sin conectar'}</b><p class="small" style="margin-top:.3rem">${a.mail ? 'Los mensajes se envían automáticamente desde el servidor.' : 'Sin SMTP en el servidor, los mensajes se preparan y quedan en la bandeja de salida para que los envíes a mano. Para activarlo, configura SMTP_HOST, SMTP_USER y SMTP_PASS (guía en el README).'}</p></div>
    <div class="grid2" style="align-items:start">
      <form class="stack" id="af">${Object.entries(NAMES).map(([k, [t, d, mk]]) => `<div class="card"><div class="between"><div><h3 style="font-size:1.3rem">${t}</h3><p class="muted small">${d}</p></div><label class="check"><input type="checkbox" name="${k}.on" ${cfg[k].on ? 'checked' : ''}> Activa</label></div>
        <div class="stack" style="margin-top:.8rem"><label>Asunto<input name="${k}.subject" value="${esc(cfg[k].subject)}"></label><label>Mensaje<textarea name="${k}.body" rows="5">${esc(cfg[k].body)}</textarea></label>
        ${'hoursBefore' in cfg[k] ? `<label>Horas antes de la cita<input type="number" name="${k}.hoursBefore" min="1" max="168" value="${cfg[k].hoursBefore}"></label>` : ''}${'daysAfter' in cfg[k] ? `<label>Días después de la cita<input type="number" name="${k}.daysAfter" min="1" max="30" value="${cfg[k].daysAfter}"></label>` : ''}${mk ? '<p class="small muted">Incluye automáticamente el enlace de baja.</p>' : ''}</div></div>`).join('')}
        <p class="small muted">Variables: {nombre}, {servicio}, {fecha}, {hora}, {estudio}, {direccion}, {enlace} (gestionar la cita), {web}.</p><div><button class="btn">Guardar automatizaciones</button></div></form>
      <div class="stack"><div class="card"><h3>Se enviarán ahora (${a.plan.length})</h3>${a.plan.length ? a.plan.map((p) => `<div style="padding:.5rem 0;border-bottom:1px solid var(--line)"><span class="badge b-info">${esc(NAMES[p.type]?.[0] || p.type)}</span> <b>${esc(p.client_name)}</b><div class="small muted">${esc(p.to)} · ${esc(p.subject)}</div></div>`).join('') : '<p class="muted small">Nada pendiente de enviar.</p>'}</div>
        <div class="card"><h3>Bandeja de salida</h3>${a.outbox.length ? a.outbox.map((o) => `<div style="padding:.55rem 0;border-bottom:1px solid var(--line)"><div class="between"><div><b>${esc(o.subject)}</b><div class="small muted">${esc(o.client_name || '')} · ${esc(o.to)} · ${dateTime(o.created_at)}</div></div>${badge(o.status === 'enviado' ? 'ok' : o.status === 'error' ? 'bad' : 'warn', o.status)}</div>${o.error ? `<p class="small" style="color:var(--bad)">${esc(o.error)}</p>` : ''}${o.status !== 'enviado' ? `<div class="row" style="margin-top:.4rem"><button class="btn sm ghost" data-view="${o.id}">Ver mensaje</button>${a.mail ? `<button class="btn sm" data-send="${o.id}">Enviar</button>` : ''}<button class="btn sm ghost" data-mark="${o.id}">Ya enviado</button></div>` : ''}</div>`).join('') : empty('Bandeja vacía', 'Aquí verás cada correo enviado o preparado.')}</div></div></div>`;
  $('#af', el).onsubmit = guard(async (e) => {
    e.preventDefault(); const out = {};
    for (const k of Object.keys(NAMES)) out[k] = { on: e.target.elements[`${k}.on`].checked, subject: e.target.elements[`${k}.subject`].value, body: e.target.elements[`${k}.body`].value, ...(e.target.elements[`${k}.hoursBefore`] ? { hoursBefore: Number(e.target.elements[`${k}.hoursBefore`].value) } : {}), ...(e.target.elements[`${k}.daysAfter`] ? { daysAfter: Number(e.target.elements[`${k}.daysAfter`].value) } : {}) };
    await api('/api/admin/settings', { method: 'PUT', body: { automations: out } }); toast('Automatizaciones guardadas'); redraw();
  });
  $('#run', el).onclick = guard(async () => { const r = await api('/api/admin/automations/run', { method: 'POST', body: {} }); toast(r.total ? `${r.sent} enviados · ${r.queued} preparados${r.failed ? ` · ${r.failed} con error` : ''}` : 'No había nada que enviar'); redraw(); ctx.refreshCounts(); });
  $$('[data-send]', el).forEach((b) => (b.onclick = guard(async () => { await api(`/api/admin/outbox/${b.dataset.send}/send`, { method: 'POST', body: {} }); toast('Enviado'); redraw(); ctx.refreshCounts(); })));
  $$('[data-mark]', el).forEach((b) => (b.onclick = guard(async () => { await api(`/api/admin/outbox/${b.dataset.mark}`, { method: 'PATCH', body: { status: 'enviado' } }); redraw(); ctx.refreshCounts(); })));
  $$('[data-view]', el).forEach((b) => (b.onclick = () => { const o = a.outbox.find((x) => x.id === Number(b.dataset.view)); openDialog(`<h3>${esc(o.subject)}</h3><p class="muted small">Para: ${esc(o.to)}</p><pre style="white-space:pre-wrap;font:inherit;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1rem;margin:0">${esc(o.text)}</pre>`, async () => {}, { submit: '' }); }));
}
