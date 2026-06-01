-- Merge Eric Mbwetsano (7df0c5f9-45dd-4cca-a16d-931ac1a459f7) into Erickwin Mwesigye (0371830e-9f2b-4d04-a8f2-cccef0e1b4b2)
DO $$
DECLARE
  keep_id uuid := '0371830e-9f2b-4d04-a8f2-cccef0e1b4b2';
  drop_id uuid := '7df0c5f9-45dd-4cca-a16d-931ac1a459f7';
  canonical_name text := 'Erickwin Mwesigye';
BEGIN
  -- Re-point all references
  UPDATE coffee_records SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE coffee_bookings SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_payments SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_payment_allocations SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_advances SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_contracts SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_subcontracts SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_expenses SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_ledger_entries SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE supplier_statement_prints SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE finance_coffee_lots SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE finance_reconciliation_items SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE purchase_orders SET supplier_id = keep_id WHERE supplier_id = drop_id;
  UPDATE quality_recommendations SET supplier_id = keep_id WHERE supplier_id = drop_id;

  -- Normalize supplier_name everywhere the kept supplier appears
  UPDATE coffee_records SET supplier_name = canonical_name WHERE supplier_id = keep_id;
  UPDATE coffee_bookings SET supplier_name = canonical_name WHERE supplier_id = keep_id;
  UPDATE purchase_orders SET supplier_name = canonical_name WHERE supplier_id = keep_id;
  UPDATE supplier_contracts SET supplier_name = canonical_name WHERE supplier_id = keep_id;
  UPDATE quality_recommendations SET supplier_name = canonical_name WHERE supplier_id = keep_id;

  -- Finally drop duplicate supplier
  DELETE FROM suppliers WHERE id = drop_id;
END $$;