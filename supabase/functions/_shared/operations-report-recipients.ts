interface ReportEmployee {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  status?: string | null;
  disabled?: boolean | null;
}

/** Both scheduled and test reports retain the existing administrator audience. */
export function operationsReportRecipients(employees: ReportEmployee[], testEmail?: string | null) {
  const allowed = employees.filter(employee => employee.disabled !== true &&
    employee.role === 'Administrator' && employee.status?.toLowerCase() === 'active' &&
    !!employee.email?.trim());
  const selected = testEmail
    ? allowed.filter(employee => employee.email?.trim().toLowerCase() === testEmail.trim().toLowerCase())
    : allowed;
  if (testEmail && selected.length !== 1) return [];
  return selected.map(employee => ({
    name: employee.name || 'Administrator',
    email: employee.email?.trim() || '',
    phone: testEmail ? null : (employee.phone || null),
  }));
}