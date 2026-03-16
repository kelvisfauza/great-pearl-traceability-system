-- Create a sequence for safe batch-code generation
CREATE SEQUENCE IF NOT EXISTS public.inventory_batch_code_seq START 1;

SELECT setval(
  'public.inventory_batch_code_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX((regexp_match(batch_code, '^B([0-9]+)'))[1]::integer)
        FROM public.inventory_batches
        WHERE batch_code ~ '^B[0-9]+'
      ),
      0
    ),
    1
  ),
  true
);

-- Helpful index for daily-batch lookup
CREATE INDEX IF NOT EXISTS idx_inventory_batches_type_date
ON public.inventory_batches (lower(coffee_type), batch_date);

-- Helper: get or create the canonical daily batch for a coffee type + date
CREATE OR REPLACE FUNCTION public.get_or_create_inventory_batch_for_day(
  p_coffee_type text,
  p_batch_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
  v_normalized_type text;
  v_prefix text;
  v_batch_code text;
BEGIN
  v_normalized_type := initcap(trim(COALESCE(p_coffee_type, '')));

  IF v_normalized_type = '' THEN
    RAISE EXCEPTION 'coffee_type is required';
  END IF;

  SELECT id
  INTO v_batch_id
  FROM public.inventory_batches
  WHERE lower(coffee_type) = lower(v_normalized_type)
    AND batch_date = p_batch_date
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF v_batch_id IS NOT NULL THEN
    RETURN v_batch_id;
  END IF;

  v_prefix := upper(left(v_normalized_type, 3));
  v_batch_code := 'B' || lpad(nextval('public.inventory_batch_code_seq')::text, 3, '0') || '-' || p_batch_date::text || '-' || v_prefix;

  INSERT INTO public.inventory_batches (
    batch_code,
    coffee_type,
    batch_date,
    total_kilograms,
    remaining_kilograms,
    status
  ) VALUES (
    v_batch_code,
    v_normalized_type,
    p_batch_date,
    0,
    0,
    'active'
  )
  RETURNING id INTO v_batch_id;

  RETURN v_batch_id;
END;
$$;

-- Helper: ensure one coffee record is linked into its daily batch
CREATE OR REPLACE FUNCTION public.ensure_inventory_batch_source_for_record(
  p_coffee_record_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.coffee_records%ROWTYPE;
  v_batch_id uuid;
BEGIN
  SELECT *
  INTO v_record
  FROM public.coffee_records
  WHERE id = p_coffee_record_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'record_not_found');
  END IF;

  IF v_record.status <> 'inventory' OR COALESCE(v_record.kilograms, 0) <= 0 THEN
    RETURN jsonb_build_object('success', true, 'action', 'skipped_not_inventory');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_batch_sources
    WHERE coffee_record_id = v_record.id
  ) THEN
    RETURN jsonb_build_object('success', true, 'action', 'already_linked');
  END IF;

  v_batch_id := public.get_or_create_inventory_batch_for_day(v_record.coffee_type, v_record.date::date);

  INSERT INTO public.inventory_batch_sources (
    batch_id,
    coffee_record_id,
    kilograms,
    supplier_name,
    purchase_date
  ) VALUES (
    v_batch_id,
    v_record.id,
    v_record.kilograms,
    v_record.supplier_name,
    v_record.date::date
  );

  UPDATE public.inventory_batches
  SET total_kilograms = COALESCE(total_kilograms, 0) + COALESCE(v_record.kilograms, 0),
      remaining_kilograms = COALESCE(remaining_kilograms, 0) + COALESCE(v_record.kilograms, 0),
      status = CASE
        WHEN COALESCE(remaining_kilograms, 0) + COALESCE(v_record.kilograms, 0) <= 0 THEN 'sold_out'
        ELSE 'active'
      END,
      updated_at = now()
  WHERE id = v_batch_id;

  RETURN jsonb_build_object('success', true, 'action', 'linked', 'batch_id', v_batch_id);
END;
$$;

