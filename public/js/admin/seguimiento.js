import { $, $$, api, esc, dateShort, dateTime, today, badge, STAGE, openDialog, confirmBox, toast, guard, empty, wa } from './core.js';

const TYPE = { retoque: ['Retoque', 'info'], cumple: ['Cumpleaños', 'good'], inactiva: ['Recuperar', 'warn'], lead: ['Contacto', 'neutral'], recordatorio: ['Recordatorio', 'info'] };
const TPL_NAMES = { confirmacion: 'Confirmación de cita', recordatorio: 'Recordatorio de cita', retoque: 'Proponer retoque', cumple: 'Felicitación de cumpleaños', inactiva: 'Recuperar clienta', vip: 'Clientas VIP', lead: 'Responder a un contacto', bienvenida: 'Bienvenida', novedades: 'Novedades', resena: 'Pedir reseña' };

export async function render(el, ctx) {
  let tab = window.__stab || 'hoy';
  const redraw = () => render(el, ctx);
  const [fu, tasks, segs, settings] = await Promise.all([api('/api/admin/followups'), api('/api/admin/tasks'), api('/api/admin/segments'), api('/api/admin/settings')]);
  const open = tasks.filter((t) => !t.done);
  el.innerHTML = `<div class="top"><div><h2>Seguimiento</h2><p class="sub">Quién necesita que le escribas hoy, tus tareas y campañas por segmentos.</p></div></div>
    <div class="tabs" id="tabs">${[['hoy', `Para hoy (${fu.length})`], ['tareas', `Tareas (${open.length})`], ['campanas', 'Campañas por segmento'], ['plantillas', 'Plantillas de mensajes']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tab"></div>`;
  const draw = () => {
    const t = $('#tab', el);
    if (tab === 'hoy') {
      t.innerHTML = fu.length ? `<p class="muted small" style="margin-bottom:.8rem">Sugerencias automáticas según citas, cumpleaños y actividad. Pulsa WhatsApp para abrir el mensaje ya redactado y luego “Hecho” para que no vuelva a salir en 30 días.</p><div class="stack">${fu.map((f, i) => `<div class="card"><div class="between"><div><span class="badge b-${TYPE[f.type][1]}">${TYPE[f.type][0]}</span> <b style="margin-left:.4rem"><a href="#clientas.${f.client_id}">${esc(f.client_name)}</a></b> <span class="muted small">· ${esc(f.title)}</span></div><div class="row">${wa(f.wa)}${f.email ? `<a class="btn sm ghost" href="mailto:${esc(f.email)}?body=${encodeURIComponent(f.text)}">Email</a>` : ''}<button class="btn sm ok" data-done="${i}">Hecho</button></div></div><p class="small muted" style="margin-top:.6rem">“${esc(f.text)}”</p></div>`).join('')}</div>` : empty('Todo al día', 'No hay nadie a quien escribir hoy.');
      $$('[data-done]', t).forEach((b) => (b.onclick = guard(async () => { const f = fu[b.dataset.done]; await api('/api/admin/followups/done', { method: 'POST', body: { client_id: f.client_id, type: f.type, text: f.title } }); toast('Marcado como hecho'); redraw(); ctx.refreshCounts(); })));
    } else if (tab === 'tareas') {
      t.innerHTML = `<div class="between" style="margin-bottom:.8rem"><span class="muted small">${open.length} pendientes</span><button class="btn sm" id="nt">+ Tarea</button></div>${tasks.length ? `<div class="stack">${tasks.map((k) => `<label class="check card" style="${k.done ? 'opacity:.5' : ''}"><input type="checkbox" data-k="${k.id}" ${k.done ? 'checked' : ''}><span style="flex:1">${esc(k.title)}${k.client_name ? ` · <a href="#clientas.${k.client_id}">${esc(k.client_name)}</a>` : ''}<br><small class="muted">${!k.done && k.due_date < today() ? '<span style="color:var(--bad)">Vencida · </span>' : ''}${dateShort(k.due_date)}</small></span><button class="link small" data-del="${k.id}" type="button">borrar</button></label>`).join('')}</div>` : empty('Sin tareas', 'Crea recordatorios como “llamar a Elena por la prueba de novia”.')}`;
      $$('[data-k]', t).forEach((x) => (x.onchange = guard(async () => { await api(`/api/admin/tasks/${x.dataset.k}`, { method: 'PATCH', body: { done: x.checked } }); redraw(); ctx.refreshCounts(); })));
      $$('[data-del]', t).forEach((b) => (b.onclick = guard(async (e) => { e.preventDefault(); await api(`/api/admin/tasks/${b.dataset.del}`, { method: 'DELETE' }); redraw(); })));
      $('#nt', t).onclick = () => openDialog(`<h3>Nueva tarea</h3><label>Qué hay que hacer<input name="title" required></label><label>Para el día<input type="date" name="due_date" value="${today()}"></label>`, async (v) => { await api('/api/admin/tasks', { method: 'POST', body: v }); toast('Tarea creada'); redraw(); }, { submit: 'Crear' });
    } else if (tab === 'campanas') {
      t.innerHTML = `<p class="muted small" style="margin-bottom:.8rem">Elige un segmento. Verás a cada clienta con su mensaje personalizado y el botón de WhatsApp. Las campañas comerciales solo deben ir a quien haya dado permiso.</p>
        <div class="grid3">${segs.map((s) => `<button class="card" data-seg="${s.id}" style="text-align:left;cursor:pointer"><div class="between"><h3 style="font-size:1.3rem">${esc(s.label)}</h3><b style="font:400 2rem var(--display)">${s.count}</b></div><p class="muted small" style="margin-top:.4rem">${esc(s.desc)}</p></button>`).join('')}</div><div id="camp" style="margin-top:1.2rem"></div>`;
      $$('[data-seg]', t).forEach((b) => (b.onclick = () => campaign(b.dataset.seg)));
    } else {
      const tp = settings.templates;
      t.innerHTML = `<form class="stack" id="tf"><p class="muted small">Textos de los mensajes de WhatsApp. Usa {nombre}, {servicio}, {fecha}, {hora}, {estudio}, {direccion} y {web}.</p>${Object.entries(TPL_NAMES).map(([k, n]) => `<label>${n}<textarea name="${k}" rows="3">${esc(tp[k] || '')}</textarea></label>`).join('')}<div><button class="btn">Guardar plantillas</button></div></form>`;
      $('#tf', t).onsubmit = guard(async (e) => { e.preventDefault(); await api('/api/admin/settings', { method: 'PUT', body: { templates: Object.fromEntries(new FormData(e.target)) } }); toast('Plantillas guardadas'); });
    }
  };
  async function campaign(id) {
    const r = await api(`/api/admin/segments/${id}`), box = $('#camp', el);
    box.innerHTML = `<div class="card"><div class="between"><h3>${esc(r.segment.label)} · ${r.members.length}</h3><div class="row"><button class="btn sm ghost" id="copy">Copiar emails</button><button class="btn sm" id="log">Marcar todas como contactadas</button></div></div>${r.members.length ? `<div class="table-wrap" style="margin-top:.8rem"><table><thead><tr><th>Clienta</th><th>Etapa</th><th>Mensaje</th><th></th></tr></thead><tbody>${r.members.map((m) => `<tr><td><a href="#clientas.${m.id}"><b>${esc(m.name)}</b></a><div class="muted small">${esc(m.phone || m.email || '')}</div></td><td>${badge(m.stage, STAGE[m.stage])}</td><td class="small" style="max-width:420px">${esc(m.text)}</td><td>${wa(m.wa)}</td></tr>`).join('')}</tbody></table></div>` : empty('Nadie en este segmento por ahora')}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#copy', box).onclick = async () => { const t = r.members.map((m) => m.email).filter(Boolean).join(', '); try { await navigator.clipboard.writeText(t); toast('Emails copiados'); } catch { toast(t || 'Sin emails', false); } };
    $('#log', box).onclick = () => confirmBox('¿Marcarlas como contactadas?', 'Se anotará en el historial de cada clienta y no volverán a salir como sugerencia durante 30 días.', async () => { await api('/api/admin/campaigns/log', { method: 'POST', body: { template: r.template, client_ids: r.members.map((m) => m.id) } }); toast('Registrado en sus historiales'); redraw(); }, { danger: false, label: 'Marcar' });
  }
  $$('#tabs [data-t]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; window.__stab = tab; $$('#tabs [data-t]', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  draw();
}
