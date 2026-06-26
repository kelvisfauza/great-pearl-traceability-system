REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.provider_submission_requests FROM anon;
GRANT INSERT ON public.provider_submission_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_submission_requests TO authenticated;
GRANT ALL ON public.provider_submission_requests TO service_role;