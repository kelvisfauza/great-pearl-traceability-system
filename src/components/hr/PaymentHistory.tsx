
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, Users, TrendingUp } from "lucide-react";
import EmptyState from "./EmptyState";
import { format } from "date-fns";

interface PaymentHistoryProps {
  payments: any[];
  loading: boolean;
  onProcessPayment: () => void;
}

const PaymentHistory = ({ payments, loading, onProcessPayment }: PaymentHistoryProps) => {
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.total_pay), 0);
  const thisMonthPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.created_at);
    const now = new Date();
    return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payroll Overview
            </CardTitle>
            <CardDescription>Payment history and statistics</CardDescription>
          </div>
          <Button onClick={onProcessPayment} size="sm">
            Process Payroll
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-gray-500">Loading payments...</p>
        ) : (
          <>
            {/* Payment Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Total Paid</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  UGX {(totalPaid / 1000000).toFixed(1)}M
                </p>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">This Month</span>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  {thisMonthPayments.length} payments
                </p>
              </div>
            </div>

            {/* Recent Payments */}
            {payments.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 mb-3">Recent Payments</h4>
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{payment.month}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-3 w-3" />
                          <span>{payment.employee_count} employees</span>
                        </div>
                      </div>
                      <Badge variant={payment.status === 'Processed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold text-gray-900">
                        UGX {(Number(payment.total_pay) / 1000000).toFixed(1)}M
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    
                    {payment.payment_method && (
                      <p className="text-xs text-gray-500 mt-1">
                        via {payment.payment_method}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                type="payments"
                onAction={onProcessPayment}
                actionLabel="Process First Payroll"
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
