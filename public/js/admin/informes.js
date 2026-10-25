import { $, $$, api, qs, esc, eur, eur0, dateShort, monthName, addDays, today, barChart, hbars, empty, guard, download } from './core.js';

let range = 180;
export async function render(el, ctx) {
  const to = today(), from = addDays(to, -range);
  const r = await api(`/api/admin/reports?${qs({ from, to })}`);
  const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const STATUS_L = { done: 'Realizadas', confirmed: 'Confirmadas', pending: 'Pendientes', cancelled: 'Canceladas', no_show: 'No asistió' };
  el.innerHTML = `<div class="top"><div><h2>Informes</h2><p class="sub">${dateShort(from)} – ${dateShort(to)}</p></div>
      <div class="actions"><select id="rg" style="width:170px">${[[30, 'Últimos 30 días'], [90, 'Últimos 90 días'], [180, 'Últimos 6 meses'], [365, 'Último año']].map(([v, l]) => `<option value="${v}" ${v === range ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn ghost" id="e1">Exportar citas</button><button class="btn ghost" id="e2">Exportar clientas</button></div></div>
    <div class="kpis"><div class="kpi"><b>${eur0(r.revenue)}</b><span>Cobrado</span></div><div class="kpi"><b>${r.bookings}</b><span>Citas</span></div><div class="kpi"><b>${eur0(r.avg_ticket)}</b><span>Ticket medio</span></div><div class="kpi"><b>${r.new_clients}</b><span>Clientas nuevas</span></div><div class="kpi"><b>${r.returning_clients}</b><span>Clientas que repiten</span></div></div>
    <div class="grid2"><div class="card"><h3>Ingresos por mes</h3>${r.by_month.length ? barChart(r.by_month.map((m) => ({ label: monthName(m.month), value: m.revenue })), { cur: r.by_month.length - 1 }) : empty('Sin cobros en este periodo')}</div>
      <div class="card"><h3>Citas por día de la semana</h3>${barChart(r.by_weekday.map((v, i) => ({ label: dows[i], value: v })), { fmt: (n) => n })}</div></div>
    <div class="grid2" style="margin-top:1rem"><div class="card"><h3>Ingresos por servicio</h3>${hbars(r.by_service.slice(0, 10).map((s) => ({ label: s.name, value: s.revenue })))}</div>
      <div class="card"><h3>Servicios más pedidos</h3>${hbars([...r.by_service].sort((a, b) => b.count - a.count).slice(0, 10).map((s) => ({ label: s.name, value: s.count })), { fmt: (n) => n, cls: 'clay' })}</div></div>
    <div class="grid3" style="margin-top:1rem"><div class="card"><h3>Mejores clientas</h3>${r.top_clients.length ? r.top_clients.map((c) => `<div class="between" style="padding:.4rem 0;border-bottom:1px solid var(--line)"><a href="#clientas.${c.id}">${esc(c.name)}</a><b class="mono">${eur0(c.spent)}</b></div>`).join('') : '<p class="muted small">Sin datos todavía.</p>'}</div>
      <div class="card"><h3>De dónde vienen</h3>${hbars(r.by_source.map((s) => ({ label: s.source, value: s.count })), { fmt: (n) => n, cls: 'clay' })}</div>
      <div class="card"><h3>Estado de las citas</h3>${hbars(Object.entries(r.status).map(([k, v]) => ({ label: STATUS_L[k] || k, value: v, cls: ['cancelled', 'no_show'].includes(k) ? 'bad' : k === 'done' ? 'good' : '' })), { fmt: (n) => n })}</div></div>`;
  $('#rg', el).onchange = (e) => { range = Number(e.target.value); render(el, ctx); };
  $('#e1', el).onclick = guard(() => download('/api/admin/export/bookings', 'citas.csv'));
  $('#e2', el).onclick = guard(() => download('/api/admin/export/clients', 'clientas.csv'));
}
