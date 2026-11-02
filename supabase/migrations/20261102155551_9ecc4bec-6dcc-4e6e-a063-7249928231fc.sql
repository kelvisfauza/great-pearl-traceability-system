DO $$
DECLARE
  v_old uuid := '87395bda-35c5-4b55-b98e-f490fe6828e5';
  v_new uuid := 'ee08897f-bbe3-4f2d-8008-77a046f38901';
  r record;
BEGIN
  FOR r IN SELECT c.table_name, c.column_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    WHERE c.table_schema='public' AND c.column_name IN ('supplier_id','confirmed_supplier_id') AND c.table_name<>'suppliers'
  LOOP
    EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2', r.table_name, r.column_name, r.column_name) USING v_new, v_old;
  END LOOP;
  FOR r IN SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema=c.table_schema AND t.table_name=c.table_name AND t.table_type='BASE TABLE'
    JOIN information_schema.columns s ON s.table_schema=c.table_schema AND s.table_name=c.table_name AND s.column_name='supplier_id'
    WHERE c.table_schema='public' AND c.column_name='supplier_name' AND c.data_type='text'
  LOOP
    EXECUTE format('UPDATE public.%I SET supplier_name = %L WHERE supplier_id = $1 AND supplier_name IS DISTINCT FROM %L', r.table_name, 'David Kakusi', 'David Kakusi') USING v_new;
  END LOOP;
  DELETE FROM public.suppliers WHERE id = v_old;
END $$;