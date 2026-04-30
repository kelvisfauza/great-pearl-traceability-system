
-- Update Sserunkuma Taufiq's instant withdrawal phone from 256754121793 to 256764340901
UPDATE public.ledger_entries
SET metadata = jsonb_set(metadata, '{phone}', '"256764340901"'::jsonb)
WHERE user_id = '5ac019de-199c-4a3f-97de-96de786f55dc'
  AND source_category = 'SELF_DEPOSIT'
  AND metadata->>'phone' = '256754121793';

UPDATE public.mobile_money_transactions
SET phone = '256764340901'
WHERE user_id = '5ac019de-199c-4a3f-97de-96de786f55dc'
  AND phone = '256754121793';
