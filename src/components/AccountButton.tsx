import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUserAccount } from '@/hooks/useUserAccount';
import { MoneyRequestModal } from './MoneyRequestModal';
import { WithdrawalModal } from './WithdrawalModal';
import { format } from 'date-fns';

export const AccountButton = () => {
  const { account, moneyRequests, withdrawalRequests, loading } = useUserAccount();
  const [showMoneyRequest, setShowMoneyRequest] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  console.log('🚨 AccountButton render - loading:', loading, 'account:', account);

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Wallet className="h-4 w-4 mr-2" />
            {account ? formatCurrency(account.wallet_balance) : 'Account'}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              My Account
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* New Three-Figure Dashboard */}
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Wallet Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {account ? formatCurrency(account.wallet_balance) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">From ledger sum</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {account ? formatCurrency(account.pending_withdrawals) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Being processed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Available to Request
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {account ? formatCurrency(account.available_to_request) : formatCurrency(0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Wallet - Pending</p>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setShowMoneyRequest(true)}
                className="flex items-center gap-2"
              >
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

            <Separator />

            {/* Recent Requests */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recent Requests</h3>
              
              {/* Money Requests */}
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
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(request.created_at), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Withdrawal Requests */}
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
                        <Badge className={getStatusColor(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
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

      <MoneyRequestModal 
        open={showMoneyRequest} 
        onOpenChange={setShowMoneyRequest} 
      />
      <WithdrawalModal 
        open={showWithdrawal} 
        onOpenChange={setShowWithdrawal}
        availableAmount={account?.available_to_request || 0}
      />
    </>
  );
};