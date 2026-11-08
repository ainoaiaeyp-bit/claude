CREATE POLICY "Members can update adjustments"
ON public.balance_adjustments
FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Members can delete adjustments"
ON public.balance_adjustments
FOR DELETE
USING (is_group_member(group_id));