-- Helper: keep linked source kg aligned if an inventory record's kg changes later
CREATE OR REPLACE FUNCTION public.update_inventory_batch_source_for_record(
  p_coffee_record_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.coffee_records%ROWTYPE;
  v_source RECORD;
  v_delta numeric;
  v_new_kg numeric;
BEGIN
  SELECT *
  INTO v_record
  FROM public.coffee_records
  WHERE id = p_coffee_record_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'record_not_found');
  END IF;

  SELECT *
  INTO v_source
  FROM public.inventory_batch_sources
  WHERE coffee_record_id = p_coffee_record_id
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN public.ensure_inventory_batch_source_for_record(p_coffee_record_id);
  END IF;

  IF v_record.status <> 'inventory' THEN
    RETURN jsonb_build_object('success', true, 'action', 'skipped_not_inventory');
  END IF;

  v_new_kg := GREATEST(COALESCE(v_record.kilograms, 0), 0);
  v_delta := v_new_kg - COALESCE(v_source.kilograms, 0);

  IF v_delta = 0 THEN
    RETURN jsonb_build_object('success', true, 'action', 'no_change');
  END IF;

  UPDATE public.inventory_batch_sources
  SET kilograms = v_new_kg,
      supplier_name = v_record.supplier_name,
      purchase_date = v_record.date::date
  WHERE id = v_source.id;

  UPDATE public.inventory_batches
  SET total_kilograms = GREATEST(0, COALESCE(total_kilograms, 0) + v_delta),
      remaining_kilograms = GREATEST(0, COALESCE(remaining_kilograms, 0) + v_delta),
      status = CASE
        WHEN GREATEST(0, COALESCE(remaining_kilograms, 0) + v_delta) <= 0 THEN 'sold_out'
        ELSE 'active'
      END,
      updated_at = now()
  WHERE id = v_source.batch_id;

  RETURN jsonb_build_object('success', true, 'action', 'updated', 'delta', v_delta);
END;
$$;

-- Backfill helper for existing unlinked inventory records
CREATE OR REPLACE FUNCTION public.backfill_missing_inventory_batch_sources()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_processed integer := 0;
  v_linked integer := 0;
  v_skipped integer := 0;
BEGIN
  FOR v_record IN
    SELECT cr.id
    FROM public.coffee_records cr
    LEFT JOIN public.inventory_batch_sources ibs
      ON ibs.coffee_record_id = cr.id
    WHERE cr.status = 'inventory'
      AND COALESCE(cr.kilograms, 0) > 0
      AND ibs.coffee_record_id IS NULL
    ORDER BY cr.date ASC, cr.created_at ASC
  LOOP
    v_processed := v_processed + 1;

    IF (public.ensure_inventory_batch_source_for_record(v_record.id) ->> 'action') = 'linked' THEN
      v_linked := v_linked + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed', v_processed,
    'linked', v_linked,
    'skipped', v_skipped
  );
END;
$$;

-- Trigger: auto-sync batches when coffee enters inventory or its kg changes while in inventory
CREATE OR REPLACE FUNCTION public.sync_inventory_batches_from_coffee_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'inventory' AND COALESCE(NEW.kilograms, 0) > 0 THEN
      PERFORM public.ensure_inventory_batch_source_for_record(NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'inventory' AND OLD.status <> 'inventory' AND COALESCE(NEW.kilograms, 0) > 0 THEN
      PERFORM public.ensure_inventory_batch_source_for_record(NEW.id);
      RETURN NEW;
    END IF;

    IF NEW.status = 'inventory'
       AND OLD.status = 'inventory'
       AND COALESCE(NEW.kilograms, 0) <> COALESCE(OLD.kilograms, 0) THEN
      PERFORM public.update_inventory_batch_source_for_record(NEW.id);
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inventory_batches_from_coffee_records ON public.coffee_records;

CREATE TRIGGER trg_sync_inventory_batches_from_coffee_records
AFTER INSERT OR UPDATE ON public.coffee_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_batches_from_coffee_records();