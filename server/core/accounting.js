/* Contabilidad del estudio: libro de ingresos, libro de gastos, resúmenes trimestrales (modelos 303, 130 y 115) y paquete para la asesoría. */
import { ApiError, addDays, cents, clean, eur, isDate, quarterOf, sum } from './util.js';
import { getSettings } from './booking.js';
import { EXPENSE_CATEGORIES } from './defaults.js';
import { toCSV } from './crm.js';
import { zip } from './zip.js';

export const catLabel = (id) => (EXPENSE_CATEGORIES.find((c) => c.id === id) || { label: id }).label;
export const catKind = (id) => (EXPENSE_CATEGORIES.find((c) => c.id === id) || { kind: 'fijo' }).kind;

/** Separa un importe en base e IVA. */
export function vatSplit(total, rate, included = true) {
  const r = Number(rate) || 0;
  if (included) { const base = Math.round(total / (1 + r / 100)); return { base, vat: total - base, total }; }
  const vat = Math.round(total * r / 100); return { base: total, vat, total: total + vat };
}

export function quarterRange(year, q) {
  const m0 = (q - 1) * 3;
  const from = `${year}-${String(m0 + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, m0 + 3, 0)).getUTCDate();
  const to = `${year}-${String(m0 + 3).padStart(2, '0')}-${lastDay}`;
  return { from, to };
}

export function deadlines(year, q) {
  const d = { 1: `${year}-04-20`, 2: `${year}-07-20`, 3: `${year}-10-20`, 4: `${year + 1}-01-30` }[q];
  return { date: d, models: ['303', '130', '115'] };
}

/** Normaliza y valida un gasto (factura recibida). */
/** Convierte lo extraído de una factura en un borrador de gasto, sin exigir que esté completo. */
export function draftFromExtraction(x, settings, today) {
  const ok = x && typeof x === 'object';
  const vat_rate = ok && Number.isFinite(Number(x.vat_rate)) ? Number(x.vat_rate) : settings.defaultVat;
  let base = ok ? cents(x.base_cents) : 0, total = ok ? cents(x.total_cents) : 0;
  if (!base && total) base = vatSplit(total, vat_rate, true).base;
  const vat = ok && x.vat_cents != null ? cents(x.vat_cents) : Math.round(base * vat_rate / 100);
  const irpf = ok ? cents(x.irpf_cents) : 0;
  if (!total) total = base + vat - irpf;
  return {
    supplier: ok ? clean(x.supplier, 120) : '', supplier_nif: ok ? clean(x.supplier_nif, 20).toUpperCase() : '', number: ok ? clean(x.number, 60) : '',
    date: ok && isDate(x.date) ? x.date : today, concept: ok ? clean(x.concept, 200) : '',
    category: ok && EXPENSE_CATEGORIES.some((c) => c.id === x.category) ? x.category : 'otros',
    base_cents: base, vat_rate, vat_cents: vat, irpf_cents: irpf, total_cents: total, deductible_pct: 100, paid: true, pay_method: '', recurring: '', notes: '',
    files: [], draft: true, source: ok ? 'ia' : 'subida',
  };
}

export function normalizeExpense(input, settings, prev = {}) {
  const d = { ...prev, ...input };
  if (!isDate(d.date)) throw new ApiError('La fecha de la factura no es válida.');
  const supplier = clean(d.supplier, 120);
  if (!supplier) throw new ApiError('Indica el proveedor.');
  const vat_rate = d.vat_rate === '' || d.vat_rate == null ? settings.defaultVat : Number(d.vat_rate);
  if (!(vat_rate >= 0 && vat_rate <= 30)) throw new ApiError('Tipo de IVA no válido.');
  let base = cents(d.base_cents), total = cents(d.total_cents);
  if (!base && !total) throw new ApiError('Indica el importe (base o total).');
  if (!base) base = vatSplit(total, vat_rate, true).base;
  const vat = d.vat_cents != null && d.vat_cents !== '' ? cents(d.vat_cents) : Math.round(base * vat_rate / 100);
  const irpf = cents(d.irpf_cents);
  if (!total || input.base_cents != null) total = base + vat - irpf;
  const category = EXPENSE_CATEGORIES.some((c) => c.id === d.category) ? d.category : 'otros';
  const ded = d.deductible_pct === '' || d.deductible_pct == null ? 100 : Number(d.deductible_pct);
  return {
    supplier, supplier_nif: clean(d.supplier_nif, 20).toUpperCase(), number: clean(d.number, 60), date: d.date, concept: clean(d.concept, 200), category,
    base_cents: base, vat_rate, vat_cents: vat, irpf_cents: irpf, total_cents: total, deductible_pct: Math.min(100, Math.max(0, ded)),
    paid: !!d.paid, pay_method: clean(d.pay_method, 30), recurring: d.recurring ? 'monthly' : '', notes: clean(d.notes, 400),
    files: Array.isArray(d.files) ? d.files : [], source: d.source || 'manual',
  };
}

const svcVat = (store, settings) => { const m = {}; for (const s of store.list('services')) m[s.id] = s.vat_rate ?? settings.defaultVat; return m; };

export function incomeLedger(store, from, to) {
  const st = getSettings(store), vats = svcVat(store, st);
  const rows = store.list('bookings').filter((b) => b.paid_cents > 0 && b.date >= from && b.date <= to)
    .map((b) => {
      const rate = vats[b.service_id] ?? st.defaultVat, sp = vatSplit(b.paid_cents, rate, st.pricesIncludeVat);
      return { id: b.id, date: b.date, client: b.name, concept: b.service_name, method: b.pay_method || '', vat_rate: rate, base: sp.base, vat: sp.vat, total: sp.total };
    });
  // venta de productos: el precio de tienda ya lleva IVA incluido
  for (const o of store.list('orders').filter((x) => x.paid_cents > 0 && x.status !== 'cancelado' && x.paid_date >= from && x.paid_date <= to)) {
    for (const it of o.items) {
      const sp = vatSplit(it.price_cents * it.qty, it.vat_rate, true);
      rows.push({ id: `p${o.id}-${it.product_id}`, date: o.paid_date, client: o.name, concept: it.name, method: o.pay_method || '', vat_rate: it.vat_rate, base: sp.base, vat: sp.vat, total: sp.total });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
}

export function expenseLedger(store, from, to) {
  return store.list('expenses').filter((e) => !e.draft && e.date >= from && e.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
}

/** Resumen de un trimestre o, con `range`, de cualquier periodo (año, todo el historial, fechas a medida). */
export function quarterSummary(store, year, q, now = new Date(), range = null) {
  const st = getSettings(store), { from, to } = range || quarterRange(year, q);
  const inc = incomeLedger(store, from, to), exp = expenseLedger(store, from, to);
  const byRate = {};
  for (const r of inc) { const x = (byRate[r.vat_rate] ||= { rate: r.vat_rate, base: 0, vat: 0 }); x.base += r.base; x.vat += r.vat; }
  const ded = (e, v) => Math.round(v * (e.deductible_pct ?? 100) / 100);
  const expBase = sum(exp, (e) => ded(e, e.base_cents)), expVat = sum(exp, (e) => ded(e, e.vat_cents));
  const byCat = {};
  for (const e of exp) { const x = (byCat[e.category] ||= { id: e.category, label: catLabel(e.category), base: 0, vat: 0, total: 0, count: 0 }); x.base += e.base_cents; x.vat += e.vat_cents; x.total += e.total_cents; x.count++; }
  const m303 = { repercutido: sum(inc, (r) => r.vat), soportado: expVat };
  m303.resultado = m303.repercutido - m303.soportado;
  // modelo 130: acumulado del año hasta el final del trimestre
  const ytd = [];
  let prevPaid = 0;
  if (range) {
    const ib = sum(inc, (r) => r.base), net = ib - expBase, calc = Math.max(0, Math.round(net * st.irpfFractionRate / 100));
    ytd.push({ q: 0, income_base: ib, expenses: expBase, net, calc, retained: sum(exp, (e) => e.irpf_cents || 0), to_pay: calc });
  } else for (let k = 1; k <= q; k++) {
    const rg = quarterRange(year, k);
    const y0 = `${year}-01-01`;
    const ib = sum(incomeLedger(store, y0, rg.to), (r) => r.base);
    const eb = sum(expenseLedger(store, y0, rg.to), (e) => ded(e, e.base_cents));
    const ret = sum(expenseLedger(store, y0, rg.to), (e) => e.irpf_cents || 0);
    const net = ib - eb, calc = Math.max(0, Math.round(net * st.irpfFractionRate / 100));
    const pagar = Math.max(0, calc - prevPaid);
    ytd.push({ q: k, income_base: ib, expenses: eb, net, calc, retained: ret, to_pay: pagar });
    prevPaid += pagar;
  }
  const cur = ytd[ytd.length - 1];
  const m130 = { rate: st.irpfFractionRate, income_ytd: cur.income_base, expenses_ytd: cur.expenses, net_ytd: cur.net, previous_paid: range ? 0 : prevPaid - cur.to_pay, to_pay: cur.to_pay };
  const m115 = { retenciones: sum(exp.filter((e) => e.category === 'alquiler'), (e) => e.irpf_cents || 0) };
  const warnings = [];
  const noFile = exp.filter((e) => !(e.files || []).length);
  if (noFile.length) warnings.push(`${noFile.length} ${noFile.length === 1 ? 'gasto' : 'gastos'} sin factura adjunta. La asesoría necesita el justificante.`);
  const noNif = exp.filter((e) => !e.supplier_nif);
  if (noNif.length) warnings.push(`${noNif.length} ${noNif.length === 1 ? 'gasto' : 'gastos'} sin NIF del proveedor. Sin NIF el IVA puede no ser deducible.`);
  const unpaid = store.list('bookings').filter((b) => b.status === 'done' && b.date >= from && b.date <= to && !(b.paid_cents > 0));
  if (unpaid.length) warnings.push(`${unpaid.length} ${unpaid.length === 1 ? 'cita realizada' : 'citas realizadas'} sin cobro registrado. No cuentan como ingreso hasta que registres el cobro.`);
  const drafts = store.list('expenses').filter((e) => e.draft).length;
  if (drafts) warnings.push(`${drafts} ${drafts === 1 ? 'factura subida' : 'facturas subidas'} pendiente${drafts === 1 ? '' : 's'} de revisar. No se contabilizan hasta que las confirmes.`);
  if (!st.nif) warnings.push('Falta el NIF del negocio en Ajustes. Aparecerá en el resumen para la asesoría.');
  if (!st.gestoria.email) warnings.push('Falta el email de la asesoría en Ajustes para poder enviarle el paquete.');
  return {
    year: range ? null : year, q: range ? null : q, from, to, range: !!range, label: range ? `del ${from} al ${to}` : `${q}.º trimestre de ${year}`, deadline: range ? null : deadlines(year, q),
    income: { count: inc.length, total: sum(inc, (r) => r.total), base: sum(inc, (r) => r.base), vat: m303.repercutido, by_rate: Object.values(byRate) },
    expenses: { count: exp.length, total: sum(exp, (e) => e.total_cents), base_deductible: expBase, vat_deductible: expVat, irpf_withheld: sum(exp, (e) => e.irpf_cents || 0), by_category: Object.values(byCat).sort((a, b) => b.total - a.total) },
    m303, m130, m115, ytd, warnings,
  };
}

const money = (c) => (c / 100).toFixed(2).replace('.', ',');
const bizName = (st) => st.legalName || st.businessName;

export function summaryHtml(sum, st) {
  const row = (a, b) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`;
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Resumen ${sum.label}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;color:#111}h1{font-size:1.5rem}h2{font-size:1.05rem;margin-top:2rem;border-bottom:1px solid #ccc;padding-bottom:.3rem}table{width:100%;border-collapse:collapse}td{padding:.35rem 0;border-bottom:1px solid #eee}.r{text-align:right;font-variant-numeric:tabular-nums}.n{color:#666;font-size:.85rem}.w{background:#fff6dc;padding:.6rem .8rem;margin:.3rem 0}</style>
<h1>${bizName(st)} · Resumen ${sum.range ? '' : 'del '}${sum.label}</h1>
<p class="n">NIF: ${st.nif || '—'} · Periodo ${sum.from} a ${sum.to} ${sum.deadline ? ' · Plazo de presentación: ' + sum.deadline.date : ''} · Estimación orientativa generada por el panel; la presentación corresponde a la asesoría.</p>
<h2>Ingresos</h2><table>${row('Cobros registrados', sum.income.count)}${row('Base imponible', eur(sum.income.base))}${sum.income.by_rate.map((r) => row(`IVA repercutido al ${r.rate}% (sobre ${eur(r.base)})`, eur(r.vat))).join('')}${row('Total cobrado', eur(sum.income.total))}</table>
<h2>Gastos</h2><table>${row('Facturas recibidas', sum.expenses.count)}${row('Base deducible', eur(sum.expenses.base_deductible))}${row('IVA soportado deducible', eur(sum.expenses.vat_deductible))}${row('Retenciones practicadas (IRPF)', eur(sum.expenses.irpf_withheld))}${row('Total gastos', eur(sum.expenses.total))}</table>
<table style="margin-top:.6rem">${sum.expenses.by_category.map((c) => row(c.label + ` (${c.count})`, eur(c.total))).join('')}</table>
<h2>Modelo 303 · IVA</h2><table>${row('IVA repercutido', eur(sum.m303.repercutido))}${row('IVA soportado deducible', eur(sum.m303.soportado))}${row('<b>Resultado</b>', '<b>' + eur(sum.m303.resultado) + (sum.m303.resultado < 0 ? ' (a compensar o devolver)' : ' (a ingresar)') + '</b>')}</table>
<h2>Modelo 130 · IRPF fraccionado (${sum.m130.rate}%)</h2><table>${row('Ingresos acumulados (base)', eur(sum.m130.income_ytd))}${row('Gastos deducibles acumulados', eur(sum.m130.expenses_ytd))}${row('Rendimiento neto acumulado', eur(sum.m130.net_ytd))}${row('Pagos de trimestres anteriores (estimados)', eur(sum.m130.previous_paid))}${row('<b>Importe estimado a ingresar</b>', '<b>' + eur(sum.m130.to_pay) + '</b>')}</table>
<h2>Modelo 115 · Retenciones de alquiler</h2><table>${row('Retenciones del periodo', eur(sum.m115.retenciones))}</table>
${sum.warnings.length ? '<h2>Avisos</h2>' + sum.warnings.map((w) => `<div class="w">${w}</div>`).join('') : ''}
</html>`;
}

/** Construye los ficheros del paquete trimestral. readFile(id) -> Uint8Array|null */
export async function buildQuarterFiles(store, year, q, readFile, range = null) {
  const st = getSettings(store), s = quarterSummary(store, year, q, new Date(), range), { from, to } = s;
  const tag = range ? `${from}_a_${to}` : `T${q}-${year}`;
  const files = [];
  const fmt = (c) => money(c);
  files.push({ name: `libro-ingresos-${tag}.csv`, data: toCSV(incomeLedger(store, from, to), [
    { label: 'Fecha', key: 'date' }, { label: 'Clienta', key: 'client' }, { label: 'Concepto', key: 'concept' }, { label: 'Método de pago', key: 'method' },
    { label: 'Base imponible', get: (r) => fmt(r.base) }, { label: 'Tipo IVA', get: (r) => r.vat_rate + '%' }, { label: 'Cuota IVA', get: (r) => fmt(r.vat) }, { label: 'Total', get: (r) => fmt(r.total) }]) });
  const exp = expenseLedger(store, from, to);
  files.push({ name: `libro-gastos-${tag}.csv`, data: toCSV(exp, [
    { label: 'Fecha', key: 'date' }, { label: 'Nº factura', key: 'number' }, { label: 'Proveedor', key: 'supplier' }, { label: 'NIF proveedor', key: 'supplier_nif' },
    { label: 'Concepto', key: 'concept' }, { label: 'Categoría', get: (e) => catLabel(e.category) }, { label: 'Base imponible', get: (e) => fmt(e.base_cents) },
    { label: 'Tipo IVA', get: (e) => e.vat_rate + '%' }, { label: 'Cuota IVA', get: (e) => fmt(e.vat_cents) }, { label: 'Retención IRPF', get: (e) => fmt(e.irpf_cents || 0) },
    { label: 'Total', get: (e) => fmt(e.total_cents) }, { label: '% deducible', key: 'deductible_pct' }, { label: 'Pagada', get: (e) => (e.paid ? 'Sí' : 'No') },
    { label: 'Archivo', get: (e) => (e.files || []).map((f) => f.name).join(' | ') }]) });
  files.push({ name: `resumen-${tag}.html`, data: summaryHtml(s, st) });
  let n = 0;
  for (const e of exp) for (const f of e.files || []) {
    const data = await readFile(f.id); if (!data) continue;
    const ext = (f.name.match(/\.[A-Za-z0-9]+$/) || [''])[0];
    const slug = (e.supplier || 'proveedor').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    files.push({ name: `facturas-recibidas/${e.date}_${slug}_${(e.number || String(e.id)).replace(/[^A-Za-z0-9-]/g, '')}${ext}`, data });
    n++;
  }
  files.push({ name: 'LEEME.txt', data: `Paquete ${range ? 'del periodo ' + s.label : 'trimestral T' + q + ' ' + year} · ${bizName(st)}${st.nif ? ' (NIF ' + st.nif + ')' : ''}\r\n\r\nContenido:\r\n- libro-ingresos: cobros del periodo con base, IVA y total.\r\n- libro-gastos: facturas recibidas con proveedor, NIF, IVA y retenciones.\r\n- resumen: estimación de los modelos 303, 130 y 115 del periodo (orientativa).\r\n- facturas-recibidas/: ${n} archivos adjuntos.\r\n\r\n${st.gestoria.note ? 'Nota: ' + st.gestoria.note + '\r\n' : ''}Generado por el panel de gestión el ${new Date().toISOString().slice(0, 10)}.\r\n` });
  return { files, summary: s };
}

export async function buildQuarterZip(store, year, q, readFile, range = null) {
  const { files, summary } = await buildQuarterFiles(store, year, q, readFile, range);
  return { bytes: zip(files), summary, count: files.length };
}
