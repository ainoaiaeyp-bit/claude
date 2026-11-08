-- Add foreign key from group_members.user_id to profiles.user_id
-- First, we need to make sure there's an index on profiles.user_id for the FK

-- Create a unique constraint on profiles.user_id if it doesn't exist
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add foreign key from group_members.user_id to profiles.user_id
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
