import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Wallet, DollarSign, TrendingUp, Plus, Smartphone, Printer, Send,
  Clock, CheckCircle, XCircle, AlertCircle, Star, Zap, Award, Gift, FileText,
  Landmark
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useLoyaltyStats } from '@/hooks/useLoyaltyStats';
import { useBonusBalance } from '@/hooks/useBonusBalance';
import { useWithdrawalControl } from '@/hooks/useWithdrawalControl';
import { MoneyRequestModal } from './MoneyRequestModal';
import { WithdrawalModal } from './WithdrawalModal';
import { DepositModal } from './DepositModal';
import { TransactionStatement } from './TransactionStatement';
import { format } from 'date-fns';

const ACTIVITY_LABELS: Record<string, string> = {
  data_entry: 'Data Entry',
  form_submission: 'Form Submit',
  report_generation: 'Reports',
  task_completion: 'Tasks',
  document_upload: 'Uploads',
  transaction: 'Transactions',
};

export const AccountButton = () => {
  const { account, moneyRequests, withdrawalRequests, loading } = useUserAccount();
  const { stats, loading: statsLoading } = useLoyaltyStats();
  const { bonusData } = useBonusBalance();
  const { isWithdrawalDisabled } = useWithdrawalControl();
  const { user, employee } = useAuth();
  const [showMoneyRequest, setShowMoneyRequest] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [activeLoanTotal, setActiveLoanTotal] = useState(0);
  const [activeLoanCount, setActiveLoanCount] = useState(0);
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState({
    lastMonthLoyalty: 0,
    lastMonthBonuses: 0,
    lastMonthDeposits: 0,
    lastMonthWithdrawals: 0,
    lastMonthAdjustments: 0,
    thisMonthLoyalty: 0,
    thisMonthBonuses: 0,
    thisMonthDeposits: 0,
    thisMonthWithdrawals: 0,
    thisMonthAdjustments: 0,
    balanceBroughtForward: 0,
    thisMonthNet: 0,
  });

  const withdrawalStatus = isWithdrawalDisabled();

  // Fetch detailed breakdown from ledger
  const fetchLedgerTotals = async () => {
    const lookupEmail = employee?.email || user?.email || null;
    const fallbackUserId = user?.id || null;

    if (!lookupEmail && !fallbackUserId) return;

    let resolvedUserId = fallbackUserId;

    if (lookupEmail) {
      const { data: userIdData, error: userIdError } = await supabase
        .rpc('get_unified_user_id', { input_email: lookupEmail });

      if (userIdError) {
        console.error('Error resolving unified user ID for account breakdown:', userIdError);
      }

      resolvedUserId = userIdData || fallbackUserId;
    }

    if (!resolvedUserId) return;

    setLedgerUserId(resolvedUserId);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: allEntries, error } = await supabase
      .from('ledger_entries')
      .select('amount, entry_type, created_at')
      .eq('user_id', resolvedUserId)
      .in('entry_type', ['LOYALTY_REWARD', 'BONUS', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT']);

    if (error) {
      console.error('Error loading account breakdown ledger entries:', error);
      return;
    }

    const entries = allEntries || [];
    const before = entries.filter(e => new Date(e.created_at) < monthStart);
    const current = entries.filter(e => new Date(e.created_at) >= monthStart);

    const sumByType = (arr: typeof entries, type: string) =>
      arr.filter(e => e.entry_type === type).reduce((s, e) => s + Number(e.amount), 0);

    const lastMonthLoyalty = sumByType(before, 'LOYALTY_REWARD');
    const lastMonthBonuses = sumByType(before, 'BONUS');
    const lastMonthDeposits = sumByType(before, 'DEPOSIT');
    const lastMonthWithdrawals = sumByType(before, 'WITHDRAWAL');
    const lastMonthAdjustments = sumByType(before, 'ADJUSTMENT');
    const balanceBroughtForward = lastMonthLoyalty + lastMonthBonuses + lastMonthDeposits + lastMonthWithdrawals + lastMonthAdjustments;

    const thisMonthLoyalty = sumByType(current, 'LOYALTY_REWARD');
    const thisMonthBonuses = sumByType(current, 'BONUS');
    const thisMonthDeposits = sumByType(current, 'DEPOSIT');
    const thisMonthWithdrawals = sumByType(current, 'WITHDRAWAL');
    const thisMonthAdjustments = sumByType(current, 'ADJUSTMENT');
    const thisMonthNet = thisMonthLoyalty + thisMonthBonuses + thisMonthDeposits + thisMonthWithdrawals + thisMonthAdjustments;

    setBreakdown({
      lastMonthLoyalty, lastMonthBonuses, lastMonthDeposits, lastMonthWithdrawals, lastMonthAdjustments,
      thisMonthLoyalty, thisMonthBonuses, thisMonthDeposits, thisMonthWithdrawals, thisMonthAdjustments,
      balanceBroughtForward, thisMonthNet,
    });
  };

  // Fetch active loans for this employee
  const fetchActiveLoans = async () => {
    const email = employee?.email || user?.email;
    if (!email) return;
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('remaining_balance')
        .eq('employee_email', email)
        .eq('status', 'active');
      if (!error && data) {
        setActiveLoanCount(data.length);
        setActiveLoanTotal(data.reduce((s, l) => s + (l.remaining_balance || 0), 0));
      }
    } catch {}
  };

  useEffect(() => {
    fetchLedgerTotals();
    fetchActiveLoans();
  }, [user?.id, user?.email, employee?.email, withdrawalRequests.length]);

  // Real-time subscription for ledger changes
  useEffect(() => {
    if (!ledgerUserId) return;

    const channel = supabase
      .channel('account-ledger-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ledger_entries',
        filter: `user_id=eq.${ledgerUserId}`,
      }, () => {
        console.log('📡 Ledger changed, refreshing account totals...');
        fetchLedgerTotals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ledgerUserId]);

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  const reprintVoucher = (withdrawal: { amount: number; phone_number: string; request_ref?: string; channel?: string; created_at: string }) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = `<!doctype html><html><head><meta charset="utf-8"/><title>Withdrawal Voucher – ${withdrawal.request_ref || 'N/A'}</title><style>body{font:14px/1.4 system-ui;margin:0;padding:20px}.card{width:640px;margin:0 auto;padding:24px;border:1px solid #ddd}h1{font-size:18px;margin:0 0 12px}.row{display:flex;justify-content:space-between;margin:6px 0}.muted{color:#555}</style></head><body onload="window.print();"><div class="card"><h1>Withdrawal Request Voucher</h1><div class="row"><div>Ref</div><div><strong>${withdrawal.request_ref || 'N/A'}</strong></div></div><div class="row"><div>Amount</div><div><strong>UGX ${withdrawal.amount.toLocaleString()}</strong></div></div><div class="row"><div>Channel</div><div>${withdrawal.channel || 'N/A'}</div></div><div class="row"><div>Phone</div><div>${withdrawal.phone_number}</div></div><div class="row"><div>Requested</div><div>${new Date(withdrawal.created_at).toLocaleString()}</div></div><hr/><p class="muted">This is a withdrawal request voucher. Present to Finance for processing.</p><div style="margin-top:24px"><div>Employee Signature: _____________________</div><div>Date: ______________</div></div></div></body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Wallet className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  const monthlyProgress = stats ? (stats.monthlyEarnings / stats.monthlyCap) * 100 : 0;
  const pendingAmount = account?.pending_withdrawals || 0;
  // Use the wallet balance from get_user_balance_safe (already excludes DAILY_SALARY)
  const walletBalance = account?.wallet_balance || 0;
  const availableLoyalty = Math.max(0, walletBalance - pendingAmount);

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative gap-2">
            <Wallet className="h-4 w-4" />
            {formatCurrency(availableLoyalty)}
            {stats && stats.todayEarnings > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0">
                +{stats.todayEarnings.toLocaleString()}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              My Account & Loyalty
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Balance Card */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">
                  {formatCurrency(availableLoyalty)}
                </div>
                
                <div className="mt-3 space-y-1 text-xs">
                  {/* Last month section */}
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pt-1">Balance from previous months</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loyalty Rewards</span>
                    <span className="font-medium">{breakdown.lastMonthLoyalty.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonuses</span>
                    <span className="font-medium">{breakdown.lastMonthBonuses.toLocaleString()}</span>
                  </div>
                  {breakdown.lastMonthDeposits > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposits</span>
                      <span className="font-medium">{breakdown.lastMonthDeposits.toLocaleString()}</span>
                    </div>
                  )}
                  {breakdown.lastMonthWithdrawals < 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawals</span>
                      <span className="font-medium text-red-600">{breakdown.lastMonthWithdrawals.toLocaleString()}</span>
                    </div>
                  )}
                  {breakdown.lastMonthAdjustments !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adjustments</span>
                      <span className={breakdown.lastMonthAdjustments >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-600'}>
                        {breakdown.lastMonthAdjustments > 0 ? '+' : ''}{breakdown.lastMonthAdjustments.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-green-200 pt-1">
                    <span>Brought Forward</span>
                    <span>{formatCurrency(breakdown.balanceBroughtForward)}</span>
                  </div>

                  {/* This month section */}
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide pt-2">This Month</div>
                  {breakdown.thisMonthLoyalty > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loyalty Rewards</span>
                      <span className="font-medium text-green-700">+{breakdown.thisMonthLoyalty.toLocaleString()}</span>
                    </div>
                  )}
                  {breakdown.thisMonthBonuses > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bonuses</span>
                      <span className="font-medium text-green-700">+{breakdown.thisMonthBonuses.toLocaleString()}</span>
                    </div>
                  )}
                  {breakdown.thisMonthDeposits > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposits</span>
                      <span className="font-medium text-green-700">+{breakdown.thisMonthDeposits.toLocaleString()}</span>
                    </div>
                  )}
                  {breakdown.thisMonthWithdrawals < 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Withdrawals</span>
                      <span className="font-medium text-red-600">{breakdown.thisMonthWithdrawals.toLocaleString()}</span>
                    </div>
                  )}
                  {breakdown.thisMonthAdjustments !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Adjustments (deductions/refunds)</span>
                      <span className={breakdown.thisMonthAdjustments >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-600'}>
                        {breakdown.thisMonthAdjustments > 0 ? '+' : ''}{breakdown.thisMonthAdjustments.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t border-green-200 pt-1">
                    <span>This Month Net</span>
                    <span className={breakdown.thisMonthNet >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {breakdown.thisMonthNet >= 0 ? '+' : ''}{formatCurrency(breakdown.thisMonthNet)}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between font-bold text-sm border-t-2 border-green-300 pt-2 mt-1">
                    <span>Total Balance</span>
                    <span className="text-green-700">{formatCurrency(availableLoyalty)}</span>
                  </div>
                </div>

                {pendingAmount > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                    <Clock className="h-3 w-3" />
                    <span>UGX {pendingAmount.toLocaleString()} frozen (pending approval)</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Loans Card */}
            {activeLoanCount > 0 && (
              <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-red-600" />
                    Active Loans
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">
                    UGX {activeLoanTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activeLoanCount} active loan{activeLoanCount > 1 ? 's' : ''} · Total outstanding balance
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 w-full text-xs border-red-200 text-red-700 hover:bg-red-100"
                    onClick={() => window.location.href = '/quick-loans'}
                  >
                    View Loans & Repay
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loyalty Points Section */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600" />
                  Loyalty Rewards This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold text-amber-700">
                    {stats ? formatCurrency(stats.monthlyEarnings) : formatCurrency(0)}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    of {formatCurrency(50000)} cap
                  </span>
                </div>
                <Progress value={monthlyProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Remaining: {stats ? formatCurrency(stats.monthlyRemaining) : formatCurrency(50000)}</span>
                  <span>Today: +{stats ? formatCurrency(stats.todayEarnings) : formatCurrency(0)}</span>
                </div>

                {/* Activity Breakdown */}
                {stats && Object.keys(stats.activityBreakdown).length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    <p className="text-xs font-medium text-amber-800">Activity Breakdown</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(stats.activityBreakdown).map(([type, data]) => (
                        <div key={type} className="flex items-center justify-between bg-white/60 rounded px-2 py-1 text-xs">
                          <span className="text-muted-foreground">{ACTIVITY_LABELS[type] || type}</span>
                          <span className="font-medium">{data.count}× = {data.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                  <div className="text-lg font-bold text-orange-600">
                    {formatCurrency(pendingAmount)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Available</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(availableLoyalty)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => setShowDeposit(true)} variant="outline" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Deposit
              </Button>
              <Button onClick={() => setShowMoneyRequest(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Request
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowWithdrawal(true)}
                className="flex items-center gap-2"
                disabled={availableLoyalty <= 0 || withdrawalStatus.disabled}
              >
                <DollarSign className="h-4 w-4" />
                Withdraw
              </Button>
            </div>

            {withdrawalStatus.disabled && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p className="font-medium">Withdrawals are currently disabled</p>
                {withdrawalStatus.reason && <p className="text-xs mt-1">{withdrawalStatus.reason}</p>}
                {withdrawalStatus.until && (
                  <p className="text-xs mt-1">Available after: {new Date(withdrawalStatus.until).toLocaleString()}</p>
                )}
              </div>
            )}

            {/* Statement Toggle */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex items-center gap-2"
              onClick={() => setShowStatement(!showStatement)}
            >
              <FileText className="h-4 w-4" />
              {showStatement ? 'Hide Statement' : 'View Transaction Statement'}
            </Button>

            {/* Transaction Statement */}
            <TransactionStatement open={showStatement} onOpenChange={setShowStatement} currentBalance={availableLoyalty} balanceBroughtForward={breakdown.balanceBroughtForward} thisMonthEarnings={breakdown.thisMonthNet} />

            <Separator />

            {/* Recent Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Requests</h3>
              
              {moneyRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Money Requests</h4>
                  {moneyRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(request.status)}
                        <div>
                          <div className="font-medium">{formatCurrency(request.amount)}</div>
                          <div className="text-sm text-muted-foreground">{request.reason}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(request.created_at), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {withdrawalRequests.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Withdrawal Requests</h4>
                  {withdrawalRequests.slice(0, 5).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(withdrawal.status)}
                        <div>
                          <div className="font-medium">{formatCurrency(withdrawal.amount)}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.phone_number}</div>
                          {withdrawal.request_ref && (
                            <div className="text-xs text-muted-foreground">Ref: {withdrawal.request_ref}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <Badge className={getStatusColor(withdrawal.status)}>{withdrawal.status}</Badge>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(withdrawal.created_at), 'MMM dd')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => reprintVoucher(withdrawal)}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Reprint
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {moneyRequests.length === 0 && withdrawalRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent requests
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MoneyRequestModal open={showMoneyRequest} onOpenChange={setShowMoneyRequest} />
      <WithdrawalModal 
        open={showWithdrawal} 
        onOpenChange={setShowWithdrawal}
        availableAmount={availableLoyalty}
      />
      <DepositModal open={showDeposit} onOpenChange={setShowDeposit} />
    </>
  );
};
