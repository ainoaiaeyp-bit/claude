const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (c) => (c ? (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : 'Sin coste');
const pad = (n) => String(n).padStart(2, '0');
const fm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const longDate = (s) => new Date(s + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const LABEL = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', done: 'Realizada', no_show: 'No asistió' };
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

async function api(url, method = 'GET', body, raw) {
  const opts = { method, headers: {} };
  if (raw) { opts.body = raw; opts.headers['Content-Type'] = raw.type; }
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  const r = await fetch(url, opts);
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.endsWith('/login')) { showLogin(); throw new Error('Sesión caducada'); }
  if (!r.ok) throw new Error(d.error || 'Error');
  return d;
}
let toastT;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), 2600);
}
const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

/* auth */
function showLogin() { $('#app').hidden = true; $('#login').hidden = false; }
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  try { await api('/api/admin/login', 'POST', { password: $('#pw').value }); $('#pw').value = ''; boot(); }
  catch (ex) { $('#login-err').innerHTML = `<div class="err">${esc(ex.message)}</div>`; }
};
$('#logout').onclick = async () => { await api('/api/admin/logout', 'POST', {}); showLogin(); };

async function boot() {
  try { await api('/api/admin/me'); } catch { return showLogin(); }
  $('#login').hidden = true; $('#app').hidden = false;
  loadAgenda();
}

/* tabs */
$('#tabs').onclick = (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  ({ agenda: loadAgenda, services: loadServices, hours: loadHours, gallery: loadGallery, settings: loadSettings })[b.dataset.tab]();
};

/* ───── agenda ───── */
const today = iso(new Date());
let range = 'month', anchor = today;
function bounds() {
  if (range === 'today') return [anchor, anchor];
  if (range === 'week') { const d = new Date(anchor + 'T12:00:00'); const off = (d.getDay() + 6) % 7; const s = addDays(anchor, -off); return [s, addDays(s, 6)]; }
  if (range === 'month') return [anchor, addDays(anchor, 29)];
  return [today, addDays(today, 365)];
}
$('#range').onclick = (e) => { const b = e.target.closest('[data-r]'); if (!b) return; range = b.dataset.r; anchor = today; $$('#range button').forEach((x) => x.classList.toggle('on', x === b)); loadAgenda(); };
const step = () => (range === 'today' ? 1 : range === 'week' ? 7 : 30);
$('#prev-r').onclick = () => { anchor = addDays(anchor, -step()); loadAgenda(); };
$('#next-r').onclick = () => { anchor = addDays(anchor, step()); loadAgenda(); };

