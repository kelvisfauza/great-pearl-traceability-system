CREATE OR REPLACE FUNCTION public.deduct_from_inventory_batches(
  p_coffee_type text,
  p_quantity_kg numeric,
  p_sale_id uuid DEFAULT NULL::uuid,
  p_customer text DEFAULT NULL::text
)
RETURNS TABLE(batch_id uuid, batch_code text, deducted_kg numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  remaining_to_deduct NUMERIC := p_quantity_kg;
  batch_row RECORD;
  deduct_amount NUMERIC;
BEGIN
  FOR batch_row IN
    SELECT ib.id, ib.batch_code, ib.remaining_kilograms
    FROM public.inventory_batches ib
    WHERE LOWER(ib.coffee_type) = LOWER(p_coffee_type)
      AND ib.remaining_kilograms > 0
      AND ib.status IN ('active', 'filling', 'selling')
    ORDER BY ib.batch_code ASC
  LOOP
    EXIT WHEN remaining_to_deduct <= 0;

    deduct_amount := LEAST(batch_row.remaining_kilograms, remaining_to_deduct);

    UPDATE public.inventory_batches
    SET remaining_kilograms = remaining_kilograms - deduct_amount,
        status = CASE
          WHEN remaining_kilograms - deduct_amount <= 0 THEN 'sold_out'
          WHEN status IN ('active', 'filling') THEN 'selling'
          ELSE status
        END,
        sold_out_at = CASE
          WHEN remaining_kilograms - deduct_amount <= 0 THEN NOW()
          ELSE sold_out_at
        END,
        updated_at = NOW()
    WHERE id = batch_row.id;

    INSERT INTO public.inventory_movements (
      coffee_record_id,
      movement_type,
      quantity_kg,
      reference_type,
      reference_id,
      created_by,
      notes
    )
    VALUES (
      batch_row.id::text,
      'SALE',
      -deduct_amount,
      'sale',
      COALESCE(p_sale_id::text, 'manual'),
      'Sales Department',
      'Sale to ' || COALESCE(p_customer, 'customer') || ' from batch ' || batch_row.batch_code
    );

    IF p_sale_id IS NOT NULL THEN
      INSERT INTO public.inventory_batch_sales (
        batch_id,
        sale_transaction_id,
        kilograms_deducted,
        customer_name,
        sale_date
      )
      SELECT
        batch_row.id,
        p_sale_id,
        deduct_amount,
        p_customer,
        CURRENT_DATE
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.inventory_batch_sales ibs
        WHERE ibs.batch_id = batch_row.id
          AND ibs.sale_transaction_id = p_sale_id
      );
    END IF;

    remaining_to_deduct := remaining_to_deduct - deduct_amount;

    batch_id := batch_row.id;
    batch_code := batch_row.batch_code;
    deducted_kg := deduct_amount;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

DO $$
DECLARE
  v_sale RECORD;
  v_deduction RECORD;
  v_total_deducted numeric;
BEGIN
  FOR v_sale IN
    SELECT st.id, st.customer, st.coffee_type, st.weight
    FROM public.sales_transactions st
    WHERE st.id IN (
      '30a13f57-02b9-4644-84a4-d039a9697a44'::uuid,
      '7a5ad157-14ff-47dc-a370-79410bb3e216'::uuid,
      '27d91091-9b10-448c-8dc2-e622e1e665b3'::uuid,
      '008cdf2f-b155-458c-b856-addd73735a58'::uuid
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.inventory_batch_sales ibs
        WHERE ibs.sale_transaction_id = st.id
      )
    ORDER BY st.created_at ASC
  LOOP
    v_total_deducted := 0;

    FOR v_deduction IN
      SELECT *
      FROM public.deduct_from_inventory_batches(
        v_sale.coffee_type,
        v_sale.weight,
        v_sale.id,
        v_sale.customer
      )
    LOOP
      v_total_deducted := v_total_deducted + COALESCE(v_deduction.deducted_kg, 0);
    END LOOP;

    IF v_total_deducted < v_sale.weight THEN
      RAISE EXCEPTION 'Failed to fully reconcile sale %: deducted % of % kg', v_sale.id, v_total_deducted, v_sale.weight;
    END IF;
  END LOOP;
END $$;