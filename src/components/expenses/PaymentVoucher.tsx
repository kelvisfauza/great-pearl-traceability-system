import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';

interface PaymentVoucherProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    type: string;
    title: string;
    description: string;
    amount: number;
    status: string;
    created_at: string;
    finance_approved_at?: string | null;
    admin_approved_at?: string | null;
    requestedby_name?: string;
    department?: string;
  };
  employeeName: string;
  employeeDepartment: string;
}

const PaymentVoucher: React.FC<PaymentVoucherProps> = ({
  isOpen,
  onClose,
  request,
  employeeName,
  employeeDepartment
}) => {
  const voucherRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = voucherRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Voucher - ${request.id.slice(0, 8).toUpperCase()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              background: white;
            }
            .voucher {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #1a5f2a;
              margin-bottom: 5px;
            }
            .company-tagline {
              font-size: 12px;
              color: #666;
              margin-bottom: 10px;
            }
            .voucher-title {
              font-size: 22px;
              font-weight: bold;
              margin-top: 15px;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .voucher-number {
              font-size: 14px;
              color: #666;
              margin-top: 5px;
            }
            .content {
              margin: 25px 0;
            }
            .row {
              display: flex;
              border-bottom: 1px solid #ddd;
              padding: 12px 0;
            }
            .row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              width: 180px;
              color: #444;
            }
            .value {
              flex: 1;
              color: #333;
            }
            .amount-section {
              background: #f5f5f5;
              padding: 20px;
              margin: 25px 0;
              border-radius: 8px;
              text-align: center;
            }
            .amount-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 8px;
            }
            .amount-value {
              font-size: 32px;
              font-weight: bold;
              color: #1a5f2a;
            }
            .amount-words {
              font-size: 12px;
              color: #666;
              margin-top: 8px;
              font-style: italic;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding-top: 20px;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-bottom: 8px;
              padding-top: 10px;
            }
            .signature-title {
              font-size: 12px;
              color: #666;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px dashed #ccc;
              font-size: 11px;
              color: #888;
            }
            .status-badge {
              display: inline-block;
              background: #22c55e;
              color: white;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .instructions {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              padding: 15px;
              margin-top: 20px;
              border-radius: 8px;
              font-size: 12px;
            }
            .instructions-title {
              font-weight: bold;
              color: #92400e;
              margin-bottom: 8px;
            }
            .instructions-list {
              color: #78350f;
              padding-left: 20px;
            }
            @media print {
              body { padding: 0; }
              .voucher { border: 2px solid #333; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      return convert(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    };
    
    return convert(Math.floor(num)) + ' Shillings Only';
  };

  const voucherNumber = `PV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${request.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Voucher</span>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Voucher
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={voucherRef}>
          <div className="voucher">
            <div className="header">
              <div className="company-name">GREAT PEARL COFFEE</div>
              <div className="company-tagline">Premium Coffee Trading & Export</div>
              <div className="voucher-title">Payment Voucher</div>
              <div className="voucher-number">Voucher No: {voucherNumber}</div>
            </div>

            <div className="content">
              <div className="row">
                <div className="label">Payee Name:</div>
                <div className="value">{employeeName}</div>
              </div>
              <div className="row">
                <div className="label">Department:</div>
                <div className="value">{employeeDepartment}</div>
              </div>
              <div className="row">
                <div className="label">Request Type:</div>
                <div className="value">{request.type}</div>
              </div>
              <div className="row">
                <div className="label">Purpose:</div>
                <div className="value">{request.title}</div>
              </div>
              <div className="row">
                <div className="label">Description:</div>
                <div className="value">{request.description}</div>
              </div>
              <div className="row">
                <div className="label">Request Date:</div>
                <div className="value">{formatDate(request.created_at)}</div>
              </div>
              <div className="row">
                <div className="label">Approval Date:</div>
                <div className="value">{formatDate(request.finance_approved_at || request.admin_approved_at || new Date().toISOString())}</div>
              </div>
              <div className="row">
                <div className="label">Status:</div>
                <div className="value">
                  <span className="status-badge">✓ APPROVED</span>
                </div>
              </div>
            </div>

            <div className="amount-section">
              <div className="amount-label">Amount Approved for Payment</div>
              <div className="amount-value">UGX {request.amount.toLocaleString()}</div>
              <div className="amount-words">{numberToWords(request.amount)}</div>
            </div>

            <div className="instructions">
              <div className="instructions-title">📋 Payment Instructions:</div>
              <ul className="instructions-list">
                <li>Present this voucher to the Finance Department</li>
                <li>Carry a valid ID for verification</li>
                <li>Sign the payment register upon receiving payment</li>
                <li>This voucher is valid for 7 days from approval date</li>
              </ul>
            </div>

            <div className="signatures">
              <div className="signature-box">
                <div className="signature-line">________________</div>
                <div className="signature-title">Payee Signature</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">________________</div>
                <div className="signature-title">Finance Officer</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">________________</div>
                <div className="signature-title">Authorized By</div>
              </div>
            </div>

            <div className="footer">
              <p>Generated on: {new Date().toLocaleString('en-UG')}</p>
              <p>Great Pearl Coffee | www.greatpearlcoffeesystem.site | +256 778 536 681</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentVoucher;
