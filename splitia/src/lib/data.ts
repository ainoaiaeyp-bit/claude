import { supabase } from './supabase';
import type { Adjustment, Expense, Group, Member, Split } from './types';
import { computeBalances } from './balances';

export interface CustomCategory { id: string; group_id: string; name: string; color: string }

export interface GroupBundle {
  group: Group;
  members: Member[];
  expenses: Expense[];
  splits: Split[];
  adjustments: Adjustment[];
  customCategories: CustomCategory[];
  balances: Record<string, number>;
}

export interface Snapshot {
  groups: GroupBundle[];
  profiles: Record<string, string>;
  avatars: Record<string, string | null>;
}

/** Trae todas las filas de una tabla sorteando el límite de 1000 de PostgREST. */
async function fetchAll<T>(table: string, select = '*', order?: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999);
    if (order) q = q.order(order, { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function loadSnapshot(): Promise<Snapshot> {
  const [groups, members, expenses, splits, adjustments, cats] = await Promise.all([
    fetchAll<Group>('groups'),
    fetchAll<{ group_id: string; user_id: string; profiles: { display_name: string; avatar_url: string | null } | null }>(
      'group_members',
      'group_id, user_id, profiles(display_name, avatar_url)',
    ),
    fetchAll<Expense>('expenses', '*', 'created_at'),
    fetchAll<Split>('expense_splits'),
    fetchAll<Adjustment>('balance_adjustments', '*', 'created_at'),
    fetchAll<CustomCategory>('custom_categories'),
  ]);

  const profiles: Record<string, string> = {};
  const avatars: Record<string, string | null> = {};
  members.forEach((m) => {
    profiles[m.user_id] = m.profiles?.display_name || 'Usuario';
    avatars[m.user_id] = m.profiles?.avatar_url ?? null;
  });

  const bundles = groups.map<GroupBundle>((group) => {
    const ms: Member[] = members
      .filter((m) => m.group_id === group.id)
      .map((m) => ({ user_id: m.user_id, display_name: m.profiles?.display_name || 'Usuario', avatar_url: m.profiles?.avatar_url ?? null }));
    const ex = expenses
      .filter((e) => e.group_id === group.id)
      .map((e) => ({ ...e, amount: Number(e.amount) }))
      .sort(
        (a, b) =>
          (b.expense_date ?? b.created_at).localeCompare(a.expense_date ?? a.created_at) ||
          b.created_at.localeCompare(a.created_at),
      );
    const ids = new Set(ex.map((e) => e.id));
    const sp = splits.filter((s) => ids.has(s.expense_id));
    const adj = adjustments.filter((a) => a.group_id === group.id);
    return {
      group,
      members: ms,
      expenses: ex,
      splits: sp,
      adjustments: adj,
      customCategories: cats.filter((c) => c.group_id === group.id),
      balances: computeBalances(
        ms.map((m) => m.user_id),
        ex,
        sp,
        adj,
      ),
    };
  });
  return { groups: bundles, profiles, avatars };
}
