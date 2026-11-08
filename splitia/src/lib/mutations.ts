import { supabase } from './supabase';
import type { SplitLine } from './splits';
import type { ExpenseCategory } from './types';

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

export interface ExpenseInput {
  group_id: string; concept: string; amount: number; paid_by: string;
  category: ExpenseCategory; custom_category_id?: string | null;
  split_type: 'split_equal' | 'other_full' | 'custom' | 'payer_full'; split_with: string | null;
  expense_date: string; observations: string | null; is_refund: boolean;
}

export async function saveExpense(input: ExpenseInput, splits: SplitLine[], id?: string): Promise<string> {
  let expenseId = id;
  if (id) {
    const { error } = await supabase.from('expenses').update(input as never).eq('id', id);
    fail(error);
    const del = await supabase.from('expense_splits').delete().eq('expense_id', id);
    fail(del.error);
  } else {
    const { data, error } = await supabase.from('expenses').insert({ ...input, refund_of: null } as never).select('id').single();
    fail(error);
    expenseId = (data as { id: string }).id;
  }
  if (splits.length) {
    const { error } = await supabase.from('expense_splits').insert(
      splits.map((s) => ({ expense_id: expenseId, user_id: s.user_id, amount: s.amount, percentage: s.percentage })) as never,
    );
    fail(error);
  }
  return expenseId!;
}

export async function deleteExpense(id: string) {
  fail((await supabase.from('expenses').delete().eq('id', id)).error);
}

export async function addPayment(p: { group_id: string; from_user: string; to_user: string; amount: number; reason?: string; created_by: string }) {
  fail((await supabase.from('balance_adjustments').insert({ ...p, reason: p.reason ?? 'Pago' } as never)).error);
}
export async function deletePayment(id: string) {
  fail((await supabase.from('balance_adjustments').delete().eq('id', id)).error);
}

export async function renameGroup(id: string, name: string) {
  fail((await supabase.from('groups').update({ name }).eq('id', id)).error);
}
export async function leaveGroup(groupId: string, userId: string) {
  fail((await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)).error);
}
export async function deleteGroup(id: string) {
  fail((await supabase.from('groups').delete().eq('id', id)).error);
}

export interface Comment { id: string; expense_id: string; user_id: string; content: string; created_at: string }
export async function loadComments(expenseId: string): Promise<Comment[]> {
  const { data, error } = await supabase.from('expense_comments').select('*').eq('expense_id', expenseId).order('created_at');
  fail(error);
  return (data ?? []) as Comment[];
}
export async function addComment(expenseId: string, userId: string, content: string) {
  fail((await supabase.from('expense_comments').insert({ expense_id: expenseId, user_id: userId, content } as never)).error);
}
export async function deleteComment(id: string) {
  fail((await supabase.from('expense_comments').delete().eq('id', id)).error);
}

export interface Attachment { id: string; file_url: string; file_name: string; file_type: string | null; signed?: string }
export async function loadAttachments(expenseId: string): Promise<Attachment[]> {
  const { data, error } = await supabase.from('expense_attachments').select('*').eq('expense_id', expenseId);
  fail(error);
  const list = (data ?? []) as Attachment[];
  return Promise.all(list.map(async (a) => {
    const path = a.file_url.includes('expense-attachments/') ? a.file_url.split('expense-attachments/')[1] : a.file_url;
    const { data: s } = await supabase.storage.from('expense-attachments').createSignedUrl(path, 3600);
    return { ...a, signed: s?.signedUrl };
  }));
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const up = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
  fail(up.error);
  const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  fail((await supabase.from('profiles').update({ avatar_url: url } as never).eq('user_id', userId)).error);
  return url;
}
