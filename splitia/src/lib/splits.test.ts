import { describe, expect, it } from 'vitest';
import { computeSplits, splitError, toStorage } from './splits';

const sum = (l: { amount: number }[]) => Math.round(l.reduce((s, x) => s + x.amount, 0) * 100) / 100;

describe('computeSplits', () => {
  it('reparte igual y cuadra al céntimo', () => {
    const l = computeSplits('equal', 100, ['a', 'b', 'c'], {});
    expect(l.map((x) => x.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(sum(l)).toBe(100);
  });
  it('porcentajes', () => {
    const l = computeSplits('percent', 200, ['a', 'b'], { a: 70, b: 30 });
    expect(l.map((x) => x.amount)).toEqual([140, 60]);
    expect(l[0].percentage).toBe(70);
  });
  it('partes', () => {
    const l = computeSplits('shares', 90, ['a', 'b', 'c'], { a: 2, b: 1, c: 0 });
    expect(l.map((x) => x.amount)).toEqual([60, 30, 0]);
  });
  it('importes exactos', () => {
    expect(computeSplits('exact', 30, ['a', 'b'], { a: 10.5, b: 19.5 }).map((x) => x.amount)).toEqual([10.5, 19.5]);
  });
  it('siempre suma el total aunque haya decimales raros', () => {
    for (const total of [0.01, 0.02, 9.99, 33.33, 1234.57]) {
      expect(sum(computeSplits('equal', total, ['a', 'b', 'c', 'd', 'e', 'f', 'g'], {}))).toBe(total);
    }
  });
});

describe('splitError', () => {
  it('detecta importes que no cuadran', () => {
    expect(splitError('exact', 30, ['a', 'b'], { a: 10, b: 10 })).toMatch(/Faltan 10.00/);
    expect(splitError('exact', 30, ['a', 'b'], { a: 20, b: 15 })).toMatch(/Te pasas 5.00/);
    expect(splitError('exact', 30, ['a', 'b'], { a: 10, b: 20 })).toBeNull();
  });
  it('porcentajes y participantes', () => {
    expect(splitError('percent', 10, ['a', 'b'], { a: 50, b: 40 })).toMatch(/90.0/);
    expect(splitError('equal', 10, [], {})).toMatch(/al menos/);
  });
});

describe('toStorage', () => {
  const all = ['a', 'b'];
  it('todos a partes iguales → split_equal (como tu app)', () => {
    expect(toStorage(computeSplits('equal', 10, all, {}), all, 'a').split_type).toBe('split_equal');
  });
  it('solo la otra persona → other_full', () => {
    const r = toStorage(computeSplits('equal', 10, ['b'], {}), all, 'a');
    expect(r).toMatchObject({ split_type: 'other_full', split_with: 'b' });
  });
  it('reparto desigual → custom con líneas', () => {
    const r = toStorage(computeSplits('percent', 10, all, { a: 60, b: 40 }), all, 'a');
    expect(r.split_type).toBe('custom');
    expect(r.splits).toHaveLength(2);
  });
});
