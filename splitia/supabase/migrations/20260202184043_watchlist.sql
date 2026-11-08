CREATE TYPE media_type AS ENUM ('movie', 'series', 'book');

CREATE TABLE public.watchlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  media_type media_type NOT NULL,
  description TEXT,
  link TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group watchlist"
  ON public.watchlist_items FOR SELECT
  USING (is_group_member(group_id));

CREATE POLICY "Members can add to watchlist"
  ON public.watchlist_items FOR INSERT
  WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);

CREATE POLICY "Members can update watchlist items"
  ON public.watchlist_items FOR UPDATE
  USING (is_group_member(group_id));

CREATE POLICY "Creator can delete watchlist items"
  ON public.watchlist_items FOR DELETE
  USING (auth.uid() = created_by);

CREATE TRIGGER update_watchlist_items_updated_at
  BEFORE UPDATE ON public.watchlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.watchlist_items;
