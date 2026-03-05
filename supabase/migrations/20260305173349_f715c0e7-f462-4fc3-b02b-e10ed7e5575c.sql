-- Allow transfer reversal notifications in sms queue
ALTER TABLE public.sms_notification_queue
DROP CONSTRAINT IF EXISTS sms_notification_queue_notification_type_check;

ALTER TABLE public.sms_notification_queue
ADD CONSTRAINT sms_notification_queue_notification_type_check
CHECK (
  notification_type = ANY (
    ARRAY[
      'withdrawal_approved'::text,
      'withdrawal_rejected'::text,
      'withdrawal_admin_approved'::text,
      'withdrawal_submitted'::text,
      'salary_update'::text,
      'general'::text,
      'transfer_reversal'::text
    ]
  )
);
