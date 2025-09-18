import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee, DollarSign, Clock, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinanceStats } from '@/hooks/useFinanceStats';

export const FinanceStats = () => {
  const { stats, loading } = useFinanceStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Pending Coffee Payments */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Pending Coffee Payments</p>
              <p className="text-2xl font-bold text-orange-900">{stats.pendingCoffeePayments}</p>
              <p className="text-xs text-orange-600">UGX {stats.pendingCoffeeAmount.toLocaleString()}</p>
            </div>
            <Coffee className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      {/* Available Cash */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Available Cash</p>
              <p className="text-2xl font-bold text-green-900">UGX {stats.availableCash.toLocaleString()}</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <p className="text-xs text-green-600">+12% from last week</p>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Pending Expense Requests */}
      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Pending Expenses</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingExpenseRequests}</p>
              <p className="text-xs text-yellow-600">UGX {stats.pendingExpenseAmount.toLocaleString()}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>

      {/* Completed Today */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Completed Today</p>
              <p className="text-2xl font-bold text-blue-900">{stats.completedToday}</p>
              <p className="text-xs text-blue-600">UGX {stats.completedTodayAmount.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};