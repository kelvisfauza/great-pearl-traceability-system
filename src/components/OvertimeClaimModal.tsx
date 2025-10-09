import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOvertimeAwards, OvertimeAward } from '@/hooks/useOvertimeAwards';
import { Copy, Check, FileText, Printer } from 'lucide-react';

interface OvertimeClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  award: OvertimeAward | null;
}

export const OvertimeClaimModal = ({ open, onOpenChange, award }: OvertimeClaimModalProps) => {
  const [claiming, setClaiming] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { claimOvertime } = useOvertimeAwards();

  console.log('📋 OvertimeClaimModal - open:', open);
  console.log('📋 OvertimeClaimModal - award:', award);

  const handleClaim = async () => {
    console.log('📋 Submit Claim clicked!');
    console.log('📋 Award to claim:', award);
    if (!award) {
      console.error('❌ No award to claim!');
      return;
    }

    console.log('📋 Claiming overtime for award ID:', award.id);
    setClaiming(true);
    const refNumber = await claimOvertime(award.id);
    setClaiming(false);

    console.log('📋 Claim result - Reference number:', refNumber);
    if (refNumber) {
      setReferenceNumber(refNumber);
    }
  };

  const handleCopyReference = () => {
    if (referenceNumber) {
      navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (!referenceNumber || !award) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Overtime Claim Reference</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              color: #333;
            }
            .content {
              margin: 30px 0;
            }
            .row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
            }
            .label {
              font-weight: bold;
              color: #666;
            }
            .value {
              color: #333;
            }
            .reference {
              background: #f5f5f5;
              padding: 20px;
              margin: 30px 0;
              text-align: center;
              border-radius: 8px;
              border: 2px dashed #999;
            }
            .reference-number {
              font-size: 24px;
              font-weight: bold;
              font-family: 'Courier New', monospace;
              color: #000;
              letter-spacing: 2px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Overtime Claim Receipt</h1>
          </div>
          
          <div class="content">
            <div class="row">
              <span class="label">Employee Name:</span>
              <span class="value">${award.employee_name}</span>
            </div>
            <div class="row">
              <span class="label">Department:</span>
              <span class="value">${award.department}</span>
            </div>
            <div class="row">
              <span class="label">Overtime Hours:</span>
              <span class="value">${award.hours}h ${award.minutes}m</span>
            </div>
            <div class="row">
              <span class="label">Amount:</span>
              <span class="value">${award.total_amount.toLocaleString()} UGX</span>
            </div>
          </div>

          <div class="reference">
            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">REFERENCE NUMBER</p>
            <div class="reference-number">${referenceNumber}</div>
          </div>

          <div class="footer">
            <p>Please save this reference number for tracking your overtime claim.</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleClose = () => {
    setReferenceNumber(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (!award) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Claim Overtime Payment
          </DialogTitle>
        </DialogHeader>

        {!referenceNumber ? (
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Employee:</span>
                <span className="font-semibold">{award.employee_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Department:</span>
                <span className="font-semibold">{award.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Overtime:</span>
                <span className="font-semibold">
                  {award.hours}h {award.minutes}m
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  {award.total_amount.toLocaleString()} UGX
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              By claiming, you will receive a reference number that can be used to track your claim with the admin.
            </p>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleClaim} disabled={claiming} className="flex-1">
                {claiming ? 'Processing...' : 'Submit Claim'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Claim Submitted Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Your overtime claim has been submitted. Please save the reference number below.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reference Number</Label>
              <div className="flex gap-2">
                <Input
                  value={referenceNumber}
                  readOnly
                  className="font-mono text-center font-semibold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReference}
                  className="shrink-0"
                  title="Copy reference number"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrint}
                  className="shrink-0"
                  title="Print reference"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this reference number to check the status of your claim with the admin.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
