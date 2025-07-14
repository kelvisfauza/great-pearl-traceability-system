import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface GRNPrintModalProps {
  open: boolean;
  onClose: () => void;
  grnData: {
    grnNumber: string;
    supplierName: string;
    coffeeType: string;
    qualityAssessment: string;
    numberOfBags: number;
    totalKgs: number;
    unitPrice: number;
    assessedBy: string;
    createdAt: string;
  } | null;
}

const GRNPrintModal: React.FC<GRNPrintModalProps> = ({ open, onClose, grnData }) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!grnData) return null;

  const {
    grnNumber,
    supplierName,
    coffeeType,
    qualityAssessment,
    numberOfBags,
    totalKgs,
    unitPrice,
    assessedBy,
    createdAt
  } = grnData;

  const totalAmount = totalKgs * unitPrice;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>GRN - ${grnNumber}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .header { text-align: center; margin-bottom: 20px; }
            .signature { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; }
            .signature div { text-align: center; }
            .note { font-size: 11px; margin-top: 20px; color: #666; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold mb-4">
            Goods Received Note (GRN)
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="text-center text-sm">
            <p className="font-bold text-lg">Great Pearl Coffee Factory</p>
            <p>+256781121639 / +256778536681</p>
            <p>www.greatpearlcoffee.com</p>
            <p>greatpearlcoffee@gmail.com</p>
          </div>

          <div className="mt-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Supplier Name:</strong> {supplierName}</p>
                <p><strong>GRN Number:</strong> {grnNumber}</p>
                <p><strong>Assessed By:</strong> {assessedBy}</p>
                <p><strong>Date:</strong> {new Date(createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>Coffee Type:</strong> {coffeeType}</p>
                <p><strong>Quality Assessment:</strong> {qualityAssessment}</p>
                <p><strong>Number of Bags:</strong> {numberOfBags}</p>
                <p><strong>Total Kgs:</strong> {totalKgs.toLocaleString()} kg</p>
              </div>
            </div>

            <table className="mt-6">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Unit Price (UGX)</th>
                  <th>Total (UGX)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{coffeeType} - {qualityAssessment}</td>
                  <td>{unitPrice.toLocaleString()}</td>
                  <td>{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="signature mt-10">
              <div>
                <p>__________________________</p>
                <p>Store Keeper</p>
              </div>
              <div>
                <p>__________________________</p>
                <p>Quality Analyst</p>
              </div>
            </div>

            <div className="note mt-4 text-xs text-gray-500">
              This GRN is system-generated and valid without a signature.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={handlePrint}>
            Print GRN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;
