import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useStoreManagement } from '@/hooks/useStoreManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDocumentVerification } from '@/hooks/useDocumentVerification';
import { generateVerificationCode, getVerificationQRUrl } from '@/utils/verificationCode';
import { supabase } from '@/integrations/supabase/client';
import { Printer, CheckCircle2, Filter } from 'lucide-react';

interface GRNGeneratorProps {
  open: boolean;
  onClose: () => void;
}

const GRNGenerator: React.FC<GRNGeneratorProps> = ({ open, onClose }) => {
  const { storeRecords, loading, fetchStoreData } = useStoreManagement();
  const { employee } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState<string>('');
  const [filterPrinted, setFilterPrinted] = useState<'all' | 'printed' | 'not_printed'>('all');
  const { toast } = useToast();
  const { createVerification } = useDocumentVerification();

  const filteredRecords = storeRecords.filter(r => {
    if (filterPrinted === 'printed') return !!r.grnPrintedAt;
    if (filterPrinted === 'not_printed') return !r.grnPrintedAt;
    return true;
  });

  const handleGenerateGRN = async () => {
    const record = storeRecords.find(r => r.id === selectedRecord);
    if (!record) return;

    // Create verification record
    const verificationCode = await createVerification({
      type: 'document',
      subtype: 'Goods Received Note (GRN)',
      issued_to_name: record.supplierName,
      reference_no: `GRN-${record.batchNumber}`,
      meta: {
        coffeeType: record.coffeeType,
        bags: record.bags,
        kilograms: record.kilograms,
        batchNumber: record.batchNumber
      }
    });

    const qrCodeUrl = verificationCode ? getVerificationQRUrl(verificationCode, 100) : '';

    const grnContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>GOODS RECEIVED NOTE (GRN)</h1>
          <p><strong>Great Agro Coffee</strong></p>
          <p>+256 393 001 626</p>
          <p>info@greatpearlcoffee.com</p>
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

        ${verificationCode ? `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc; text-align: center;">
          <p style="font-size: 10px; color: #666; margin-bottom: 5px;">Document Verification</p>
          <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
            <div style="text-align: left;">
              <p style="font-size: 12px; font-weight: bold; color: #166534; font-family: monospace;">${verificationCode}</p>
              <p style="font-size: 9px; color: #999;">Scan QR to verify authenticity</p>
            </div>
            <img src="${qrCodeUrl}" alt="Verification QR" style="width: 80px; height: 80px; border: 1px solid #ddd; padding: 4px; background: white;" />
          </div>
        </div>
        ` : ''}
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
                setTimeout(function() { window.print(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }

    // Mark the record as printed
    try {
      await (supabase.from('coffee_records') as any)
        .update({
          grn_printed_at: new Date().toISOString(),
          grn_printed_by: employee?.email || 'unknown',
        })
        .eq('id', record.id);
      
      // Refresh data to update UI
      fetchStoreData(true);
    } catch (err) {
      console.error('Failed to mark GRN as printed:', err);
    }

    toast({
      title: "GRN Generated & Marked",
      description: `GRN for ${record.batchNumber} printed and tracked successfully`
    });
  };

  const selectedRecordData = storeRecords.find(r => r.id === selectedRecord);
  const printedCount = storeRecords.filter(r => r.grnPrintedAt).length;
  const unprintedCount = storeRecords.filter(r => !r.grnPrintedAt).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Generate GRN / Delivery Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Print status summary */}
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {printedCount} Printed
            </Badge>
            <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700">
              {unprintedCount} Not Printed
            </Badge>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterPrinted} onValueChange={(v: any) => setFilterPrinted(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="not_printed">Not Printed</SelectItem>
                <SelectItem value="printed">Already Printed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Record selector */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Coffee Record</label>
            <Select value={selectedRecord} onValueChange={setSelectedRecord}>
              <SelectTrigger>
                <SelectValue placeholder="Select a coffee record" />
              </SelectTrigger>
              <SelectContent>
                {filteredRecords.map((record) => (
                  <SelectItem key={record.id} value={record.id}>
                    <span className="flex items-center gap-2">
                      {record.grnPrintedAt && <CheckCircle2 className="h-3 w-3 text-green-600 inline" />}
                      {record.supplierName} - {record.coffeeType} - {record.batchNumber}
                      {record.grnPrintedAt && <span className="text-xs text-muted-foreground">(printed)</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRecordData && (
            <div className="border rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Record Details</h3>
                {selectedRecordData.grnPrintedAt ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Printed {new Date(selectedRecordData.grnPrintedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {selectedRecordData.grnPrintedBy && ` by ${selectedRecordData.grnPrintedBy.split('@')[0]}`}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    Not Printed
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Supplier:</strong> {selectedRecordData.supplierName}</p>
                  <p><strong>Coffee Type:</strong> {selectedRecordData.coffeeType}</p>
                  <p><strong>Date:</strong> {new Date(selectedRecordData.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Bags:</strong> {selectedRecordData.bags}</p>
                  <p><strong>Kilograms:</strong> {selectedRecordData.kilograms}</p>
                  <p><strong>Batch:</strong> {selectedRecordData.batchNumber}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleGenerateGRN} 
              disabled={!selectedRecord}
            >
              <Printer className="h-4 w-4 mr-1" />
              {selectedRecordData?.grnPrintedAt ? 'Re-Print GRN' : 'Generate & Print GRN'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNGenerator;
