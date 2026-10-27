export interface PendingSupplierInput {
  name: string;
  origin: string;
  phone?: string;
  openingBalance?: number;
  coffeeRecordId?: string | null;
  deliveryLabel?: string | null;
}

export type PendingSupplierValidation =
  | { ok: true; value: Required<Pick<PendingSupplierInput, 'name' | 'origin'>> & Omit<PendingSupplierInput, 'name' | 'origin'> }
  | { ok: false; error: string };

// Store managers propose suppliers; only admins or Procurement staff save them directly.
export function canDirectlyAddSupplier(isAdmin: boolean, hasProcurement: boolean): boolean {
  return isAdmin || hasProcurement;
}

export function validatePendingSupplier(input: PendingSupplierInput): PendingSupplierValidation {
  const name = (input.name || '').trim().replace(/\s+/g, ' ');
  const origin = (input.origin || '').trim();
  if (!name) return { ok: false, error: 'Enter the supplier name' };
  if (name.length < 3) return { ok: false, error: 'Supplier name is too short' };
  if (!origin) return { ok: false, error: 'Enter the supplier origin' };
  const openingBalance = Number(input.openingBalance) || 0;
  if (openingBalance < 0) return { ok: false, error: 'Opening balance cannot be negative' };
  return {
    ok: true,
    value: {
      name,
      origin,
      phone: (input.phone || '').trim() || undefined,
      openingBalance,
      coffeeRecordId: input.coffeeRecordId || null,
      deliveryLabel: input.deliveryLabel || null,
    },
  };
}

export type PendingSupplierStatus = 'pending' | 'confirmed' | 'declined';

export function canReviewRequest(status: string): boolean {
  return status === 'pending';
}

export function requestStatusLabel(status: string): string {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'declined') return 'Declined';
  return 'Pending';
}
