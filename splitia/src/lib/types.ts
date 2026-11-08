export type ExpenseCategory =
  | 'alimentacion' | 'hogar' | 'servicios' | 'transporte' | 'ocio' | 'salud' | 'otros';

export type SplitType = 'payer_full' | 'split_equal' | 'other_full' | 'custom';

export interface Member { user_id: string; display_name: string; avatar_url?: string | null }

export interface Expense {
  id: string;
  group_id: string;
  concept: string;
  observations: string | null;
  category: ExpenseCategory;
  custom_category_id: string | null;
  amount: number;
  paid_by: string;
  split_type: SplitType;
  split_with: string | null;
  expense_date: string | null;
  created_at: string;
  is_refund: boolean;
  refund_of: string | null;
}

export interface Split { expense_id: string; user_id: string; amount: number }

export interface Adjustment {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  reason: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
}

/** Gasto detectado por la IA (foto de ticket o línea de extracto), pendiente de revisión. */
export interface DetectedExpense {
  concept: string;
  amount: number;
  date: string | null;
  category: ExpenseCategory;
  kind: 'expense' | 'income' | 'transfer';
  is_refund: boolean;
  items: { name: string; price: number }[];
  confidence: number;
  /** índice de la imagen de origen */
  source: number;
}
