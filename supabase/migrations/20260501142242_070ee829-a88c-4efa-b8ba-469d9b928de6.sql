DO $$
DECLARE
  pairs text[][] := ARRAY[
    ARRAY['BATCH1777273234949','20260427007'],
    ARRAY['BATCH1777285179093','20260427008'],
    ARRAY['BATCH1777292430167','20260427009'],
    ARRAY['BATCH1777292527502','20260427010']
  ];
  p text[];
BEGIN
  FOREACH p SLICE 1 IN ARRAY pairs LOOP
    UPDATE coffee_records       SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE quality_assessments  SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE finance_coffee_lots  SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE store_records        SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE eudr_documents       SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE sales_inventory_tracking SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE warehouse_quality_monitoring SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE quality_reevaluations SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE store_damaged_bags    SET batch_number = p[2] WHERE batch_number = p[1];
    UPDATE modification_requests SET batch_number = p[2] WHERE batch_number = p[1];
  END LOOP;
END$$;