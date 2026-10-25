import { $, $$, api, esc, eur, eur0, dateShort, monthName, badge, barChart, hbars, empty, openDialog, toast } from './core.js';

const VERDICT = { estrella: ['Muy rentable', 'good'], ok: ['Correcto', 'neutral'], revisar: ['Revisar precio', 'warn'], perdida: ['Pierde dinero', 'bad'] };

export async function render(el, ctx) {
  const c = await api('/api/admin/cfo'), be = c.break_even, m = c.month;
  const pctNeed = c.need ? Math.min(100, m.coverage_pct) : 0;
  el.innerHTML = `
    <div class="top"><div><h2>Rentabilidad</h2><p class="sub">Tu director financiero de bolsillo: cuánto necesitas facturar, qué servicios te dejan más y cuánto apartar para impuestos.</p></div><div class="actions"><a class="btn ghost" href="#ajustes">Fijar objetivos</a><a class="btn ghost" href="#servicios">Costes por servicio</a></div></div>
    ${c.needs.length ? `<div class="card" style="background:var(--info-bg);border-color:#b9cde0;margin-bottom:1rem"><h4 style="color:var(--info)">Para afinar los números</h4><ul class="advice" style="margin-top:.6rem">${c.needs.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}

    <div class="kpis">
      <div class="kpi"><b>${eur0(c.fixed.total)}</b><span>Costes fijos al mes</span><small>Alquiler, suministros, cuota…</small></div>
      <div class="kpi"><b>${be.bookings ?? '—'}</b><span>Citas al mes para cubrirte</span><small>${be.hours ? `${be.hours} h de trabajo` : 'Faltan datos'}</small></div>
      <div class="kpi ${be.occupancy_pct > 85 ? 'bad' : be.occupancy_pct > 65 ? 'warn' : 'good'}"><b>${be.occupancy_pct != null ? be.occupancy_pct + '%' : '—'}</b><span>Ocupación necesaria</span><small>De ${c.capacity_hours} h disponibles al mes</small></div>
      <div class="kpi"><b>${eur0(be.hourly_needed)}</b><span>Tarifa mínima por hora</span><small>Para llegar a tu objetivo con 70 % de ocupación</small></div>
      <div class="kpi ${c.tax_reserve.total ? 'warn' : ''}"><b>${eur0(c.tax_reserve.total)}</b><span>Aparta para impuestos</span><small>IVA ${eur0(c.tax_reserve.vat)} + IRPF ${eur0(c.tax_reserve.irpf)} (T${c.tax_reserve.quarter})</small></div>
    </div>

    <div class="grid2" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start">
      <div class="card"><div class="between"><h3>Este mes</h3><span class="muted small">Día ${m.day} de ${m.days}</span></div>
        <div class="gauge"><div class="between small"><span>Margen aportado: <b>${eur0(m.contribution)}</b></span><span>Necesitas <b>${eur0(c.need)}</b> (costes fijos + tu objetivo)</span></div>
          <div class="progress"><i style="width:${pctNeed}%"></i></div>
          <div class="between small muted"><span>${m.coverage_pct}% cubierto</span><span>Previsión a fin de mes: ${m.projected_coverage_pct}%</span></div></div>
        <dl class="kv" style="margin-top:1rem;grid-template-columns:1fr auto"><dt>Ingresos del mes (sin IVA)</dt><dd class="mono">${eur(m.revenue_base)}</dd><dt>Previsión de ingresos a fin de mes</dt><dd class="mono">${eur(m.projected)}</dd><dt>Gastos del mes</dt><dd class="mono">${eur(m.expenses)}</dd><dt><b>Resultado tras costes fijos</b></dt><dd class="mono" style="color:${m.result < 0 ? 'var(--bad)' : 'var(--ok)'}"><b>${eur(m.result)}</b></dd></dl></div>
      <div class="card"><h3>Qué te recomienda</h3>${c.advice.length ? `<ul class="advice">${c.advice.map((a) => `<li class="${a.level}">${esc(a.text)}</li>`).join('')}</ul>` : '<p class="muted">Sin avisos por ahora.</p>'}</div>
    </div>

    <div class="card" style="margin-top:1rem"><div class="between"><h3>Rentabilidad por servicio</h3><span class="muted small">Margen = precio sin IVA − material</span></div>
      ${c.services.length ? `<div class="table-wrap"><table><thead><tr><th>Servicio</th><th class="r">Precio sin IVA</th><th class="r">Material</th><th class="r">Margen</th><th class="r">Margen %</th><th class="r">€ por hora</th><th class="r">Para cubrirte, solo con este</th><th class="r">Precio mínimo</th><th>Veredicto</th></tr></thead><tbody>${c.services.map((s) => `<tr><td><b>${esc(s.name)}</b><div class="muted small">${s.minutes} min · ${s.sold_90d} vendidas en 90 días</div></td><td class="num">${eur(s.net_price)}</td><td class="num">${eur(s.variable_cost)}</td><td class="num">${eur(s.contribution)}</td><td class="num">${s.margin_pct}%</td><td class="num"><b>${eur0(s.per_hour)}</b></td><td class="num">${s.break_even_alone ? s.break_even_alone + ' al mes' : '—'}</td><td class="num">${s.min_price_cents ? eur0(s.min_price_cents) : '—'}${s.min_price_cents > s.price_cents ? ' <span style="color:var(--bad)">▲</span>' : ''}</td><td>${badge(VERDICT[s.verdict][1], VERDICT[s.verdict][0])}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:.7rem">“Precio mínimo” es el precio con IVA que necesitas para llegar a tu objetivo si trabajas con un 70 % de ocupación. Si sale por encima de tu precio actual, ese servicio te está costando dinero.</p>` : empty('Sin servicios con precio')}</div>

    <div class="grid2" style="margin-top:1rem">
      <div class="card"><h3>Gastos de los últimos meses</h3>${barChart(c.expenses_trend.map((t) => ({ label: monthName(t.month), value: t.total })), { cur: 2 })}</div>
      <div class="card"><h3>Dónde se va el dinero</h3><p class="muted small" style="margin-bottom:.4rem">Últimos 90 días, sin IVA</p>${hbars(c.top_categories.map((k) => ({ label: k.label + (k.kind === 'fijo' ? ' · fijo' : ' · variable'), value: k.cents })), { cls: 'clay' })}</div>
    </div>
    <div class="card" style="margin-top:1rem"><h3>Cómo se calcula</h3><p class="small muted">Costes fijos = media mensual de tus facturas de gastos fijos de los últimos 3 meses + tu cuota de autónomos + otros fijos de Ajustes. Umbral de rentabilidad = (costes fijos + tu objetivo neto) ÷ margen medio por cita, ponderado por lo que realmente vendes. Son estimaciones orientativas, no sustituyen el consejo de tu asesoría.</p></div>`;
}
