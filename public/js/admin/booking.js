/* Ficha de cita en panel lateral: estado, cobro, mover, notas internas y datos de la clienta. */
import { $, $$, api, esc, eur, fm, toMin, dateLong, dateShort, openDrawer, closeDrawer, openDialog, confirmBox, toast, guard, badge, STATUS, STAGE, wa, addDays } from './core.js';

export async function openBooking(id, after = () => {}) {
  const d = await api(`/api/admin/bookings/${id}`);
  const b = d.booking, c = d.client;
  const first = (c?.name || b.name).split(' ')[0];
  const wtext = `Hola ${first}, te escribo sobre tu cita de ${b.service_name} el ${dateLong(b.date)} a las ${fm(b.start_min)}.`;
  const wlink = b.phone ? `https://wa.me/${b.phone.replace(/\D/g, '').replace(/^(\d{9})$/, '34$1')}?text=${encodeURIComponent(wtext)}` : '';
  const owe = b.status === 'done' ? Math.max(0, b.price_cents - (b.paid_cents || 0)) : 0;
  const el = openDrawer(`
    <div><h3>${esc(b.service_name)}</h3><p class="muted" style="margin-top:.3rem">${dateLong(b.date)} · ${fm(b.start_min)}–${fm(b.end_min)} · ${b.location === 'home' ? 'A domicilio' : 'Estudio'}</p></div>
    <div class="row">${badge(b.status, STATUS[b.status])}${b.status === 'proposed' ? badge('neutral', `Pidió ${dateShort(b.prev_date)} ${fm(b.prev_start_min)}`) : ''}${b.source === 'admin' ? badge('neutral', 'Manual') : ''}${owe ? badge('warn', `Falta cobrar ${eur(owe)}`) : ''}</div>
    <div class="row" id="st-actions"></div>
    <div class="card"><h4>Clienta</h4>
      <div class="between" style="margin-top:.5rem"><div><b>${esc(b.name)}</b> ${c ? badge(c.stage, STAGE[c.stage]) : ''}<div class="muted small">${esc(b.phone)} · ${esc(b.email)}</div>${b.location === 'home' ? `<div class="small">${esc(b.address)}</div>` : ''}</div>
      <div class="row">${c ? `<a class="btn sm ghost" href="#clientas.${c.id}">Ver ficha</a>` : ''}${wa(wlink)}</div></div>
      ${b.notes ? `<p class="small" style="margin-top:.7rem">“${esc(b.notes)}”</p>` : ''}
      ${c && (c.allergies || c.health) ? `<p class="small" style="margin-top:.6rem;color:var(--bad)">⚠ ${esc([c.allergies, c.health].filter(Boolean).join(' · '))}</p>` : ''}</div>
    <form class="card stack" id="pay-form"><h4>Cobro</h4>
      <div class="grid3"><label>Precio<input name="price" type="number" step="0.01" min="0" value="${(b.price_cents / 100).toFixed(2)}"></label>
      <label>Cobrado<input name="paid" type="number" step="0.01" min="0" value="${((b.paid_cents || 0) / 100).toFixed(2)}"></label>
      <label>Método<select name="method">${['', 'efectivo', 'tarjeta', 'bizum', 'transferencia'].map((m) => `<option value="${m}" ${b.pay_method === m ? 'selected' : ''}>${m || '—'}</option>`).join('')}</select></label></div>
      ${['pending', 'proposed', 'confirmed', 'done'].includes(b.status) && (b.price_cents - (b.paid_cents || 0)) > 0 ? '<div class="row" id="vrow"><input id="vcode" placeholder="Código de bono NOE-XXXX-XXXX" style="flex:1;min-width:160px;text-transform:uppercase"><button type="button" class="btn sm clay" id="vuse">Usar bono</button></div>' : ''}
      <div class="row"><button class="btn sm">Guardar cobro</button><button type="button" class="btn sm ghost" id="pay-full">Cobrar importe completo</button></div></form>
    <form class="card stack" id="note-form"><h4>Notas internas</h4><textarea name="n" placeholder="Solo las ves tú">${esc(b.internal_notes || '')}</textarea><div><button class="btn sm ghost">Guardar nota</button></div></form>
    ${d.history.length ? `<div class="card"><h4>Otras citas de ${esc(first)}</h4><div style="margin-top:.5rem">${d.history.map((h) => `<div class="between small" style="padding:.3rem 0;border-bottom:1px solid var(--line)"><span>${dateShort(h.date)} · ${esc(h.service_name)}</span>${badge(h.status, STATUS[h.status])}</div>`).join('')}</div></div>` : ''}
    <div class="row"><button class="btn ghost" id="mv">Mover cita</button><button class="btn danger" id="del">Eliminar</button></div>`);

  const done = () => { closeDrawer(); after(); window.__panel?.refreshCounts(); };
  const setStatus = guard(async (s) => { await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { status: s } }); toast('Cita actualizada'); done(); });
  const acts = { pending: [['confirmed', 'Aceptar', 'ok'], ['propose', 'Proponer otra hora', 'clay'], ['reject', 'Rechazar', 'danger']], proposed: [['confirmed', 'Confirmar igualmente', 'ok'], ['propose', 'Cambiar propuesta', 'clay']], confirmed: [['done', 'Marcar realizada', ''], ['no_show', 'No asistió', 'ghost']], done: [['confirmed', 'Reabrir', 'ghost']], cancelled: [['confirmed', 'Reabrir', 'ghost']], no_show: [['confirmed', 'Reabrir', 'ghost']] }[b.status] || [];
  const extra = ['proposed', 'confirmed'].includes(b.status) ? [['cancelled', 'Cancelar cita', 'danger']] : [];
  $('#st-actions', el).innerHTML = [...acts, ...extra].map(([s, l, cls]) => `<button class="btn sm ${cls}" data-s="${s}">${l}</button>`).join('');
  $$('[data-s]', el).forEach((x) => (x.onclick = () => (x.dataset.s === 'propose' ? proposeDialog(b, done) : x.dataset.s === 'reject' ? rejectDialog(b, done) : x.dataset.s === 'cancelled' ? confirmBox('¿Cancelar la cita?', 'Se marcará como cancelada y el hueco quedará libre.', () => setStatus(x.dataset.s), { label: 'Cancelar cita' }) : setStatus(x.dataset.s))));
  const pay = guard(async (paid) => { const f = $('#pay-form', el); await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { paid_cents: Math.round(paid * 100), pay_method: f.method.value, price_cents: Math.round(Number(f.price.value) * 100), ...(b.status !== 'done' && paid > 0 && b.status !== 'cancelled' ? { status: 'done' } : {}) } }); toast('Cobro guardado'); done(); });
  const vuse = $('#vuse', el); if (vuse) vuse.onclick = guard(async () => { const code = $('#vcode', el).value.trim(); if (!code) throw new Error('Escribe el código del bono.'); await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { voucher_code: code } }); toast('Bono aplicado al cobro'); done(); });
  $('#pay-form', el).onsubmit = (e) => { e.preventDefault(); pay(Number(e.target.paid.value)); };
  $('#pay-full', el).onclick = () => pay(Number($('#pay-form', el).price.value));
  $('#note-form', el).onsubmit = guard(async (e) => { e.preventDefault(); await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { internal_notes: e.target.n.value } }); toast('Nota guardada'); });
  $('#del', el).onclick = () => confirmBox('¿Eliminar la cita?', 'Se borra definitivamente. Si solo quieres liberar el hueco, mejor cancélala.', async () => { await api(`/api/admin/bookings/${id}`, { method: 'DELETE' }); toast('Cita eliminada'); done(); }, { label: 'Eliminar' });
  $('#mv', el).onclick = () => moveDialog(b, done);
}

