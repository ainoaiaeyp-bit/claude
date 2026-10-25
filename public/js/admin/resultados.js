/* Resultados: lo ganado en el periodo que elijas, del mes actual a todo el historial. */
import { $, $$, api, qs, esc, eur, eur0, hbars, isoLocal, today, monthName, empty } from './core.js';

const now = new Date(), Y = now.getFullYear();
let sel = { p: 'year', y: Y, from: '', to: '' };

const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(y, m, 0).getDate();
function range() {
  const m = now.getMonth() + 1, q = Math.floor((m - 1) / 3);
  switch (sel.p) {
    case 'month': return { from: `${Y}-${pad(m)}-01`, to: `${Y}-${pad(m)}-${lastDay(Y, m)}`, label: now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) };
    case 'quarter': return { from: `${Y}-${pad(q * 3 + 1)}-01`, to: `${Y}-${pad(q * 3 + 3)}-${lastDay(Y, q * 3 + 3)}`, label: `${q + 1}.º trimestre de ${Y}` };
    case '12m': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); d.setDate(d.getDate() + 1); return { from: isoLocal(d), to: today(), label: 'Últimos 12 meses' }; }
    case 'year': return { from: `${sel.y}-01-01`, to: `${sel.y}-12-31`, label: `Año ${sel.y}` };
    case 'custom': return { from: sel.from, to: sel.to, label: 'Periodo elegido' };
    default: return { all: 1, label: 'Desde el principio' };
  }
}
const PERIODS = [['month', 'Este mes'], ['quarter', 'Trimestre'], ['year', 'Año'], ['12m', '12 meses'], ['all', 'Todo'], ['custom', 'Personalizado']];
const tone = (v) => (v < 0 ? 'bad' : '');
const dl = (cur, prev) => { if (!prev) return ''; const p = Math.round(((cur - prev) / Math.abs(prev)) * 100); return `<small class="delta ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)} % vs periodo anterior</small>`; };
const lab = (k, unit) => (unit === 'year' ? k : monthName(k));

