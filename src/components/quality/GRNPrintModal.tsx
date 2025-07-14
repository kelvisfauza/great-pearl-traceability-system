import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StoreRecord {
  id: string;
  supplier_name: string;
  date: string;
  coffee_type: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  approved_by?: string;
}

interface GRNPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeRecord?: StoreRecord;
}

const formatCurrency = (amount: number | undefined | null): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'UGX 0';
  }
  return `UGX ${amount.toLocaleString('en-UG')}`;
};

const GRNPrintModal: React.FC<GRNPrintModalProps> = ({ isOpen, onClose, storeRecord }) => {
  if (!storeRecord) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">Goods Received Note (GRN)</DialogTitle>
        </DialogHeader>

        <div className="p-4 border rounded shadow-sm text-sm space-y-3">
          <div className="flex justify-between">
            <div>
              <p><strong>Supplier:</strong> {storeRecord.supplier_name}</p>
              <p><strong>Date:</strong> {new Date(storeRecord.date).toLocaleDateString()}</p>
              <p><strong>Approved by:</strong> {storeRecord.approved_by || '________________'}</p>
            </div>
            <div className="text-right">
              <p><strong>GRN ID:</strong> {storeRecord.id}</p>
              <p><strong>Coffee Type:</strong> {storeRecord.coffee_type}</p>
            </div>
          </div>

          <hr className="my-2" />

          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Item</th>
                <th className="border p-2">Quantity (Kg)</th>
                <th className="border p-2">Unit Price</th>
                <th className="border p-2">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">{storeRecord.coffee_type}</td>
                <td className="border p-2">{storeRecord.quantity}</td>
                <td className="border p-2">{formatCurrency(storeRecord.unit_price)}</td>
                <td className="border p-2">{formatCurrency(storeRecord.total_amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 flex justify-between">
            <div>
              <p><strong>Store Manager Signature:</strong> ___________________</p>
              <p><strong>Receiver Signature:</strong> ___________________</p>
            </div>
            <div className="text-right">
              <p><strong>Total:</strong> {formatCurrency(storeRecord.total_amount)}</p>
            </div>
          </div>

          <div className="text-center mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;