import { GRNDocumentData, getGRNPrintDocumentHTML } from "@/utils/grnPrintTemplate";

export type GRNData = GRNDocumentData;

export function openBulkGRNPrintWindow(grnDataList: GRNData[]): void {
  if (grnDataList.length === 0) return;

  const printWindow = window.open('', '', 'width=1000,height=1200');
  if (!printWindow) return;

  printWindow.document.write(
    getGRNPrintDocumentHTML(grnDataList, `Bulk GRN Print - ${grnDataList.length} documents`)
  );
  printWindow.document.close();
}
