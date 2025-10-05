import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Wallet, Receipt, Users, TrendingUp, Coffee } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { PendingCoffeePayments } from '@/components/finance/PendingCoffeePayments';
import { ExpenseManagement } from '@/components/finance/ExpenseManagement';
import { HRPayments } from '@/components/finance/HRPayments';
import { FinanceStats } from '@/components/finance/FinanceStats';
import { PaymentHistory } from '@/components/finance/PaymentHistory';
import { FinanceReports } from '@/components/finance/FinanceReports';

const Finance = () => {
  const { hasPermission } = useAuth();

  if (!hasPermission('Finance')) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="text-center py-8">
              <div className="mb-4">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access Finance management.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-3">
              <Wallet className="h-10 w-10" />
              Finance Department
            </h1>
            <p className="text-muted-foreground">Manage coffee payments, expenses, and financial operations</p>
          </div>

          {/* Finance Statistics */}
          <FinanceStats />

          {/* Main Finance Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Financial Management
              </CardTitle>
              <CardDescription>
                Complete financial operations management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending-coffee" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="pending-coffee" className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    Pending Coffee
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Payments
                  </TabsTrigger>
                  <TabsTrigger value="expenses" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Expenses
                  </TabsTrigger>
                  <TabsTrigger value="hr-payments" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    HR Payments
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Reports
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending-coffee" className="mt-6">
                  <PendingCoffeePayments />
                </TabsContent>

                <TabsContent value="payments" className="mt-6">
                  <PaymentHistory />
                </TabsContent>

                <TabsContent value="expenses" className="mt-6">
                  <ExpenseManagement />
                </TabsContent>

                <TabsContent value="hr-payments" className="mt-6">
                  <HRPayments />
                </TabsContent>

                <TabsContent value="reports" className="mt-6">
                  <FinanceReports />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Finance;