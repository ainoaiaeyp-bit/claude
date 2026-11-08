-- =====================
-- TASKS TABLE
-- =====================
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(user_id),
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group tasks"
ON public.tasks FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update tasks"
ON public.tasks FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Members can delete tasks"
ON public.tasks FOR DELETE
USING (is_group_member(group_id));

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- CALENDAR EVENTS TABLE
-- =====================
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group events"
ON public.calendar_events FOR SELECT
USING (is_group_member(group_id) AND (is_shared = true OR created_by = auth.uid()));

CREATE POLICY "Members can create events"
ON public.calendar_events FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Creator can update events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = created_by);

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SHOPPING CATEGORIES TABLE
-- =====================
CREATE TABLE public.shopping_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🛒',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group shopping categories"
ON public.shopping_categories FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can create shopping categories"
ON public.shopping_categories FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update shopping categories"
ON public.shopping_categories FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Members can delete shopping categories"
ON public.shopping_categories FOR DELETE
USING (is_group_member(group_id));

-- =====================
-- SHOPPING ITEMS TABLE
-- =====================
CREATE TABLE public.shopping_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.shopping_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  purchased_by UUID,
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group shopping items"
ON public.shopping_items FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can create shopping items"
ON public.shopping_items FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update shopping items"
ON public.shopping_items FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Members can delete shopping items"
ON public.shopping_items FOR DELETE
USING (is_group_member(group_id));

CREATE TRIGGER update_shopping_items_updated_at
BEFORE UPDATE ON public.shopping_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;
