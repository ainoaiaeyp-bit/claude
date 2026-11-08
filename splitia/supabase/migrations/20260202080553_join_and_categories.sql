-- Fix: Create a secure function to join groups by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION public.join_group_by_code(code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_uuid uuid;
BEGIN
  -- Find the group by invite code
  SELECT id INTO group_uuid
  FROM public.groups
  WHERE invite_code = lower(code);
  
  IF group_uuid IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_uuid AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;
  
  -- Add as member
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (group_uuid, auth.uid());
  
  RETURN group_uuid;
END;
$$;

-- Create custom categories table
CREATE TABLE public.custom_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'hsl(200, 70%, 50%)',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, name)
);

-- Enable RLS
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_categories
CREATE POLICY "Members can view group categories"
ON public.custom_categories FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can create categories"
ON public.custom_categories FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update categories"
ON public.custom_categories FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Creator can delete categories"
ON public.custom_categories FOR DELETE
USING (auth.uid() = created_by OR EXISTS (
  SELECT 1 FROM groups WHERE id = group_id AND created_by = auth.uid()
));

-- Add custom_category_id to expenses (optional, if user wants to use custom category)
ALTER TABLE public.expenses 
ADD COLUMN custom_category_id UUID REFERENCES public.custom_categories(id) ON DELETE SET NULL;

-- Update trigger for custom_categories
CREATE TRIGGER update_custom_categories_updated_at
BEFORE UPDATE ON public.custom_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