async function moveDialog(b, done) {
  let date = b.date;
  const f = openDialog(`<h3>Mover cita</h3><p class="muted">${esc(b.service_name)} · ${esc(b.name)}</p>
    <div class="grid2"><label>Nueva fecha<input type="date" name="date" value="${b.date}" required></label><label>Hora<select name="time"></select></label></div>
    <label>Hora exacta (solo si fuerzas)<input type="time" name="custom"></label><label class="check"><input type="checkbox" name="force"> Permitir una hora fuera de disponibilidad</label>`,
    async (v) => { const t = v.force && v.custom ? toMin(v.custom) : Number(v.time); await api(`/api/admin/bookings/${b.id}/move`, { method: 'POST', body: { date: v.date, start_min: t, force: !!v.force } }); toast('Cita movida'); done(); }, { submit: 'Mover' });
  const sel = f.elements.time;
  const load = async () => {
    const r = await api(`/api/availability?service_id=${b.service_id}&date=${f.elements.date.value}`);
    sel.innerHTML = r.slots.length ? r.slots.map((s) => `<option value="${s.start_min}" ${s.start_min === b.start_min && f.elements.date.value === b.date ? 'selected' : ''}>${s.label}</option>`).join('') : '<option value="">Sin huecos ese día</option>';
  };
  f.elements.date.onchange = load; load();
}

