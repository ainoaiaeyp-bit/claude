-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_edited BOOLEAN NOT NULL DEFAULT false
);

-- Create reactions table for message reactions
CREATE TABLE public.chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Members can view group messages" ON public.chat_messages
FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "Members can send messages" ON public.chat_messages
FOR INSERT WITH CHECK (is_group_member(group_id) AND auth.uid() = user_id);

CREATE POLICY "Users can edit own messages" ON public.chat_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON public.chat_messages
FOR DELETE USING (auth.uid() = user_id);

-- Chat reactions policies
CREATE POLICY "Members can view reactions" ON public.chat_reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.chat_messages m 
    WHERE m.id = chat_reactions.message_id AND is_group_member(m.group_id)
  )
);

CREATE POLICY "Members can add reactions" ON public.chat_reactions
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_messages m 
    WHERE m.id = chat_reactions.message_id AND is_group_member(m.group_id)
  )
);

CREATE POLICY "Users can remove own reactions" ON public.chat_reactions
FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- Index for faster queries
CREATE INDEX idx_chat_messages_group_id ON public.chat_messages(group_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_reactions_message_id ON public.chat_reactions(message_id);
