-- Create recurring expenses table
CREATE TABLE public.recurring_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  observations TEXT,
  category expense_category NOT NULL DEFAULT 'otros',
  custom_category_id UUID REFERENCES public.custom_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  paid_by UUID NOT NULL,
  split_type payment_split_type NOT NULL DEFAULT 'split_equal',
  split_with UUID,
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view group recurring expenses"
ON public.recurring_expenses FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can create recurring expenses"
ON public.recurring_expenses FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Creator can update recurring expenses"
ON public.recurring_expenses FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete recurring expenses"
ON public.recurring_expenses FOR DELETE
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_recurring_expenses_updated_at
BEFORE UPDATE ON public.recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
