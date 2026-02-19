import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Send, Shield, User, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string;
  department: string;
}

interface DelegateApprovalModalProps {
  open: boolean;
  onClose: () => void;
  violationReason: string;
  requestId: string;
  requestType: 'money_request' | 'expense_request';
  requestAmount: number;
  requestTitle?: string;
}

export const DelegateApprovalModal: React.FC<DelegateApprovalModalProps> = ({
  open,
  onClose,
  violationReason,
  requestId,
  requestType,
  requestAmount,
  requestTitle,
}) => {
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAdmins();
      setSent(null);
    }
  }, [open]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, phone, position, department')
        .in('role', ['Administrator', 'Super Admin'])
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelegate = async (admin: AdminOption) => {
    setSending(admin.id);
    try {
      const typeLabel = requestType === 'money_request' ? 'Money Request' : 'Expense Request';
      const message = `Hi ${admin.name}, you have been asked to review and approve a ${typeLabel} of UGX ${requestAmount.toLocaleString()}${requestTitle ? ` - "${requestTitle}"` : ''}. Please log in to the system to take action. Great Pearl Coffee.`;

      if (admin.phone) {
        await supabase.functions.invoke('send-sms', {
          body: {
            phone: admin.phone,
            message,
            userName: admin.name,
            messageType: 'approval_delegation',
          },
        });
      }

      setSent(admin.id);
      toast({
        title: '✅ Approval Request Sent',
        description: `${admin.name} has been notified to review this request.`,
      });
    } catch (error: any) {
      console.error('Error delegating approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to send notification. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(null);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Policy Violation Detected
          </DialogTitle>
          <DialogDescription className="sr-only">
            You cannot approve this request due to a policy violation. Select an administrator to delegate the approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Violation Alert */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">Cannot Approve</p>
              <p className="text-muted-foreground mt-1">{violationReason}</p>
            </div>
          </div>

          {/* Request Info */}
          <div className="p-3 rounded-lg bg-muted/50 border text-sm">
            <p className="text-muted-foreground">
              Request Amount: <span className="font-semibold text-foreground">UGX {requestAmount.toLocaleString()}</span>
            </p>
            {requestTitle && (
              <p className="text-muted-foreground mt-1">
                Title: <span className="font-medium text-foreground">{requestTitle}</span>
              </p>
            )}
          </div>

          {/* Suggestion */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Ask an Administrator to approve this request:
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading admins...</span>
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No administrators available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getInitials(admin.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{admin.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{admin.position}</span>
                          {admin.phone && (
                            <>
                              <span>•</span>
                              <Phone className="h-3 w-3" />
                              <span>{admin.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {sent === admin.id ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sent
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelegate(admin)}
                        disabled={sending === admin.id || !admin.phone}
                        className="shrink-0"
                      >
                        {sending === admin.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Ask to Approve
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
