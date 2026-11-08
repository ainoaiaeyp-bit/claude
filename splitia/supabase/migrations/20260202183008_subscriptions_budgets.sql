CREATE TYPE billing_cycle AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');

CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  next_billing_date DATE NOT NULL,
  category expense_category NOT NULL DEFAULT 'otros',
  custom_category_id UUID REFERENCES public.custom_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.category_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  category expense_category NOT NULL DEFAULT 'otros',
  custom_category_id UUID REFERENCES public.custom_categories(id) ON DELETE CASCADE,
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, category, custom_category_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group subscriptions"
  ON public.subscriptions FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Members can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Creator can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete subscriptions"
  ON public.subscriptions FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Members can view group budgets"
  ON public.category_budgets FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Members can create budgets"
  ON public.category_budgets FOR INSERT
  WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update budgets"
  ON public.category_budgets FOR UPDATE
  USING (is_group_member(group_id));

CREATE POLICY "Members can delete budgets"
  ON public.category_budgets FOR DELETE
  USING (is_group_member(group_id));

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_category_budgets_updated_at
  BEFORE UPDATE ON public.category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.category_budgets;
