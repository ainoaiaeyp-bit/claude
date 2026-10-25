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
    <div class="row">${badge(b.status, STATUS[b.status])}${b.source === 'admin' ? badge('neutral', 'Manual') : ''}${owe ? badge('warn', `Falta cobrar ${eur(owe)}`) : ''}</div>
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
      <div class="row"><button class="btn sm">Guardar cobro</button><button type="button" class="btn sm ghost" id="pay-full">Cobrar importe completo</button></div></form>
    <form class="card stack" id="note-form"><h4>Notas internas</h4><textarea name="n" placeholder="Solo las ves tú">${esc(b.internal_notes || '')}</textarea><div><button class="btn sm ghost">Guardar nota</button></div></form>
    ${d.history.length ? `<div class="card"><h4>Otras citas de ${esc(first)}</h4><div style="margin-top:.5rem">${d.history.map((h) => `<div class="between small" style="padding:.3rem 0;border-bottom:1px solid var(--line)"><span>${dateShort(h.date)} · ${esc(h.service_name)}</span>${badge(h.status, STATUS[h.status])}</div>`).join('')}</div></div>` : ''}
    <div class="row"><button class="btn ghost" id="mv">Mover cita</button><button class="btn danger" id="del">Eliminar</button></div>`);

  const done = () => { closeDrawer(); after(); window.__panel?.refreshCounts(); };
  const setStatus = guard(async (s) => { await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { status: s } }); toast('Cita actualizada'); done(); });
  const acts = { pending: [['confirmed', 'Confirmar', 'ok']], confirmed: [['done', 'Marcar realizada', ''], ['no_show', 'No asistió', 'ghost']], done: [['confirmed', 'Reabrir', 'ghost']], cancelled: [['confirmed', 'Reabrir', 'ghost']], no_show: [['confirmed', 'Reabrir', 'ghost']] }[b.status] || [];
  const extra = ['pending', 'confirmed'].includes(b.status) ? [['cancelled', 'Cancelar cita', 'danger']] : [];
  $('#st-actions', el).innerHTML = [...acts, ...extra].map(([s, l, cls]) => `<button class="btn sm ${cls}" data-s="${s}">${l}</button>`).join('');
  $$('[data-s]', el).forEach((x) => (x.onclick = () => (x.dataset.s === 'cancelled' ? confirmBox('¿Cancelar la cita?', 'Se marcará como cancelada y el hueco quedará libre.', () => setStatus(x.dataset.s), { label: 'Cancelar cita' }) : setStatus(x.dataset.s))));
  const pay = guard(async (paid) => { const f = $('#pay-form', el); await api(`/api/admin/bookings/${id}`, { method: 'PATCH', body: { paid_cents: Math.round(paid * 100), pay_method: f.method.value, price_cents: Math.round(Number(f.price.value) * 100), ...(b.status !== 'done' && paid > 0 && b.status !== 'cancelled' ? { status: 'done' } : {}) } }); toast('Cobro guardado'); done(); });
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
