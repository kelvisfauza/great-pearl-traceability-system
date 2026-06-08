// Generic Excel/OneDrive sync via Microsoft Graph (Lovable connector gateway).
// Ensures /GAC-System-Reports/<workbook>.xlsx exists, ensures the named worksheet,
// clears its used range, then writes header + rows.
//
// Body: { workbook: string, sheet: string, headers: string[], rows: (string|number|null)[][], folder?: string }

import { EMPTY_XLSX_B64 } from "./empty_template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_excel";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const EXCEL_KEY = Deno.env.get("MICROSOFT_EXCEL_API_KEY")!;
const DEFAULT_FOLDER = "GAC-System-Reports";

function authHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": EXCEL_KEY,
    ...extra,
  };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function ensureFolder(folder: string): Promise<void> {
  const r = await fetch(`${GATEWAY}/me/drive/root:/${encodeURIComponent(folder)}`, {
    headers: authHeaders(),
  });
  if (r.ok) return;
  if (r.status !== 404) {
    const t = await r.text();
    throw new Error(`ensureFolder probe ${r.status}: ${t}`);
  }
  const c = await fetch(`${GATEWAY}/me/drive/root/children`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name: folder, folder: {}, "@microsoft.graph.conflictBehavior": "replace" }),
  });
  if (!c.ok) throw new Error(`create folder ${c.status}: ${await c.text()}`);
}

async function ensureWorkbook(folder: string, workbook: string): Promise<string> {
  const path = `${folder}/${workbook}.xlsx`;
  const r = await fetch(`${GATEWAY}/me/drive/root:/${encodeURIComponent(path)}`, {
    headers: authHeaders(),
  });
  if (r.ok) {
    const j = await r.json();
    return j.id;
  }
  if (r.status !== 404) throw new Error(`workbook probe ${r.status}: ${await r.text()}`);

  // Create with empty xlsx template.
  const bytes = b64ToBytes(EMPTY_XLSX_B64);
  const up = await fetch(`${GATEWAY}/me/drive/root:/${encodeURIComponent(path)}:/content`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/octet-stream" }),
    body: bytes,
  });
  if (!up.ok) throw new Error(`create workbook ${up.status}: ${await up.text()}`);
  const j = await up.json();
  return j.id;
}

async function ensureWorksheet(itemId: string, sheet: string): Promise<void> {
  const r = await fetch(
    `${GATEWAY}/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}`,
    { headers: authHeaders() },
  );
  if (r.ok) return;
  if (r.status !== 404) throw new Error(`worksheet probe ${r.status}: ${await r.text()}`);
  const a = await fetch(
    `${GATEWAY}/me/drive/items/${itemId}/workbook/worksheets/add`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name: sheet }),
    },
  );
  if (!a.ok) throw new Error(`add worksheet ${a.status}: ${await a.text()}`);
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

async function clearUsedRange(itemId: string, sheet: string): Promise<void> {
  const r = await fetch(
    `${GATEWAY}/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange/clear`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ applyTo: "All" }),
    },
  );
  // ignore if sheet is empty
  if (!r.ok && r.status !== 400) {
    const t = await r.text();
    console.warn(`clear range ${r.status}: ${t}`);
  }
}

async function writeRange(itemId: string, sheet: string, values: any[][]): Promise<void> {
  if (values.length === 0) return;
  const cols = values[0].length;
  const lastCol = colLetter(cols);
  const lastRow = values.length;
  const address = `A1:${lastCol}${lastRow}`;
  const r = await fetch(
    `${GATEWAY}/me/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/range(address='${address}')`,
    {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ values }),
    },
  );
  if (!r.ok) throw new Error(`write range ${r.status}: ${await r.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !EXCEL_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: "Excel connector secrets are missing" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const workbook = String(body.workbook || "").replace(/[\\/:*?"<>|]/g, "_");
    const sheet = String(body.sheet || "Data").slice(0, 31).replace(/[\\/:*?"<>|]/g, "_");
    const folder = String(body.folder || DEFAULT_FOLDER).replace(/[\\/:*?"<>|]/g, "_");
    const headers: string[] = Array.isArray(body.headers) ? body.headers : [];
    const rows: any[][] = Array.isArray(body.rows) ? body.rows : [];

    if (!workbook) {
      return new Response(JSON.stringify({ ok: false, error: "workbook required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ensureFolder(folder);
    const itemId = await ensureWorkbook(folder, workbook);
    await ensureWorksheet(itemId, sheet);
    await clearUsedRange(itemId, sheet);

    const stamp = [[`Last updated: ${new Date().toISOString()}`, "", ""].slice(0, Math.max(3, headers.length))];
    const data: any[][] = [];
    if (headers.length) {
      // pad stamp to header width
      const padded = new Array(headers.length).fill("");
      padded[0] = `Last updated: ${new Date().toISOString()} UTC`;
      data.push(padded);
      data.push(headers);
    }
    for (const r of rows) data.push(r);

    if (data.length === 0) data.push(["(no data)"]);

    // Normalize all rows to same width
    const width = Math.max(...data.map((r) => r.length));
    const normalized = data.map((r) => {
      const out = r.slice();
      while (out.length < width) out.push("");
      return out;
    });

    await writeRange(itemId, sheet, normalized);

    return new Response(
      JSON.stringify({ ok: true, itemId, workbook: `${folder}/${workbook}.xlsx`, sheet, rows: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("excel-sync error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});