-- ADD PRIORITY TO TASKS
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

ALTER TABLE public.tasks 
ADD COLUMN priority task_priority NOT NULL DEFAULT 'medium';

-- ADD RECURRENCE TO CALENDAR EVENTS
CREATE TYPE public.event_recurrence AS ENUM ('none', 'daily', 'weekly', 'monthly');

ALTER TABLE public.calendar_events 
ADD COLUMN recurrence event_recurrence NOT NULL DEFAULT 'none';

ALTER TABLE public.calendar_events 
ADD COLUMN recurrence_end_date DATE;

-- ACTIVITY NOTIFICATIONS TABLE
CREATE TABLE public.activity_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group notifications"
ON public.activity_notifications FOR SELECT
USING (is_group_member(group_id));

CREATE POLICY "Members can create notifications"
ON public.activity_notifications FOR INSERT
WITH CHECK (is_group_member(group_id) AND auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read"
ON public.activity_notifications FOR UPDATE
USING (is_group_member(group_id));

CREATE POLICY "Members can delete notifications"
ON public.activity_notifications FOR DELETE
USING (is_group_member(group_id));

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_notifications;

CREATE INDEX idx_activity_notifications_group_id ON public.activity_notifications(group_id);
CREATE INDEX idx_activity_notifications_created_at ON public.activity_notifications(created_at DESC);
