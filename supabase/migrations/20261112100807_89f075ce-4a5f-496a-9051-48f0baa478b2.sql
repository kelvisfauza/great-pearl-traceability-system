CREATE OR REPLACE FUNCTION public.trg_bank_withdrawal_leaves_cash_at_bank() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.account_code = 'user_wallets' AND NEW.direction = 'debit' AND NEW.counter_account = 'external'
     AND NEW.reference LIKE 'BNK-%' AND NEW.reference NOT LIKE '%-FEE'
     AND NOT EXISTS (SELECT 1 FROM public.treasury_account_entries b WHERE b.account_code='cash_at_bank' AND b.reference = NEW.reference) THEN
    PERFORM public.treasury_account_post('cash_at_bank','debit',NEW.amount,'external',NEW.reference,NEW.ledger_entry_id,
      NEW.related_user_email,NEW.related_user_name,'Bank transfer paid out: '||COALESCE(NEW.description,''),'system',
      jsonb_build_object('source','bank_withdrawal','wallet_entry_id',NEW.id));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_bank_withdrawal_leaves_cash_at_bank() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bank_withdrawal_leaves_cash_at_bank ON public.treasury_account_entries;
CREATE TRIGGER bank_withdrawal_leaves_cash_at_bank AFTER INSERT ON public.treasury_account_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_bank_withdrawal_leaves_cash_at_bank();

SELECT public.treasury_account_post('cash_at_bank','debit',450000,'external','BNK-2026-11-12-77225',NULL,
 'musemawyclif@greatpearlcoffee.com','Musema Wyclif','Bank transfer paid out: Stanbic A/C 9030027294226 (correction)','system',
 '{"source":"bank_withdrawal","correction":true}'::jsonb);