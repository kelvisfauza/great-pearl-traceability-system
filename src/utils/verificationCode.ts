// Verification Code Generator Utility

type DocumentType = 'document' | 'employee_id' | 'receipt' | 'report' | 'contract' | 'assessment';

const TYPE_PREFIXES: Record<DocumentType, string> = {
  document: 'DOC',
  employee_id: 'EMP',
  receipt: 'RCP',
  report: 'RPT',
  contract: 'CNT',
  assessment: 'QA'
};

/**
 * Generates a unique verification code for documents
 * Format: GPCF-{TYPE}-{YEAR}-{RANDOM}
 * Example: GPCF-DOC-2026-A3K9X2
 */
export function generateVerificationCode(type: DocumentType = 'document'): string {
  const prefix = 'GPCF';
  const typeCode = TYPE_PREFIXES[type] || 'DOC';
  const year = new Date().getFullYear();
  const random = generateRandomString(6);
  
  return `${prefix}-${typeCode}-${year}-${random}`;
}

/**
 * Generates a random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 to avoid confusion
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates QR code URL for verification
 */
export function getVerificationQRUrl(code: string, size: number = 150): string {
  const verifyUrl = `${window.location.origin}/verify/${code}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(verifyUrl)}&format=svg`;
}

/**
 * Gets the full verification URL
 */
export function getVerificationUrl(code: string): string {
  return `${window.location.origin}/verify/${code}`;
}

/**
 * Validates a verification code format
 */
export function isValidVerificationCode(code: string): boolean {
  // Format: GPCF-XXX-YYYY-XXXXXX
  const pattern = /^GPCF-[A-Z]{2,3}-\d{4}-[A-Z0-9]{6}$/;
  return pattern.test(code);
}

/**
 * Gets the type from a verification code
 */
export function getTypeFromCode(code: string): DocumentType | null {
  const match = code.match(/^GPCF-([A-Z]{2,3})-/);
  if (!match) return null;
  
  const typeCode = match[1];
  const entry = Object.entries(TYPE_PREFIXES).find(([, prefix]) => prefix === typeCode);
  return entry ? (entry[0] as DocumentType) : null;
}
