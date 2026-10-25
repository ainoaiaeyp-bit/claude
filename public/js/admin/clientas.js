import { $, $$, api, qs, esc, eur, eur0, fm, dateLong, dateShort, dateTime, today, badge, STATUS, STAGE, openDialog, confirmBox, toast, guard, empty, wa, initials } from './core.js';
import { openBooking } from './booking.js';

let f = { q: '', stage: '', segment: '', tag: '' };

export async function render(el, ctx) {
  if (ctx.arg === 'nueva') { await list(el, ctx); newClient(() => list(el, ctx)); history.replaceState(null, '', '#clientas'); return; }
  if (ctx.arg) return detail(el, ctx, Number(ctx.arg));
  return list(el, ctx);
}

async function list(el, ctx) {
  const redraw = () => list(el, ctx);
  const [clients, segs] = await Promise.all([api(`/api/admin/clients?${qs(f)}`), api('/api/admin/segments')]);
  const tags = [...new Set(clients.flatMap((c) => c.tags || []))];
  el.innerHTML = `
    <div class="top"><div><h2>Clientas</h2><p class="sub">${clients.length} ${clients.length === 1 ? 'ficha' : 'fichas'}${f.segment ? ' en este segmento' : ''}. Todo lo que sabes de cada una, en un sitio.</p></div>
      <div class="actions"><a class="btn ghost" id="exp" href="#clientas">Exportar CSV</a><button class="btn" id="new">+ Nueva clienta</button></div></div>
    <div class="stack" style="margin-bottom:1rem">
      <div class="chips"><button class="chip ${!f.segment ? 'on' : ''}" data-seg="">Todas</button>${segs.map((s) => `<button class="chip ${f.segment === s.id ? 'on' : ''}" data-seg="${s.id}" title="${esc(s.desc)}">${esc(s.label)} · ${s.count}</button>`).join('')}</div>
      <div class="row"><input id="q" placeholder="Buscar por nombre, email, teléfono o etiqueta" value="${esc(f.q)}" style="max-width:360px"><select id="stage" style="width:160px"><option value="">Todas las etapas</option>${Object.entries(STAGE).map(([k, v]) => `<option value="${k}" ${f.stage === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        ${tags.length ? `<select id="tag" style="width:150px"><option value="">Cualquier etiqueta</option>${tags.map((t) => `<option ${f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}</div></div>
    ${clients.length ? `<div class="table-wrap"><table><thead><tr><th>Clienta</th><th>Etapa</th><th>Última visita</th><th>Próxima cita</th><th class="r">Visitas</th><th class="r">Gastado</th><th>Etiquetas</th></tr></thead><tbody>
      ${clients.map((c) => `<tr class="click" data-c="${c.id}"><td><b>${esc(c.name)}</b>${c.consent_marketing ? '' : ''}<div class="muted small">${esc(c.phone || c.email || '')}</div></td><td>${badge(c.stage, STAGE[c.stage])}</td><td>${dateShort(c.last_visit)}</td><td>${c.next ? `${dateShort(c.next.date)} ${fm(c.next.start_min)}` : '<span class="muted">—</span>'}</td><td class="num">${c.visits}</td><td class="num">${eur0(c.spent)}</td><td>${(c.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')}</td></tr>`).join('')}</tbody></table></div>`
      : empty('No hay clientas con estos filtros', 'Las fichas se crean solas cuando alguien reserva o te escribe desde la web.')}`;
  $$('[data-seg]', el).forEach((b) => (b.onclick = () => { f.segment = b.dataset.seg; redraw(); }));
  $$('[data-c]', el).forEach((r) => (r.onclick = () => ctx.go('clientas.' + r.dataset.c)));
  let t; $('#q', el).oninput = (e) => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value; redraw().then(() => { const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); };
  $('#stage', el).onchange = (e) => { f.stage = e.target.value; redraw(); };
  if ($('#tag', el)) $('#tag', el).onchange = (e) => { f.tag = e.target.value; redraw(); };
  $('#new', el).onclick = () => newClient(redraw);
  $('#exp', el).onclick = guard(async (e) => { e.preventDefault(); const { download } = await import('./core.js'); await download('/api/admin/export/clients', 'clientas.csv'); });
}

function clientForm(c = {}) {
  return `<div class="grid2"><label>Nombre y apellidos<input name="name" required value="${esc(c.name || '')}"></label><label>Teléfono<input name="phone" value="${esc(c.phone || '')}"></label>
    <label>Email<input type="email" name="email" value="${esc(c.email || '')}"></label><label>Cumpleaños<input type="date" name="birthday" value="${esc(c.birthday || '')}"></label>
    <label>Instagram<input name="instagram" placeholder="@usuario" value="${esc(c.instagram || '')}"></label><label>Cómo nos conoció<select name="source">${[['manual', 'Manual'], ['web', 'Web'], ['instagram', 'Instagram'], ['referida', 'Referida'], ['evento', 'Evento'], ['otro', 'Otro']].map(([k, l]) => `<option value="${k}" ${c.source === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="full">Etiquetas (separadas por comas)<input name="tags" placeholder="novia, piel sensible, vip" value="${esc((c.tags || []).join(', '))}"></label>
    <label class="full">Alergias e intolerancias<input name="allergies" value="${esc(c.allergies || '')}"></label>
    <label class="full">Salud y contraindicaciones<textarea name="health" placeholder="Embarazo, lactancia, medicación, condiciones de la piel…">${esc(c.health || '')}</textarea></label>
    <label class="full">Notas<textarea name="notes">${esc(c.notes || '')}</textarea></label>
    <label class="check full"><input type="checkbox" name="consent_marketing" ${c.consent_marketing ? 'checked' : ''}> Ha dado permiso para recibir novedades y promociones</label></div>`;
}
function newClient(after) {
  openDialog(`<h3>Nueva clienta</h3>${clientForm()}`, async (v) => { const c = await api('/api/admin/clients', { method: 'POST', body: v }); toast('Ficha creada'); location.hash = 'clientas.' + c.id; after(); }, { submit: 'Crear ficha', wide: true });
}

async function detail(el, ctx, id) {
  const redraw = () => detail(el, ctx, id);
  const d = await api(`/api/admin/clients/${id}`);
  const c = d.client;
  let tab = window.__tab || 'historial';
  const wlink = (text) => (c.phone ? `https://wa.me/${c.phone.replace(/\D/g, '').replace(/^(\d{9})$/, '34$1')}${text ? '?text=' + encodeURIComponent(text) : ''}` : '');
  const age = c.birthday ? Math.floor((Date.now() - new Date(c.birthday + 'T12:00:00')) / 31557600000) : null;
  el.innerHTML = `
    <p class="small"><a href="#clientas" class="link">‹ Todas las clientas</a></p>
    <div class="top"><div><h2>${esc(c.name)}</h2><p class="sub">${badge(c.stage, STAGE[c.stage])} ${c.consent_marketing ? badge('ok', 'Acepta novedades') : badge('neutral', 'Sin permiso de novedades')} ${(c.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join(' ')}</p></div>
      <div class="actions">${wa(wlink(`Hola ${c.name.split(' ')[0]}, `))}${c.email ? `<a class="btn sm ghost" href="mailto:${esc(c.email)}">Email</a>` : ''}<button class="btn sm" id="book">Nueva cita</button><button class="btn sm ghost" id="edit">Editar ficha</button></div></div>
    <div class="kpis"><div class="kpi"><b>${c.visits}</b><span>Visitas</span></div><div class="kpi"><b>${eur0(c.spent)}</b><span>Gastado</span></div><div class="kpi"><b>${eur0(c.avg)}</b><span>Ticket medio</span></div><div class="kpi"><b>${c.last_visit ? dateShort(c.last_visit) : '—'}</b><span>Última visita</span></div><div class="kpi ${c.next ? 'good' : ''}"><b style="font-size:1.4rem">${c.next ? dateShort(c.next.date) : 'Sin cita'}</b><span>Próxima cita</span>${c.next ? `<small>${esc(c.next.service_name)}</small>` : ''}</div></div>
    <div class="grid2" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start">
      <div><div class="tabs" id="tabs">${[['historial', `Historial (${d.interactions.length})`], ['citas', `Citas (${d.bookings.length})`], ['fichas', `Fichas técnicas (${d.records.length})`], ['tareas', `Tareas (${d.tasks.filter((t) => !t.done).length})`]].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tab"></div></div>
      <div class="stack">
        <div class="card"><h4>Datos</h4><dl class="kv" style="margin-top:.6rem"><dt>Teléfono</dt><dd>${esc(c.phone || '—')}</dd><dt>Email</dt><dd>${esc(c.email || '—')}</dd><dt>Cumpleaños</dt><dd>${c.birthday ? `${dateShort(c.birthday).replace(/ \d+$/, '')}${age ? ` · ${age} años` : ''}` : '—'}</dd><dt>Instagram</dt><dd>${esc(c.instagram || '—')}</dd><dt>Origen</dt><dd>${esc(c.source || '—')}</dd><dt>Alta</dt><dd>${dateShort(String(c.created_at).slice(0, 10))}</dd></dl></div>
        ${c.allergies || c.health ? `<div class="card" style="background:var(--bad-bg);border-color:#e7bcb4"><h4 style="color:var(--bad)">Salud y alergias</h4><p class="small" style="margin-top:.5rem">${esc([c.allergies, c.health].filter(Boolean).join(' · '))}</p></div>` : ''}
        ${c.notes ? `<div class="card"><h4>Notas</h4><p class="small" style="margin-top:.5rem;white-space:pre-wrap">${esc(c.notes)}</p></div>` : ''}
        <button class="btn danger sm" id="arch" style="justify-self:start">Archivar ficha</button></div></div>`;

  const drawTab = () => {
    const t = $('#tab', el);
    if (tab === 'historial') {
      t.innerHTML = `<form class="card stack" id="nf" style="margin-bottom:1rem"><div class="grid3"><label>Tipo<select name="kind"><option value="nota">Nota</option><option value="llamada">Llamada</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="visita">Visita</option></select></label><label class="full" style="grid-column:span 2">Anotación<input name="text" placeholder="Qué habéis hablado, qué le gusta, qué hay que recordar…" required></label></div><div><button class="btn sm">Añadir al historial</button></div></form>
        ${d.interactions.length ? `<div class="tl">${d.interactions.map((i) => `<div class="tl-i ${i.kind.startsWith('auto') || i.kind === 'cita' || i.kind === 'cobro' ? 'auto' : ''}"><span class="tag">${esc(i.kind.replace('seguimiento:', 'seguimiento · ').replace('auto:', 'automático · '))}</span> ${esc(i.text)}<small>${dateTime(i.created_at)} ${['nota', 'llamada', 'whatsapp', 'email', 'visita'].includes(i.kind) ? `· <button class="link" data-di="${i.id}">borrar</button>` : ''}</small></div>`).join('')}</div>` : empty('Sin historial', 'Las anotaciones y los movimientos de sus citas aparecerán aquí.')}`;
      $('#nf', t).onsubmit = guard(async (e) => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); await api(`/api/admin/clients/${id}/interactions`, { method: 'POST', body: v }); toast('Anotación añadida'); redraw(); });
      $$('[data-di]', t).forEach((b) => (b.onclick = guard(async () => { await api(`/api/admin/interactions/${b.dataset.di}`, { method: 'DELETE' }); redraw(); })));
    } else if (tab === 'citas') {
      t.innerHTML = d.bookings.length ? `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Tratamiento</th><th>Estado</th><th class="r">Precio</th><th class="r">Cobrado</th></tr></thead><tbody>${d.bookings.map((b) => `<tr class="click" data-b="${b.id}"><td>${dateShort(b.date)} ${fm(b.start_min)}</td><td>${esc(b.service_name)}</td><td>${badge(b.status, STATUS[b.status])}</td><td class="num">${eur(b.price_cents)}</td><td class="num">${eur(b.paid_cents || 0)}</td></tr>`).join('')}</tbody></table></div>` : empty('Todavía sin citas');
      $$('[data-b]', t).forEach((r) => (r.onclick = () => openBooking(r.dataset.b, redraw)));
    } else if (tab === 'fichas') {
      t.innerHTML = `<div class="between" style="margin-bottom:.8rem"><p class="muted small">Registro de cada sesión de micropigmentación: técnica, pigmento, piel y consentimiento.</p><button class="btn sm" id="nr">+ Nueva ficha técnica</button></div>${d.records.length ? d.records.map((r) => `<div class="card" style="margin-bottom:.7rem"><div class="between"><h3 style="font-size:1.3rem">${esc(r.technique || 'Sesión')} · ${dateShort(r.date)}</h3><div class="row">${r.consent_signed ? badge('ok', 'Consentimiento firmado') : badge('warn', 'Sin consentimiento')}<button class="btn sm ghost" data-er="${r.id}">Editar</button></div></div><dl class="kv" style="margin-top:.6rem"><dt>Zona</dt><dd>${esc(r.areas || '—')}</dd><dt>Pigmento</dt><dd>${esc(r.pigment || '—')}</dd><dt>Dispositivo / aguja</dt><dd>${esc(r.device || '—')}</dd><dt>Tipo de piel</dt><dd>${esc(r.skin_type || '—')}</dd><dt>Notas</dt><dd style="white-space:pre-wrap">${esc(r.notes || '—')}</dd></dl></div>`).join('') : empty('Sin fichas técnicas', 'Crea una ficha tras cada sesión para recordar el pigmento y la técnica.')}`;
      $('#nr', t).onclick = () => recordDialog(id, null, redraw); $$('[data-er]', t).forEach((b) => (b.onclick = () => recordDialog(id, d.records.find((x) => x.id === Number(b.dataset.er)), redraw)));
    } else {
      t.innerHTML = `<div class="between" style="margin-bottom:.8rem"><span class="muted small">Seguimientos y recordatorios para esta clienta.</span><button class="btn sm" id="nt">+ Tarea</button></div>${d.tasks.length ? d.tasks.map((k) => `<label class="check card" style="margin-bottom:.5rem;${k.done ? 'opacity:.5' : ''}"><input type="checkbox" data-k="${k.id}" ${k.done ? 'checked' : ''}><span>${esc(k.title)}<br><small class="muted">${dateShort(k.due_date)}</small></span></label>`).join('') : empty('Sin tareas')}`;
      $$('[data-k]', t).forEach((x) => (x.onchange = guard(async () => { await api(`/api/admin/tasks/${x.dataset.k}`, { method: 'PATCH', body: { done: x.checked } }); redraw(); })));
      $('#nt', t).onclick = () => openDialog(`<h3>Nueva tarea para ${esc(c.name.split(' ')[0])}</h3><label>Qué hay que hacer<input name="title" required></label><label>Para el día<input type="date" name="due_date" value="${today()}"></label>`, async (v) => { await api('/api/admin/tasks', { method: 'POST', body: { ...v, client_id: id } }); toast('Tarea creada'); redraw(); }, { submit: 'Crear' });
    }
  };
  $$('#tabs [data-t]', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; window.__tab = tab; $$('#tabs [data-t]', el).forEach((x) => x.classList.toggle('on', x === b)); drawTab(); }));
  drawTab();
  $('#edit', el).onclick = () => openDialog(`<h3>Editar ficha</h3>${clientForm(c)}`, async (v) => { await api(`/api/admin/clients/${id}`, { method: 'PUT', body: v }); toast('Ficha guardada'); redraw(); }, { wide: true });
  $('#arch', el).onclick = () => confirmBox('¿Archivar la ficha?', 'Dejará de aparecer en las listas y campañas. Su historial se conserva.', async () => { await api(`/api/admin/clients/${id}`, { method: 'DELETE' }); toast('Ficha archivada'); location.hash = 'clientas'; }, { label: 'Archivar' });
  $('#book', el).onclick = async () => {
    const svcs = await api('/api/admin/services');
    openDialog(`<h3>Nueva cita para ${esc(c.name.split(' ')[0])}</h3><label>Tratamiento<select name="service_id">${svcs.filter((s) => s.active).map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><div class="grid2"><label>Fecha<input type="date" name="date" value="${today()}" required></label><label>Hora<input type="time" name="time" required></label></div><label class="check"><input type="checkbox" name="force"> Ignorar disponibilidad</label>`,
      async (v) => { const [h, m] = v.time.split(':').map(Number); await api('/api/admin/bookings', { method: 'POST', body: { name: c.name, email: c.email, phone: c.phone, service_id: Number(v.service_id), date: v.date, start_min: h * 60 + m, force: !!v.force } }); toast('Cita creada'); redraw(); }, { submit: 'Crear cita' });
  };
}

function recordDialog(clientId, r, after) {
  r = r || { date: today(), technique: '', areas: 'Cejas', pigment: '', device: '', skin_type: '', notes: '', consent_signed: false };
  openDialog(`<h3>${r.id ? 'Editar' : 'Nueva'} ficha técnica</h3><div class="grid2"><label>Fecha<input type="date" name="date" value="${r.date}" required></label><label>Técnica<input name="technique" value="${esc(r.technique)}" placeholder="Microblading, powder brows…"></label><label>Zona<input name="areas" value="${esc(r.areas)}"></label><label>Pigmento<input name="pigment" value="${esc(r.pigment)}" placeholder="Marca y tono"></label><label>Dispositivo / aguja<input name="device" value="${esc(r.device)}"></label><label>Tipo de piel<input name="skin_type" value="${esc(r.skin_type)}"></label></div><label>Notas de la sesión<textarea name="notes" rows="4">${esc(r.notes)}</textarea></label><label class="check"><input type="checkbox" name="consent_signed" ${r.consent_signed ? 'checked' : ''}> Consentimiento informado firmado</label>`,
    async (v) => { if (r.id) await api(`/api/admin/records/${r.id}`, { method: 'PUT', body: v }); else await api(`/api/admin/clients/${clientId}/records`, { method: 'POST', body: v }); toast('Ficha guardada'); after(); }, { wide: true });
  if (r.id) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn danger'; b.textContent = 'Eliminar'; b.onclick = () => confirmBox('¿Eliminar la ficha?', 'Se borrará el registro de esta sesión.', async () => { await api(`/api/admin/records/${r.id}`, { method: 'DELETE' }); toast('Ficha eliminada'); after(); }, { label: 'Eliminar' }); document.querySelector('.dlg-actions').prepend(b); }
}
