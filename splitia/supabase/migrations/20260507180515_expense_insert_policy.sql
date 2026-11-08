DROP POLICY IF EXISTS "Members can create expenses" ON public.expenses;

CREATE POLICY "Members can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (
  is_group_member(group_id)
  AND EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = expenses.group_id AND gm.user_id = expenses.paid_by
  )
);
