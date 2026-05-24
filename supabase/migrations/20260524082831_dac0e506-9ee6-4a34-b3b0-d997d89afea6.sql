
-- Face recognition credentials for biometric face-id auth
CREATE TABLE IF NOT EXISTS public.face_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  descriptor JSONB NOT NULL, -- 128-d float array from face-api.js
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_face_credentials_email ON public.face_credentials(lower(email));
CREATE INDEX IF NOT EXISTS idx_face_credentials_user_id ON public.face_credentials(user_id);

ALTER TABLE public.face_credentials ENABLE ROW LEVEL SECURITY;

-- A user can view/insert/update/delete their own face credential
CREATE POLICY "Users view own face credential"
  ON public.face_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own face credential"
  ON public.face_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own face credential"
  ON public.face_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own face credential"
  ON public.face_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Admins manage all
CREATE POLICY "Admins manage face credentials"
  ON public.face_credentials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Lookup function: anonymous-callable check whether a face is registered for an email
-- (returns boolean only, no descriptor leak)
CREATE OR REPLACE FUNCTION public.has_face_credential(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.face_credentials
    WHERE lower(email) = lower(p_email)
  );
$$;

-- Verification function: caller supplies a descriptor; we compare against stored
-- descriptor server-side using Euclidean distance. Returns user_id if match,
-- else NULL. Threshold 0.5 is standard for face-api.js.
CREATE OR REPLACE FUNCTION public.verify_face_descriptor(
  p_email TEXT,
  p_descriptor JSONB
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored JSONB;
  v_user_id UUID;
  v_sum DOUBLE PRECISION := 0;
  v_diff DOUBLE PRECISION;
  i INT;
  v_dist DOUBLE PRECISION;
BEGIN
  SELECT descriptor, user_id INTO v_stored, v_user_id
  FROM public.face_credentials
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_stored IS NULL THEN
    RETURN NULL;
  END IF;

  IF jsonb_array_length(v_stored) <> jsonb_array_length(p_descriptor) THEN
    RETURN NULL;
  END IF;

  FOR i IN 0..jsonb_array_length(v_stored) - 1 LOOP
    v_diff := (v_stored->>i)::DOUBLE PRECISION - (p_descriptor->>i)::DOUBLE PRECISION;
    v_sum := v_sum + (v_diff * v_diff);
  END LOOP;

  v_dist := sqrt(v_sum);

  IF v_dist <= 0.5 THEN
    UPDATE public.face_credentials
       SET last_used_at = now()
     WHERE user_id = v_user_id;
    RETURN v_user_id;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_face_credential(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_face_descriptor(TEXT, JSONB) TO anon, authenticated;

CREATE TRIGGER update_face_credentials_updated_at
  BEFORE UPDATE ON public.face_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
