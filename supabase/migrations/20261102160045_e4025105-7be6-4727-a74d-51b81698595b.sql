DO $$
DECLARE
  v_olds uuid[] := ARRAY['59941c2e-9741-4b69-9ee5-1c85121213c2','c4d6ef97-833d-4a72-9a09-b009001859a3']::uuid[];
  v_new uuid := '2c940a3a-2f8f-46e3-adef-b018915bbf0f';
  r record;
BEGIN
  FOR r IN SELECT c.table_name, c.column_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.column_name IN ('supplier_id','confirmed_supplier_id') AND c.table_name<>'suppliers'
  LOOP
    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = ANY($2)', r.table_name, r.column_name, r.column_name) USING v_new, v_olds;
  END LOOP;
  FOR r IN SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    JOIN information_schema.columns s ON s.table_schema=c.table_schema AND s.table_name=c.table_name AND s.column_name='supplier_id'
    WHERE c.table_schema='public' AND c.column_name='supplier_name' AND c.data_type='text'
  LOOP
    EXECUTE format('UPDATE public.%I SET supplier_name = %L WHERE supplier_id = $1 AND supplier_name IS DISTINCT FROM %L', r.table_name, 'Masereka Andrew', 'Masereka Andrew') USING v_new;
  END LOOP;
  DELETE FROM public.suppliers WHERE id = ANY(v_olds);
END $$;