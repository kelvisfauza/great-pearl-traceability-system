import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, DollarSign, PlusCircle, CheckCircle, XCircle, Banknote, CreditCard, Calendar, User } from 'lucide-react';
import { useHRPayments } from '@/hooks/useHRPayments';
import { useToast } from '@/hooks/use-toast';

export const HRPayments = () => {
  const { 
    salaryRequests, 
    advanceRequests, 
    loading, 
    processSalaryPayment, 
    processAdvancePayment,
    issueAdvance 
  } = useHRPayments();
  const { toast } = useToast();

  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank'>('Cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Advance Form State
  const [advanceEmployee, setAdvanceEmployee] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [processingSalary, setProcessingSalary] = useState<string | null>(null);
  const [processingAdvance, setProcessingAdvance] = useState<string | null>(null);

  const handleProcessSalaryPayment = async (paymentId: string, method: 'Cash' | 'Bank') => {
    if (processingSalary) return;
    
    setProcessingSalary(paymentId);
    try {
      await processSalaryPayment(paymentId, method);
      
      if (method === 'Cash') {
        toast({
          title: "Salary Payment Processed",
          description: "Salary payment has been processed successfully"
        });
      } else {
        toast({
          title: "Bank Transfer Submitted",
          description: "Bank transfer submitted for admin approval"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process salary payment",
        variant: "destructive"
      });
    } finally {
      setProcessingSalary(null);
    }
  };

  const handleProcessAdvancePayment = async (advanceId: string, method: 'Cash' | 'Bank') => {
    if (processingAdvance) return;
    
    setProcessingAdvance(advanceId);
    try {
      await processAdvancePayment(advanceId, method);
      
      if (method === 'Cash') {
        toast({
          title: "Advance Payment Processed",
          description: "Employee advance has been processed successfully"
        });
      } else {
        toast({
          title: "Bank Transfer Submitted", 
          description: "Advance bank transfer submitted for admin approval"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process advance payment",
        variant: "destructive"
      });
    } finally {
      setProcessingAdvance(null);
    }
  };

  const handleIssueAdvance = async () => {
    if (!advanceEmployee || !advanceAmount || !advanceReason) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await issueAdvance({
        employee: advanceEmployee,
        amount: parseFloat(advanceAmount),
        reason: advanceReason
      });

      toast({
        title: "Advance Issued",
        description: `Advance of UGX ${parseFloat(advanceAmount).toLocaleString()} issued to ${advanceEmployee}`
      });

      // Reset form
      setAdvanceEmployee('');
      setAdvanceAmount('');
      setAdvanceReason('');
      setShowAdvanceDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to issue advance",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => `UGX ${amount.toLocaleString()}`;

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'Cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'Bank Transfer': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            HR Payments & Advances
          </CardTitle>
          <CardDescription>
            Process employee salary payments and manage advances
          </CardDescription>
          
          <div className="pt-4">
            <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Issue Employee Advance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Issue Employee Advance</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="advance-employee">Employee Name *</Label>
                    <Input
                      id="advance-employee"
                      value={advanceEmployee}
                      onChange={(e) => setAdvanceEmployee(e.target.value)}
                      placeholder="Enter employee name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="advance-amount">Amount (UGX) *</Label>
                    <Input
                      id="advance-amount"
                      type="number"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="advance-reason">Reason *</Label>
                    <Textarea
                      id="advance-reason"
                      value={advanceReason}
                      onChange={(e) => setAdvanceReason(e.target.value)}
                      placeholder="Reason for advance payment"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAdvanceDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleIssueAdvance} className="flex-1">
                      Issue Advance
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="salary-requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="salary-requests">
                Salary Requests ({salaryRequests.length})
              </TabsTrigger>
              <TabsTrigger value="advances">
                Employee Advances ({advanceRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="salary-requests" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Salary Amount</TableHead>
                    <TableHead>Month/Period</TableHead>
                    <TableHead>Requested Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{request.employeeName}</div>
                            <div className="text-xs text-muted-foreground">{request.employeeId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{request.position}</TableCell>
                      <TableCell className="font-bold text-green-600">
                        {formatCurrency(request.salaryAmount)}
                      </TableCell>
                      <TableCell>{request.period}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {request.requestedDate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleProcessSalaryPayment(request.id, 'Cash')}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={processingSalary === request.id}
                            >
                              {processingSalary === request.id ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                </div>
                              ) : (
                                <>
                                  <Banknote className="h-4 w-4 mr-1" />
                                  Pay Cash
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessSalaryPayment(request.id, 'Bank')}
                              disabled={processingSalary === request.id}
                            >
                              {processingSalary === request.id ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                </div>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Bank Transfer
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {request.status === 'Processing' && (
                          <Badge className="bg-blue-100 text-blue-800">Awaiting Admin Approval</Badge>
                        )}
                        {request.status === 'Completed' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {salaryRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No salary payment requests</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advances" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advanceRequests.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {advance.employeeName}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-purple-600">
                        {formatCurrency(advance.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {advance.reason}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {advance.requestDate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(advance.status)}>
                          {advance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {advance.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleProcessAdvancePayment(advance.id, 'Cash')}
                              className="bg-green-600 hover:bg-green-700"
                              disabled={processingAdvance === advance.id}
                            >
                              {processingAdvance === advance.id ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                </div>
                              ) : (
                                <>
                                  <Banknote className="h-4 w-4 mr-1" />
                                  Pay Cash
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleProcessAdvancePayment(advance.id, 'Bank')}
                              disabled={processingAdvance === advance.id}
                            >
                              {processingAdvance === advance.id ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                                </div>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Bank Transfer
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {advance.status === 'Processing' && (
                          <Badge className="bg-blue-100 text-blue-800">Awaiting Admin Approval</Badge>
                        )}
                        {advance.status === 'Completed' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {advanceRequests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No advance requests</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};