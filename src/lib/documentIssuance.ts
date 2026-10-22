export interface PrintStamp {
  code: string;
  url: string;
  qr: string;
  printedBy: string;
  printedAt: string;
  title: string;
}

export async function issuePrintStamp(
  title: string,
  format: string,
  services: {
    identity: () => Promise<{ id: string; name: string }>;
    code: () => string;
    url: (code: string) => string;
    qr: (url: string) => Promise<string>;
    register: (record: Record<string, unknown>) => Promise<void>;
  },
): Promise<PrintStamp> {
  const identity = await services.identity();
  if (!identity.id || !identity.name.trim()) throw new Error('Sign in with your employee account before printing.');
  const code = services.code();
  const url = services.url(code);
  const qr = await services.qr(url);
  const printedAt = new Date().toISOString();
  await services.register({
    code, type: 'document', subtype: 'system_print', status: 'verified',
    created_by: identity.id, issued_to_name: identity.name, issued_at: printedAt,
    reference_no: title.slice(0, 160),
    meta: { title: title.slice(0, 160), format, printed_by: identity.name, printed_at: printedAt,
      verification_scope: 'Document issuance; not confirmation of payment, approval or handwritten changes.' },
  });
  return { code, url, qr, printedBy: identity.name, printedAt, title };
}