-- Fix the conversation_participants policy completely
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Much simpler: users can see all participant records for any conversation they're part of
-- We'll use a function to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_conversation_participant(conversation_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_uuid
    AND user_id = auth.uid()
  );
$$;

-- Now create the policy using the function
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants FOR SELECT
USING (
  user_is_conversation_participant(conversation_id)
);