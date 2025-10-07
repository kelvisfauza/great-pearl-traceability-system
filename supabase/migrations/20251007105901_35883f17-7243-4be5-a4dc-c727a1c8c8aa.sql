-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can update messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can update participation" ON conversation_participants;

-- Create proper private messaging policies

-- Messages: Users can only see messages from conversations they're part of
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Messages: Users can send messages to conversations they're part of
CREATE POLICY "Users can send messages to their conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Messages: Users can update only their own messages
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (sender_id = auth.uid());

-- Conversation participants: Users can view participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
ON conversation_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Conversation participants: Users can add themselves to conversations
CREATE POLICY "Users can join conversations"
ON conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Conversation participants: Users can update their own participation
CREATE POLICY "Users can update their own participation"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());