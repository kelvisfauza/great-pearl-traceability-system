export interface GrnPrintReference { id: string; batch_number?: string | null }
export interface GrnPrintRow { lot_id: string; batch_number: string | null }

export function hasActiveGrnPrint(lot: GrnPrintReference, rows: GrnPrintRow[]): boolean {
  return rows.some(row => row.lot_id === lot.id ||
    (!!lot.batch_number && row.batch_number?.toUpperCase() === lot.batch_number.toUpperCase()));
}