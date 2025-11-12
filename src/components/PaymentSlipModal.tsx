import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface PaymentSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    amount: number;
    requested_by: string;
    request_type: string;
    reason: string;
    payment_slip_number: string | null;
    paymentMethod?: string;
    finance_approved_by: string | null;
    finance_approved_at: string | null;
    admin_approved_by: string | null;
    admin_approved_at: string | null;
  } | null;
}

const PaymentSlipModal: React.FC<PaymentSlipModalProps> = ({ open, onOpenChange, request }) => {
  if (!request || !request.payment_slip_number) return null;

  const handlePrint = () => {
    const slipContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #333;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">PAYMENT SLIP</h1>
          <p style="margin: 5px 0; color: #666;">Company Finance Department</p>
          <hr style="border: 1px solid #333; margin: 20px 0;">
        </div>
        
        <div style="background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Payment Details</h3>
          <p style="margin: 5px 0;"><strong>Slip Number:</strong> ${request.payment_slip_number}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Recipient Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${request.requested_by}</p>
          <p style="margin: 5px 0;"><strong>Request Type:</strong> ${request.request_type}</p>
          <p style="margin: 5px 0;"><strong>Reason:</strong> ${request.reason}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Payment Information</h3>
          <p style="margin: 5px 0;"><strong>Amount:</strong> UGX ${request.amount.toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${request.paymentMethod || 'Bank Transfer'}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Approved & Processed</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #333;">Approval Chain</h3>
          <p style="margin: 5px 0;"><strong>Finance Approved By:</strong> ${request.finance_approved_by}</p>
          <p style="margin: 5px 0;"><strong>Finance Approval Date:</strong> ${new Date(request.finance_approved_at!).toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Final Approved By:</strong> ${request.admin_approved_by}</p>
          <p style="margin: 5px 0;"><strong>Final Approval Date:</strong> ${new Date(request.admin_approved_at!).toLocaleString()}</p>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #333;">
          <p style="margin: 0; color: #666; font-size: 12px;">This is an official payment slip. Please retain for your records.</p>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 10px;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Payment Slip - ${request.payment_slip_number}</title>
            <style>
              @media print {
                body { margin: 0; }
                @page { margin: 1cm; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${slipContent}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Payment Slip - {request.payment_slip_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">PAYMENT SLIP</h2>
            <p className="text-gray-600">Company Finance Department</p>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Slip Number:</span>
                <p className="font-mono">{request.payment_slip_number}</p>
              </div>
              <div>
                <span className="font-medium">Date:</span>
                <p>{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Recipient Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {request.requested_by}</div>
              <div><span className="font-medium">Request Type:</span> {request.request_type}</div>
              <div><span className="font-medium">Reason:</span> {request.reason}</div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Payment Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Amount:</span> <span className="font-bold text-green-600">UGX {request.amount.toLocaleString()}</span></div>
              <div><span className="font-medium">Payment Method:</span> {request.paymentMethod || 'Bank Transfer'}</div>
              <div><span className="font-medium">Status:</span> <span className="text-green-600">Approved & Processed</span></div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold text-gray-900 mb-3">Approval Chain</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Finance Approved By:</span> {request.finance_approved_by}</div>
              <div><span className="font-medium">Finance Approval Date:</span> {new Date(request.finance_approved_at!).toLocaleString()}</div>
              <div><span className="font-medium">Final Approved By:</span> {request.admin_approved_by}</div>
              <div><span className="font-medium">Final Approval Date:</span> {new Date(request.admin_approved_at!).toLocaleString()}</div>
            </div>
          </div>
          
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            This is an official payment slip. Please retain for your records.
          </div>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Payment Slip
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSlipModal;