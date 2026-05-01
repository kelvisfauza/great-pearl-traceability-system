
ALTER TABLE public.coffee_records      ADD COLUMN IF NOT EXISTS client_op_id text;
ALTER TABLE public.quality_assessments ADD COLUMN IF NOT EXISTS client_op_id text;
ALTER TABLE public.milling_jobs        ADD COLUMN IF NOT EXISTS client_op_id text;

CREATE UNIQUE INDEX IF NOT EXISTS coffee_records_client_op_id_uniq      ON public.coffee_records      (client_op_id) WHERE client_op_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quality_assessments_client_op_id_uniq ON public.quality_assessments (client_op_id) WHERE client_op_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS milling_jobs_client_op_id_uniq        ON public.milling_jobs        (client_op_id) WHERE client_op_id IS NOT NULL;
