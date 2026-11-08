-- Add custom split type to enum
ALTER TYPE payment_split_type ADD VALUE 'custom';

-- Create expense_splits table for custom splits
CREATE TABLE public.expense_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  percentage NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view expense splits"
ON public.expense_splits FOR SELECT
USING (EXISTS (
  SELECT 1 FROM expenses e 
  WHERE e.id = expense_splits.expense_id 
  AND is_group_member(e.group_id)
));

CREATE POLICY "Members can create expense splits"
ON public.expense_splits FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM expenses e 
  WHERE e.id = expense_splits.expense_id 
  AND is_group_member(e.group_id)
));

CREATE POLICY "Members can delete expense splits"
ON public.expense_splits FOR DELETE
USING (EXISTS (
  SELECT 1 FROM expenses e 
  WHERE e.id = expense_splits.expense_id 
  AND is_group_member(e.group_id)
));
