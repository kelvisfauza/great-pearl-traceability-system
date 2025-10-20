import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, Calendar, DollarSign, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentSlipModal } from './PaymentSlipModal';

interface RecentPaymentSlipsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApprovedRequest {
  id: string;
  title: string;
  amount: number;
  requestedby: string;
  created_at: string;
  finance_approved_at?: string;
  admin_approved_at?: string;
  finance_approved_by?: string;
  admin_approved_by?: string;
  details?: any;
}

export const RecentPaymentSlipsModal: React.FC<RecentPaymentSlipsModalProps> = ({
  open,
  onOpenChange
}) => {
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [paymentSlipModalOpen, setPaymentSlipModalOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, { name?: string; phone?: string }>>({});

  useEffect(() => {
    if (open) {
      fetchApprovedRequests();
      
      // Poll every 10 seconds while modal is open
      const interval = setInterval(fetchApprovedRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const fetchApprovedRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('status', 'Approved')
        .in('type', ['Expense Request', 'Employee Salary Request', 'Requisition'])
        .not('admin_approved_at', 'is', null)
        .order('admin_approved_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      setApprovedRequests(data || []);
      
      // Fetch user profiles
      if (data) {
        const emails = [...new Set(data.map(r => r.requestedby))];
        const profiles: Record<string, { name?: string; phone?: string }> = {};

        for (const email of emails) {
          try {
            const { data: employee } = await supabase
              .from('employees')
              .select('name, phone')
              .eq('email', email)
              .single();

            if (employee) {
              profiles[email] = { name: employee.name, phone: employee.phone };
            }
          } catch (error) {
            console.error('Error fetching profile for', email);
          }
        }
        setUserProfiles(profiles);
      }
    } catch (error) {
      console.error('Error fetching approved requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = (request: ApprovedRequest) => {
    const requestForSlip = {
      ...request,
      amount: request.amount,
      paymentMethod: 'Bank Transfer',
      financeApprovedBy: request.finance_approved_by || 'Finance Team',
      adminApprovedBy: request.admin_approved_by || 'Admin Team',
      financeApprovedAt: request.finance_approved_at,
      adminApprovedAt: request.admin_approved_at,
      phoneNumber: request.details?.phoneNumber || userProfiles[request.requestedby]?.phone,
      reason: request.details?.reason
    };

    setSelectedRequest(requestForSlip);
    setPaymentSlipModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Recent Payment Slips
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : approvedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Printer className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No approved payment slips available</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {approvedRequests.map((request) => (
                  <Card key={request.id} className="border-l-4 border-l-green-400">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-2">{request.title}</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-700">
                                UGX {request.amount.toLocaleString()}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {userProfiles[request.requestedby]?.name || request.requestedby.split('@')[0]}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDate(request.admin_approved_at!)}
                              </span>
                            </div>
                            
                            <Badge variant="default" className="w-fit">
                              Approved
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground mb-2">
                            <span>Finance: {request.finance_approved_by || 'Finance Team'}</span>
                            <span className="mx-2">•</span>
                            <span>Admin: {request.admin_approved_by || 'Admin Team'}</span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => handlePrintSlip(request)}
                          size="sm"
                          className="ml-4"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Print Slip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentSlipModal
        open={paymentSlipModalOpen}
        onOpenChange={setPaymentSlipModalOpen}
        request={selectedRequest}
        recipientName={selectedRequest ? userProfiles[selectedRequest.requestedby]?.name : undefined}
      />
    </>
  );
};