-- UPDATE policy for expense-attachments storage bucket
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
CREATE POLICY "Users can update own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'expense-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Realtime channel authorization: only group members can subscribe to channels
-- whose topic ends with their group_id (pattern: "<prefix>-<uuid>")
DROP POLICY IF EXISTS "Group members can read group realtime channels" ON realtime.messages;
CREATE POLICY "Group members can read group realtime channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = auth.uid()
      AND group_id::text = substring(
        realtime.topic()
        FROM '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
  )
);

DROP POLICY IF EXISTS "Group members can broadcast to group realtime channels" ON realtime.messages;
CREATE POLICY "Group members can broadcast to group realtime channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = auth.uid()
      AND group_id::text = substring(
        realtime.topic()
        FROM '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
  )
);
