
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreManagement } from '@/hooks/useStoreManagement';
import { useToast } from '@/hooks/use-toast';

interface GRNGeneratorProps {
  open: boolean;
  onClose: () => void;
}

const GRNGenerator: React.FC<GRNGeneratorProps> = ({ open, onClose }) => {
  const { storeRecords, loading } = useStoreManagement();
  const [selectedRecord, setSelectedRecord] = useState<string>('');
  const { toast } = useToast();

  const handleGenerateGRN = () => {
    const record = storeRecords.find(r => r.id === selectedRecord);
    if (!record) return;

    const grnContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>GOODS RECEIVED NOTE (GRN)</h1>
          <p><strong>Great Pearl Coffee Factory</strong></p>
          <p>+256781121639 / +256778536681</p>
          <p>greatpearlcoffee@gmail.com</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>GRN Number:</strong> GRN-${record.batchNumber}</p>
          <p><strong>Date:</strong> ${new Date(record.date).toLocaleDateString()}</p>
          <p><strong>Supplier:</strong> ${record.supplierName}</p>
          <p><strong>Coffee Type:</strong> ${record.coffeeType}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Quantity (Bags)</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Weight (KG)</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Batch Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${record.coffeeType}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${record.bags}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${record.kilograms}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${record.batchNumber}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 40px;">
          <p>This GRN confirms the receipt of the above coffee from ${record.supplierName}.</p>
          <br/>
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p>_________________________</p>
              <p>Store Keeper</p>
            </div>
            <div>
              <p>_________________________</p>
              <p>Quality Controller</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GRN - ${record.batchNumber}</title>
          </head>
          <body>
            ${grnContent}
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
    }

    toast({
      title: "GRN Generated",
      description: "Goods Received Note has been generated successfully"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate GRN / Delivery Note</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Coffee Record</label>
            <Select value={selectedRecord} onValueChange={setSelectedRecord}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coffee record" />
              </SelectTrigger>
              <SelectContent>
                {storeRecords.map((record) => (
                  <SelectItem key={record.id} value={record.id}>
                    {record.supplierName} - {record.coffeeType} - {record.batchNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecord && (
            <div className="border rounded p-4">
              <h3 className="font-medium mb-2">Record Details</h3>
              {(() => {
                const record = storeRecords.find(r => r.id === selectedRecord);
                if (!record) return null;
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Supplier:</strong> {record.supplierName}</p>
                      <p><strong>Coffee Type:</strong> {record.coffeeType}</p>
                      <p><strong>Date:</strong> {new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p><strong>Bags:</strong> {record.bags}</p>
                      <p><strong>Kilograms:</strong> {record.kilograms}</p>
                      <p><strong>Batch:</strong> {record.batchNumber}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleGenerateGRN} 
              disabled={!selectedRecord}
            >
              Generate & Print GRN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNGenerator;
