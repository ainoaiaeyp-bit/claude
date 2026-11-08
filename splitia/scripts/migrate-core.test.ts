import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { TABLES, chunk, collectUserIds, remapRow, remapAttachmentPath, buildUserTemplate, missingEmails, compareCounts } from './migrate-core.mjs';

describe('migrate-core', () => {
  const map = { old1: 'new1', old2: 'new2' };

  it('remapRow cambia usuarios, conserva id y fechas, anula refund_of', () => {
    const row = { id: 'e1', paid_by: 'old1', split_with: 'old2', refund_of: 'e0', created_at: '2026-01-01T00:00:00Z' };
    expect(remapRow(row, ['paid_by', 'split_with'], map, ['refund_of'])).toEqual({
      id: 'e1', paid_by: 'new1', split_with: 'new2', refund_of: null, created_at: '2026-01-01T00:00:00Z',
    });
  });
  it('remapRow admite columnas nulas y falla con usuarios desconocidos', () => {
    expect(remapRow({ id: 'x', split_with: null, paid_by: 'old1' }, ['paid_by', 'split_with'], map).split_with).toBeNull();
    expect(() => remapRow({ paid_by: 'otro' }, ['paid_by'], map)).toThrow(/sin correspondencia/);
  });
  it('collectUserIds recoge ids de todas las tablas', () => {
    const ids = collectUserIds({ expenses: [{ paid_by: 'a', split_with: 'b' }], tasks: [{ created_by: 'c', assigned_to: null }] });
    expect(ids.sort()).toEqual(['a', 'b', 'c']);
  });
  it('remapAttachmentPath cambia solo el primer segmento', () => {
    expect(remapAttachmentPath('old1/exp/123-ticket.jpg', map)).toBe('new1/exp/123-ticket.jpg');
    expect(remapAttachmentPath('desconocido/x.jpg', map)).toBe('desconocido/x.jpg');
  });
  it('plantilla de usuarios y validación de correos', () => {
    const tpl = buildUserTemplate(['a', 'b'], { a: 'Ainoa', b: 'Marcos' }, { a: 'a@x.com' });
    expect(missingEmails(tpl).map((u: { old_id: string }) => u.old_id)).toEqual(['b']);
  });
  it('chunk y compareCounts', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    const r = compareCounts({ a: 3, b: 2 }, { a: 3, b: 1 });
    expect(r.map((x: { ok: boolean }) => x.ok)).toEqual([true, false]);
  });
  it('el orden de tablas respeta dependencias', () => {
    const idx = (n: string) => TABLES.findIndex((t: { name: string }) => t.name === n);
    expect(idx('groups')).toBeLessThan(idx('expenses'));
    expect(idx('custom_categories')).toBeLessThan(idx('expenses'));
    expect(idx('expenses')).toBeLessThan(idx('expense_splits'));
    expect(idx('chat_messages')).toBeLessThan(idx('chat_reactions'));
  });
});
