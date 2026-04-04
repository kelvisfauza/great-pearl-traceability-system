import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const LoanStatsCard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-loan-stats'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [
        activeLoans,
        disbursedThisMonth,
        repaymentsThisMonth,
        overdueInstallments,
        defaultedLoans,
      ] = await Promise.all([
        // Active loans count + total outstanding
        supabase
          .from('loans')
          .select('id, remaining_balance, loan_amount, total_repayable')
          .in('status', ['active', 'disbursed']),

        // Loans disbursed this month
        supabase
          .from('loans')
          .select('id, disbursed_amount, loan_amount')
          .gte('start_date', monthStart)
          .lte('start_date', monthEnd)
          .in('status', ['active', 'disbursed', 'completed']),

        // Repayments this month
        supabase
          .from('loan_repayments')
          .select('id, amount_paid')
          .gte('paid_date', monthStart)
          .lte('paid_date', monthEnd)
          .gt('amount_paid', 0),

        // Overdue installments
        supabase
          .from('loan_repayments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['overdue']),

        // Defaulted loans
        supabase
          .from('loans')
          .select('id', { count: 'exact', head: true })
          .eq('is_defaulted', true)
          .in('status', ['active', 'disbursed']),
      ]);

      const totalOutstanding = activeLoans.data?.reduce((sum, l) => sum + (l.remaining_balance || 0), 0) || 0;
      const activeCount = activeLoans.data?.length || 0;
      const disbursedCount = disbursedThisMonth.data?.length || 0;
      const disbursedAmount = disbursedThisMonth.data?.reduce((sum, l) => sum + (l.disbursed_amount || l.loan_amount || 0), 0) || 0;
      const repaidCount = repaymentsThisMonth.data?.length || 0;
      const repaidAmount = repaymentsThisMonth.data?.reduce((sum, r) => sum + (r.amount_paid || 0), 0) || 0;

      return {
        activeCount,
        totalOutstanding,
        disbursedCount,
        disbursedAmount,
        repaidCount,
        repaidAmount,
        overdueCount: overdueInstallments.count || 0,
        defaultedCount: defaultedLoans.count || 0,
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="h-5 w-5 text-primary" />
          Loan Overview
          <Badge variant="outline" className="ml-auto text-xs font-normal">{monthName}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Active Loans */}
          <div className="p-3 rounded-lg bg-blue-500/10 space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Active Loans</span>
            </div>
            <p className="text-xl font-bold">{stats?.activeCount || 0}</p>
            <p className="text-xs text-muted-foreground">
              UGX {(stats?.totalOutstanding || 0).toLocaleString()} outstanding
            </p>
          </div>

          {/* Disbursed This Month */}
          <div className="p-3 rounded-lg bg-green-500/10 space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Disbursed ({monthName})</span>
            </div>
            <p className="text-xl font-bold">{stats?.disbursedCount || 0}</p>
            <p className="text-xs text-muted-foreground">
              UGX {(stats?.disbursedAmount || 0).toLocaleString()}
            </p>
          </div>

          {/* Repayments This Month */}
          <div className="p-3 rounded-lg bg-purple-500/10 space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Repayments ({monthName})</span>
            </div>
            <p className="text-xl font-bold">{stats?.repaidCount || 0}</p>
            <p className="text-xs text-muted-foreground">
              UGX {(stats?.repaidAmount || 0).toLocaleString()}
            </p>
          </div>

          {/* Overdue / Defaulted */}
          <div className={`p-3 rounded-lg space-y-1 ${(stats?.overdueCount || 0) > 0 ? 'bg-red-500/10' : 'bg-muted/50'}`}>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className={`h-4 w-4 ${(stats?.overdueCount || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
              <span className="text-xs text-muted-foreground">Overdue</span>
            </div>
            <p className="text-xl font-bold">{stats?.overdueCount || 0}</p>
            <p className="text-xs text-muted-foreground">
              {stats?.defaultedCount || 0} defaulted
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanStatsCard;
