CREATE OR REPLACE FUNCTION public.guard_message_recipient_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  -- Recipients may only touch delivery/read tracking columns
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.sender_name IS DISTINCT FROM OLD.sender_name
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reply_to_id IS DISTINCT FROM OLD.reply_to_id THEN
    RAISE EXCEPTION 'Only read/delivery status can be updated by recipients';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_message_recipient_update_trg ON public.messages;
CREATE TRIGGER guard_message_recipient_update_trg
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_recipient_update();

DROP POLICY IF EXISTS messages_update_recipient_read ON public.messages;
CREATE POLICY messages_update_recipient_read
ON public.messages
FOR UPDATE
TO authenticated
USING (public.is_conversation_member(conversation_id))
WITH CHECK (public.is_conversation_member(conversation_id));