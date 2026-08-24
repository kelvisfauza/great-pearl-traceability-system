CREATE OR REPLACE FUNCTION public.guard_loan_appeal_vote_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_loan uuid;
BEGIN
  SELECT status, resulting_loan_id INTO v_status, v_loan
  FROM public.loan_appeals WHERE id = NEW.appeal_id;

  IF v_loan IS NOT NULL THEN
    RAISE EXCEPTION 'Votes cannot be changed: the appeal loan has already been disbursed';
  END IF;

  IF v_status IS DISTINCT FROM 'pending_admin_review' THEN
    RAISE EXCEPTION 'Votes cannot be changed: the appeal is already decided';
  END IF;

  IF OLD.vote_type = 'approve_full' AND NEW.vote_type IS DISTINCT FROM 'approve_full' THEN
    RAISE EXCEPTION 'A full approval vote is final and cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_loan_appeal_vote_update ON public.loan_appeal_votes;
CREATE TRIGGER trg_guard_loan_appeal_vote_update
BEFORE UPDATE ON public.loan_appeal_votes
FOR EACH ROW EXECUTE FUNCTION public.guard_loan_appeal_vote_update();