import { supabase } from "@/integrations/supabase/client";

/**
 * Secure GRN pay codes.
 *
 * Batch numbers are sequential (20260522004 vs 20260522005) so a single typo
 * silently lands on a different, valid GRN. Each GRN therefore also carries an
 * immutable random 9-character code with a built-in check character, e.g.
 * GAC-K7Q-M4X-T9. A mistyped code fails the checksum and is rejected instead of
 * resolving to somebody else's payment.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"; // no I, L, O, U, 0, 1

export function normalizePayCode(input: string): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^GAC/, "");
}

function checkChar(body: string): string | null {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const idx = ALPHABET.indexOf(body[i]);
    if (idx < 0) return null;
    sum += idx * (i + 2);
  }
  return ALPHABET[sum % ALPHABET.length];
}

/** Structural check only — does not prove the code exists. */
export function isValidPayCode(input: string): boolean {
  const clean = normalizePayCode(input);
  if (clean.length !== 9) return false;
  return checkChar(clean.slice(0, 8)) === clean[8];
}

/** True when the text looks like a pay code attempt (letters + 9 chars). */
export function looksLikePayCode(input: string): boolean {
  const clean = normalizePayCode(input);
  return clean.length === 9 && /[A-Z]/.test(clean);
}

/** Human friendly grouping: GAC-K7Q-M4X-T9 */
export function formatPayCode(code: string): string {
  const clean = normalizePayCode(code);
  if (clean.length !== 9) return clean;
  return `GAC-${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

/** Gets (or creates on first use) the pay code for a GRN batch number. */
export async function getGrnPayCode(batchNumber: string): Promise<string | null> {
  if (!batchNumber) return null;
  const { data, error } = await supabase.rpc("get_or_create_grn_pay_code" as any, {
    p_batch_number: batchNumber,
  });
  if (error) {
    console.error("Failed to allocate GRN pay code", error);
    return null;
  }
  return (data as string) || null;
}

/** Resolves a scanned/typed value (pay code, legacy code or batch number) to a batch number. */
export async function resolveGrnReference(input: string): Promise<string | null> {
  const value = (input || "").trim();
  if (!value) return null;
  if (/^\d{6,16}$/.test(value)) return value; // plain batch number, nothing to resolve
  const { data, error } = await supabase.rpc("resolve_grn_reference" as any, { p_code: value });
  if (error) return null;
  return (data as string) || null;
}
