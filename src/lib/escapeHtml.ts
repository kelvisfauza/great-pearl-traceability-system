export const escapeHtml = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Copy of an object with every string value HTML-escaped (one level deep). */
export const escapeStrings = <T extends Record<string, any>>(o: T): T => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(o || {})) out[k] = typeof v === "string" ? escapeHtml(v) : v;
  return out as T;
};
