-- Fix RLS policies for conversation_participants to allow creating conversations
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Allow users to add themselves and others to conversations they create
CREATE POLICY "Users can add participants to new conversations"
ON conversation_participants FOR INSERT
WITH CHECK (
  -- User can add themselves
  user_id = auth.uid() 
  OR
  -- User can add others if they're creating/part of the conversation
  conversation_id IN (
    SELECT id FROM conversations WHERE created_by = auth.uid()
  )
);

-- Allow users to view participants in conversations they're part of
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants FOR SELECT
USING (
  user_is_conversation_participant(conversation_id)
);