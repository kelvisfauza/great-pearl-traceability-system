import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, MessageSquare, XCircle } from 'lucide-react';
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
  created_at: string;
}

const MyDeductions = () => {
  const { employee } = useAuth();
  const [deductions, setDeductions] = useState<AbsenceAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealReason, setAppealReason] = useState('');
  const [appealingId, setAppealingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDeductions = async () => {
    if (!employee?.email) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('absence_appeals')
      .select('*')
      .eq('employee_email', employee.email)
      .order('deduction_date', { ascending: false });

    if (!error && data) {
      setDeductions(data as AbsenceAppeal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeductions();
  }, [employee?.email]);

  const submitAppeal = async (deductionId: string) => {
    if (!appealReason.trim()) {
      toast.error('Please provide a reason for your appeal');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from('absence_appeals')
      .update({
        appeal_status: 'pending',
        appeal_reason: appealReason.trim(),
        appeal_submitted_at: new Date().toISOString(),
      })
      .eq('id', deductionId);

    if (error) {
      toast.error('Failed to submit appeal');
    } else {
      toast.success('Appeal submitted successfully. HR will review it.');
      setAppealReason('');
      setAppealingId(null);
      fetchDeductions();
    }
    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'none':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Deducted</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Appeal Pending</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Appeal Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Appeal Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading deductions...</div>;
  }

  if (deductions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="text-lg font-medium">No deductions found</p>
          <p className="text-sm">You have no absence deductions. Keep up the good work!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          If you were deducted unfairly (e.g., you were on an approved errand, had a valid reason), 
          you can appeal the deduction. Provide your reason and HR will review it. 
          If approved, the deducted amount will be refunded to your wallet.
        </AlertDescription>
      </Alert>

      {deductions.map((d) => (
        <Card key={d.id} className="border-l-4" style={{
          borderLeftColor: d.appeal_status === 'approved' ? 'hsl(var(--primary))' : 
                          d.appeal_status === 'rejected' ? 'hsl(var(--destructive))' : 
                          d.appeal_status === 'pending' ? 'hsl(var(--secondary))' : 'hsl(var(--destructive))'
        }}>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">
                  {format(new Date(d.deduction_date), 'EEEE, MMM d, yyyy')}
                </p>
                <p className="text-sm text-destructive font-medium">
                  UGX {d.deduction_amount.toLocaleString()} deducted
                </p>
                <p className="text-xs text-muted-foreground mt-1">Not logged in by 9:00 AM</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(d.appeal_status)}
              </div>
            </div>

            {d.appeal_status === 'pending' && d.appeal_reason && (
              <div className="mt-3 bg-muted p-3 rounded-md">
                <p className="text-xs font-medium text-muted-foreground mb-1">Your appeal reason:</p>
                <p className="text-sm">{d.appeal_reason}</p>
              </div>
            )}

            {d.appeal_status === 'approved' && (
              <div className="mt-3 bg-primary/10 p-3 rounded-md">
                <p className="text-sm text-primary font-medium">Appeal approved - UGX {d.deduction_amount.toLocaleString()} refunded</p>
                {d.review_notes && <p className="text-xs mt-1">{d.review_notes}</p>}
              </div>
            )}

            {d.appeal_status === 'rejected' && (
              <div className="mt-3 bg-destructive/10 p-3 rounded-md">
                <p className="text-sm text-destructive font-medium">Appeal rejected</p>
                {d.review_notes && <p className="text-xs mt-1">{d.review_notes}</p>}
              </div>
            )}

            {d.appeal_status === 'none' && (
              <div className="mt-3">
                {appealingId === d.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Explain where you were or why you were late (e.g., 'I was on a company errand to...', 'I had a medical appointment...')"
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitAppeal(d.id)} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Appeal'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setAppealingId(null); setAppealReason(''); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setAppealingId(d.id)}>
                    <MessageSquare className="h-4 w-4" />
                    Appeal This Deduction
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyDeductions;
