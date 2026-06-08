// Daily orchestrator: pushes Daily Coffee Intake, Finance Day Book, and EUDR
// snapshots into the admin's OneDrive (/GAC-System-Reports/*.xlsx) via excel-sync.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function fmt(v: any): any {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

async function callSync(payload: any) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/excel-sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: any[] = [];

  try {
    // 1) Daily Coffee Intake — last 90 days of coffee_records
    const cutoff = new Date(Date.now() - 90 * 86400_000).toISOString();
    const { data: intake } = await supabase
      .from("coffee_records")
      .select("date,batch_number,coffee_type,supplier_name,kilograms,bags,unit_price,total_amount,status")
      .gte("created_at", cutoff)
      .order("date", { ascending: false })
      .limit(5000);

    results.push(
      await callSync({
        workbook: "Daily Coffee Intake",
        sheet: "Intake (90d)",
        headers: ["Date", "Batch", "Coffee Type", "Supplier", "Kilograms", "Bags", "Unit Price", "Total", "Status"],
        rows: (intake || []).map((r: any) => [
          fmt(r.date), fmt(r.batch_number), fmt(r.coffee_type), fmt(r.supplier_name),
          r.kilograms ?? 0, r.bags ?? 0, r.unit_price ?? 0, r.total_amount ?? 0, fmt(r.status),
        ]),
      }),
    );

    // 2) Finance Day Book — last 60 days of ledger_entries
    const fcutoff = new Date(Date.now() - 60 * 86400_000).toISOString();
    const { data: ledger } = await supabase
      .from("ledger_entries")
      .select("created_at,entry_type,amount,source,wallet_owner_id,metadata")
      .gte("created_at", fcutoff)
      .order("created_at", { ascending: false })
      .limit(10000);

    results.push(
      await callSync({
        workbook: "Finance Day Book",
        sheet: "Ledger (60d)",
        headers: ["Timestamp", "Type", "Amount", "Source", "Owner", "Description"],
        rows: (ledger || []).map((r: any) => [
          fmt(r.created_at), fmt(r.entry_type), r.amount ?? 0, fmt(r.source),
          fmt(r.wallet_owner_id), fmt(r.metadata?.description ?? ""),
        ]),
      }),
    );

    // 3a) EUDR Batches
    const { data: batches } = await supabase
      .from("eudr_batches")
      .select("batch_identifier,kilograms,available_kilograms,status,created_at,batch_sequence")
      .order("created_at", { ascending: false })
      .limit(5000);

    results.push(
      await callSync({
        workbook: "EUDR Traceability",
        sheet: "Batches",
        headers: ["Created", "Batch ID", "Sequence", "Kilograms", "Available Kg", "Status"],
        rows: (batches || []).map((r: any) => [
          fmt(r.created_at), fmt(r.batch_identifier), r.batch_sequence ?? 0,
          r.kilograms ?? 0, r.available_kilograms ?? 0, fmt(r.status),
        ]),
      }),
    );

    // 3b) EUDR Sales
    const { data: sales } = await supabase
      .from("eudr_sales")
      .select("sale_date,batch_identifier,coffee_type,kilograms,sold_to,sale_price,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    results.push(
      await callSync({
        workbook: "EUDR Traceability",
        sheet: "Sales",
        headers: ["Sale Date", "Batch", "Coffee Type", "Kilograms", "Buyer", "Sale Price"],
        rows: (sales || []).map((r: any) => [
          fmt(r.sale_date), fmt(r.batch_identifier), fmt(r.coffee_type),
          r.kilograms ?? 0, fmt(r.sold_to), r.sale_price ?? 0,
        ]),
      }),
    );

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("excel-daily-sync error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});