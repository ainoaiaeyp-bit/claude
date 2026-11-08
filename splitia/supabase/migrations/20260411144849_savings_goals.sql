CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group savings goals" ON public.savings_goals FOR SELECT USING (public.is_group_member(group_id));
CREATE POLICY "Members can create savings goals" ON public.savings_goals FOR INSERT WITH CHECK (public.is_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "Members can update savings goals" ON public.savings_goals FOR UPDATE USING (public.is_group_member(group_id));
CREATE POLICY "Members can delete savings goals" ON public.savings_goals FOR DELETE USING (public.is_group_member(group_id));

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
