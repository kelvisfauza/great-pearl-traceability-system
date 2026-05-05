import { supabase } from "@/integrations/supabase/client";
import { GRNDocumentData } from "@/utils/grnPrintTemplate";
import { stripLegacySupplierSuffix } from "@/utils/supplierDisplay";

type SupplierRow = {
  id: string;
  name: string;
  code?: string | null;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  phone?: string | null;
  email?: string | null;
  origin?: string | null;
};

const SUPPLIER_FIELDS =
  "id, name, code, bank_name, account_name, account_number, phone, email, origin";

const supplierCache = new Map<string, SupplierRow | null>();

async function lookupSupplier(
  supplierId: string | undefined | null,
  supplierName: string | undefined | null,
): Promise<SupplierRow | null> {
  const cacheKey = supplierId ? `id:${supplierId}` : `name:${(supplierName || "").toLowerCase()}`;
  if (supplierCache.has(cacheKey)) return supplierCache.get(cacheKey) || null;

  let row: SupplierRow | null = null;

  if (supplierId) {
    const { data } = await supabase
      .from("suppliers")
      .select(SUPPLIER_FIELDS)
      .eq("id", supplierId)
      .maybeSingle();
    if (data) row = data as SupplierRow;
  }

  if (!row && supplierName) {
    const rawName = supplierName.trim();
    const cleaned = stripLegacySupplierSuffix(rawName).trim();

    const codeMatch = rawName.match(/(GPC\s*\d+)/i);
    if (codeMatch) {
      const { data } = await supabase
        .from("suppliers")
        .select(SUPPLIER_FIELDS)
        .ilike("code", codeMatch[1].replace(/\s+/g, " "))
        .maybeSingle();
      if (data) row = data as SupplierRow;
    }

    if (!row) {
      const { data } = await supabase
        .from("suppliers")
        .select(SUPPLIER_FIELDS)
        .ilike("name", cleaned)
        .maybeSingle();
      if (data) row = data as SupplierRow;
    }

    if (!row) {
      const { data } = await supabase
        .from("suppliers")
        .select(SUPPLIER_FIELDS)
        .ilike("name", `%${cleaned}%`)
        .limit(5);
      if (data && data.length) {
        const withBank = data.find((s: any) => s.bank_name || s.account_number);
        row = (withBank || data[0]) as SupplierRow;
      }
    }

    if (!row) {
      const tokens = cleaned
        .split(/\s+/)
        .filter((t) => t.length >= 4)
        .sort((a, b) => b.length - a.length);
      for (const tok of tokens) {
        const { data } = await supabase
          .from("suppliers")
          .select(SUPPLIER_FIELDS)
          .ilike("name", `%${tok}%`)
          .limit(5);
        if (data && data.length) {
          const withBank = data.find((s: any) => s.bank_name || s.account_number);
          row = (withBank || data[0]) as SupplierRow;
          break;
        }
      }
    }
  }

  supplierCache.set(cacheKey, row);
  return row;
}

async function fetchRecoveries(supplierId: string) {
  const [advRes, expRes] = await Promise.all([
    supabase
      .from("supplier_advances")
      .select("description, issued_at, outstanding_ugx")
      .eq("supplier_id", supplierId)
      .eq("is_closed", false)
      .gt("outstanding_ugx", 0),
    (supabase as any)
      .from("supplier_expenses")
      .select("description, expense_date, outstanding_ugx")
      .eq("supplier_id", supplierId)
      .eq("is_closed", false)
      .gt("outstanding_ugx", 0),
  ]);

  const items: Array<{ type: "advance" | "expense"; description: string; date?: string; amount: number }> = [];
  (advRes.data || []).forEach((a: any) =>
    items.push({
      type: "advance",
      description: a.description || "Cash advance",
      date: a.issued_at ? new Date(a.issued_at).toLocaleDateString("en-GB") : undefined,
      amount: Number(a.outstanding_ugx) || 0,
    }),
  );
  (expRes.data || []).forEach((e: any) =>
    items.push({
      type: "expense",
      description: e.description || "Expense paid on behalf",
      date: e.expense_date ? new Date(e.expense_date).toLocaleDateString("en-GB") : undefined,
      amount: Number(e.outstanding_ugx) || 0,
    }),
  );
  return items;
}

export async function enrichGRNWithSupplier(
  grn: GRNDocumentData & { supplierId?: string | null },
): Promise<GRNDocumentData> {
  const supplier = await lookupSupplier(grn.supplierId, grn.supplierName);
  const recoveries = supplier?.id ? await fetchRecoveries(supplier.id) : grn.recoveries || [];

  return {
    ...grn,
    supplierAddress: grn.supplierAddress || supplier?.origin || undefined,
    supplierPhone: grn.supplierPhone || supplier?.phone || undefined,
    supplierEmail: grn.supplierEmail || supplier?.email || undefined,
    supplierCode: grn.supplierCode || supplier?.code || undefined,
    supplierBankName: grn.supplierBankName || supplier?.bank_name || undefined,
    supplierAccountName: grn.supplierAccountName || supplier?.account_name || undefined,
    supplierAccountNumber: grn.supplierAccountNumber || supplier?.account_number || undefined,
    recoveries,
  };
}

export async function enrichGRNListWithSuppliers(
  list: Array<GRNDocumentData & { supplierId?: string | null }>,
): Promise<GRNDocumentData[]> {
  return Promise.all(list.map((g) => enrichGRNWithSupplier(g)));
}