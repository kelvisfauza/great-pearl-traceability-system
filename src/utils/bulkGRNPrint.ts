import { GRNDocumentData, getGRNPrintDocumentHTML } from "@/utils/grnPrintTemplate";
import { enrichGRNListWithSuppliers } from "@/utils/enrichGRNSupplier";

export type GRNData = GRNDocumentData & { supplierId?: string | null };

export async function openBulkGRNPrintWindow(grnDataList: GRNData[]): Promise<void> {
  if (grnDataList.length === 0) return;

  // Open the print window synchronously to avoid popup blockers, then fill it
  // once supplier enrichment finishes so Payment Order copy is complete.
  const printWindow = window.open('', '', 'width=1000,height=1200');
  if (!printWindow) return;

  printWindow.document.write(
    `<!DOCTYPE html><html><body style="font-family:Arial;padding:24px;color:#333;">Preparing payment orders…</body></html>`,
  );

  const enriched = await enrichGRNListWithSuppliers(grnDataList);

  printWindow.document.open();
  printWindow.document.write(
    getGRNPrintDocumentHTML(enriched, `Bulk GRN Print - ${enriched.length} documents`)
  );
  printWindow.document.close();
}
