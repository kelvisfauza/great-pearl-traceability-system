import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useAuth } from '@/contexts/AuthContext';
import { Smartphone, AlertTriangle, Printer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAmount: number;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  open,
  onOpenChange,
  availableAmount,
}) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [channel, setChannel] = useState('ZENGAPAY');
  const [loading, setLoading] = useState(false);
  const { createWithdrawalRequest, refreshAccount } = useUserAccount();
  const { user, employee } = useAuth();
  const { toast } = useToast();

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + numberToWords(num % 100) : '');
    if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    return numberToWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
  };

  const printVoucher = (ref: string, amt: number, phone: string, ch: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const empName = employee?.name || user?.email || 'Employee';
    const amtWords = numberToWords(Math.round(amt)) + ' Shillings Only';
    const now = new Date();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Withdrawal Voucher - ${ref}</title>
<style>
  body{font:13px/1.5 'Segoe UI',system-ui,sans-serif;margin:0;padding:20px;color:#000}
  .voucher{max-width:700px;margin:0 auto;border:2px solid #000;padding:0}
  .header{text-align:center;padding:16px;border-bottom:2px solid #000;background:#f8f8f8}
  .header h1{margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px}
  .header h2{margin:4px 0 0;font-size:13px;font-weight:normal}
  .header .sub{font-size:11px;color:#555;margin-top:2px}
  .title{text-align:center;padding:10px;background:#000;color:#fff;font-weight:bold;font-size:14px;letter-spacing:2px}
  .body{padding:20px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #ccc}
  .row:last-child{border:none}
  .label{color:#555;font-size:12px}
  .value{font-weight:600}
  .amount-box{border:2px solid #000;padding:12px;margin:16px 0;text-align:center;background:#fafafa}
  .amount-box .big{font-size:22px;font-weight:bold}
  .amount-box .words{font-size:11px;font-style:italic;margin-top:4px;color:#333}
  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px;padding-top:10px}
  .sig-block{text-align:center}
  .sig-line{border-top:1px solid #000;margin-top:40px;padding-top:4px;font-size:11px}
  .footer{text-align:center;padding:10px;border-top:2px solid #000;font-size:10px;color:#666}
  .stamp{border:2px dashed #999;padding:8px;text-align:center;font-size:10px;color:#999;margin-top:16px}
  @media print{body{padding:0}.voucher{border:2px solid #000}}
</style></head><body onload="window.print();">
<div class="voucher">
  <div class="header">
    <h1>Great Pearl Coffee Factory Ltd.</h1>
    <h2>Employee Withdrawal Payment Voucher</h2>
    <div class="sub">P.O. Box XXXXX, Kampala, Uganda</div>
  </div>
  <div class="title">PAYMENT VOUCHER</div>
  <div class="body">
    <div class="row"><span class="label">Voucher Reference:</span><span class="value">${ref}</span></div>
    <div class="row"><span class="label">Date:</span><span class="value">${now.toLocaleDateString('en-UG', {day:'2-digit',month:'long',year:'numeric'})}</span></div>
    <div class="row"><span class="label">Employee Name:</span><span class="value">${empName}</span></div>
    <div class="row"><span class="label">Employee Email:</span><span class="value">${user?.email || ''}</span></div>
    <div class="row"><span class="label">Payment Channel:</span><span class="value">${ch === 'ZENGAPAY' ? 'Mobile Money' : 'Cash Payment'}</span></div>
    ${ch === 'ZENGAPAY' ? `<div class="row"><span class="label">Phone Number:</span><span class="value">${phone}</span></div>` : ''}
    <div class="row"><span class="label">Source:</span><span class="value">Loyalty Rewards Balance</span></div>
    <div class="amount-box">
      <div class="big">UGX ${amt.toLocaleString()}</div>
      <div class="words">${amtWords}</div>
    </div>
    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">Employee Signature</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">Authorized By (Admin/Finance)</div>
      </div>
    </div>
    <div class="stamp">OFFICE STAMP / SEAL</div>
  </div>
  <div class="footer">This voucher must be presented to the Finance Department for payment processing. Valid for 7 days from date of issue.</div>
</div>
</body></html>`);
    w.document.close();
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || (channel === 'ZENGAPAY' && !phoneNumber)) return;

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > availableAmount) {
      return;
    }

    setLoading(true);
    try {
      const ref = `WR-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
      await createWithdrawalRequest(withdrawalAmount, phoneNumber, channel);
      
      // Print voucher after successful submission
      printVoucher(ref, withdrawalAmount, phoneNumber, channel);
      
      // Reset form
      setAmount('');
      setPhoneNumber('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAmountValid = amount && parseFloat(amount) <= availableAmount && parseFloat(amount) >= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Request Withdrawal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Available to Request: <strong>{formatCurrency(availableAmount)}</strong>
              <br />
              <span className="text-xs text-muted-foreground">
                This prevents double-spending while you have pending withdrawals.
              </span>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Payment Channel</Label>
              <select
                id="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="ZENGAPAY">Mobile Money (ZengaPay)</option>
                <option value="CASH">Cash Payment</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (UGX)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter withdrawal amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1000"
                max={availableAmount}
                step="1000"
              />
              {amount && parseFloat(amount) > availableAmount && (
                <p className="text-sm text-red-600">
                  Amount exceeds available to request
                </p>
              )}
            </div>

            {channel === 'ZENGAPAY' && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Mobile Money Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter phone number (e.g., 256700123456)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  pattern="256[0-9]{9}"
                  title="Please enter a valid Ugandan phone number starting with 256"
                />
                <p className="text-xs text-muted-foreground">
                  Enter phone number with country code (256)
                </p>
              </div>
            )}

            {channel === 'CASH' && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Cash Payment:</strong> You will collect cash directly from Finance department after approval.
                </p>
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your request will create a Request Slip that you must print and present to Finance. 
                No funds are deducted until Finance approves your request.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !isAmountValid || (channel === 'ZENGAPAY' && !phoneNumber)}
              >
                {loading ? 'Creating Request...' : 'Create Withdrawal Request'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};