import { supabase } from "@/integrations/supabase/client";

export type ExcelRow = (string | number | null)[];

export interface ExcelPushPayload {
  workbook: string;       // e.g. "Sales Report"
  sheet: string;          // e.g. "2026-06-08"
  headers: string[];
  rows: ExcelRow[];
  folder?: string;        // defaults to "GAC-System-Reports"
}

export async function pushToExcel(payload: ExcelPushPayload) {
  const { data, error } = await supabase.functions.invoke("excel-sync", { body: payload });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Excel sync failed");
  return data;
}