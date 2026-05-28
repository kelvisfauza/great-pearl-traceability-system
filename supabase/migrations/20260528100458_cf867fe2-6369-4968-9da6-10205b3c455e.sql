INSERT INTO public.ledger_entries (user_id, entry_type, amount, source_category, reference, metadata)
VALUES (
  'eba97d3e-f098-467a-ad78-d0b9639d76a8',
  'WITHDRAWAL',
  48059,
  'SYSTEM_AWARD',
  'SAL-REMIT-DEDUCT-2398dfe4-411d-4549-8f1c-49922eca8761',
  jsonb_build_object(
    'description', 'Salary remittance to Benson Parents (50% to mum) - May 2026',
    'remittance_id', 'bc56f1cc-d724-4eb9-81d0-2ea68f57997c',
    'recipient_name', 'Benson Parents',
    'recipient_phone', '256773650011',
    'yo_status', 'pending',
    'original_salary_entry', 'ebd5445f-da9b-41b0-8b20-05f480892ac2',
    'performed_by', 'Manual Correction - Avoid Double Credit'
  )
);