import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useAttendance } from '@/hooks/useAttendance';
import { useMonthlySalaryTracking } from '@/hooks/useMonthlySalaryTracking';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Calendar, AlertCircle, Phone, Banknote, Smartphone, Wallet } from 'lucide-react';

interface MoneyRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoneyRequestModal: React.FC<MoneyRequestModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [requestType, setRequestType] = useState('advance');
  const [paymentChannel, setPaymentChannel] = useState('CASH');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [weeklyAllowance, setWeeklyAllowance] = useState<any>(null);
  const { createMoneyRequest } = useUserAccount();
  const { getCurrentWeekAllowance, deductFromAllowance } = useAttendance();
  const { user, employee } = useAuth();
  const { toast } = useToast();

  // Get salary tracking info for advance requests
  const { periodInfo, loading: salaryLoading } = useMonthlySalaryTracking(
    employee?.email,
    employee?.salary || 0,
    requestType === 'advance' ? 'advance' : 'mid-month'
  );

  useEffect(() => {
    const fetchAllowance = async () => {
      if (open && user?.id) {
        const allowance = await getCurrentWeekAllowance(user.id);
        setWeeklyAllowance(allowance);
        
        // Pre-fill phone number from employee profile if available
        if (employee?.phone) {
          setPhoneNumber(employee.phone);
        }
      }
    };
    fetchAllowance();
  }, [open, user, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !reason) return;
    
    // Validate phone number for mobile money
    if (paymentChannel === 'MOBILE_MONEY' && !phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number for mobile money payment",
        variant: "destructive"
      });
      return;
    }

    const requestAmount = parseFloat(amount);

    setLoading(true);
    try {
      // For lunch/refreshment requests, check and deduct from weekly allowance
      if (requestType === 'lunch_refreshment' && user?.id) {
        if (!weeklyAllowance) {
          throw new Error('Unable to load weekly allowance. Please try again.');
        }

        if (weeklyAllowance.balance_available < requestAmount) {
          throw new Error(`Insufficient balance. You have ${weeklyAllowance.balance_available.toLocaleString()} UGX available this week (limit: 15,000 UGX).`);
        }

        // Deduct from allowance
        await deductFromAllowance(user.id, requestAmount);
      }

      // Create money request with phone number and payment channel
      const { error } = await supabase
        .from('money_requests')
        .insert([{
          user_id: user?.id,
          amount: requestAmount,
          reason,
          request_type: requestType,
          requested_by: user?.email || 'Unknown',
          approval_stage: 'pending_admin',
          status: 'pending',
          admin_approved: false,
          finance_approved: false,
          phone_number: paymentChannel === 'MOBILE_MONEY' ? phoneNumber : null,
          payment_channel: paymentChannel
        }]);

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: `Your ${requestType === 'lunch_refreshment' ? 'lunch allowance' : 'money'} request has been submitted for admin approval. Payment will be via ${paymentChannel === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cash'}.`,
      });
      
      // Reset form
      setAmount('');
      setReason('');
      setRequestType('advance');
      setPaymentChannel('CASH');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to submit request',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Request Money
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {requestType === 'lunch_refreshment' && (
            <>
              {weeklyAllowance ? (
                <Alert className="border-green-200 bg-green-50">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-semibold text-green-900">Weekly Lunch Allowance (Mon-Sat)</div>
                      <div className="text-sm text-green-800 space-y-1">
                        <div>💰 Weekly Limit: <strong>15,000 UGX</strong></div>
                        <div>✅ Available to Request: <strong className="text-green-700 text-base">{weeklyAllowance.balance_available?.toLocaleString()} UGX</strong></div>
                        <div className="text-xs text-green-600 pt-1">Already requested this week: {weeklyAllowance.amount_requested?.toLocaleString()} UGX</div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">Weekly Allowance Not Available</div>
                      <div className="text-sm">Unable to load your weekly lunch allowance. Please try again or contact admin.</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Salary Balance for Advance Requests */}
          {requestType === 'advance' && (
            <>
              {salaryLoading ? (
                <Alert className="border-blue-200 bg-blue-50">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <div className="text-sm text-blue-800">Loading salary balance...</div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className={periodInfo.canRequest ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                  <Wallet className={`h-4 w-4 ${periodInfo.canRequest ? "text-green-600" : "text-amber-600"}`} />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className={`font-semibold ${periodInfo.canRequest ? "text-green-900" : "text-amber-900"}`}>
                        Salary Advance Balance
                      </div>
                      <div className={`text-sm ${periodInfo.canRequest ? "text-green-800" : "text-amber-800"} space-y-1`}>
                        <div>💰 Monthly Salary: <strong>UGX {(employee?.salary || 0).toLocaleString()}</strong></div>
                        <div>✅ Available to Request: <strong className="text-base">UGX {periodInfo.availableAmount.toLocaleString()}</strong></div>
                        {periodInfo.message && (
                          <div className="text-xs pt-1">{periodInfo.message}</div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="requestType">Request Type</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select request type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lunch_refreshment">
                  🍽️ Weekly Lunch Allowance (15,000 UGX/week)
                </SelectItem>
                <SelectItem value="advance">💰 Salary Advance (From monthly salary)</SelectItem>
                <SelectItem value="bonus">🎁 Bonus Request</SelectItem>
                <SelectItem value="expense">📋 Expense Reimbursement</SelectItem>
                <SelectItem value="emergency">🚨 Emergency Fund</SelectItem>
              </SelectContent>
            </Select>
            
            {requestType === 'lunch_refreshment' && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  <div className="space-y-1">
                    <div className="font-semibold">Weekly Lunch Allowance Policy:</div>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li>Fixed allowance: <strong>15,000 UGX per week</strong></li>
                      <li>Coverage: <strong>Monday to Saturday</strong> (Sunday excluded)</li>
                      <li>Auto-refreshes every <strong>Monday</strong></li>
                      <li>Request full amount or in portions throughout the week</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (UGX)
              {requestType === 'lunch_refreshment' && weeklyAllowance && (
                <span className="text-xs text-muted-foreground ml-2">
                  Max: {weeklyAllowance.balance_available?.toLocaleString()} UGX
                </span>
              )}
              {requestType === 'advance' && periodInfo.canRequest && (
                <span className="text-xs text-muted-foreground ml-2">
                  Max: {periodInfo.availableAmount.toLocaleString()} UGX
                </span>
              )}
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1000"
              step="1000"
              max={
                requestType === 'lunch_refreshment' && weeklyAllowance 
                  ? weeklyAllowance.balance_available 
                  : requestType === 'advance' && periodInfo.canRequest 
                    ? periodInfo.availableAmount 
                    : undefined
              }
            />
            {requestType === 'lunch_refreshment' && weeklyAllowance && parseFloat(amount) > weeklyAllowance.balance_available && (
              <p className="text-xs text-destructive">Amount exceeds your available weekly meal allowance</p>
            )}
            {requestType === 'advance' && periodInfo.canRequest && parseFloat(amount) > periodInfo.availableAmount && (
              <p className="text-xs text-destructive">Amount exceeds your available salary balance</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you need this money..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
            />
          </div>

          {/* Payment Method Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              How do you want to receive payment?
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="paymentChannel">Payment Method</Label>
                <Select value={paymentChannel} onValueChange={setPaymentChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Cash - Collect from Finance
                      </div>
                    </SelectItem>
                    <SelectItem value="MOBILE_MONEY">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Mobile Money
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentChannel === 'MOBILE_MONEY' && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Mobile Money Number
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Enter phone number (e.g., 256700123456)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required={paymentChannel === 'MOBILE_MONEY'}
                    pattern="256[0-9]{9}"
                    title="Please enter a valid Ugandan phone number starting with 256"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter phone number with country code (256). Money will be sent to this number after approval.
                  </p>
                </div>
              )}

              {paymentChannel === 'CASH' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Banknote className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Cash Payment:</strong> After approval, visit Finance department to collect your cash. Bring your ID.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={
                loading || 
                !amount || 
                !reason || 
                (paymentChannel === 'MOBILE_MONEY' && !phoneNumber) ||
                (requestType === 'lunch_refreshment' && (!weeklyAllowance || parseFloat(amount) > weeklyAllowance.balance_available)) ||
                (requestType === 'advance' && (!periodInfo.canRequest || parseFloat(amount) > periodInfo.availableAmount))
              }
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
