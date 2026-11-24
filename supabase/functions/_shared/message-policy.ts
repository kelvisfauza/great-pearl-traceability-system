export const SETTINGS_TEST_MESSAGE = 'Great Agro Coffee: messaging connection test.';
export const SETTINGS_TEST_SUBJECT = 'Great Agro Coffee messaging test';

export function phoneKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('256') ? '0' + digits.slice(3) : digits.length === 9 ? '0' + digits : digits;
  return /^0\d{9}$/.test(local) ? local : null;
}

export function ownTestDestination(channel: string, submitted: unknown, employee: { email?: string | null; phone?: string | null; alt_phone?: string | null }): string {
  if (channel === 'email') {
    if (!employee.email) throw new Error('Your saved email address is missing.');
    if (submitted && (typeof submitted !== 'string' || submitted.trim().toLowerCase() !== employee.email.trim().toLowerCase())) {
      throw new Error('Tests can only go to your saved email address.');
    }
    return employee.email;
  }
  const saved = [employee.phone, employee.alt_phone].map(phoneKey).filter((v): v is string => v !== null);
  const chosen = submitted ? phoneKey(submitted) : saved[0];
  if (!chosen || !saved.includes(chosen)) throw new Error('Tests can only go to your saved phone number.');
  return chosen;
}

export function deliveryAccepted(httpOk: boolean, value: unknown): boolean {
  if (!httpOk || !value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  if (body.ok === false || body.success === false || body.blocked === true || body.skipped === true || body.error || body.email_status === 'failed') return false;
  return body.success === true || body.ok === true || body.status === 'success';
}

export function mayMirrorEmailToSms(caller: { internal: boolean; isAdmin: boolean }): boolean {
  return caller.internal || caller.isAdmin;
}

export async function employeePhoneBlocked(db: any, submitted: unknown): Promise<boolean> {
  const phone = phoneKey(submitted);
  if (!phone) return true;
  const variants = [phone, '256' + phone.slice(1), '+256' + phone.slice(1)];
  const reads = await Promise.all(['phone', 'alt_phone'].map(column => db.from('employees').select('disabled').in(column, variants).limit(10)));
  if (reads.some(r => r.error)) throw new Error('Employee notification access could not be checked.');
  return reads.some(r => (r.data || []).some((e: { disabled?: boolean }) => e.disabled === true));
}

/** Only resolves registered contacts; employee suppression takes precedence over other registries. */
export async function registeredPhone(db: any, submitted: unknown): Promise<{ phone: string; name: string; email?: string } | null> {
  const phone = phoneKey(submitted);
  if (!phone) return null;
  const variants = [phone, '256' + phone.slice(1), '+256' + phone.slice(1)];
  const employeeReads = await Promise.all(['phone', 'alt_phone'].map(column =>
    db.from('employees').select('name,email,phone,alt_phone,status,disabled').in(column, variants).limit(10)));
  if (employeeReads.some(r => r.error)) throw new Error('Saved recipient access could not be checked.');
  const employees = employeeReads.flatMap(r => r.data || []);
  if (employees.some(e => e.disabled === true || String(e.status).toLowerCase() !== 'active')) return null;
  if (employees.length) return { phone, name: employees[0].name, email: employees[0].email };
  const sources = [
    ['suppliers', 'name'], ['field_assessment_suppliers', 'supplier_name'],
    ['farmer_profiles', 'full_name'], ['field_agents', 'name'],
    ['service_providers', 'name'], ['customers', 'name'],
  ];
  for (const [table, column] of sources) {
    const { data, error } = await db.from(table).select(`phone,${column}`).in('phone', variants).limit(1);
    if (error) throw new Error('Saved supplier access could not be checked.');
    if (data?.[0]) return { phone, name: data[0][column] || 'Supplier' };
  }
  return null;
}