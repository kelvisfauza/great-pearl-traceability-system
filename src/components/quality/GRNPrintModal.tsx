
import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { height: 60px; width: auto; max-width: 120px; }
            .company-name { font-weight: bold; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-bottom: 10px; }
            .company-address { font-weight: bold; text-align: center; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th, td { border: 1px solid #999; padding: 8px; text-align: left; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; }
            .signatures div { text-align: center; }
            .note { margin-top: 20px; font-size: 11px; color: #666; }
            .quality-table { margin-top: 20px; }
            .quality-table th { background-color: #f5f5f5; font-weight: bold; }
            .separator { border-top: 2px solid #000; margin: 15px 0; }
          </style>
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
          <div className="text-center mb-6 text-sm">
             <div className="mb-4">
               <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" alt="Great Pearl Coffee Factory Logo" className="mx-auto h-16 w-auto mb-2 logo" />
             </div>
            <h1 className="font-bold text-xl uppercase tracking-wide mb-2 company-name">GREAT PEARL COFFEE FACTORY</h1>
            <div className="mb-4 company-address">
              <p>+256781121639 / +256778536681</p>
              <p>www.greatpearlcoffee.com</p>
              <p>greatpearlcoffee@gmail.com</p>
            </div>
            <hr className="border-t-2 border-gray-800 my-4" />
          </div>

          <div className="space-y-4 text-sm">
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

            <div className="quality-table">
              <h3 className="font-bold text-base mb-2">Quality Assessment Parameters</h3>
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
                <p>__________________________</p>
                <p>Store Keeper</p>
              </div>
              <div>
                <p>__________________________</p>
                <p>Quality Analyst</p>
              </div>
            </div>

            <div className="note">
              This GRN is system-generated and valid without a signature.
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
