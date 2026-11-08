ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS is_refund boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_of uuid REFERENCES public.expenses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_refund_of ON public.expenses(refund_of);

-- Update balance function to handle refunds (invert signs when is_refund)
CREATE OR REPLACE FUNCTION public.calculate_group_balances(p_group_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, total_paid numeric, total_owed numeric, balance numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Not authorized to view this group';
  END IF;

  RETURN QUERY
  WITH member_expenses AS (
    SELECT 
      e.paid_by AS uid,
      COALESCE(SUM(CASE WHEN e.is_refund THEN -e.amount ELSE e.amount END), 0) AS paid
    FROM expenses e
    WHERE e.group_id = p_group_id
    GROUP BY e.paid_by
  ),
  member_owes AS (
    SELECT 
      gm.user_id AS uid,
      COALESCE(SUM(
        (CASE WHEN e.is_refund THEN -1 ELSE 1 END) *
        CASE 
          WHEN e.split_type = 'payer_full' THEN 0
          WHEN e.split_type = 'other_full' AND e.split_with = gm.user_id THEN e.amount
          WHEN e.split_type = 'split_equal' AND (e.paid_by != gm.user_id) THEN e.amount / 2
          WHEN e.split_type = 'custom' THEN COALESCE((
            SELECT es.amount FROM expense_splits es 
            WHERE es.expense_id = e.id AND es.user_id = gm.user_id
          ), 0)
          ELSE 0
        END
      ), 0) AS owed
    FROM group_members gm
    LEFT JOIN expenses e ON e.group_id = gm.group_id
    WHERE gm.group_id = p_group_id
    GROUP BY gm.user_id
  ),
  adjustments_from AS (
    SELECT from_user AS uid, COALESCE(SUM(amount), 0) AS adj_from
    FROM balance_adjustments WHERE group_id = p_group_id GROUP BY from_user
  ),
  adjustments_to AS (
    SELECT to_user AS uid, COALESCE(SUM(amount), 0) AS adj_to
    FROM balance_adjustments WHERE group_id = p_group_id GROUP BY to_user
  )
  SELECT 
    gm.user_id,
    p.display_name,
    COALESCE(me.paid, 0) AS total_paid,
    COALESCE(mo.owed, 0) AS total_owed,
    (COALESCE(me.paid, 0) - COALESCE(mo.owed, 0) + COALESCE(at.adj_to, 0) - COALESCE(af.adj_from, 0)) AS balance
  FROM group_members gm
  JOIN profiles p ON p.user_id = gm.user_id
  LEFT JOIN member_expenses me ON me.uid = gm.user_id
  LEFT JOIN member_owes mo ON mo.uid = gm.user_id
  LEFT JOIN adjustments_from af ON af.uid = gm.user_id
  LEFT JOIN adjustments_to at ON at.uid = gm.user_id
  WHERE gm.group_id = p_group_id;
END;
$function$;
