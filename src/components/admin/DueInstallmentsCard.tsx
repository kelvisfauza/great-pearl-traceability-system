import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight, AlertTriangle } from 'lucide-react';

const DueInstallmentsCard = () => {
  const { data: dueInstallments } = useQuery({
    queryKey: ['admin-due-installments'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get installments that are due today or overdue (unpaid/partial)
      const { data } = await supabase
        .from('loan_repayments')
        .select(`
          id, installment_number, amount_due, amount_paid, due_date, status,
          loans!inner (id, employee_name, loan_type, status)
        `)
        .in('status', ['pending', 'partial', 'overdue'])
        .lte('due_date', today)
        .in('loans.status', ['active', 'approved'])
        .order('due_date', { ascending: true })
        .limit(10);
      
      return data || [];
    },
    refetchInterval: 30000,
  });

  const overdueCount = dueInstallments?.filter((i: any) => {
    const today = new Date().toISOString().split('T')[0];
    return i.due_date < today;
  }).length || 0;

  if (!dueInstallments?.length) return null;

  return (
    <Card className="border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-red-600" />
            Due & Overdue Installments
            <Badge variant="destructive" className="ml-1">{dueInstallments.length}</Badge>
            {overdueCount > 0 && (
              <Badge variant="outline" className="border-red-500 text-red-600 ml-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueCount} overdue
              </Badge>
            )}
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link to="/quick-loans" className="flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {dueInstallments.slice(0, 5).map((inst: any) => {
            const loan = inst.loans;
            const isOverdue = inst.due_date < new Date().toISOString().split('T')[0];
            const remaining = (inst.amount_due || 0) - (inst.amount_paid || 0);
            return (
              <div
                key={inst.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isOverdue ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-background'
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{loan?.employee_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    Week {inst.installment_number} • Due{' '}
                    {new Date(inst.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {isOverdue && <span className="text-red-600 font-medium ml-1">• OVERDUE</span>}
                  </p>
                </div>
                <span className="font-bold text-sm">
                  UGX {remaining.toLocaleString()}
                </span>
              </div>
            );
          })}
          {dueInstallments.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{dueInstallments.length - 5} more due
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DueInstallmentsCard;
