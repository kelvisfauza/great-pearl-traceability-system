DROP POLICY IF EXISTS "realtime_authenticated_safe_topics" ON realtime.messages;

CREATE POLICY "realtime_authenticated_safe_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND realtime.topic() ~ '^(call:[a-zA-Z0-9_-]+|group-call:[a-zA-Z0-9_-]+|presence-realtime-[a-zA-Z0-9]+)$'
);