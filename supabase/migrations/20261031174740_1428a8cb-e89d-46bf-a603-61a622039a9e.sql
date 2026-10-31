DO $$ BEGIN
 PERFORM 1 FROM public.treasury_accounts WHERE code='cash_at_bank' FOR UPDATE;
 IF NOT EXISTS (SELECT 1 FROM public.treasury_account_entries WHERE account_code='cash_at_bank' AND reference='BANK-DEPOSIT-20261031-1747-85000') THEN
 PERFORM public.treasury_account_post('cash_at_bank','credit',85000,'external','BANK-DEPOSIT-20261031-1747-85000',NULL,NULL,NULL,'Bank deposit recorded for system reconciliation at Fauza Kelvis request','Fauzakusa@greatpearlcoffee.com',jsonb_build_object('manual',true,'bank_movement','deposit','requested_amount',85000));
 END IF;
END $$;