export async function render(el, ctx) {
  const redraw = () => render(el, ctx);
  const rg = range();
  const ready = sel.p !== 'custom' || (sel.from && sel.to && sel.from <= sel.to);
  const r = ready ? await api(`/api/admin/results?${qs(rg.all ? { all: 1 } : { from: rg.from, to: rg.to })}`) : null;
  const yrs = []; for (let y = Y; y >= Y - 5; y--) yrs.push(y);
  el.innerHTML = `
    <div class="top"><div><h2>Resultados</h2><p class="sub">Lo que has facturado, gastado y ganado. Todos los importes son sin IVA.</p></div></div>
    <div class="chips" id="per" style="margin-bottom:.9rem">${PERIODS.map(([k, l]) => `<button class="chip ${sel.p === k ? 'on' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
    ${sel.p === 'year' ? `<div class="row" style="margin-bottom:1rem"><select id="yr" style="width:120px">${yrs.map((y) => `<option ${y === sel.y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>` : ''}
    ${sel.p === 'custom' ? `<div class="row" style="margin-bottom:1rem"><label>Desde<input type="date" id="f" value="${sel.from}"></label><label>Hasta<input type="date" id="t" value="${sel.to}"></label></div>` : ''}
    <div id="res"></div>`;
  $$('#per [data-p]', el).forEach((b) => (b.onclick = () => { sel.p = b.dataset.p; redraw(); }));
  const yr = $('#yr', el); if (yr) yr.onchange = () => { sel.y = Number(yr.value); redraw(); };
  const f = $('#f', el), t = $('#t', el);
  if (f) { f.onchange = () => { sel.from = f.value; if (sel.from && sel.to) redraw(); }; t.onchange = () => { sel.to = t.value; if (sel.from && sel.to) redraw(); }; }
  const host = $('#res', el);
  if (!r) { host.innerHTML = empty('Elige las dos fechas', 'Indica desde y hasta cuándo quieres ver los resultados.'); return; }
  if (!r.count && !r.expenses) { host.innerHTML = empty('Sin movimientos en este periodo', 'Cuando registres cobros y gastos aparecerán aquí.'); return; }

  const max = Math.max(1, ...r.series.flatMap((s) => [s.income, s.expenses]));
  const many = r.series.length > 14;
  host.innerHTML = `
    <div class="hero-res card"><span class="small muted">${esc(rg.label)}${r.days > 1 ? ` · ${r.from.split('-').reverse().join('/')} a ${r.to.split('-').reverse().join('/')}` : ''}</span>
      <div class="hero-num ${tone(r.profit)}">${eur0(r.profit)}</div><p class="muted">de beneficio${r.income ? ` · ${r.margin} % de margen` : ''}</p>${dl(r.profit, r.prev?.profit)}</div>
    <div class="kpis" style="margin-top:.9rem">
      <div class="kpi"><b>${eur0(r.income)}</b><span>Ingresos</span>${dl(r.income, r.prev?.income)}<small>${r.count} cobros · ticket medio ${eur0(r.ticket)}</small></div>
      <div class="kpi"><b>${eur0(r.expenses)}</b><span>Gastos deducibles</span>${dl(r.expenses, r.prev?.expenses)}</div>
      <div class="kpi ${r.irpf_estimate ? 'warn' : ''}"><b>${eur0(r.irpf_estimate)}</b><span>IRPF estimado (${r.irpf_rate} %)</span><small>Sobre el beneficio</small></div>
      <div class="kpi good"><b>${eur0(r.after_tax)}</b><span>Te queda aprox.</span><small>Tras IRPF, sin contar el IVA</small></div>
      <div class="kpi ${r.vat_net > 0 ? 'warn' : ''}"><b>${eur0(r.vat_net)}</b><span>IVA neto</span><small>${r.vat_net < 0 ? 'A tu favor' : 'Repercutido menos soportado'}</small></div>
      ${r.vouchers_outstanding ? `<div class="kpi"><b>${eur0(r.vouchers_outstanding)}</b><span>Bonos por canjear</span><small>Vendidos, aún no son ingreso</small></div>` : ''}
      ${r.unpaid.count ? `<div class="kpi warn"><b>${eur0(r.unpaid.cents)}</b><span>Sin cobrar</span><small>${r.unpaid.count} citas realizadas</small></div>` : ''}
    </div>
    <div class="card" style="margin-top:.9rem"><div class="between"><h3>${r.unit === 'year' ? 'Por año' : 'Mes a mes'}</h3><div class="legend"><span><i class="lg a"></i>Ingresos</span><span><i class="lg b"></i>Gastos</span></div></div>
      <div class="pairs ${many ? 'dense' : ''}">${r.series.map((s) => `<div class="pair" title="${esc(lab(s.key, r.unit))}: ingresos ${eur(s.income)}, gastos ${eur(s.expenses)}, beneficio ${eur(s.profit)}">
        <div class="cols"><i class="a" style="height:${Math.max(1, (s.income / max) * 100)}%"></i><i class="b" style="height:${Math.max(0, (s.expenses / max) * 100)}%"></i></div>
        <u class="${s.profit < 0 ? 'neg' : ''}">${many ? '' : eur0(s.profit)}</u><em>${esc(lab(s.key, r.unit))}</em></div>`).join('')}</div>
      ${r.best && r.series.length > 2 ? `<p class="muted small" style="margin-top:.8rem">Mejor ${r.unit === 'year' ? 'año' : 'mes'}: <b>${esc(lab(r.best.key, r.unit))}</b> con ${eur0(r.best.profit)} de beneficio.</p>` : ''}</div>
    <div class="grid3" style="margin-top:.9rem">
      <div class="card"><h3>Qué te da más</h3>${hbars(r.by_service.map((s) => ({ label: s.label, value: s.total })))}</div>
      <div class="card"><h3>En qué gastas</h3>${hbars(r.by_category.map((s) => ({ label: s.label, value: s.total })), { cls: 'clay' })}</div>
      <div class="card"><h3>Tus mejores clientas</h3>${hbars(r.by_client.map((s) => ({ label: s.label, value: s.total })), { cls: 'good' })}</div>
    </div>
    <p class="muted small" style="margin-top:1rem">Estimación orientativa: el IRPF real se calcula en tu declaración anual con tramos y deducciones. Para presentar impuestos usa el paquete trimestral de <a href="#contabilidad">Contabilidad</a>.</p>`;
}
