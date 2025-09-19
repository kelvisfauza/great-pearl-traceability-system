import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import { useApprovalSystem } from '@/hooks/useApprovalSystem';
import { useSalaryPayments } from '@/hooks/useSalaryPayments';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import SalaryPaymentModal from './SalaryPaymentModal';
import { Send, DollarSign, Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

const SalaryPaymentRequestsManager = () => {
  const { employees } = useFirebaseEmployees();
  const { createApprovalRequest, loading: submitting } = useApprovalSystem();
  const { paymentRequests: payments, loading } = useSalaryPayments();
  const { employee } = useAuth();
  const { toast } = useToast();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [viewDetailsModal, setViewDetailsModal] = useState(false);

  const activeEmployees = employees.filter(emp => emp.status === 'Active');

  const handlePaymentRequestSubmitted = async (paymentRequest: any) => {
    try {
      const success = await createApprovalRequest(
        paymentRequest.type,
        paymentRequest.title,
        paymentRequest.description,
        parseFloat(paymentRequest.amount.replace(/[^\d.-]/g, '')),
        {
          ...paymentRequest.details,
          department: 'Human Resources',
          priority: 'High'
        }
      );

      if (success) {
        setShowPaymentModal(false);
        toast({
          title: "Payment Request Submitted",
          description: "Salary payment request has been sent to admin for approval"
        });

        // Send SMS notifications to employees about salary initialization
        if (paymentRequest.details?.employee_details) {
          for (const emp of paymentRequest.details.employee_details) {
            if (emp.phone) {
              try {
                // This would be implemented with the SMS service
                console.log(`Sending SMS to ${emp.name} at ${emp.phone}: Dear ${emp.name}, your ${paymentRequest.details.payment_type === "mid-month" ? "mid month" : "end of month"} salary of UGX ${emp.salary.toLocaleString()} has been initialized. Once approved you will receive it ASAP.`);
              } catch (smsError) {
                console.error('SMS notification failed for:', emp.name, smsError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error submitting payment request:', error);
      toast({
        title: "Error",
        description: "Failed to submit payment request",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setViewDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Salary Payment Management</h2>
          <p className="text-muted-foreground">Submit and track salary payment requests</p>
        </div>
        <Button onClick={() => setShowPaymentModal(true)} disabled={submitting}>
          <Send className="h-4 w-4 mr-2" />
          New Payment Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{activeEmployees.length}</p>
                <p className="text-sm text-muted-foreground">Active Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  UGX {activeEmployees.reduce((sum, emp) => sum + emp.salary, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Monthly Payroll</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{payments.length}</p>
                <p className="text-sm text-muted-foreground">Payment Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Track submitted salary payment requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Payment Requests</h3>
              <p className="text-muted-foreground mb-4">You haven't submitted any salary payment requests yet.</p>
              <Button onClick={() => setShowPaymentModal(true)}>
                <Send className="h-4 w-4 mr-2" />
                Submit First Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold">{payment.title}</h4>
                        <Badge className={getStatusColor(payment.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </div>
                        </Badge>
                      </div>
                       <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <span>{payment.details?.employee_count || 0} employees</span>
                         <span>{payment.amount}</span>
                         <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                       </div>
                       {payment.details?.notes && (
                         <p className="text-sm text-muted-foreground italic">{payment.details.notes}</p>
                       )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(payment)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Request Modal */}
      <SalaryPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        employees={activeEmployees}
        onPaymentRequestSubmitted={handlePaymentRequestSubmitted}
      />

      {/* Payment Details Modal */}
      <Dialog open={viewDetailsModal} onOpenChange={setViewDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              Detailed information about this salary payment
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Month</label>
                   <p className="text-lg font-semibold">{selectedPayment.details?.month || 'N/A'}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Status</label>
                   <Badge className={getStatusColor(selectedPayment.status)}>
                     {selectedPayment.status}
                   </Badge>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Total Amount</label>
                   <p className="text-lg font-semibold">{selectedPayment.amount}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Employee Count</label>
                   <p className="text-lg font-semibold">{selectedPayment.details?.employee_count || 0}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Bonuses</label>
                   <p className="text-lg font-semibold">UGX {(selectedPayment.details?.bonuses || 0).toLocaleString()}</p>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Deductions</label>
                   <p className="text-lg font-semibold">UGX {(selectedPayment.details?.deductions || 0).toLocaleString()}</p>
                 </div>
               </div>

              {selectedPayment.details?.employee_details && selectedPayment.details.employee_details.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Employee Breakdown</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted p-3 border-b">
                      <div className="grid grid-cols-4 gap-2 text-sm font-medium">
                        <span>Name</span>
                        <span>Position</span>
                        <span>Department</span>
                        <span>Salary</span>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {selectedPayment.details.employee_details.map((emp: any, index: number) => (
                        <div key={index} className="p-3 border-b last:border-b-0">
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <span className="font-medium">{emp.name}</span>
                            <span className="text-muted-foreground">{emp.position}</span>
                            <span className="text-muted-foreground">{emp.department}</span>
                            <span className="font-medium">UGX {emp.salary.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

               {selectedPayment.details?.notes && (
                 <div>
                   <label className="text-sm font-medium text-muted-foreground">Notes</label>
                   <p className="mt-1 p-3 bg-muted rounded-lg">{selectedPayment.details.notes}</p>
                 </div>
               )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryPaymentRequestsManager;