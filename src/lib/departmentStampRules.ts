export type DepartmentStampKey = 'operations' | 'quality' | 'finance' | 'procurement' | 'supervisor' | 'business';

const normalizedName = (name: string) => name.trim().toLowerCase().replace(/\s+2$/, '').replace(/\s+/g, ' ');

/** Personal stamps are matched to recorded identities, never to a generic Admin label. */
export function personalApprovalStamp(name?: string | null): DepartmentStampKey | undefined {
  const value = normalizedName(name || '');
  if (['fauza kusa', 'kusa fauza', 'fauza kelvis', 'kelvis fauza'].includes(value)) return 'operations';
  if (value === 'bwambale denis') return 'supervisor';
  return undefined;
}

export function documentDepartmentStamp(title: string, department = '', name = ''): DepartmentStampKey {
  const value = title.toLowerCase();
  if (/payment|payout|receipt|finance|withdrawal|salary|payroll/.test(value)) return 'finance';
  if (/sampling|quality|analysis|lab report|daily.price|price sheet/.test(value)) return 'quality';
  if (/procurement|purchase order|meal.plan.requisition|supplier contract/.test(value)) return 'procurement';
  const dept = department.toLowerCase();
  if (/quality|laboratory/.test(dept)) return 'quality';
  if (/finance|accounts/.test(dept)) return 'finance';
  if (/procurement/.test(dept)) return 'procurement';
  return personalApprovalStamp(name) || 'business';
}

export function departmentStampDate(at: string | Date = new Date()): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) throw new Error('A valid stamp date is required.');
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Kampala', day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(date);
  return ['day', 'month', 'year'].map(type => parts.find(part => part.type === type)?.value.toUpperCase()).join(' ');
}