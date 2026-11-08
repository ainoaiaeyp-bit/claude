import type { Expense } from './types';

const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV con separador ; y coma decimal para abrirlo directo en Excel en español. */
export function expensesToCsv(expenses: Expense[], name: (id: string) => string): string {
  const head = ['Fecha', 'Concepto', 'Categoría', 'Importe', 'Pagado por', 'Tipo', 'Devolución', 'Notas'];
  const rows = expenses.map((e) => [
    e.expense_date ?? e.created_at.slice(0, 10), e.concept, e.category,
    (e.is_refund ? -e.amount : e.amount).toFixed(2).replace('.', ','), name(e.paid_by), e.split_type,
    e.is_refund ? 'sí' : 'no', e.observations ?? '',
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
