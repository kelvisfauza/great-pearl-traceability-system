import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MoneyRequestsManager = lazy(() => import('./MoneyRequestsManager').then(m => ({ default: m.default })));

export const ExpenseManagement = () => {
  const { employee } = useAuth();
  const [moneyRequestsCount, setMoneyRequestsCount] = useState(0);

  const isFinance = employee?.department === 'Finance';

  // Fetch money_requests count
  useEffect(() => {
    const fetchMoneyRequestsCount = async () => {
      try {
        const { count, error } = await supabase
          .from('money_requests')
          .select('*', { count: 'exact', head: true })
          .eq('approval_stage', 'pending_finance');
        
        if (error) throw error;
        setMoneyRequestsCount(count || 0);
      } catch (error) {
        console.error('Error fetching money requests count:', error);
      }
    };

    fetchMoneyRequestsCount();

    // Subscribe to changes in money_requests table
    const subscription = supabase
      .channel('money_requests_count')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'money_requests' },
        () => fetchMoneyRequestsCount()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!isFinance) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You do not have permission to access Finance features. This page is only accessible to Finance department staff.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          <strong>Finance Management:</strong> Use this page for salary & advance requests. For expense approvals, see the Finance Approvals page.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Salary & Advance Management
          </CardTitle>
          <CardDescription>
            Review and process employee salary advances and money requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="salary" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="salary" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Salary & Advance Requests ({moneyRequestsCount})
              </TabsTrigger>
            </TabsList>

            {/* Salary Requests Tab */}
            <TabsContent value="salary" className="space-y-4">
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
                <MoneyRequestsManager />
              </Suspense>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
