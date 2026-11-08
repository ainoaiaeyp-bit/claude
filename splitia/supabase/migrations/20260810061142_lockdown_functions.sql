-- 1) Restrict group_members INSERT: no self-join with arbitrary group_id
DROP POLICY IF EXISTS "Members can add to groups" ON public.group_members;

CREATE POLICY "Existing members can add members"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (public.is_group_member(group_id));

-- 2) Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.add_creator_as_member() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_expense_input() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.calculate_group_balances(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.join_group_by_code(text) FROM anon;
REVOKE ALL ON FUNCTION public.is_group_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.shares_group_with(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.calculate_group_balances(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_group_with(uuid) TO authenticated;
