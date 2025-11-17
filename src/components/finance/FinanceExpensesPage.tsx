import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import PendingApprovalRequests from './PendingApprovalRequests';
import { CompletedTransactions } from './CompletedTransactions';

export const FinanceExpensesPage = () => {
  const { employee } = useAuth();
  const isFinance = employee?.department === 'Finance';

  if (!isFinance) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You do not have permission to access Finance approvals. This page is only accessible to Finance department staff.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Separation of Duties Notice */}
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          <strong>Separation of Duties Policy:</strong> Finance can only approve requests that have been pre-approved by Admin.
          All requests shown below have already passed Admin approval.
        </AlertDescription>
      </Alert>

      {/* Main Approval Section - Requests waiting for Finance */}
      <PendingApprovalRequests />

      {/* Completed Transactions History */}
      <CompletedTransactions />
    </div>
  );
};

export default FinanceExpensesPage;
