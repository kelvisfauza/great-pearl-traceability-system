UPDATE public.user_fraud_locks
SET is_locked = false,
    unlocked_at = now(),
    unlocked_by = 'admin_manual_after_fix'
WHERE user_email = 'tumwinealex@greatpearlcoffee.com'
  AND is_locked = true;