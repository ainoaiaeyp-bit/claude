import type { Adjustment, Expense, Split } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Saldos por miembro. Misma lógica que "Gastos hogar" para que los números
 * coincidan al céntimo: positivo = le deben, negativo = debe.
 */
export function computeBalances(
  memberIds: string[],
  expenses: Expense[],
  splits: Split[],
  adjustments: Adjustment[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  memberIds.forEach((id) => (bal[id] = 0));
  const n = memberIds.length || 1;

  const byExpense = new Map<string, Split[]>();
  splits.forEach((s) => {
    const arr = byExpense.get(s.expense_id) ?? [];
    arr.push(s);
    byExpense.set(s.expense_id, arr);
  });

  for (const e of expenses) {
    applyExpense(bal, e, byExpense.get(e.id) ?? [], n);
  }
  for (const a of adjustments) applyAdjustment(bal, a);
  return bal;
}

export function applyExpense(bal: Record<string, number>, e: Expense, splits: Split[], memberCount: number) {
  const sign = e.is_refund ? -1 : 1;
  const amount = Number(e.amount);
  const payer = e.paid_by;
  const add = (id: string, v: number) => (bal[id] = (bal[id] ?? 0) + v);

  if (e.split_type === 'custom') {
    const own = splits.find((s) => s.user_id === payer)?.amount ?? 0;
    add(payer, sign * (amount - Number(own)));
    splits.forEach((s) => s.user_id !== payer && add(s.user_id, -sign * Number(s.amount)));
  } else if (e.split_type === 'split_equal') {
    const each = amount / memberCount;
    add(payer, sign * (amount - each));
    Object.keys(bal).forEach((id) => id !== payer && add(id, -sign * each));
  } else if (e.split_type === 'other_full' && e.split_with) {
    add(payer, sign * amount);
    add(e.split_with, -sign * amount);
  }
  // payer_full: el pagador asume todo, no cambia ningún saldo.
}

export function applyAdjustment(bal: Record<string, number>, a: Adjustment) {
  bal[a.from_user] = (bal[a.from_user] ?? 0) + Number(a.amount);
  bal[a.to_user] = (bal[a.to_user] ?? 0) - Number(a.amount);
}

export interface Transfer { from: string; to: string; amount: number }

/** Pagos mínimos para dejar todo a cero (algoritmo voraz, como en tu app). */
export function simplifyDebts(balances: Record<string, number>): Transfer[] {
  const debtors: { id: string; amt: number }[] = [];
  const creditors: { id: string; amt: number }[] = [];
  Object.entries(balances).forEach(([id, v]) => {
    const b = r2(v);
    if (b < -0.01) debtors.push({ id, amt: -b });
    else if (b > 0.01) creditors.push({ id, amt: b });
  });
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amt, creditors[j].amt);
    if (amt > 0.01) out.push({ from: debtors[i].id, to: creditors[j].id, amount: r2(amt) });
    debtors[i].amt -= amt;
    creditors[j].amt -= amt;
    if (debtors[i].amt < 0.01) i++;
    if (creditors[j].amt < 0.01) j++;
  }
  return out;
}

/** Posible duplicado: mismo importe y fecha ±1 día que un gasto ya registrado. */
export function findDuplicate(
  existing: Pick<Expense, 'amount' | 'expense_date' | 'concept' | 'is_refund'>[],
  cand: { amount: number; date: string | null },
): boolean {
  if (!cand.date) return false;
  const t = Date.parse(cand.date);
  return existing.some(
    (e) =>
      !e.is_refund &&
      Math.abs(Number(e.amount) - cand.amount) < 0.005 &&
      !!e.expense_date &&
      Math.abs(Date.parse(e.expense_date) - t) <= 86_400_000,
  );
}

/** Lo que le toca pagar a cada persona de un gasto (independiente de quién lo adelantó). */
export function expenseShares(e: Expense, splits: Split[], memberIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  const amount = Number(e.amount);
  if (e.split_type === 'split_equal') memberIds.forEach((id) => (out[id] = amount / (memberIds.length || 1)));
  else if (e.split_type === 'other_full' && e.split_with) out[e.split_with] = amount;
  else if (e.split_type === 'payer_full') out[e.paid_by] = amount;
  else if (e.split_type === 'custom') splits.filter((s) => s.expense_id === e.id).forEach((s) => (out[s.user_id] = Number(s.amount)));
  return out;
}
