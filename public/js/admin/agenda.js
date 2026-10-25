import { $, $$, api, qs, esc, eur, fm, toMin, dateLong, dateShort, today, addDays, badge, STATUS, openDialog, toast, guard, empty, isoLocal } from './core.js';
import { openBooking } from './booking.js';

let state = { mode: 'lista', range: 'month', anchor: today(), q: '', status: '' };

const weekStart = (s) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoLocal(d); };
function bounds() {
  if (state.mode === 'semana') { const s = weekStart(state.anchor); return [s, addDays(s, 6)]; }
  if (state.range === 'today') return [state.anchor, state.anchor];
  if (state.range === 'week') { const s = weekStart(state.anchor); return [s, addDays(s, 6)]; }
  if (state.range === 'month') return [state.anchor, addDays(state.anchor, 29)];
  return [today(), addDays(today(), 365)];
}

export async function render(el, ctx) {
  const redraw = () => render(el, ctx);
  const [from, to] = bounds();
  const status = state.range === 'pending' && state.mode === 'lista' ? 'pending' : state.status;
  const [rows, blocked, settings] = await Promise.all([api(`/api/admin/bookings?${qs({ from, to, q: state.q, status })}`), api('/api/admin/blocked'), api('/api/admin/settings')]);
  const step = state.mode === 'semana' ? 7 : state.range === 'today' ? 1 : state.range === 'week' ? 7 : 30;
  el.innerHTML = `
    <div class="top"><div><h2>Agenda</h2><p class="sub">${dateShort(from)} – ${dateShort(to)} · ${rows.length} ${rows.length === 1 ? 'cita' : 'citas'}</p></div>
      <div class="actions"><button class="btn" id="new">+ Nueva cita</button></div></div>
    <div class="between" style="margin-bottom:1rem">
      <div class="chips" id="mode"><button class="chip ${state.mode === 'lista' ? 'on' : ''}" data-m="lista">Lista</button><button class="chip ${state.mode === 'semana' ? 'on' : ''}" data-m="semana">Semana</button></div>
      ${state.mode === 'lista' ? `<div class="chips" id="range">${[['today', 'Hoy'], ['week', 'Semana'], ['month', '30 días'], ['pending', 'Pendientes']].map(([k, l]) => `<button class="chip ${state.range === k ? 'on' : ''}" data-r="${k}">${l}</button>`).join('')}</div>` : ''}
      <div class="row"><button class="btn sm ghost" id="prev" aria-label="Anterior">‹</button><button class="btn sm ghost" id="tod">Hoy</button><button class="btn sm ghost" id="next" aria-label="Siguiente">›</button></div>
      <div class="row"><input id="q" placeholder="Buscar clienta o servicio" value="${esc(state.q)}" style="width:210px"><select id="st" style="width:190px"><option value="">Todos los estados</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${state.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <div id="body"></div>`;
  $$('#mode [data-m]', el).forEach((b) => (b.onclick = () => { state.mode = b.dataset.m; state.anchor = today(); redraw(); }));
  $$('#range [data-r]', el).forEach((b) => (b.onclick = () => { state.range = b.dataset.r; state.anchor = today(); redraw(); }));
  $('#prev', el).onclick = () => { state.anchor = addDays(state.anchor, -step); redraw(); };
  $('#next', el).onclick = () => { state.anchor = addDays(state.anchor, step); redraw(); };
  $('#tod', el).onclick = () => { state.anchor = today(); redraw(); };
  let qt; $('#q', el).oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; redraw().then(() => { const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); };
  $('#st', el).onchange = (e) => { state.status = e.target.value; redraw(); };
  $('#new', el).onclick = () => newBooking(redraw);
  const body = $('#body', el);
  if (state.mode === 'semana') weekView(body, rows, blocked, settings, from, redraw); else listView(body, rows, redraw);
}

