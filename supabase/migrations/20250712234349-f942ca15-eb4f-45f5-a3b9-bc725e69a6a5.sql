
-- First, create a security definer function to check if user can access conversations
CREATE OR REPLACE FUNCTION public.user_can_access_conversation(conversation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = $1 
    AND user_id = auth.uid()
  );
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view their own participation records" 
  ON conversation_participants 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can view accessible conversations" 
  ON conversations 
  FOR SELECT 
  USING (created_by = auth.uid() OR public.user_can_access_conversation(id));

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.user_can_access_conversation(uuid) TO authenticated;
