export type SupplierRef = {
  id: string;
  name: string;
  code: string;
};

/**
 * Some historical records stored supplier_name like: "John (SUP176...)" or "Mary (GPC 00172)".
 * This removes that legacy suffix for clean display.
 */
export const stripLegacySupplierSuffix = (name: string): string => {
  return (name || '')
    .replace(/\s*\((?:SUP\d+|GPC\s*\d+)\)\s*$/i, '')
    .trim();
};

export const formatSupplierDisplay = (opts: {
  supplier?: SupplierRef | null;
  fallbackName?: string;
  includeCode?: boolean;
}): { displayName: string; code?: string } => {
  const includeCode = opts.includeCode !== false;

  if (opts.supplier) {
    const displayName = includeCode
      ? `${opts.supplier.code} - ${opts.supplier.name}`
      : opts.supplier.name;
    return { displayName, code: opts.supplier.code };
  }

  const fallback = stripLegacySupplierSuffix(opts.fallbackName || '');
  return { displayName: fallback || 'Unknown Supplier' };
};
