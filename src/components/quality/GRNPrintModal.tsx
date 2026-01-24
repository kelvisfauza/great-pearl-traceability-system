
import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';
import { getStandardPrintStyles } from '@/utils/printStyles';

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
    moisture?: number;
    group1_defects?: number;
    group2_defects?: number;
    below12?: number;
    pods?: number;
    husks?: number;
    stones?: number;
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
    createdAt,
    moisture,
    group1_defects,
    group2_defects,
    below12,
    pods,
    husks,
    stones
  } = grnData;

  const totalAmount = totalKgs * unitPrice;

  const qualityParameters = [
    { parameter: 'Moisture', value: moisture, unit: '%', description: 'Water content in coffee beans' },
    { parameter: 'Group 1 Defects', value: group1_defects, unit: '%', description: 'Primary defects (black beans, sour beans, etc.)' },
    { parameter: 'Group 2 Defects', value: group2_defects, unit: '%', description: 'Secondary defects (partial black, floaters, etc.)' },
    { parameter: 'Below 12 Screen', value: below12, unit: '%', description: 'Small bean size percentage' },
    { parameter: 'Pods', value: pods, unit: '%', description: 'Dried coffee cherries' },
    { parameter: 'Husks', value: husks, unit: '%', description: 'Parchment remnants' },
    { parameter: 'Stones', value: stones, unit: '%', description: 'Foreign matter' },
  ];

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=900,height=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>GRN - ${grnNumber}</title>
          <style>${getStandardPrintStyles()}</style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold mb-4">
            Goods Received Note (GRN)
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <StandardPrintHeader
            title="Goods Received Note (GRN)"
            documentNumber={grnNumber}
            additionalInfo={`Assessed By: ${assessedBy}`}
          />

          <div className="content-section space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Supplier Name:</strong> {supplierName}</p>
                <p><strong>GRN Number:</strong> {grnNumber}</p>
                <p><strong>Assessed By:</strong> {assessedBy}</p>
                <p><strong>Date:</strong> {new Date(createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>Coffee Type:</strong> {coffeeType}</p>
                <p><strong>Number of Bags:</strong> {numberOfBags}</p>
                <p><strong>Total Kgs:</strong> {totalKgs.toLocaleString()} kg</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Unit Price (UGX)</th>
                  <th>Total (UGX)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{unitPrice.toLocaleString()}</td>
                  <td>{totalAmount.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="content-section quality-table">
              <h3 className="section-title">Quality Assessment Parameters</h3>
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityParameters.map((param, index) => (
                    <tr key={index}>
                      <td className="font-medium">{param.parameter}</td>
                      <td className="text-center">{param.value !== undefined ? param.value : 'N/A'}</td>
                      <td className="text-center">{param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="signatures">
              <div>
                <p>Store Keeper</p>
                <div className="signature-line"></div>
                <p>Signature & Date</p>
              </div>
              <div>
                <p>Quality Analyst</p>
                <div className="signature-line"></div>
                <p>Signature & Date</p>
              </div>
            </div>

            <div className="footer">
              <p>This GRN is system-generated and valid without a signature.</p>
              <p>Generated by Great Pearl Coffee Factory Management System</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end no-print">
          <Button variant="outline" onClick={handlePrint}>
            Print GRN
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;
