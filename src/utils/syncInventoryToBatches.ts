import { supabase } from "@/integrations/supabase/client";

type CoffeeRecordForBatch = {
  id: string;
  coffee_type: string;
  kilograms: number;
  supplier_name: string;
  date: string;
  created_at?: string;
};

const BATCH_CAPACITY_KG = 5000;

const getBatchPrefix = (coffeeType: string) => {
  const t = (coffeeType || "").trim();
  if (!t) return "BAT";
  return t.substring(0, 3).toUpperCase();
};

const getNextBatchNumber = async (prefix: string): Promise<number> => {
  const { data, error } = await supabase
    .from("inventory_batches")
    .select("batch_code")
    .like("batch_code", `${prefix}-B%`);

  if (error) throw error;

  let max = 0;
  for (const row of data || []) {
    const code = String((row as any).batch_code || "");
    const match = code.match(/-B(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return max + 1;
};

const getOrCreateOpenBatch = async (coffeeType: string, batchDate: string) => {
  // Normalize coffee type to title case for consistent matching
  const normalizedType = coffeeType.charAt(0).toUpperCase() + coffeeType.slice(1).toLowerCase();
  
  const { data: existing, error: existingError } = await supabase
    .from("inventory_batches")
    .select("*")
    .ilike("coffee_type", normalizedType)
    .in("status", ["filling", "active"])
    .lt("total_kilograms", BATCH_CAPACITY_KG)
    .order("batch_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const prefix = getBatchPrefix(normalizedType);
  const nextNumber = await getNextBatchNumber(prefix);
  const batchCode = `${prefix}-B${String(nextNumber).padStart(3, "0")}`;

  const { data: created, error: createError } = await supabase
    .from("inventory_batches")
    .insert({
      batch_code: batchCode,
      coffee_type: normalizedType,
      batch_date: batchDate,
      status: "filling",
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created;
};

export const addCoffeeRecordToBatches = async (record: CoffeeRecordForBatch) => {
  // Avoid duplicates
  const { data: existing, error: existingError } = await supabase
    .from("inventory_batch_sources")
    .select("id")
    .eq("coffee_record_id", record.id)
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    return { added: false, kilograms: 0 };
  }

  const batchDate = (record.date || new Date().toISOString().split("T")[0]).slice(0, 10);
  const batch = await getOrCreateOpenBatch(record.coffee_type, batchDate);

  const kg = Number(record.kilograms || 0);
  if (kg <= 0) return { added: false, kilograms: 0 };

  const { error: sourceError } = await supabase.from("inventory_batch_sources").insert({
    batch_id: (batch as any).id,
    coffee_record_id: record.id,
    kilograms: kg,
    supplier_name: record.supplier_name,
    purchase_date: batchDate,
  });

  if (sourceError) throw sourceError;

  const currentTotal = Number((batch as any).total_kilograms || 0);
  const currentRemaining = Number((batch as any).remaining_kilograms || 0);
  const newTotal = currentTotal + kg;
  const newRemaining = currentRemaining + kg;

  const { error: updateError } = await supabase
    .from("inventory_batches")
    .update({
      total_kilograms: newTotal,
      remaining_kilograms: newRemaining,
      status: newTotal >= BATCH_CAPACITY_KG ? "active" : "filling",
    })
    .eq("id", (batch as any).id);

  if (updateError) throw updateError;

  return { added: true, kilograms: kg };
};

export const syncInventoryToBatchesSince = async (sinceIso: string) => {
  const { data: records, error } = await supabase
    .from("coffee_records")
    .select("id, coffee_type, kilograms, supplier_name, date, created_at")
    .eq("status", "inventory")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!records || records.length === 0) {
    return { processed: 0, added: 0, totalKg: 0 };
  }

  // Find which ones are already linked
  const ids = records.map((r: any) => r.id);
  const { data: linked, error: linkedError } = await supabase
    .from("inventory_batch_sources")
    .select("coffee_record_id")
    .in("coffee_record_id", ids);

  if (linkedError) throw linkedError;

  const linkedSet = new Set((linked || []).map((x: any) => x.coffee_record_id));
  const missing = (records as any[]).filter((r) => !linkedSet.has(r.id));

  let added = 0;
  let totalKg = 0;

  for (const r of missing) {
    const res = await addCoffeeRecordToBatches({
      id: r.id,
      coffee_type: r.coffee_type,
      kilograms: Number(r.kilograms || 0),
      supplier_name: r.supplier_name,
      date: r.date,
      created_at: r.created_at,
    });

    if (res.added) {
      added += 1;
      totalKg += res.kilograms;
    }
  }

  return { processed: records.length, added, totalKg };
};
