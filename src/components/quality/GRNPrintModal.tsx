import React from 'react';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="printable w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold mb-4">
            Goods Received Note (GRN)
          </DialogTitle>
        </DialogHeader>

        <div className="text-center mb-4 text-sm">
          <p className="font-bold text-lg">Great Pearl Coffee Factory</p>
          <p>+256781121639 / +256778536681</p>
          <p>www.greatpearlcoffee.com</p>
          <p>greatpearlcoffee@gmail.com</p>
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

          <table className="w-full mt-4 text-sm border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left">Description</th>
                <th className="border px-4 py-2 text-left">Unit Price (UGX)</th>
                <th className="border px-4 py-2 text-left">Total (UGX)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2">{coffeeType} - {qualityAssessment}</td>
                <td className="border px-4 py-2">{unitPrice.toLocaleString()}</td>
                <td className="border px-4 py-2">{totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between mt-8">
            <div className="text-xs">
              <p>__________________________</p>
              <p>Store Keeper</p>
            </div>
            <div className="text-xs text-right">
              <p>__________________________</p>
              <p>Quality Analyst</p>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>This GRN is system generated and valid without a signature.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;