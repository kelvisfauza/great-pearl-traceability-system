import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Wallet, DollarSign, TrendingUp, Plus, Smartphone,
  Clock, CheckCircle, XCircle, AlertCircle, Star, Zap, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useUserAccount } from '@/hooks/useUserAccount';
import { useLoyaltyStats } from '@/hooks/useLoyaltyStats';
import { MoneyRequestModal } from './MoneyRequestModal';
import { WithdrawalModal } from './WithdrawalModal';
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
  const [showMoneyRequest, setShowMoneyRequest] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

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

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative gap-2">
            <Wallet className="h-4 w-4" />
            {account ? formatCurrency(account.wallet_balance) : 'Account'}
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
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Total Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">
                  {account ? formatCurrency(account.wallet_balance) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Salary + Loyalty Rewards</p>
              </CardContent>
            </Card>

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
                    {account ? formatCurrency(account.pending_withdrawals) : formatCurrency(0)}
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
                    {account ? formatCurrency(account.available_to_request) : formatCurrency(0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => setShowMoneyRequest(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Request Money
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowWithdrawal(true)}
                className="flex items-center gap-2"
                disabled={!account || account.available_to_request <= 0}
              >
                <Smartphone className="h-4 w-4" />
                Withdraw
              </Button>
            </div>

            {/* How It Works */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">How Loyalty Points Work</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• <strong>Data Entry:</strong> 100 UGX per action</li>
                  <li>• <strong>Form Submissions:</strong> 200 UGX each</li>
                  <li>• <strong>Reports:</strong> 300 UGX each</li>
                  <li>• <strong>Transactions:</strong> 250 UGX each</li>
                  <li>• <strong>Monthly cap:</strong> 50,000 UGX max</li>
                </ul>
              </CardContent>
            </Card>

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
                  {withdrawalRequests.slice(0, 3).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(withdrawal.status)}
                        <div>
                          <div className="font-medium">{formatCurrency(withdrawal.amount)}</div>
                          <div className="text-sm text-muted-foreground">{withdrawal.phone_number}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(withdrawal.status)}>{withdrawal.status}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(withdrawal.created_at), 'MMM dd')}
                        </div>
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
        availableAmount={account?.available_to_request || 0}
      />
    </>
  );
};
