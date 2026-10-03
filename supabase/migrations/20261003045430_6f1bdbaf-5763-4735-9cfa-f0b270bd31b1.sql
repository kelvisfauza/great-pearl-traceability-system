UPDATE public.airtime_batch_items
SET payment_status = 'pending', paid_at = NULL, error_message = NULL, updated_at = now()
WHERE batch_id = '2c3d7dad-e6ac-4caf-b239-18c3816cea2b'
  AND payment_status = 'pending_approval'
  AND included = true;

UPDATE public.airtime_batches
SET status = 'approved', sent_at = NULL,
    notes = 'Reset 2026-10-03: Yo Payments was unfunded, 12 payments never completed. Ready to resend.',
    updated_at = now()
WHERE id = '2c3d7dad-e6ac-4caf-b239-18c3816cea2b';