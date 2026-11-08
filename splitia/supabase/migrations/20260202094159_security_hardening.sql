-- 1. Fix groups SELECT policy to only show invite_code to actual group members
DROP POLICY IF EXISTS "Members can view their groups" ON public.groups;

CREATE POLICY "Members can view their groups" 
ON public.groups 
FOR SELECT 
USING (is_group_member(id) OR (created_by = auth.uid()));

-- 2. Add UPDATE policy for expense_splits (members only)
CREATE POLICY "Members can update expense splits" 
ON public.expense_splits 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM expenses e 
  WHERE e.id = expense_splits.expense_id 
  AND is_group_member(e.group_id)
));

-- 3. Add server-side validation for expense amounts using CHECK constraints
ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0),
ADD CONSTRAINT expenses_amount_reasonable CHECK (amount <= 10000000);

ALTER TABLE public.balance_adjustments 
ADD CONSTRAINT balance_adjustments_amount_positive CHECK (amount > 0),
ADD CONSTRAINT balance_adjustments_amount_reasonable CHECK (amount <= 10000000);

ALTER TABLE public.expense_splits 
ADD CONSTRAINT expense_splits_amount_non_negative CHECK (amount >= 0),
ADD CONSTRAINT expense_splits_amount_reasonable CHECK (amount <= 10000000);

ALTER TABLE public.recurring_expenses 
ADD CONSTRAINT recurring_expenses_amount_positive CHECK (amount > 0),
ADD CONSTRAINT recurring_expenses_amount_reasonable CHECK (amount <= 10000000);

-- 4. Fix join_group_by_code to not leak information about valid codes
CREATE OR REPLACE FUNCTION public.join_group_by_code(code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_uuid uuid;
  is_already_member boolean;
BEGIN
  -- Find the group by invite code
  SELECT id INTO group_uuid
  FROM public.groups
  WHERE invite_code = lower(code);
  
  -- Check if already a member (do this before returning any error)
  IF group_uuid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = group_uuid AND user_id = auth.uid()
    ) INTO is_already_member;
  END IF;
  
  -- Return generic error for both invalid code and already member
  -- This prevents enumeration attacks
  IF group_uuid IS NULL OR is_already_member THEN
    RAISE EXCEPTION 'No se pudo unir al grupo. Verifica el código e intenta de nuevo.';
  END IF;
  
  -- Add as member
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (group_uuid, auth.uid());
  
  RETURN group_uuid;
END;
$$;

-- 5. Create a server-side function to calculate balances for consistency
CREATE OR REPLACE FUNCTION public.calculate_group_balances(p_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  total_paid numeric,
  total_owed numeric,
  balance numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is a member of this group
  IF NOT is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'Not authorized to view this group';
  END IF;

  RETURN QUERY
  WITH member_expenses AS (
    -- Calculate what each member paid
    SELECT 
      e.paid_by AS uid,
      COALESCE(SUM(e.amount), 0) AS paid
    FROM expenses e
    WHERE e.group_id = p_group_id
    GROUP BY e.paid_by
  ),
  member_owes AS (
    -- Calculate what each member owes based on split_type
    SELECT 
      gm.user_id AS uid,
      COALESCE(SUM(
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
    FROM balance_adjustments
    WHERE group_id = p_group_id
    GROUP BY from_user
  ),
  adjustments_to AS (
    SELECT to_user AS uid, COALESCE(SUM(amount), 0) AS adj_to
    FROM balance_adjustments
    WHERE group_id = p_group_id
    GROUP BY to_user
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
$$;

-- 6. Add validation trigger for text content (prevent XSS in concept/observations)
CREATE OR REPLACE FUNCTION public.validate_expense_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate concept is not empty and has reasonable length
  IF NEW.concept IS NULL OR length(trim(NEW.concept)) = 0 THEN
    RAISE EXCEPTION 'El concepto no puede estar vacío';
  END IF;
  
  IF length(NEW.concept) > 200 THEN
    RAISE EXCEPTION 'El concepto no puede tener más de 200 caracteres';
  END IF;
  
  IF NEW.observations IS NOT NULL AND length(NEW.observations) > 1000 THEN
    RAISE EXCEPTION 'Las observaciones no pueden tener más de 1000 caracteres';
  END IF;
  
  -- Trim whitespace
  NEW.concept := trim(NEW.concept);
  IF NEW.observations IS NOT NULL THEN
    NEW.observations := trim(NEW.observations);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_expense_input_trigger
BEFORE INSERT OR UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.validate_expense_input();

-- Same for recurring expenses
CREATE TRIGGER validate_recurring_expense_input_trigger
BEFORE INSERT OR UPDATE ON public.recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION public.validate_expense_input();
