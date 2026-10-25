import { $, $$, api, esc, eur, eur0, fm, dateLong, dateShort, dateTime, monthName, badge, STATUS, STAGE, barChart, hbars, delta, empty, today, openDialog, toast, guard } from './core.js';
import { openBooking } from './booking.js';

export async function render(el, { refreshCounts }) {
  const d = await api('/api/admin/dashboard');
  const k = d.kpis, hello = new Date().getHours() < 14 ? 'Buenos días' : 'Buenas tardes';
  const maxW = d.weekly.map((w) => ({ label: dateShort(w.week).replace(/ \d+$/, ''), value: w.revenue }));
  const stages = Object.entries(d.stages).map(([s, n]) => ({ label: STAGE[s] || s, value: n }));
  el.innerHTML = `
    <div class="top"><div><h2>${hello}, Noelia</h2><p class="sub">${dateLong(today())}. ${d.today ? `Hoy tienes <b>${d.today}</b> ${d.today === 1 ? 'cita' : 'citas'}.` : 'Hoy no tienes citas.'}</p></div>
      <div class="actions"><a class="btn" href="#agenda">Ver agenda</a><a class="btn ghost" href="#clientas.nueva">Nueva clienta</a></div></div>

    ${[k.pending && `<a class="kpi warn" style="display:block;text-decoration:none;margin-bottom:.6rem" href="#agenda"><b style="font-size:1.4rem">${k.pending} ${k.pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de confirmar</b></a>`, d.drafts && `<a class="kpi warn" style="display:block;text-decoration:none;margin-bottom:.6rem" href="#contabilidad"><b style="font-size:1.4rem">${d.drafts} ${d.drafts === 1 ? 'factura subida pendiente' : 'facturas subidas pendientes'} de revisar</b></a>`].filter(Boolean).join('')}

    <div class="kpis">
      <div class="kpi"><b>${eur0(k.month_revenue)}</b><span>Cobrado este mes</span>${delta(k.month_revenue, k.prev_revenue)}</div>
      <div class="kpi ${k.to_collect ? 'warn' : ''}"><b>${eur0(k.to_collect)}</b><span>Pendiente de cobro</span><small>Citas realizadas sin cobrar</small></div>
      <div class="kpi"><b>${k.occupancy}%</b><span>Ocupación próximos 7 días</span></div>
      <div class="kpi"><b>${eur0(k.ticket)}</b><span>Ticket medio</span><small>Últimos 90 días</small></div>
      <div class="kpi ${k.no_show_rate > 10 ? 'bad' : ''}"><b>${k.no_show_rate}%</b><span>No asistencias</span><small>Últimos 90 días</small></div>
      <div class="kpi"><b>${k.clients}</b><span>Clientas</span><small>${k.new_clients_30} nuevas en 30 días</small></div>
    </div>

    <div class="grid2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">
      <div class="card"><div class="between"><h3>Ingresos por semana</h3><span class="muted small">Últimas 8 semanas</span></div>${barChart(maxW, { cur: 7 })}</div>
      <div class="card"><h3>Próximas citas</h3>${d.next.length ? d.next.map((b) => `<div class="between" data-b="${b.id}" style="padding:.55rem 0;border-bottom:1px solid var(--line);cursor:pointer"><div><b>${esc(b.client_name)}</b><div class="muted small">${esc(b.service_name)}</div></div><div style="text-align:right"><div class="mono">${fm(b.start_min)}</div><div class="muted small">${dateShort(b.date).replace(/ \d+$/, '')}</div></div></div>`).join('') : empty('Sin citas próximas', 'Cuando alguien reserve aparecerá aquí.')}</div>
    </div>

    <div class="grid3" style="margin-top:1rem">
      <div class="card"><div class="between"><h3>Tareas</h3><a class="link small" href="#seguimiento">Ver todas</a></div>${d.tasks.length ? d.tasks.map((t) => `<label class="check" style="padding:.4rem 0;border-bottom:1px solid var(--line)"><input type="checkbox" data-task="${t.id}"><span>${esc(t.title)}${t.client_name ? ` <span class="muted">· ${esc(t.client_name)}</span>` : ''}<br><small class="muted">${t.due_date < today() ? '<span style="color:var(--bad)">Vencida · </span>' : ''}${dateShort(t.due_date)}</small></span></label>`).join('') : '<p class="muted small">Nada pendiente.</p>'}<button class="btn sm ghost" id="add-task" style="margin-top:.7rem">+ Tarea</button></div>
      <div class="card"><h3>Servicios del mes</h3>${hbars(d.top_services.map((s) => ({ label: s.name, value: s.cents })))}</div>
      <div class="card"><h3>Tus clientas por etapa</h3>${hbars(stages, { fmt: (n) => n, cls: 'clay' })}<a class="link small" href="#clientas" style="display:inline-block;margin-top:.5rem">Abrir CRM</a></div>
    </div>

    <div class="card" style="margin-top:1rem"><h3>Actividad reciente</h3>${d.activity.length ? `<div class="tl">${d.activity.map((a) => `<div class="tl-i ${a.kind.startsWith('auto') ? 'auto' : ''}"><b>${esc(a.client_name || '—')}</b> · ${esc(a.text)}<small>${dateTime(a.created_at)}</small></div>`).join('')}</div>` : empty('Todavía no hay actividad')}</div>`;

  $$('[data-b]', el).forEach((x) => (x.onclick = () => openBooking(x.dataset.b, () => render(el, { refreshCounts }))));
  $$('[data-task]', el).forEach((x) => (x.onchange = guard(async () => { await api(`/api/admin/tasks/${x.dataset.task}`, { method: 'PATCH', body: { done: true } }); toast('Tarea completada'); render(el, { refreshCounts }); refreshCounts(); })));
  $('#add-task', el).onclick = () => openDialog(`<h3>Nueva tarea</h3><label>Qué hay que hacer<input name="title" required maxlength="160"></label><label>Para el día<input type="date" name="due_date" value="${today()}"></label>`, async (v) => { await api('/api/admin/tasks', { method: 'POST', body: v }); toast('Tarea creada'); render(el, { refreshCounts }); }, { submit: 'Crear' });
}
