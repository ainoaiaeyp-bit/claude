import { supabase } from './supabase';
import type { ExpenseCategory, SplitType } from './types';

export interface NewExpense {
  group_id: string;
  concept: string;
  amount: number;
  paid_by: string;
  split_type: SplitType;
  split_with: string | null;
  category: ExpenseCategory;
  expense_date: string;
  observations?: string | null;
  is_refund?: boolean;
  /** foto original (ticket) para guardar como adjunto */
  attachment?: File;
}

/** Solo INSERTA gastos nuevos (y su adjunto). Nunca modifica ni borra datos existentes. */
export async function createExpenses(rows: NewExpense[], userId: string): Promise<{ saved: number; attachmentErrors: number }> {
  if (!rows.length) return { saved: 0, attachmentErrors: 0 };
  const payload = rows.map(({ attachment: _a, ...r }) => ({
    ...r,
    observations: r.observations ?? null,
    is_refund: r.is_refund ?? false,
    refund_of: null,
  }));
  const { data, error } = await supabase.from('expenses').insert(payload as never).select('id');
  if (error) throw error;

  let attachmentErrors = 0;
  await Promise.all(
    (data ?? []).map(async (row: { id: string }, i: number) => {
      const file = rows[i].attachment;
      if (!file) return;
      const path = `${userId}/${row.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const up = await supabase.storage.from('expense-attachments').upload(path, file);
      if (up.error) return void attachmentErrors++;
      const ins = await supabase.from('expense_attachments').insert({
        expense_id: row.id, file_url: path, file_name: file.name, file_type: file.type,
      });
      if (ins.error) attachmentErrors++;
    }),
  );
  return { saved: data?.length ?? 0, attachmentErrors };
}
