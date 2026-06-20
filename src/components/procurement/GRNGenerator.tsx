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

    const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const deliveryDate = new Date(record.date).toLocaleDateString('en-GB');
    const grnNo = `GAC-${record.batchNumber}`;
    const odNo = record.batchNumber.replace(/\D/g, '').slice(-4) || '0001';
    const region = (record as any).region || '';
    const isRegion = (r: string) => region.toLowerCase().includes(r.toLowerCase());
    const checkbox = (checked: boolean) =>
      `<span style="display:inline-block;width:11px;height:11px;border:1.2px solid #1a1a1a;vertical-align:middle;margin-right:4px;text-align:center;line-height:9px;font-size:10px;font-weight:bold;color:#0a6b2a;">${checked ? '✓' : ''}</span>`;
    const field = (label: string, value: string | number, width = '100%') =>
      `<span style="display:inline-block;width:${width};">
         <span style="font-weight:600;">${label}</span>
         <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:60px;padding:0 6px;font-family:'Courier New',monospace;color:#0a3d8f;">${value || '—'}</span>
       </span>`;

    const grnContent = `
      <div style="padding:14px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:11px;line-height:1.45;background:#fffdf3;">
        <!-- Top Header Row: Logo | Title | OD info -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr>
            <td style="border:1.5px solid #1a1a1a;padding:8px 10px;width:18%;text-align:center;vertical-align:middle;">
              <img src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" alt="GAC" style="height:36px;width:auto;display:block;margin:0 auto 2px;"/>
              <div style="font-weight:bold;font-size:11px;letter-spacing:1px;">GAC</div>
            </td>
            <td style="border:1.5px solid #1a1a1a;padding:10px;width:52%;text-align:center;vertical-align:middle;">
              <div style="font-weight:bold;font-size:18px;letter-spacing:1.5px;">OFFICIAL DOCUMENT</div>
              <div style="font-weight:600;font-size:12px;margin-top:2px;letter-spacing:1px;">GOODS RECEIVED NOTE — COFFEE</div>
            </td>
            <td style="border:1.5px solid #1a1a1a;padding:8px 10px;width:30%;font-size:10.5px;line-height:1.6;">
              <div><strong>OD No:</strong> ${odNo}</div>
              <div><strong>Version No:</strong> 01</div>
              <div><strong>Issue Date:</strong> ${issueDate}</div>
            </td>
          </tr>
        </table>

        <!-- Company strip + GRN ref -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr>
            <td style="text-align:center;padding:4px 0;font-size:11px;">
              <strong style="font-size:13px;letter-spacing:1px;">GREAT AGRO COFFEE LIMITED</strong><br/>
              <span style="font-size:9.5px;color:#444;font-weight:bold;">A Member of YEDA Coffee Company Limited</span><br/>
              <span style="font-size:9.5px;color:#444;">P.O Box 431420, Kasese, Uganda</span>
            </td>
            <td style="width:30%;text-align:right;padding:4px 0;">
              <strong style="font-size:11px;">GAC-GRNC</strong>
              <span style="display:inline-block;color:#c1121f;font-weight:bold;font-size:16px;font-family:'Courier New',monospace;border:1px solid #c1121f;padding:2px 8px;margin-left:4px;letter-spacing:1px;">${grnNo}</span>
            </td>
          </tr>
        </table>

        <!-- Region checkboxes -->
        <div style="margin:6px 0 8px;font-size:11px;">
          ${checkbox(isRegion('elgon'))}<span style="margin-right:18px;font-weight:600;">Elgon</span>
          ${checkbox(isRegion('rwenzori'))}<span style="margin-right:18px;font-weight:600;">Rwenzori</span>
          ${checkbox(isRegion('masaka'))}<span style="margin-right:18px;font-weight:600;">Masaka</span>
          ${checkbox(!!region && !['elgon','rwenzori','masaka'].some(r=>isRegion(r)))}<span style="font-weight:600;">Other</span>
          <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:200px;margin-left:4px;padding:0 6px;font-family:'Courier New',monospace;color:#0a3d8f;">${region && !['elgon','rwenzori','masaka'].some(r=>isRegion(r)) ? region : ''}</span>
        </div>

        <!-- Preamble -->
        <p style="font-size:10px;text-align:center;margin:6px 16px 12px;line-height:1.4;color:#222;">
          This Goods Received Note is a Contract between the two parties mentioned, whereby Great Agro Coffee Limited has agreed to buy
          and the Supplier has agreed to sell coffee under the following terms and conditions. This is to certify that we have received and
          inspected your coffee delivered to us and found it to conform to the following quality and price specifications.
        </p>

        <!-- Supplier & Delivery details -->
        <div style="margin:8px 0;">
          <div style="margin:8px 0;">${field('Date:&nbsp;', deliveryDate, '38%')} ${field('Supplier&rsquo;s Name:&nbsp;', record.supplierName, '58%')}</div>
          <div style="margin:8px 0;">${field('Supplier&rsquo;s Address:&nbsp;', (record as any).supplierAddress || '—', '58%')} ${field('Supplier&rsquo;s Tel:&nbsp;', (record as any).supplierPhone || '—', '38%')}</div>
          <div style="margin:8px 0;">${field('Vehicle Reg:&nbsp;', (record as any).vehicleReg || '—', '48%')} ${field('Delivery Note No:&nbsp;', (record as any).deliveryNote || record.batchNumber, '48%')}</div>
          <div style="margin:8px 0;">${field('No. of Bags:&nbsp;', `${record.bags} bags`, '32%')} ${field('Weighbridge No:&nbsp;', (record as any).weighbridgeNo || '—', '38%')} ${field('Net Weight (kg):&nbsp;', record.kilograms.toLocaleString(), '28%')}</div>
          <div style="margin:8px 0;">${field('Type of Coffee:&nbsp;', record.coffeeType, '40%')} ${field('Quality Factor:&nbsp;', (record as any).qualityFactor || '—', '28%')} ${field('Moisture Content:&nbsp;', (record as any).moisture ? `${(record as any).moisture}%` : '—', '28%')}</div>
          <div style="text-align:center;font-size:10px;font-style:italic;color:#444;margin:6px 0;">Quality Analysis: (See Quality Analysis Form attached)</div>
        </div>

        <!-- Pricing block -->
        <table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:10.5px;">
          <tr>
            <td style="padding:4px 0;width:34%;"><strong>Other:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:120px;">&nbsp;</span></td>
            <td style="padding:4px 0;width:33%;"></td>
            <td style="padding:4px 0;width:33%;"><strong>Contract No:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:100px;font-family:'Courier New',monospace;color:#0a3d8f;">${(record as any).contractNo || '—'}</span></td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Non-Contract Price:</strong></td>
            <td style="padding:4px 0;"><strong>Paid Price:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:90px;padding:0 4px;font-family:'Courier New',monospace;color:#0a3d8f;">${(record as any).pricePerKg ? Number((record as any).pricePerKg).toLocaleString() : '—'}</span></td>
            <td style="padding:4px 0;"><strong>UGX:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:120px;padding:0 4px;font-family:'Courier New',monospace;color:#0a3d8f;">${(record as any).totalAmount ? Number((record as any).totalAmount).toLocaleString() : '—'}</span></td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Contract Price:</strong></td>
            <td style="padding:4px 0;"><strong>Paid Price:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:90px;">&nbsp;</span></td>
            <td style="padding:4px 0;"><strong>UGX:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:120px;">&nbsp;</span></td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Advance — Payment Voucher No:</strong></td>
            <td style="padding:4px 0;"><strong>Cheque No:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:90px;">&nbsp;</span></td>
            <td style="padding:4px 0;"><strong>UGX:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:120px;">&nbsp;</span></td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Deduction / Other:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:140px;">&nbsp;</span></td>
            <td></td>
            <td style="padding:4px 0;"><strong>UGX:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:120px;">&nbsp;</span></td>
          </tr>
          <tr>
            <td colspan="2" style="padding:6px 0;border-top:1.5px solid #1a1a1a;"><strong style="font-size:12px;">TOTAL PAID AFTER DEDUCTIONS:</strong></td>
            <td style="padding:6px 0;border-top:1.5px solid #1a1a1a;"><strong>UGX:</strong> <span style="display:inline-block;border-bottom:2px solid #1a1a1a;min-width:140px;padding:0 4px;font-family:'Courier New',monospace;color:#0a3d8f;font-weight:bold;font-size:12px;">${(record as any).totalAmount ? Number((record as any).totalAmount).toLocaleString() : '—'}</span></td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Paid Bank:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:160px;">&nbsp;</span></td>
            <td colspan="2" style="padding:4px 0;"><strong>Cheque No:</strong> <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:160px;">&nbsp;</span></td>
          </tr>
        </table>

        <!-- Electronic stamp -->
        <div style="position:relative;margin:14px 0;text-align:center;">
          <div style="display:inline-block;border:2.5px solid #0a6b2a;color:#0a6b2a;padding:6px 18px;border-radius:60px;transform:rotate(-6deg);font-weight:bold;font-family:Arial,sans-serif;letter-spacing:1.5px;">
            <div style="font-size:10px;">★ GREAT AGRO COFFEE LTD ★</div>
            <div style="font-size:9px;margin:2px 0;">A Member of YEDA Coffee Company Limited</div>
            <div style="font-size:13px;margin:2px 0;">${issueDate.toUpperCase()}</div>
            <div style="font-size:9px;">QUALITY DEPARTMENT</div>
          </div>
        </div>

        <!-- NB clause -->
        <p style="font-size:9.5px;text-align:center;margin:10px 16px;line-height:1.4;color:#333;">
          <strong>NB:</strong> To suppliers — please check that you agree to the above calculations and deductions before you sign to receive your
          Payment / GRN. There will be no refunds or re-calculations once you have signed. Paid Price equals Daily Price / Contract Price
          divided by the Quality Factor.
        </p>

        <!-- Signatures -->
        <div style="margin:14px 0 4px;">
          <strong>Signed in full acceptance — Supplier:</strong>
          <span style="display:inline-block;border-bottom:1px solid #1a1a1a;min-width:380px;">&nbsp;</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
          <tr>
            <td style="border:1px solid #1a1a1a;padding:8px;width:33%;font-size:10.5px;">
              <strong>Signed QM/QC:</strong><br/>
              <span style="display:inline-block;margin-top:14px;border-bottom:1px solid #1a1a1a;width:90%;font-family:'Courier New',monospace;color:#0a3d8f;">${(record as any).qualityApprovedBy || ''}</span>
            </td>
            <td style="border:1px solid #1a1a1a;padding:8px;width:34%;font-size:10.5px;">
              <strong>Signed PM/UM:</strong><br/>
              <span style="display:inline-block;margin-top:14px;border-bottom:1px solid #1a1a1a;width:90%;font-family:'Courier New',monospace;color:#0a3d8f;">${employee?.name || employee?.email || ''}</span>
            </td>
            <td style="border:1px solid #1a1a1a;padding:8px;width:33%;font-size:10.5px;">
              <strong>Signed AM:</strong><br/>
              <span style="display:inline-block;margin-top:14px;border-bottom:1px solid #1a1a1a;width:90%;">&nbsp;</span>
            </td>
          </tr>
        </table>

        <!-- Footer + verification -->
        <table style="width:100%;border-collapse:collapse;margin-top:12px;border-top:1.5px solid #1a1a1a;">
          <tr>
            <td style="padding:8px;font-size:9px;color:#444;line-height:1.5;vertical-align:top;width:65%;">
              <strong style="color:#1a1a1a;">GREAT AGRO COFFEE LIMITED</strong><br/>
              A Member of YEDA Coffee Company Limited<br/>
              P.O Box 431420, Kasese, Uganda<br/>
              Tel: +256 393 001 626 &nbsp;|&nbsp; Email: info@greatpearlcoffee.com &nbsp;|&nbsp; Web: www.greatagrocoffee.com
              ${verificationCode ? `<br/><span style="color:#0a6b2a;font-weight:bold;font-family:'Courier New',monospace;margin-top:4px;display:inline-block;">Verify code: ${verificationCode}</span>` : ''}
            </td>
            ${verificationCode ? `
            <td style="padding:8px;text-align:right;width:35%;vertical-align:top;">
              <img src="${qrCodeUrl}" alt="Verify" style="width:78px;height:78px;border:1px solid #ccc;padding:3px;background:#fff;"/>
              <div style="font-size:8px;color:#666;margin-top:2px;">Scan to verify authenticity</div>
            </td>` : ''}
          </tr>
        </table>

        <div style="text-align:center;margin-top:6px;font-size:8.5px;color:#888;font-style:italic;">
          Electronic GRN — system-generated by Great Agro Coffee Traceability System. No physical signature required for system records.
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
