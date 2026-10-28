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

export function bindGrnReceipt(lot: ReceiptLot, payment: ReceiptPayment) {
  if (!lot.batch_number || payment.lot_id !== lot.id) {
    throw new Error('The saved payment does not belong to this GRN. Refresh before printing.');
  }
  if (!['paid', 'posted', 'completed', 'success', 'approved'].includes(String(payment.status || '').toLowerCase())) {
    throw new Error('A confirmed saved payment is required before printing a receipt.');
  }
  const amount = Number(payment.amount_paid_ugx);
  const lotValue = Number(lot.total_amount_ugx);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(lotValue)) {
    throw new Error('The saved payment figures are missing or invalid.');
  }
  return {
    grnNumber: `GRN-${lot.batch_number}`,
    receiptNo: `RCP-${lot.batch_number.replace(/[^A-Z0-9]/gi, '').slice(-8)}`,
    amount,
    lotValue,
  };
}