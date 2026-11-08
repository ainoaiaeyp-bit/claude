import { describe, expect, it } from 'vitest';
import { computeBalances, simplifyDebts, findDuplicate } from './balances';
import type { Expense, Adjustment } from './types';

const base: Expense = {
  id: 'e', group_id: 'g', concept: 'x', observations: null, category: 'otros', custom_category_id: null,
  amount: 100, paid_by: 'a', split_type: 'split_equal', split_with: null, expense_date: '2026-01-10',
  created_at: '2026-01-10T10:00:00Z', is_refund: false, refund_of: null,
};
const ex = (o: Partial<Expense>): Expense => ({ ...base, ...o });

describe('computeBalances', () => {
  it('reparte a partes iguales entre 2', () => {
    const b = computeBalances(['a', 'b'], [ex({})], [], []);
    expect(b).toEqual({ a: 50, b: -50 });
  });
  it('reparte entre 3', () => {
    const b = computeBalances(['a', 'b', 'c'], [ex({ amount: 90 })], [], []);
    expect(b.a).toBeCloseTo(60); expect(b.b).toBeCloseTo(-30); expect(b.c).toBeCloseTo(-30);
  });
  it('payer_full no cambia saldos', () => {
    expect(computeBalances(['a', 'b'], [ex({ split_type: 'payer_full' })], [], [])).toEqual({ a: 0, b: 0 });
  });
  it('other_full: el otro debe todo', () => {
    const b = computeBalances(['a', 'b'], [ex({ split_type: 'other_full', split_with: 'b' })], [], []);
    expect(b).toEqual({ a: 100, b: -100 });
  });
  it('devolución invierte el signo', () => {
    const b = computeBalances(['a', 'b'], [ex({}), ex({ id: 'r', is_refund: true, amount: 40 })], [], []);
    expect(b).toEqual({ a: 30, b: -30 });
  });
  it('división personalizada', () => {
    const b = computeBalances(
      ['a', 'b', 'c'],
      [ex({ split_type: 'custom' })],
      [
        { expense_id: 'e', user_id: 'a', amount: 20 },
        { expense_id: 'e', user_id: 'b', amount: 30 },
        { expense_id: 'e', user_id: 'c', amount: 50 },
      ],
      [],
    );
    expect(b).toEqual({ a: 80, b: -30, c: -50 });
  });
  it('un pago (ajuste) liquida la deuda', () => {
    const adj: Adjustment = { id: '1', group_id: 'g', from_user: 'b', to_user: 'a', amount: 50, reason: null, created_at: '' };
    expect(computeBalances(['a', 'b'], [ex({})], [], [adj])).toEqual({ a: 0, b: 0 });
  });
  it('la suma de saldos es siempre 0', () => {
    const b = computeBalances(['a', 'b', 'c'], [ex({ amount: 33.33 }), ex({ id: '2', paid_by: 'c', amount: 12.5 })], [], []);
    expect(Object.values(b).reduce((s, v) => s + v, 0)).toBeCloseTo(0);
  });
});

describe('simplifyDebts', () => {
  it('minimiza pagos', () => {
    const t = simplifyDebts({ a: 60, b: -30, c: -30 });
    expect(t).toEqual([{ from: 'b', to: 'a', amount: 30 }, { from: 'c', to: 'a', amount: 30 }]);
  });
  it('todo saldado', () => expect(simplifyDebts({ a: 0, b: 0.004 })).toEqual([]));
});

describe('findDuplicate', () => {
  const existing = [{ amount: 12.9, expense_date: '2026-03-02', concept: 'Lidl', is_refund: false }];
  it('detecta mismo importe y día cercano', () => {
    expect(findDuplicate(existing, { amount: 12.9, date: '2026-03-03' })).toBe(true);
  });
  it('no marca otro importe o fecha lejana', () => {
    expect(findDuplicate(existing, { amount: 13, date: '2026-03-02' })).toBe(false);
    expect(findDuplicate(existing, { amount: 12.9, date: '2026-03-10' })).toBe(false);
  });
});

import { expenseShares } from './balances';
describe('expenseShares', () => {
  it('reparte según el tipo', () => {
    expect(expenseShares(ex({}), [], ['a', 'b'])).toEqual({ a: 50, b: 50 });
    expect(expenseShares(ex({ split_type: 'other_full', split_with: 'b' }), [], ['a', 'b'])).toEqual({ b: 100 });
    expect(expenseShares(ex({ split_type: 'payer_full' }), [], ['a', 'b'])).toEqual({ a: 100 });
    expect(expenseShares(ex({ split_type: 'custom' }), [{ expense_id: 'e', user_id: 'b', amount: 70 }, { expense_id: 'e', user_id: 'a', amount: 30 }], ['a', 'b'])).toEqual({ a: 30, b: 70 });
  });
});
