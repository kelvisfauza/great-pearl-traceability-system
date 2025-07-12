
-- Drop the problematic RLS policy that's causing infinite recursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Create a simpler, non-recursive policy for viewing conversation participants
CREATE POLICY "Users can view conversation participants" 
  ON conversation_participants 
  FOR SELECT 
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM conversation_participants cp2 
    WHERE cp2.conversation_id = conversation_participants.conversation_id 
    AND cp2.user_id = auth.uid()
  ));

-- Also fix the conversations policy to avoid potential recursion
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view their conversations" 
  ON conversations 
  FOR SELECT 
  USING (created_by = auth.uid() OR id IN (
    SELECT conversation_id FROM conversation_participants 
    WHERE user_id = auth.uid()
  ));
