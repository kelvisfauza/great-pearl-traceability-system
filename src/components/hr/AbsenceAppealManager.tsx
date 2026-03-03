import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AbsenceAppeal {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  deduction_date: string;
  deduction_amount: number;
  ledger_reference: string;
  appeal_status: string;
  appeal_submitted_at: string | null;
  appeal_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  refund_ledger_reference: string | null;
  created_at: string;
}

const AbsenceAppealManager = () => {
  const { employee } = useAuth();
  const [appeals, setAppeals] = useState<AbsenceAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchAppeals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('absence_appeals')
      .select('*')
      .order('deduction_date', { ascending: false });

    if (!error && data) {
      setAppeals(data as AbsenceAppeal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppeals();
  }, []);

  const sendAppealSms = async (employeeEmail: string, message: string) => {
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('phone')
        .eq('email', employeeEmail)
        .maybeSingle();

      if (emp?.phone) {
        await supabase.functions.invoke('send-sms', {
          body: { phone: emp.phone, to: emp.phone, message },
        });
      }
    } catch (err) {
      console.error('Failed to send appeal SMS:', err);
    }
  };

  const handleApprove = async (appeal: AbsenceAppeal) => {
    setProcessing(appeal.id);
    try {
      // Get unified user ID
      const { data: userIdData } = await supabase
        .rpc('get_unified_user_id', { input_email: appeal.employee_email });

      const refundRef = `REFUND-ABSENCE-${appeal.deduction_date}-${appeal.employee_id}`;

      // Create refund ledger entry (positive amount)
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert({
          user_id: userIdData || appeal.employee_id,
          entry_type: 'ADJUSTMENT',
          amount: appeal.deduction_amount,
          reference: refundRef,
          metadata: {
            type: 'absence_appeal_refund',
            employee_name: appeal.employee_name,
            employee_email: appeal.employee_email,
            date: appeal.deduction_date,
            reason: 'Appeal approved - absence deduction refunded',
            original_reference: appeal.ledger_reference,
            approved_by: employee?.name || employee?.email,
          }
        });

      if (ledgerError) throw ledgerError;

      // Update appeal record
      const { error: updateError } = await supabase
        .from('absence_appeals')
        .update({
          appeal_status: 'approved',
          reviewed_by: employee?.name || employee?.email || 'HR',
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes[appeal.id] || 'Appeal approved',
          refund_ledger_reference: refundRef,
        })
        .eq('id', appeal.id);

      if (updateError) throw updateError;

      // Send refund SMS notification
      await sendAppealSms(
        appeal.employee_email,
        `Great Pearl Coffee: Your absence appeal for ${appeal.deduction_date} has been APPROVED. UGX ${appeal.deduction_amount.toLocaleString()} has been refunded to your wallet.`
      );

      toast.success(`Appeal approved for ${appeal.employee_name}. UGX ${appeal.deduction_amount.toLocaleString()} refunded.`);
      fetchAppeals();
    } catch (err: any) {
      toast.error('Failed to approve appeal: ' + err.message);
    }
    setProcessing(null);
  };

  const handleReject = async (appeal: AbsenceAppeal) => {
    setProcessing(appeal.id);
    const { error } = await supabase
      .from('absence_appeals')
      .update({
        appeal_status: 'rejected',
        reviewed_by: employee?.name || employee?.email || 'HR',
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes[appeal.id] || 'Appeal rejected',
      })
      .eq('id', appeal.id);

    if (error) {
      toast.error('Failed to reject appeal');
    } else {
      // Send rejection SMS notification
      await sendAppealSms(
        appeal.employee_email,
        `Great Pearl Coffee: Your absence appeal for ${appeal.deduction_date} has been REJECTED. The UGX ${appeal.deduction_amount.toLocaleString()} deduction stands. Contact HR for questions.`
      );

      toast.success(`Appeal rejected for ${appeal.employee_name}`);
      fetchAppeals();
    }
    setProcessing(null);
  };

  const pendingAppeals = appeals.filter(a => a.appeal_status === 'pending');
  const allDeductions = appeals.filter(a => a.appeal_status === 'none');
  const reviewedAppeals = appeals.filter(a => ['approved', 'rejected'].includes(a.appeal_status));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading appeals...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{appeals.length}</p>
            <p className="text-xs text-muted-foreground">Total Deductions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{pendingAppeals.length}</p>
            <p className="text-xs text-muted-foreground">Pending Appeals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-500">{reviewedAppeals.filter(a => a.appeal_status === 'approved').length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-destructive">{reviewedAppeals.filter(a => a.appeal_status === 'rejected').length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Appeals ({pendingAppeals.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            No Appeal ({allDeductions.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({reviewedAppeals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingAppeals.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No pending appeals</CardContent></Card>
          ) : pendingAppeals.map(a => (
            <Card key={a.id} className="border-l-4 border-l-orange-400">
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{a.employee_name}</p>
                    <p className="text-sm text-muted-foreground">{a.employee_email}</p>
                    <p className="text-sm">{format(new Date(a.deduction_date), 'EEEE, MMM d, yyyy')}</p>
                    <p className="text-sm text-destructive font-medium">UGX {a.deduction_amount.toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                </div>

                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Employee's reason:</p>
                  <p className="text-sm">{a.appeal_reason}</p>
                </div>

                <Textarea
                  placeholder="Add review notes (optional)..."
                  value={reviewNotes[a.id] || ''}
                  onChange={(e) => setReviewNotes(prev => ({ ...prev, [a.id]: e.target.value }))}
                  rows={2}
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => handleApprove(a)}
                    disabled={processing === a.id}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve & Refund
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => handleReject(a)}
                    disabled={processing === a.id}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {allDeductions.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No uncontested deductions</CardContent></Card>
          ) : allDeductions.map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{a.employee_name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(a.deduction_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-destructive font-medium">-UGX {a.deduction_amount.toLocaleString()}</p>
                    <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />No Appeal</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-3 mt-4">
          {reviewedAppeals.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">No reviewed appeals</CardContent></Card>
          ) : reviewedAppeals.map(a => (
            <Card key={a.id} className={`border-l-4 ${a.appeal_status === 'approved' ? 'border-l-green-500' : 'border-l-destructive'}`}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{a.employee_name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(a.deduction_date), 'MMM d, yyyy')}</p>
                    <p className="text-xs mt-1">Reason: {a.appeal_reason}</p>
                    {a.review_notes && <p className="text-xs text-muted-foreground mt-1">Notes: {a.review_notes}</p>}
                  </div>
                  <div className="text-right">
                    <Badge className={a.appeal_status === 'approved' ? 'bg-green-600' : ''} variant={a.appeal_status === 'rejected' ? 'destructive' : 'default'}>
                      {a.appeal_status === 'approved' ? 'Approved & Refunded' : 'Rejected'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">by {a.reviewed_by}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AbsenceAppealManager;
