CREATE TABLE public.food_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'unidad',
  category TEXT DEFAULT 'otros',
  expiry_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.food_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group food inventory"
ON public.food_inventory FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can add to food inventory"
ON public.food_inventory FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update food inventory"
ON public.food_inventory FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Members can delete food inventory"
ON public.food_inventory FOR DELETE
USING (is_group_member(group_id));

CREATE TRIGGER update_food_inventory_updated_at
BEFORE UPDATE ON public.food_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.food_inventory;

CREATE TABLE public.weight_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  weight_kg NUMERIC NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  height_cm NUMERIC NULL,
  age INTEGER NULL,
  gender TEXT NULL CHECK (gender IN ('male', 'female')),
  activity_level TEXT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal TEXT NULL CHECK (goal IN ('lose', 'maintain', 'gain')),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group weight entries"
ON public.weight_tracker FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Users can add own weight entries"
ON public.weight_tracker FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries"
ON public.weight_tracker FOR UPDATE
USING (is_group_member(group_id) AND auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
ON public.weight_tracker FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_weight_tracker_updated_at
BEFORE UPDATE ON public.weight_tracker
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.weight_tracker;
