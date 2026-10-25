/* Resultados por periodo: lo ganado en un mes, trimestre, año, últimos 12 meses o desde el principio. */
import { addDays, diffDays, isDate, sum } from './util.js';
import { getSettings } from './booking.js';
import { catLabel, expenseLedger, incomeLedger } from './accounting.js';

const ded = (e, v) => Math.round(v * (e.deductible_pct ?? 100) / 100);

/** Primera y última fecha con datos económicos. */
export function dataBounds(store) {
  const ds = [...store.list('bookings').filter((b) => b.paid_cents > 0).map((b) => b.date), ...store.list('expenses').filter((e) => !e.draft).map((e) => e.date)].sort();
  return { first: ds[0] || null, last: ds[ds.length - 1] || null };
}

function totals(store, from, to) {
  const inc = incomeLedger(store, from, to), exp = expenseLedger(store, from, to), st = getSettings(store);
  const income = sum(inc, (r) => r.base), expenses = sum(exp, (e) => ded(e, e.base_cents));
  const profit = income - expenses, irpf = Math.max(0, Math.round(profit * st.irpfFractionRate / 100));
  const vat = sum(inc, (r) => r.vat) - sum(exp, (e) => ded(e, e.vat_cents));
  return { inc, exp, income, expenses, profit, irpf, vat, collected: sum(inc, (r) => r.total) };
}

const keyOf = (d, unit) => (unit === 'year' ? d.slice(0, 4) : d.slice(0, 7));

export function periodReport(store, { from, to }, now = new Date()) {
  const b = dataBounds(store);
  if (!isDate(from) || !isDate(to) || from > to) throw new Error('Periodo no válido.');
  const t = totals(store, from, to), st = getSettings(store);
  const days = diffDays(from, to) + 1;
  const prev = days <= 800 ? totals(store, addDays(from, -days), addDays(from, -1)) : null;
  // serie: por mes (hasta 24 meses) o por año
  const unit = days > 24 * 31 ? 'year' : 'month', series = {};
  const put = (k) => (series[k] ||= { key: k, income: 0, expenses: 0 });
  t.inc.forEach((r) => (put(keyOf(r.date, unit)).income += r.base));
  t.exp.forEach((e) => (put(keyOf(e.date, unit)).expenses += ded(e, e.base_cents)));
  // rellena huecos mensuales para que el gráfico sea continuo
  if (unit === 'month') { let c = from.slice(0, 7); const end = to.slice(0, 7); while (c <= end) { put(c); const [y, m] = c.split('-').map(Number); c = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; } }
  const rows = Object.values(series).sort((a, c) => a.key.localeCompare(c.key)).map((r) => ({ ...r, profit: r.income - r.expenses }));
  const by = (list, key, val) => { const m = {}; for (const x of list) { const k = key(x); (m[k] ||= { label: k, total: 0, count: 0 }); m[k].total += val(x); m[k].count++; } return Object.values(m).sort((a, c) => c.total - a.total); };
  const unpaid = store.list('bookings').filter((x) => x.status === 'done' && x.date >= from && x.date <= to && !(x.paid_cents > 0));
  const best = rows.length ? [...rows].sort((a, c) => c.profit - a.profit)[0] : null;
  return {
    from, to, days, unit, bounds: b,
    income: t.income, expenses: t.expenses, profit: t.profit, margin: t.income ? Math.round((t.profit / t.income) * 100) : 0,
    collected: t.collected, vat_net: t.vat, irpf_estimate: t.irpf, irpf_rate: st.irpfFractionRate, after_tax: t.profit - t.irpf,
    count: t.inc.length, ticket: t.inc.length ? Math.round(t.income / t.inc.length) : 0,
    unpaid: { count: unpaid.length, cents: sum(unpaid, (x) => x.price_cents) },
    prev: prev ? { income: prev.income, expenses: prev.expenses, profit: prev.profit } : null,
    series: rows, best,
    by_service: by(t.inc, (r) => r.concept, (r) => r.base).slice(0, 8),
    by_client: by(t.inc, (r) => r.client, (r) => r.base).slice(0, 5),
    by_category: by(t.exp, (e) => catLabel(e.category), (e) => ded(e, e.base_cents)).slice(0, 8),
  };
}
