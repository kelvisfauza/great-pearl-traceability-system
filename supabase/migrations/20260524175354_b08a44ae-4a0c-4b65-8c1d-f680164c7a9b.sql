DROP POLICY IF EXISTS participants_insert_self ON public.conversation_participants;

CREATE POLICY participants_insert_self
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  )
);