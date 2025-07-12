
-- Check if there's a foreign key constraint on conversation_participants.user_id
-- If so, we need to remove it since we're using employee IDs, not auth user IDs

-- Drop the foreign key constraint that's causing the issue
ALTER TABLE conversation_participants 
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

-- Also drop the foreign key constraint on messages.sender_id if it exists
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Update the RLS policies to work with employee IDs instead of auth.uid()
DROP POLICY IF EXISTS "Users can view their own participation records" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;

-- Create new policies that allow authenticated users to manage conversations
CREATE POLICY "Authenticated users can view conversation participants" 
  ON conversation_participants 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can join conversations" 
  ON conversation_participants 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update participation" 
  ON conversation_participants 
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Update message policies as well
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

CREATE POLICY "Authenticated users can view messages" 
  ON messages 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can send messages" 
  ON messages 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages" 
  ON messages 
  FOR UPDATE 
  TO authenticated
  USING (true);
