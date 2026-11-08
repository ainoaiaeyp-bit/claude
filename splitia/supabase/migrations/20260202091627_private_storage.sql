-- 1. Make storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'expense-attachments';

-- 2. Drop the insecure "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;

-- 3. Create secure storage policy that checks group membership
CREATE POLICY "Members can view attachments" ON storage.objects 
FOR SELECT USING (
  bucket_id = 'expense-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.expense_attachments ea
    JOIN public.expenses e ON e.id = ea.expense_id
    WHERE storage.objects.name = SPLIT_PART(ea.file_url, 'expense-attachments/', 2)
    AND public.is_group_member(e.group_id)
  )
);

-- 4. Drop the insecure profiles SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 5. Create a function to check if users share a group
CREATE OR REPLACE FUNCTION public.shares_group_with(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
    AND gm2.user_id = _target_user_id
  )
$$;

-- 6. Create secure profiles SELECT policy - users can only see their own profile or profiles of group members
CREATE POLICY "Users can view own or group member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR public.shares_group_with(user_id)
);
