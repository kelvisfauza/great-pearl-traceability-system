/** Normalize a supplier name for loose comparison. */
export function normalizeSupplierName(name: string): string {
  return String(name || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Orders whose supplier name matches or is related to the typed name
 * (same name, one contains the other, or they share a word of 3+ letters).
 */
export function findSimilarSamplingOrders<T extends { supplier_name?: string | null }>(name: string, orders: T[]): T[] {
  const typed = normalizeSupplierName(name);
  if (typed.length < 2) return [];
  const typedWords = typed.split(" ").filter((w) => w.length >= 3);
  return orders.filter((o) => {
    const other = normalizeSupplierName(o.supplier_name || "");
    if (!other) return false;
    if (other === typed || other.includes(typed) || typed.includes(other)) return true;
    const words = other.split(" ");
    return typedWords.some((w) => words.includes(w));
  });
}
