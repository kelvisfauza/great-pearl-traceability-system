/**
 * Suppliers who have never delivered a single delivery of coffee.
 *
 * A supplier counts as "has delivered" when any coffee record links to them,
 * either by supplier_id (primary) or by normalized name (legacy records carry
 * suffixes such as "(GPC 00373)").
 */

export type NeverDeliveredSupplier = {
  id: string;
  name: string;
  code?: string | null;
  phone?: string | null;
  origin?: string | null;
  date_registered?: string | null;
  daysSinceRegistration: number | null;
};

export type DeliveryRef = {
  supplier_id?: string | null;
  supplier_name?: string | null;
};

/** Strip legacy code suffixes and normalize for comparison. */
export function normalizeSupplierName(name?: string | null): string {
  return String(name || '')
    .replace(/\s*\((?:SUP\d+|GPC\s*\d+)\)\s*$/i, '')
    .trim()
    .toLowerCase();
}

const DAY = 86_400_000;

export function daysSince(date?: string | null): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

export function resolveNeverDeliveredSuppliers<
  T extends {
    id: string;
    name: string;
    code?: string | null;
    phone?: string | null;
    origin?: string | null;
    date_registered?: string | null;
  },
>(suppliers: T[], deliveries: DeliveryRef[]): Array<T & NeverDeliveredSupplier> {
  const deliveredIds = new Set<string>();
  const deliveredNames = new Set<string>();
  for (const d of deliveries) {
    if (d.supplier_id) deliveredIds.add(String(d.supplier_id));
    const n = normalizeSupplierName(d.supplier_name);
    if (n) deliveredNames.add(n);
  }

  return suppliers
    .filter(s => !deliveredIds.has(s.id) && !deliveredNames.has(normalizeSupplierName(s.name)))
    .map(s => ({ ...s, daysSinceRegistration: daysSince(s.date_registered) }))
    .sort((a, b) => {
      const ta = a.date_registered ? new Date(a.date_registered).getTime() : Infinity;
      const tb = b.date_registered ? new Date(b.date_registered).getTime() : Infinity;
      return ta - tb;
    });
}
