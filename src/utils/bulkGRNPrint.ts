import { GRNDocumentData, getGRNPrintDocumentHTML } from "@/utils/grnPrintTemplate";
import { enrichGRNListWithSuppliers } from "@/utils/enrichGRNSupplier";

export type GRNData = GRNDocumentData & { supplierId?: string | null };

export async function openBulkGRNPrintWindow(grnDataList: GRNData[]): Promise<void> {
  if (grnDataList.length === 0) return;

  // Enrich every GRN with supplier code, phone, email, bank details and recoveries
  // so the Payment Order copy is always complete.
  const enriched = await enrichGRNListWithSuppliers(grnDataList);

  const printWindow = window.open('', '', 'width=1000,height=1200');
  if (!printWindow) return;

  printWindow.document.write(
    getGRNPrintDocumentHTML(enriched, `Bulk GRN Print - ${enriched.length} documents`)
  );
  printWindow.document.close();
}
