CREATE TABLE public.quotation_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  revision_number integer NOT NULL DEFAULT 1,
  previous_amount numeric,
  amount numeric,
  previous_file_path text,
  previous_file_name text,
  file_path text,
  file_name text,
  changes_summary text,
  attached_by text,
  attached_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quotation_revisions TO authenticated;
GRANT ALL ON public.quotation_revisions TO service_role;
ALTER TABLE public.quotation_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view quotation revisions" ON public.quotation_revisions FOR SELECT TO authenticated USING (is_active_staff());
CREATE POLICY "Procurement and admins attach revisions" ON public.quotation_revisions FOR INSERT TO authenticated WITH CHECK (is_procurement_reviewer(auth.uid()) OR is_quotation_approver());