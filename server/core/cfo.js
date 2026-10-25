/* "CFO externo": rentabilidad por servicio, punto de equilibrio, capacidad y provisión de impuestos. Orientativo y basado en tus datos reales. */
import { addDays, diffDays, dow, nowLocal, quarterOf, sum } from './util.js';
import { getSettings } from './booking.js';
import { catKind, catLabel, expenseLedger, incomeLedger, quarterSummary, vatSplit } from './accounting.js';

const ym = (s) => s.slice(0, 7);
const prevMonths = (today, n) => { const out = []; const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(1); for (let i = 1; i <= n; i++) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() - i); out.push(x.toISOString().slice(0, 7)); } return out; };

export function cfoReport(store, now = new Date()) {
  const st = getSettings(store), today = nowLocal(now).date, year = Number(today.slice(0, 4)), month = ym(today);
  const needs = [];
  const services = store.list('services').filter((s) => s.active);
  const bookings = store.list('bookings');
  const expenses = store.list('expenses');

  // costes fijos mensuales: media de los 3 últimos meses completos + cuota de autónomos + extra
  const months = prevMonths(today, 3);
  const fixedByMonth = months.map((m) => sum(expenses.filter((e) => ym(e.date) === m && catKind(e.category) === 'fijo'), (e) => e.base_cents));
  const withData = fixedByMonth.filter((x) => x > 0);
  let fixedExpenses = withData.length ? Math.round(sum(withData) / withData.length) : sum(expenses.filter((e) => e.recurring), (e) => e.base_cents);
  if (!withData.length && !fixedExpenses) needs.push('Sube tus facturas de alquiler, suministros y suscripciones para calcular tus costes fijos reales.');
  const fixed = fixedExpenses + (st.autonomoFeeMonthlyCents || 0) + (st.fixedExtraMonthlyCents || 0);
  if (!st.autonomoFeeMonthlyCents) needs.push('Indica tu cuota mensual de autónomos en Ajustes (no sale en facturas pero es un coste fijo).');
  const target = st.targetNetMonthlyCents || 0;
  if (!target) needs.push('Define cuánto quieres ganar al mes (objetivo neto) en Ajustes para calcular tu umbral real.');

  // capacidad mensual en horas según el horario
  const weekMin = sum(Object.values(st.hours || {}), (rs) => sum(rs, ([a, b]) => b - a));
  const capacityHours = Math.round((weekMin * 52 / 12 / 60) * 10) / 10;

  // mezcla de ventas de los últimos 90 días
  const recent = bookings.filter((b) => ['done', 'confirmed'].includes(b.status) && diffDays(b.date, today) >= 0 && diffDays(b.date, today) <= 90);
  const mix = {};
  for (const b of recent) mix[b.service_id] = (mix[b.service_id] || 0) + 1;

  const rows = services.filter((s) => s.price_cents > 0).map((s) => {
    const net = vatSplit(s.price_cents, s.vat_rate ?? st.defaultVat, st.pricesIncludeVat).base;
    const variable = s.material_cost_cents || 0;
    const contribution = net - variable;
    return { id: s.id, name: s.name, category: s.category, minutes: s.duration_min, price_cents: s.price_cents, net_price: net, variable_cost: variable,
      contribution, margin_pct: net ? Math.round((contribution / net) * 100) : 0, per_hour: Math.round(contribution * 60 / s.duration_min), sold_90d: mix[s.id] || 0 };
  });
  const noCost = rows.filter((r) => !r.variable_cost && r.category !== 'Cejas' || false);
  if (rows.some((r) => !r.variable_cost)) needs.push('Completa el coste de material de cada servicio (pigmentos, agujas, desechables) para ver el margen real.');

  const totalSold = sum(rows, (r) => r.sold_90d);
  const weights = rows.map((r) => (totalSold ? r.sold_90d / totalSold : 1 / (rows.length || 1)));
  const avgContribution = Math.round(sum(rows.map((r, i) => r.contribution * weights[i])));
  const avgMinutes = Math.round(sum(rows.map((r, i) => r.minutes * weights[i])));
  const avgNet = Math.round(sum(rows.map((r, i) => r.net_price * weights[i])));
  const avgPerHour = avgMinutes ? Math.round(avgContribution * 60 / avgMinutes) : 0;

  const need = fixed + target;
  const beBookings = avgContribution > 0 ? Math.ceil(need / avgContribution) : null;
  const beHours = beBookings ? Math.round((beBookings * avgMinutes / 60) * 10) / 10 : null;
  const beOcc = beHours && capacityHours ? Math.round((beHours / capacityHours) * 100) : null;
  const beFixedOnly = avgContribution > 0 ? Math.ceil(fixed / avgContribution) : null;

  // tarifa mínima por hora para cubrir objetivo con ocupación del 70 %
  const hourlyNeeded = capacityHours ? Math.round(need / (capacityHours * 0.7)) : 0;
  const perService = rows.map((r) => {
    const unitBE = r.contribution > 0 ? Math.ceil(need / r.contribution) : null;
    const minPrice = hourlyNeeded ? Math.round((hourlyNeeded * r.minutes / 60) + r.variable_cost) : 0;
    const minPriceGross = Math.round(minPrice * (1 + (st.pricesIncludeVat ? (services.find((s) => s.id === r.id).vat_rate ?? st.defaultVat) / 100 : 0)));
    // veredicto: contra lo que necesita aportar cada hora de trabajo para llegar a tu objetivo
    const bar = hourlyNeeded || avgPerHour;
    let verdict = 'ok';
    if (r.contribution <= 0) verdict = 'perdida';
    else if (bar && r.per_hour < bar) verdict = 'revisar';
    else if (bar && r.per_hour >= bar * 1.6) verdict = 'estrella';
    return { ...r, break_even_alone: unitBE, min_price_cents: minPriceGross, verdict };
  }).sort((a, b) => b.per_hour - a.per_hour);

  // mes en curso
  const monthInc = incomeLedger(store, month + '-01', today);
  const revenueBase = sum(monthInc, (r) => r.base);
  const dayOfMonth = Number(today.slice(8, 10)), daysInMonth = new Date(Date.UTC(year, Number(today.slice(5, 7)), 0)).getUTCDate();
  const projected = Math.round(revenueBase / dayOfMonth * daysInMonth);
  const monthVar = sum(bookings.filter((b) => b.date.startsWith(month) && b.paid_cents > 0), (b) => (services.find((s) => s.id === b.service_id) || {}).material_cost_cents || 0);
  const monthContribution = revenueBase - monthVar;
  const monthExpenses = sum(expenses.filter((e) => ym(e.date) === month), (e) => e.base_cents);
  const result = monthContribution - fixed;
  const coverage = need ? Math.round((monthContribution / need) * 100) : 0;
  const projectedCoverage = need ? Math.round(((projected - monthVar * (daysInMonth / dayOfMonth)) / need) * 100) : 0;

  // provisión de impuestos del trimestre en curso
  const q = quarterOf(today), qs = quarterSummary(store, year, q, now);
  const reserve = Math.max(0, qs.m303.resultado) + qs.m130.to_pay;

  // gastos
  const trend = [month, ...prevMonths(today, 2)].reverse().map((m) => ({ month: m, total: sum(expenses.filter((e) => ym(e.date) === m), (e) => e.base_cents) }));
  const catTotals = {};
  for (const e of expenses.filter((x) => diffDays(x.date, today) >= 0 && diffDays(x.date, today) <= 90)) catTotals[e.category] = (catTotals[e.category] || 0) + e.base_cents;
  const topCats = Object.entries(catTotals).map(([id, cents]) => ({ id, label: catLabel(id), kind: catKind(id), cents })).sort((a, b) => b.cents - a.cents).slice(0, 5);

  // consejos
  const advice = [];
  if (beBookings != null && target >= 0 && fixed > 0) advice.push({ level: 'info', text: `Para cubrir ${fixed ? 'costes fijos' : ''}${target ? ' y tu objetivo' : ''} necesitas unas ${beBookings} citas al mes (${beHours} h), el ${beOcc ?? '—'} % de tu capacidad.` });
  if (beOcc != null && beOcc > 85) advice.push({ level: 'warn', text: 'Tu umbral supera el 85 % de la capacidad: es difícil de sostener. Sube precios, reduce costes fijos o amplía horario.' });
  for (const p of perService.filter((x) => x.verdict === 'perdida')) advice.push({ level: 'bad', text: `${p.name} no cubre su coste de material. Revisa el precio.` });
  for (const p of perService.filter((x) => x.verdict === 'revisar').slice(0, 3)) advice.push({ level: 'warn', text: `${p.name} aporta ${(p.per_hour / 100).toFixed(0)} € por hora y necesitas ${(hourlyNeeded / 100).toFixed(0)} € por hora para llegar a tu objetivo.${p.min_price_cents > p.price_cents ? ` Con un precio de ${(p.min_price_cents / 100).toFixed(0)} € lo alcanzarías.` : ' Úsalo como complemento de otros servicios más rentables.'}` });
  const star = perService[0];
  if (star && star.verdict === 'estrella') advice.push({ level: 'good', text: `${star.name} es tu servicio más rentable por hora (${(star.per_hour / 100).toFixed(0)} €/h). Ponlo en primer plano.` });
  if (reserve > 0) advice.push({ level: 'info', text: `Aparta ${(reserve / 100).toFixed(0)} € de lo cobrado este trimestre para IVA e IRPF.` });
  const t = trend; if (t[2].total > t[1].total * 1.25 && t[1].total > 0) advice.push({ level: 'warn', text: 'Tus gastos de este mes suben más de un 25 % respecto al anterior.' });
  const toCollect = sum(bookings.filter((b) => b.status === 'done' && (b.paid_cents || 0) < b.price_cents), (b) => b.price_cents - (b.paid_cents || 0));
  if (toCollect > 0) advice.push({ level: 'warn', text: `Tienes ${(toCollect / 100).toFixed(0)} € de citas realizadas pendientes de cobro.` });

  return {
    today, needs, capacity_hours: capacityHours,
    fixed: { expenses: fixedExpenses, autonomo: st.autonomoFeeMonthlyCents || 0, extra: st.fixedExtraMonthlyCents || 0, total: fixed },
    target, need, break_even: { bookings: beBookings, hours: beHours, occupancy_pct: beOcc, fixed_only_bookings: beFixedOnly, hourly_needed: hourlyNeeded, avg_contribution: avgContribution, avg_minutes: avgMinutes, avg_per_hour: avgPerHour, avg_net_price: avgNet },
    month: { revenue_base: revenueBase, projected, contribution: monthContribution, expenses: monthExpenses, result, coverage_pct: coverage, projected_coverage_pct: projectedCoverage, bookings: monthInc.length, day: dayOfMonth, days: daysInMonth },
    tax_reserve: { quarter: q, vat: Math.max(0, qs.m303.resultado), irpf: qs.m130.to_pay, total: reserve },
    services: perService, expenses_trend: trend, top_categories: topCats, advice,
  };
}