/** Propone otra fecha u hora a la clienta; se le avisa por email con enlace para aceptar. */
export async function proposeDialog(b, done) {
  const f = openDialog(`<h3>Proponer otra hora</h3><p class="muted">${esc(b.name)} pidió ${esc(b.service_name)} el ${dateLong(b.prev_date || b.date)} a las ${fm(b.prev_start_min ?? b.start_min)}. Se reserva el nuevo hueco y ella decide desde su enlace.</p>
    <div class="grid2"><label>Nueva fecha<input type="date" name="date" value="${b.prev_date || b.date}" required></label><label>Hora<select name="time" required></select></label></div>
    <div id="alts" class="chips" aria-label="Huecos cercanos"></div>
    <label>Mensaje para ${esc(b.name.split(' ')[0])} (opcional)<textarea name="message" rows="3" placeholder="Ese día ya tengo la agenda completa, ¿te viene bien este otro?">${esc(b.proposal_message || '')}</textarea></label>`,
    async (v) => { if (!v.time) throw new Error('Elige una hora libre.'); const r = await api(`/api/admin/bookings/${b.id}/propose`, { method: 'POST', body: { date: v.date, start_min: Number(v.time), message: v.message } }); toast(r.mail === 'enviado' ? 'Propuesta enviada por email' : 'Propuesta guardada. Email preparado en la bandeja de salida'); done(); }, { submit: 'Enviar propuesta' });
  const sel = f.elements.time, alts = $('#alts', f);
  const load = async () => {
    const r = await api(`/api/availability?service_id=${b.service_id}&date=${f.elements.date.value}`);
    const cur = f.elements.date.value === b.date ? b.start_min : -1;
    const slots = r.slots.map((s) => s.start_min);
    if (cur >= 0 && !slots.includes(cur) && b.status === 'proposed') slots.push(cur);
    slots.sort((x, y) => x - y);
    sel.innerHTML = slots.length ? slots.map((m) => `<option value="${m}" ${m === cur ? 'selected' : ''}>${fm(m)}</option>`).join('') : '<option value="">Sin huecos ese día</option>';
  };
  const near = async () => {
    const out = [];
    for (let i = 1; i <= 10 && out.length < 4; i++) {
      const d = addDays(b.prev_date || b.date, i), r = await api(`/api/availability?service_id=${b.service_id}&date=${d}`);
      if (r.slots.length) out.push([d, r.slots[0].start_min, r.slots[r.slots.length - 1].start_min]);
    }
    alts.innerHTML = out.length ? out.map(([d]) => `<button type="button" class="chip" data-d="${d}">${dateShort(d).replace(/ \d+$/, '')}</button>`).join('') : '';
    alts.querySelectorAll('[data-d]').forEach((c) => (c.onclick = () => { f.elements.date.value = c.dataset.d; load(); }));
  };
  f.elements.date.onchange = load; load(); near();
}

/** Rechaza una solicitud con un mensaje opcional por email. */
export function rejectDialog(b, done) {
  openDialog(`<h3>Rechazar solicitud</h3><p class="muted">${esc(b.name)} · ${esc(b.service_name)} · ${dateLong(b.date)} ${fm(b.start_min)}. El hueco queda libre y se le avisa por email.</p>
    <label>Mensaje (opcional)<textarea name="message" rows="3" placeholder="Ese día no atiendo. Puedes elegir otro en la web."></textarea></label>
    <label class="check"><input type="checkbox" name="notify" checked> Avisar a la clienta por email</label>`,
    async (v) => { const r = await api(`/api/admin/bookings/${b.id}/reject`, { method: 'POST', body: { message: v.message, notify: v.notify } }); toast(v.notify ? (r.mail === 'enviado' ? 'Rechazada y avisada' : 'Rechazada. Email preparado en la bandeja de salida') : 'Solicitud rechazada'); done(); }, { submit: 'Rechazar' });
}
