export interface ReceiptLot {
  id: string;
  batch_number: string | null;
  total_amount_ugx: number | string | null;
}

export interface ReceiptPayment {
  id: string;
  lot_id: string | null;
  amount_paid_ugx: number | string | null;
  status?: string | null;
}

export function isConfirmedGrnPayment(payment: ReceiptPayment) {
  return ['paid', 'posted', 'completed', 'success', 'approved'].includes(String(payment.status || '').toLowerCase());
}

export function assertGrnPaymentTarget(expected: ReceiptLot, current: ReceiptLot) {
  if (expected.id !== current.id || expected.batch_number !== current.batch_number ||
      Number(expected.total_amount_ugx) !== Number(current.total_amount_ugx)) {
    throw new Error('This GRN changed after payment confirmation opened. Close and check it again before paying.');
  }
}

export function captureGrnPaymentEntry<T>(entry: T): T {
  return structuredClone(entry);
}

export function previousConfirmedGrnPayments(lot: ReceiptLot, payment: ReceiptPayment, payments: ReceiptPayment[]) {
  return payments.filter(p => p.id !== payment.id && p.lot_id === lot.id && isConfirmedGrnPayment(p))
    .reduce((sum, p) => sum + Number(p.amount_paid_ugx || 0), 0);
}

export function bindGrnReceipt(lot: ReceiptLot, payment: ReceiptPayment) {
  if (!lot.id || !payment.id || !lot.batch_number || payment.lot_id !== lot.id) {
    throw new Error('The saved payment does not belong to this GRN. Refresh before printing.');
  }
  if (!isConfirmedGrnPayment(payment)) {
    throw new Error('A confirmed saved payment is required before printing a receipt.');
  }
  const amount = Number(payment.amount_paid_ugx);
  const lotValue = Number(lot.total_amount_ugx);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(lotValue) || lotValue <= 0) {
    throw new Error('The saved payment figures are missing or invalid.');
  }
  return {
    grnNumber: `GRN-${lot.batch_number}`,
    receiptNo: `RCP-${lot.batch_number.replace(/[^A-Z0-9]/gi, '').slice(-8)}`,
    amount,
    lotValue,
  };
}