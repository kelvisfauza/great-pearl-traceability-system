const DESTINATIONS: Record<string, readonly string[]> = {
  "Daily Coffee Intake": ["Intake (90d)"],
  "Finance Day Book": ["Ledger (60d)"],
  "EUDR Traceability": ["Batches", "Sales"],
};

export function excelInput(body: Record<string, unknown>) {
  const { workbook, sheet, headers, rows } = body;
  if (body.folder !== undefined && body.folder !== "GAC-System-Reports") throw new Error("Report folder is fixed");
  if (typeof workbook !== "string" || typeof sheet !== "string" || !DESTINATIONS[workbook]?.includes(sheet)) {
    throw new Error("Unknown report destination");
  }
  if (!Array.isArray(headers) || headers.length < 1 || headers.length > 100 || !headers.every(h => typeof h === "string" && h.length <= 1000)) throw new Error("Invalid report headers");
  if (!Array.isArray(rows) || rows.length > 10000 || !rows.every(r => Array.isArray(r) && r.length === headers.length && r.every(c => c === null || typeof c === "boolean" || (typeof c === "number" && Number.isFinite(c)) || (typeof c === "string" && c.length <= 32767)))) throw new Error("Invalid report rows");
  if (JSON.stringify(body).length > 5_000_000) throw new Error("Report is too large");
  return { workbook, sheet, folder: "GAC-System-Reports", headers: headers as string[], rows: rows as (string | number | boolean | null)[][] };
}