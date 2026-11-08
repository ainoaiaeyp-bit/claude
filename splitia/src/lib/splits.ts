export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares';

export interface SplitLine { user_id: string; amount: number; percentage: number | null }

const cents = (n: number) => Math.round(n * 100);

/** Reparte `total` en céntimos con pesos enteros/decimales; el resto va a quien más "pierde" por redondeo. */
function allocate(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (totalCents * w) / sum);
  const out = raw.map(Math.floor);
  let left = totalCents - out.reduce((s, v) => s + v, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i]++;
  return out;
}

/** Valida la entrada del usuario; devuelve un mensaje o null si es correcta. */
export function splitError(mode: SplitMode, total: number, participants: string[], values: Record<string, number>): string | null {
  if (participants.length === 0) return 'Elige al menos una persona';
  if (mode === 'exact') {
    const diff = cents(total) - participants.reduce((s, id) => s + cents(values[id] ?? 0), 0);
    if (diff !== 0) return diff > 0 ? `Faltan ${(diff / 100).toFixed(2)} €` : `Te pasas ${(-diff / 100).toFixed(2)} €`;
  }
  if (mode === 'percent') {
    const sum = participants.reduce((s, id) => s + (values[id] ?? 0), 0);
    if (Math.abs(sum - 100) > 0.001) return `Los porcentajes suman ${sum.toFixed(1)} % (deben sumar 100 %)`;
  }
  if (mode === 'shares' && participants.every((id) => !(values[id] > 0))) return 'Indica las partes de cada persona';
  return null;
}

export function computeSplits(mode: SplitMode, total: number, participants: string[], values: Record<string, number>): SplitLine[] {
  const t = cents(total);
  let amounts: number[];
  let pct: (number | null)[] = participants.map(() => null);
  if (mode === 'equal') amounts = allocate(t, participants.map(() => 1));
  else if (mode === 'shares') amounts = allocate(t, participants.map((id) => Math.max(0, values[id] ?? 0)));
  else if (mode === 'percent') {
    amounts = allocate(t, participants.map((id) => Math.max(0, values[id] ?? 0)));
    pct = participants.map((id) => values[id] ?? 0);
  } else amounts = participants.map((id) => cents(values[id] ?? 0));
  return participants.map((id, i) => ({ user_id: id, amount: amounts[i] / 100, percentage: pct[i] }));
}

/** Cómo guardar el reparto respetando los tipos heredados de «Gastos hogar». */
export function toStorage(
  lines: SplitLine[], allMembers: string[], payer: string,
): { split_type: 'split_equal' | 'other_full' | 'custom'; split_with: string | null; splits: SplitLine[] } {
  const ids = lines.map((l) => l.user_id);
  const equalAll = allMembers.length > 0 && allMembers.every((m) => ids.includes(m)) && ids.length === allMembers.length &&
    lines.every((l) => Math.abs(l.amount - lines[0].amount) <= 0.011);
  if (equalAll) return { split_type: 'split_equal', split_with: null, splits: [] };
  if (lines.length === 1 && ids[0] !== payer) return { split_type: 'other_full', split_with: ids[0], splits: [] };
  return { split_type: 'custom', split_with: null, splits: lines };
}
