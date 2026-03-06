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
import { Smartphone, AlertTriangle, Printer, ShieldCheck, Loader2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWithdrawalControl } from '@/hooks/useWithdrawalControl';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAmount: number;
}

type Step = 'amount' | 'verify' | 'done';

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  open,
  onOpenChange,
  availableAmount,
}) => {
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK'>('CASH');
  const [mobileNumber, setMobileNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('amount');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [completedRef, setCompletedRef] = useState('');
  const [completedAmount, setCompletedAmount] = useState(0);
  const { createWithdrawalRequest, refreshAccount } = useUserAccount();
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const { isWithdrawalDisabled } = useWithdrawalControl();
  const withdrawalStatus = isWithdrawalDisabled();
  const isWalletFrozen = !!(employee as any)?.wallet_frozen;

  // ... keep existing code (numberToWords, printVoucher, formatCurrency, generateAndSendCode, handleAmountSubmit functions)

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

  const printVoucher = (ref: string, amt: number) => {
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
  .verified-badge{text-align:center;margin:10px 0;padding:6px;background:#e8f5e9;border:1px solid #4caf50;border-radius:4px;font-size:11px;color:#2e7d32}
  @media print{body{padding:0}.voucher{border:2px solid #000}}
</style></head><body onload="window.print();">
<div class="voucher">
  <div class="header">
    <h1>Great Pearl Coffee Factory Ltd.</h1>
    <h2>Employee Withdrawal Payment Voucher</h2>
    <div class="sub">P.O. Box XXXXX, Kampala, Uganda | Tel: +256-XXX-XXXXXX</div>
  </div>
  <div class="title">PAYMENT VOUCHER</div>
  <div class="body">
    <div class="verified-badge">✅ SMS Verified — This withdrawal was authenticated via SMS verification code</div>
    <div class="row"><span class="label">Voucher Reference:</span><span class="value">${ref}</span></div>
    <div class="row"><span class="label">Date:</span><span class="value">${now.toLocaleDateString('en-UG', {day:'2-digit',month:'long',year:'numeric'})}</span></div>
    <div class="row"><span class="label">Time:</span><span class="value">${now.toLocaleTimeString('en-UG', {hour:'2-digit',minute:'2-digit'})}</span></div>
    <div class="row"><span class="label">Employee Name:</span><span class="value">${empName}</span></div>
    <div class="row"><span class="label">Employee Email:</span><span class="value">${user?.email || ''}</span></div>
    <div class="row"><span class="label">Payment Channel:</span><span class="value">Cash Payment</span></div>
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
  <div class="footer">This voucher must be presented to the Finance Department for payment processing. Valid for 7 days from date of issue.<br/>Generated: ${now.toISOString()}</div>
</div>
</body></html>`);
    w.document.close();
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const generateAndSendCode = async () => {
    if (!employee?.phone) {
      toast({
        title: "No Phone Number",
        description: "Your employee profile does not have a phone number. Please contact HR.",
        variant: "destructive",
      });
      return;
    }

    setSendingCode(true);
    try {
      const code = String(Math.floor(10000 + Math.random() * 90000));
      setSentCode(code);

      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: employee.phone,
          message: `Your Great Pearl withdrawal verification code is: ${code}. Do NOT share this code. It expires in 5 minutes.`,
          userName: employee.name,
          messageType: 'withdrawal_verification'
        }
      });

      if (error) throw error;

      toast({
        title: "Verification Code Sent",
        description: `A 5-digit code has been sent to your phone (${employee.phone?.slice(-4) ? '****' + employee.phone.slice(-4) : ''}).`,
      });

      setStep('verify');
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast({
        title: "Failed to Send Code",
        description: "Could not send the verification SMS. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const withdrawalAmount = parseFloat(amount);
    if (withdrawalAmount > availableAmount || withdrawalAmount < 2000) return;

    // For cash, enforce round amounts (multiples of 500)
    if (channel === 'CASH' && withdrawalAmount % 500 !== 0) {
      toast({
        title: "Invalid Cash Amount",
        description: "Cash withdrawals must be in round figures (multiples of 500). E.g. 2000, 2500, 5000.",
        variant: "destructive",
      });
      return;
    }

    await generateAndSendCode();
  };

  const handleVerifyAndWithdraw = async () => {
    if (verificationCode !== sentCode) {
      toast({
        title: "Invalid Code",
        description: "The verification code you entered is incorrect. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const withdrawalAmount = parseFloat(amount);
      const ref = `WR-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
      
      // Create withdrawal request with pending_approval status
      const { error: insertError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user?.id || '',
          amount: withdrawalAmount,
          phone_number: channel === 'MOBILE_MONEY' ? mobileNumber : (employee?.phone || ''),
          channel: channel,
          status: 'pending_finance',
          request_ref: ref,
          requester_name: employee?.name || user?.email || '',
          requester_email: user?.email || employee?.email || '',
          requires_three_approvals: withdrawalAmount > 100000,
          disbursement_method: channel,
          disbursement_phone: channel === 'MOBILE_MONEY' ? mobileNumber : null,
          disbursement_bank_name: channel === 'BANK' ? bankName : null,
          disbursement_account_number: channel === 'BANK' ? accountNumber : null,
          disbursement_account_name: channel === 'BANK' ? accountName : null,
        });

      if (insertError) throw insertError;
      
      setCompletedRef(ref);
      setCompletedAmount(withdrawalAmount);
      setStep('done');

      toast({
        title: "Withdrawal Request Submitted!",
        description: `Reference: ${ref}. Your request for UGX ${withdrawalAmount.toLocaleString()} has been submitted for admin approval.`,
        duration: 8000,
      });
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setChannel('CASH');
    setMobileNumber('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setVerificationCode('');
    setSentCode('');
    setCompletedRef('');
    setCompletedAmount(0);
    onOpenChange(false);
    refreshAccount();
  };

  const parsedAmount = amount ? parseFloat(amount) : 0;
  const isCashRoundAmount = channel !== 'CASH' || parsedAmount % 500 === 0;
  const cleanMobile = mobileNumber.replace(/\s/g, '');
  const isAirtelNumber = /^(070|075|074)\d{7}$/.test(cleanMobile) || /^(256(?:70|75|74))\d{7}$/.test(cleanMobile.replace(/\+/g, ''));
  const isDisbursementValid = channel === 'CASH' || (channel === 'MOBILE_MONEY' && isAirtelNumber) || (channel === 'BANK' && bankName && accountNumber && accountName);
  const isAmountValid = amount && parsedAmount <= availableAmount && parsedAmount >= 2000 && isCashRoundAmount && !withdrawalStatus.disabled && !isWalletFrozen && isDisbursementValid;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'verify' ? <ShieldCheck className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            {step === 'amount' && 'Request Withdrawal'}
            {step === 'verify' && 'Verify Withdrawal'}
            {step === 'done' && 'Request Submitted'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Enter Amount */}
          {step === 'amount' && (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Available to Request: <strong>{formatCurrency(availableAmount)}</strong>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Withdrawals require admin & finance approval before disbursement.
                  </span>
                </AlertDescription>
              </Alert>

              {parseFloat(amount) > 100000 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>High-value withdrawal:</strong> Amounts above UGX 100,000 require 3 admin approvals + finance approval.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleAmountSubmit} className="space-y-4">
                {isWalletFrozen && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Your wallet has been frozen by an administrator.</strong>
                      <div className="text-xs mt-1">
                        Reason: {(employee as any)?.wallet_frozen_reason || 'No reason provided'}
                      </div>
                      <div className="text-xs">Deposits and rewards still apply. Contact HR for assistance.</div>
                    </AlertDescription>
                  </Alert>
                )}
                {withdrawalStatus.disabled && !isWalletFrozen && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Withdrawals are currently disabled.</strong>
                      {withdrawalStatus.reason && <> {withdrawalStatus.reason}</>}
                      {withdrawalStatus.until && (
                        <div className="text-xs mt-1">Available after: {new Date(withdrawalStatus.until).toLocaleString()}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Disbursement Method</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CASH', 'MOBILE_MONEY', 'BANK'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setChannel(method)}
                        className={`p-2 text-xs rounded-lg border text-center transition-colors ${
                          channel === method
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {method === 'CASH' ? '💵 Cash' : method === 'MOBILE_MONEY' ? '📱 Mobile Money' : '🏦 Bank'}
                      </button>
                    ))}
                  </div>
                </div>

                {channel === 'MOBILE_MONEY' && (
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Airtel Mobile Money Number</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="e.g. 0752724165"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      required
                    />
                    <Alert className="py-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        <strong>Airtel numbers only</strong> (starting with 070, 074, or 075). MTN is not yet supported.
                      </AlertDescription>
                    </Alert>
                    {mobileNumber && !isAirtelNumber && (
                      <p className="text-sm text-destructive">Please enter a valid Airtel number (070, 074, or 075)</p>
                    )}
                    <p className="text-xs text-muted-foreground">Money will be sent automatically to this number after full approval.</p>
                  </div>
                )}

                {channel === 'BANK' && (
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" placeholder="e.g. Stanbic Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input id="accountName" placeholder="Full name on account" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input id="accountNumber" placeholder="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (UGX)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter withdrawal amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="2000"
                    max={availableAmount}
                    step={channel === 'CASH' ? '500' : '1'}
                  />
                  {amount && parsedAmount < 2000 && (
                    <p className="text-sm text-destructive">Minimum withdrawal is UGX 2,000</p>
                  )}
                  {amount && parsedAmount > availableAmount && (
                    <p className="text-sm text-destructive">Amount exceeds available balance</p>
                  )}
                  {amount && channel === 'CASH' && parsedAmount >= 2000 && parsedAmount % 500 !== 0 && (
                    <p className="text-sm text-destructive">Cash must be in round figures (multiples of 500)</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={sendingCode}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendingCode || !isAmountValid}>
                    {sendingCode ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending Code...</>
                    ) : (
                      'Send Verification Code'
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Enter Verification Code */}
          {step === 'verify' && (
            <div className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  A 5-digit verification code has been sent to your phone
                  {employee?.phone ? ` (****${employee.phone.slice(-4)})` : ''}.
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Amount: <strong>{formatCurrency(parseFloat(amount))}</strong>
                  </span>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center gap-4">
                <Label>Enter 5-digit verification code</Label>
                <InputOTP
                  maxLength={5}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateAndSendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? 'Resending...' : 'Resend Code'}
                </Button>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setStep('amount'); setVerificationCode(''); }}>
                  Back
                </Button>
                <Button
                  onClick={handleVerifyAndWithdraw}
                  disabled={loading || verificationCode.length !== 5}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    'Submit for Approval'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Submitted for Approval */}
          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <Clock className="h-10 w-10 text-amber-600 mx-auto mb-2" />
                <h3 className="font-bold text-amber-800">Withdrawal Submitted for Approval</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Reference: <strong>{completedRef}</strong>
                </p>
                <p className="text-lg font-bold text-amber-800 mt-2">
                  {formatCurrency(completedAmount)}
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  {completedAmount > 100000 
                    ? '⚡ This requires 3 admin approvals + finance approval'
                    : '⚡ This requires admin approval + finance approval'}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  You will receive an SMS once approved. Money will NOT be deducted until fully approved.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
