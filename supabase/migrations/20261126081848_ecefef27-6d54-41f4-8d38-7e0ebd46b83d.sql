CREATE TABLE public.payslip_access_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), employee_email text NOT NULL, storage_path text NOT NULL UNIQUE, label text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.payslip_access_records TO authenticated;
GRANT ALL ON public.payslip_access_records TO service_role;
ALTER TABLE public.payslip_access_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY payslip_owner_read ON public.payslip_access_records FOR SELECT TO authenticated USING (lower(employee_email)=lower(public.current_user_email()) OR public.is_current_user_admin());