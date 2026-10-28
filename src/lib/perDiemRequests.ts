export interface PerDiemRequest {
  id: string;
  document_number: string;
  employee_id: string;
  employee_email: string;
  employee_name: string;
  amount: number;
  status: string;
  printed_at: string | null;
  form_data: Record<string, string>;
}

export function printedPerDiemNumber(value: string): string {
  const number = value.trim().toUpperCase();
  if (!number) throw new Error('Printed form number is required');
  return number;
}

export function perDiemAwardable(request: Pick<PerDiemRequest, 'status' | 'printed_at'>): boolean {
  return request.status === 'pending' && Boolean(request.printed_at);
}