const loadAgenda = guard(async () => {
  const [from, to] = bounds();
  const [rows, st] = await Promise.all([api(`/api/admin/bookings?from=${from}&to=${to}`), api('/api/admin/stats')]);
  $('#stats').innerHTML = [
    ['Pendientes', st.pending, st.pending ? 'alert' : ''], ['Citas hoy', st.today, ''], ['Próximas', st.upcoming, ''],
    ['Ingresos del mes', eur(st.monthRevenue), ''], ['Clientes', st.clients, '']
  ].map(([l, v, c]) => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`).join('');
  $('#range-label').textContent = range === 'pending' ? 'Solo pendientes' : `${longDate(from)}${from !== to ? ' – ' + longDate(to) : ''}`;
  const list = range === 'pending' ? rows.filter((r) => r.status === 'pending') : rows;
  if (!list.length) { $('#bookings').innerHTML = '<div class="empty">No hay citas en este periodo.</div>'; return; }
  const byDay = {};
  list.forEach((r) => (byDay[r.date] ||= []).push(r));
  $('#bookings').innerHTML = Object.entries(byDay).map(([d, bs]) => `<div class="dgroup"><h3>${longDate(d)}${d === today ? ' · hoy' : ''}</h3>${bs.map(bookingRow).join('')}</div>`).join('');
});

function bookingRow(b) {
  const wa = `https://wa.me/${b.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${b.name.split(' ')[0]}, te escribo sobre tu cita de ${b.service_name} el ${longDate(b.date)} a las ${fm(b.start_min)}.`)}`;
  const a = (s, t, cls = '') => `<button class="${cls}" data-act="${s}" data-id="${b.id}">${t}</button>`;
  return `<article class="bk ${b.status}">
    <div class="t">${fm(b.start_min)}<small>${fm(b.end_min)}</small></div>
    <div class="who"><b>${esc(b.name)}</b> <span class="badge ${b.status}">${LABEL[b.status]}</span>
      <div>${esc(b.service_name)} · ${eur(b.price_cents)} · ${b.location === 'home' ? 'Domicilio: ' + esc(b.address) : 'Estudio'}</div>
      <div>${esc(b.phone)} · ${esc(b.email)}${b.notes ? `<br>“${esc(b.notes)}”` : ''}${b.source === 'admin' ? ' · manual' : ''}</div></div>
    <div class="acts">
      ${b.status === 'pending' ? a('confirmed', 'Confirmar', 'ok') : ''}
      ${b.status === 'confirmed' ? a('done', 'Realizada') + a('no_show', 'No asistió') : ''}
      ${['pending', 'confirmed'].includes(b.status) ? a('cancelled', 'Cancelar', 'bad') : ''}
      ${['cancelled', 'no_show', 'done'].includes(b.status) ? a('confirmed', 'Reabrir') : ''}
      <a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>
      <a href="mailto:${esc(b.email)}">Email</a>
      <button class="bad" data-del="${b.id}" title="Eliminar">Eliminar</button>
    </div></article>`;
}
$('#bookings').onclick = guard(async (e) => {
  const act = e.target.closest('[data-act]'), del = e.target.closest('[data-del]');
  if (act) {
    if (act.dataset.act === 'cancelled' && !confirm('¿Cancelar esta cita?')) return;
    await api(`/api/admin/bookings/${act.dataset.id}`, 'PATCH', { status: act.dataset.act });
    toast('Cita actualizada'); loadAgenda();
  } else if (del && confirm('¿Eliminar definitivamente esta cita?')) {
    await api(`/api/admin/bookings/${del.dataset.del}`, 'DELETE'); toast('Cita eliminada'); loadAgenda();
  }
});

/* dialog helper */
const dlg = $('#dlg'), dform = $('#dlg-form');
function openDialog(html, onSubmit) {
  dform.innerHTML = html + '<div class="dlg-actions"><button type="button" class="btn btn-ghost btn-sm" id="dlg-x">Cancelar</button><button class="btn btn-sm">Guardar</button></div>';
  $('#dlg-x').onclick = () => dlg.close();
  dform.onsubmit = guard(async (e) => { e.preventDefault(); await onSubmit(Object.fromEntries(new FormData(dform)), dform); dlg.close(); });
  dlg.showModal();
}

$('#new-booking').onclick = guard(async () => {
  const svcs = await api('/api/admin/services');
  openDialog(`<h3>Nueva cita manual</h3>
    <label>Servicio<select name="service_id">${svcs.filter((s) => s.active).map((s) => `<option value="${s.id}">${esc(s.name)} (${s.duration_min} min)</option>`).join('')}</select></label>
    <div class="grid2"><label>Fecha<input type="date" name="date" value="${today}" required></label><label>Hora<input type="time" name="time" step="900" required></label></div>
    <label>Nombre<input name="name" required></label>
    <div class="grid2"><label>Teléfono<input name="phone" required></label><label>Email<input type="email" name="email" required></label></div>
    <label>Notas<textarea name="notes"></textarea></label>
    <label class="sw"><input type="checkbox" name="force"> Ignorar disponibilidad y solapes</label>`,
  async (d) => {
    await api('/api/admin/bookings', 'POST', { ...d, start_min: toMin(d.time), force: !!d.force, service_id: Number(d.service_id) });
    toast('Cita creada'); loadAgenda();
  });
});

/* ───── services ───── */
const loadServices = guard(async () => {
  const list = await api('/api/admin/services');
  $('#services').innerHTML = list.map((s) => `<div class="svc ${s.active ? '' : 'off'}"><div><b>${esc(s.name)}</b> <small>· ${esc(s.category)} · ${s.duration_min} min · ${s.price_from ? 'desde ' : ''}${eur(s.price_cents)}${s.allow_home ? ' · domicilio' : ''}${s.active ? '' : ' · oculto'}</small><br><small>${esc(s.description)}</small></div>
    <div class="acts"><button data-edit="${s.id}">Editar</button><button class="bad" data-rm="${s.id}">Eliminar</button></div></div>`).join('') || '<div class="empty">Aún no hay servicios.</div>';
  $('#services').onclick = guard(async (e) => {
    const ed = e.target.closest('[data-edit]'), rm = e.target.closest('[data-rm]');
    if (ed) serviceDialog(list.find((s) => s.id === Number(ed.dataset.edit)));
    if (rm && confirm('¿Eliminar servicio? Si tiene citas, se ocultará en lugar de borrarse.')) {
      const r = await api(`/api/admin/services/${rm.dataset.rm}`, 'DELETE'); toast(r.archived ? 'Servicio ocultado (tiene citas)' : 'Servicio eliminado'); loadServices();
    }
  });
});
$('#new-service').onclick = () => serviceDialog();
function serviceDialog(s = {}) {
  openDialog(`<h3>${s.id ? 'Editar' : 'Nuevo'} servicio</h3>
    <label>Nombre<input name="name" required maxlength="80" value="${esc(s.name)}"></label>
    <div class="grid2"><label>Categoría<input name="category" maxlength="40" value="${esc(s.category || 'Maquillaje')}"></label>
    <label>Duración (min)<input type="number" name="duration_min" min="10" max="600" step="5" required value="${s.duration_min || 60}"></label></div>
    <div class="grid2"><label>Precio (€)<input type="number" name="price" min="0" step="0.5" required value="${((s.price_cents || 0) / 100)}"></label>
    <label class="sw" style="margin-top:1.6rem"><input type="checkbox" name="price_from" ${s.price_from ? 'checked' : ''}> Precio “desde”</label></div>
    <label>Descripción<textarea name="description" maxlength="500">${esc(s.description)}</textarea></label>
    <label class="sw"><input type="checkbox" name="allow_home" ${s.allow_home ? 'checked' : ''}> Permite servicio a domicilio</label>
    <label class="sw"><input type="checkbox" name="active" ${s.active !== false ? 'checked' : ''}> Visible y reservable</label>`,
  async (d) => {
    const body = { name: d.name, category: d.category, description: d.description, duration_min: Number(d.duration_min), price_cents: Math.round(Number(d.price) * 100), price_from: !!d.price_from, allow_home: !!d.allow_home, active: !!d.active };
    await api(s.id ? `/api/admin/services/${s.id}` : '/api/admin/services', s.id ? 'PUT' : 'POST', body);
    toast('Servicio guardado'); loadServices();
  });
}

/* ───── hours ───── */
let hoursState = {};
const loadHours = guard(async () => {
  const s = await api('/api/admin/settings');
  hoursState = JSON.parse(s.hours);
  drawHours();
  const bl = await api('/api/admin/blocked');
  $('#blocked').innerHTML = bl.length ? bl.map((b) => `<div class="svc"><span>${longDate(b.date)}${b.reason ? ' · ' + esc(b.reason) : ''}</span><div class="acts"><button class="bad" data-unb="${b.date}">Quitar</button></div></div>`).join('') : '<p class="muted">Sin días bloqueados.</p>';
});
function drawHours() {
  $('#hours').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => `<div class="hrow"><b>${DAYS[d]}</b><div class="ranges">
    ${(hoursState[d] || []).map((r, i) => `<div class="range"><input type="time" value="${fm(r[0])}" data-d="${d}" data-i="${i}" data-k="0"> – <input type="time" value="${fm(r[1])}" data-d="${d}" data-i="${i}" data-k="1"><button data-rmr="${d}:${i}" aria-label="Quitar tramo">✕</button></div>`).join('') || '<span class="closed">Cerrado</span>'}
    <div><button class="mini" data-addr="${d}">+ Añadir tramo</button></div></div></div>`).join('');
}
$('#hours').onclick = (e) => {
  const add = e.target.closest('[data-addr]'), rm = e.target.closest('[data-rmr]');
  if (add) { (hoursState[add.dataset.addr] ||= []).push([600, 840]); drawHours(); }
  if (rm) { const [d, i] = rm.dataset.rmr.split(':'); hoursState[d].splice(Number(i), 1); drawHours(); }
};
$('#hours').onchange = (e) => { const t = e.target; if (t.dataset.d) hoursState[t.dataset.d][t.dataset.i][t.dataset.k] = toMin(t.value); };
$('#save-hours').onclick = guard(async () => { await api('/api/admin/settings', 'PUT', { hours: hoursState }); toast('Horario guardado'); });
$('#block-form').onsubmit = guard(async (e) => { e.preventDefault(); await api('/api/admin/blocked', 'POST', { date: $('#block-date').value, reason: $('#block-reason').value }); e.target.reset(); toast('Día bloqueado'); loadHours(); });
$('#blocked').onclick = guard(async (e) => { const b = e.target.closest('[data-unb]'); if (b) { await api(`/api/admin/blocked/${b.dataset.unb}`, 'DELETE'); loadHours(); } });

/* ───── gallery ───── */
const loadGallery = guard(async () => {
  const list = await (await fetch('/api/gallery')).json();
  $('#gal').innerHTML = list.map((u) => `<figure><img src="${esc(u)}" alt="" loading="lazy"><button data-rmg="${esc(u.split('/').pop())}" aria-label="Eliminar foto">✕</button></figure>`).join('') || '<div class="empty" style="grid-column:1/-1">Todavía no hay fotos. Sube tus mejores trabajos: aparecerán en la web al instante.</div>';
});
$('#gal').onclick = guard(async (e) => { const b = e.target.closest('[data-rmg]'); if (b && confirm('¿Eliminar esta foto?')) { await api(`/api/admin/gallery/${b.dataset.rmg}`, 'DELETE'); loadGallery(); } });
$('#upload').onchange = guard(async (e) => {
  for (const f of e.target.files) { await api('/api/admin/gallery', 'POST', undefined, f); }
  e.target.value = ''; toast('Fotos subidas'); loadGallery();
});

/* ───── settings ───── */
const FIELDS = [
  ['businessName', 'Nombre del negocio'], ['tagline', 'Frase descriptiva'], ['city', 'Ciudad / zona'], ['address', 'Dirección del estudio'],
  ['phone', 'Teléfono'], ['whatsapp', 'WhatsApp (con prefijo, ej. 34600111222)'], ['email', 'Email de contacto'], ['instagram', 'URL de Instagram'],
  ['depositInfo', 'Mensaje sobre señal/pago (opcional)'], ['homeFeeInfo', 'Texto sobre servicio a domicilio']
];
const loadSettings = guard(async () => {
  const s = await api('/api/admin/settings');
  $('#settings-form').innerHTML = `<h3>Negocio y contacto</h3><div class="grid2">${FIELDS.map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(s[k])}"></label>`).join('')}</div>
    <h3>Reglas de reserva</h3><div class="grid3">
    <label>Intervalo entre horas (min)<input type="number" name="slotStep" value="${s.slotStep}" min="5" max="120"></label>
    <label>Descanso entre citas (min)<input type="number" name="buffer" value="${s.buffer}" min="0" max="240"></label>
    <label>Antelación mínima (horas)<input type="number" name="minNoticeHours" value="${s.minNoticeHours}" min="0"></label>
    <label>Reservar hasta (días vista)<input type="number" name="maxDaysAhead" value="${s.maxDaysAhead}" min="1" max="730"></label>
    <label>Cancelación hasta (horas antes)<input type="number" name="cancelHours" value="${s.cancelHours}" min="0"></label>
    <label class="sw" style="margin-top:1.6rem"><input type="checkbox" name="autoConfirm" ${s.autoConfirm === '1' ? 'checked' : ''}> Confirmar citas automáticamente</label></div>
    <button class="btn btn-sm" style="justify-self:start">Guardar ajustes</button>`;
});
$('#settings-form').onsubmit = guard(async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  for (const k of ['slotStep', 'buffer', 'minNoticeHours', 'maxDaysAhead', 'cancelHours']) d[k] = Number(d[k]);
  d.autoConfirm = !!d.autoConfirm;
  await api('/api/admin/settings', 'PUT', d); toast('Ajustes guardados');
});
$('#pw-form').onsubmit = guard(async (e) => {
  e.preventDefault();
  await api('/api/admin/password', 'POST', Object.fromEntries(new FormData(e.target)));
  e.target.reset(); toast('Contraseña actualizada');
});

boot();
