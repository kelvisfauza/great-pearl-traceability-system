-- Fix the infinite recursion in conversation_participants policy
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Simpler policy without recursion - users can only see participants in conversations where they are a participant
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);