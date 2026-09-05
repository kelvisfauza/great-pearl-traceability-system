/**
 * Approver signature registry.
 *
 * Receipts (meal plans, service-provider payments, GRN payments, general
 * payouts) are signed by the person who actually approved / released the
 * payment — not by a single fixed finance manager.
 *
 * Signature images live in `src/assets/signatures/` and are named after the
 * key below, e.g. `src/assets/signatures/denis.png`. They are resolved lazily
 * with import.meta.glob so a missing file never breaks the build — the receipt
 * simply falls back to the typed name over the signature line.
 */

const signatureFiles = import.meta.glob('/src/assets/signatures/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface Signatory {
  key: string;
  name: string;
  title: string;
  emails: string[];
  /** Resolved image URL, or undefined when the signature has not been uploaded yet */
  signatureUrl?: string;
}

const REGISTRY: Omit<Signatory, 'signatureUrl'>[] = [
  {
    key: 'denis',
    name: 'Bwambale Denis',
    title: 'Trader',
    emails: ['bwambaledenis@greatpearlcoffee.com'],
  },
  {
    key: 'wycliff',
    name: 'Musema Wyclif',
    title: 'Assistant Trader & Field Officer',
    emails: ['musemawyclif@greatpearlcoffee.com'],
  },
  {
    key: 'fauza',
    name: 'Fauza Kusa',
    title: 'Managing Director',
    emails: ['fauzakusa@greatpearlcoffee.com', 'kelvifauza@gmail.com'],
  },
];

const resolveUrl = (key: string): string | undefined =>
  signatureFiles[`/src/assets/signatures/${key}.png`];

const withUrl = (s: Omit<Signatory, 'signatureUrl'>): Signatory => ({
  ...s,
  signatureUrl: resolveUrl(s.key),
});

export const listSignatories = (): Signatory[] => REGISTRY.map(withUrl);

/**
 * Resolve the signatory for a receipt from the approver's email (preferred)
 * or their display name. Returns undefined when no registered approver matches.
 */
export const getSignatory = (
  email?: string | null,
  name?: string | null,
): Signatory | undefined => {
  const e = (email || '').trim().toLowerCase();
  if (e) {
    const byEmail = REGISTRY.find(s => s.emails.includes(e));
    if (byEmail) return withUrl(byEmail);
  }
  const n = (name || '').trim().toLowerCase();
  if (n) {
    const byName = REGISTRY.find(
      s =>
        s.name.toLowerCase() === n ||
        n.includes(s.key) ||
        s.name.toLowerCase().split(' ').every(part => n.includes(part)),
    );
    if (byName) return withUrl(byName);
  }
  return undefined;
};

/** Name + title to print under the signature line, with a safe fallback. */
export const resolveSignatureBlock = (
  email?: string | null,
  name?: string | null,
): { name: string; title: string; signatureUrl?: string } => {
  const match = getSignatory(email, name);
  if (match) return { name: match.name, title: match.title, signatureUrl: match.signatureUrl };
  return { name: name || 'Authorised Approver', title: 'Approving Officer' };
};