function listView(body, rows, redraw) {
  if (!rows.length) { body.innerHTML = empty('No hay citas en este periodo', 'Prueba con otro rango o crea una cita manual.'); return; }
  const by = {}; rows.forEach((r) => (by[r.date] ||= []).push(r));
  body.innerHTML = Object.entries(by).map(([d, bs]) => `<div class="dgroup"><h3>${dateLong(d)}${d === today() ? ' · hoy' : ''}</h3>${bs.map((b) => `
    <div class="bk ${b.status}" data-b="${b.id}"><div class="t">${fm(b.start_min)}<small>${fm(b.end_min)}</small></div>
      <div class="who"><b>${esc(b.name)}</b> ${badge(b.status, STATUS[b.status])}<div>${esc(b.service_name)} · ${b.location === 'home' ? 'Domicilio' : 'Estudio'}${b.paid_cents ? ` · cobrado ${eur(b.paid_cents)}` : ''}${b.notes ? ` · “${esc(b.notes.slice(0, 60))}”` : ''}</div></div>
      <div class="acts">${b.status === 'pending' ? `<button class="btn sm ok" data-ok="${b.id}">Confirmar</button>` : ''}</div></div>`).join('')}</div>`).join('');
  $$('[data-b]', body).forEach((x) => (x.onclick = (e) => { if (e.target.closest('[data-ok]')) return; openBooking(x.dataset.b, redraw); }));
  $$('[data-ok]', body).forEach((x) => (x.onclick = guard(async () => { await api(`/api/admin/bookings/${x.dataset.ok}`, { method: 'PATCH', body: { status: 'confirmed' } }); toast('Cita confirmada'); redraw(); window.__panel?.refreshCounts(); })));
}

function weekView(body, rows, blocked, settings, from, redraw) {
  const hours = Object.values(settings.hours).flat();
  const startM = Math.floor((Math.min(540, ...hours.map((h) => h[0])) - 0) / 60) * 60, endM = Math.ceil(Math.max(1200, ...hours.map((h) => h[1])) / 60) * 60;
  const H = endM - startM, days = Array.from({ length: 7 }, (_, i) => addDays(from, i)), blockedSet = new Set(blocked.map((b) => b.date));
  const nowD = new Date(), nowM = nowD.getHours() * 60 + nowD.getMinutes();
  const lines = Array.from({ length: (endM - startM) / 60 + 1 }, (_, i) => i);
  body.innerHTML = `<div class="wk-wrap"><div class="wk" style="--h:${H}px">
    <div></div>${days.map((d) => `<div class="hd ${d === today() ? 'today' : ''}">${new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}<b>${Number(d.slice(8))}</b></div>`).join('')}
    <div class="hours">${lines.map((i) => `<span style="top:${i * 60}px">${pad2(startM / 60 + i)}:00</span>`).join('')}</div>
    ${days.map((d) => `<div class="col" data-d="${d}">${lines.map((i) => `<div class="line" style="top:${i * 60}px"></div>`).join('')}${blockedSet.has(d) ? '<div class="blocked"></div>' : ''}
      ${rows.filter((r) => r.date === d).map((r) => `<div class="ev ${r.status}" data-b="${r.id}" style="top:${r.start_min - startM}px;height:${Math.max(26, r.end_min - r.start_min - 2)}px"><b>${fm(r.start_min)} ${esc(r.name.split(' ')[0])}</b>${esc(r.service_name)}</div>`).join('')}
      ${d === today() && nowM >= startM && nowM <= endM ? `<div class="now" style="top:${nowM - startM}px"></div>` : ''}</div>`).join('')}
  </div></div><p class="muted small" style="margin-top:.6rem">Pulsa una cita para abrirla. Las franjas rayadas son días bloqueados.</p>`;
  $$('[data-b]', body).forEach((x) => (x.onclick = () => openBooking(x.dataset.b, redraw)));
}
const pad2 = (n) => String(n).padStart(2, '0');

async function newBooking(redraw) {
  const [svcs, clients] = await Promise.all([api('/api/admin/services'), api('/api/admin/clients')]);
  const f = openDialog(`<h3>Nueva cita</h3>
    <label>Clienta existente<select name="client"><option value="">Nueva clienta…</option>${clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
    <div class="grid2"><label>Nombre<input name="name" required></label><label>Teléfono<input name="phone" required></label><label class="full">Email<input type="email" name="email" required></label></div>
    <label>Tratamiento<select name="service_id">${svcs.filter((s) => s.active).map((s) => `<option value="${s.id}">${esc(s.name)} · ${s.duration_min} min</option>`).join('')}</select></label>
    <div class="grid2"><label>Fecha<input type="date" name="date" value="${today()}" required></label><label>Hora<input type="time" name="time" step="900" required></label></div>
    <label>Notas<textarea name="notes"></textarea></label><label class="check"><input type="checkbox" name="force"> Ignorar disponibilidad y solapes</label>`,
    async (v) => { await api('/api/admin/bookings', { method: 'POST', body: { ...v, service_id: Number(v.service_id), start_min: toMin(v.time), force: !!v.force } }); toast('Cita creada'); redraw(); }, { submit: 'Crear cita' });
  f.elements.client.onchange = (e) => { const c = clients.find((x) => x.id === Number(e.target.value)); if (c) { f.elements.name.value = c.name; f.elements.phone.value = c.phone || ''; f.elements.email.value = c.email || ''; } };
}
