import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Shield, Clock, Ban } from 'lucide-react';

type PageState = 'loading' | 'valid' | 'used' | 'expired' | 'invalid' | 'processing' | 'success' | 'error';

const ApproveAction = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const urlAction = searchParams.get('action');

  const [state, setState] = useState<PageState>('loading');
  const [tokenData, setTokenData] = useState<any>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-approval-action', {
        body: { token, action: 'validate' }
      });

      if (error) {
        setState('invalid');
        return;
      }

      if (data.error === 'already_used') {
        setState('used');
      } else if (data.error === 'expired') {
        setState('expired');
      } else if (data.error === 'invalid_token') {
        setState('invalid');
      } else if (data.status === 'valid') {
        setTokenData(data);
        setState('valid');
      } else {
        setState('invalid');
      }
    } catch {
      setState('invalid');
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    setState('processing');
    try {
      const { data, error } = await supabase.functions.invoke('handle-approval-action', {
        body: { token, action, rejectReason: action === 'reject' ? rejectReason : null }
      });

      if (error || data?.error) {
        if (data?.error === 'self_approval') {
          setResultMessage('You cannot approve your own request.');
          setState('error');
        } else if (data?.error === 'already_used') {
          setState('used');
        } else {
          setResultMessage(data?.message || 'An error occurred.');
          setState('error');
        }
        return;
      }

      setResultMessage(data?.message || `Request has been ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setState('success');
    } catch {
      setResultMessage('Failed to process action. Please try again or log in to the system.');
      setState('error');
    }
  };

  const fmt = (v: number) => `UGX ${Number(v).toLocaleString()}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        {/* Loading */}
        {state === 'loading' && (
          <CardContent className="py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Validating approval link...</p>
          </CardContent>
        )}

        {/* Invalid Token */}
        {state === 'invalid' && (
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">This approval link is invalid or does not exist.</p>
          </CardContent>
        )}

        {/* Already Used */}
        {state === 'used' && (
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Already Processed</h2>
            <p className="text-muted-foreground">This approval link has already been used. No further action is needed.</p>
          </CardContent>
        )}

        {/* Expired */}
        {state === 'expired' && (
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Link Expired</h2>
            <p className="text-muted-foreground">This approval link has expired. Please log in to the system to take action.</p>
          </CardContent>
        )}

        {/* Valid - Show request details + action buttons */}
        {state === 'valid' && tokenData && (
          <>
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5" />
                <CardTitle className="text-lg">Approval Action</CardTitle>
              </div>
              <p className="text-sm text-primary-foreground/80">{tokenData.approval_stage === 'finance' ? 'Finance Review' : 'Admin Approval'}</p>
              <p className="text-xs text-primary-foreground/60 mt-1">Approver: {tokenData.approver_name}</p>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Request Info */}
              <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Title</span>
                  <span className="text-sm font-semibold text-foreground text-right">{tokenData.request?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Type</span>
                  <Badge variant="outline" className="text-xs">{tokenData.request?.type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Requested By</span>
                  <span className="text-sm text-foreground">{tokenData.request?.requestedby_name || tokenData.request?.requestedby}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Department</span>
                  <span className="text-sm text-foreground">{tokenData.request?.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Date</span>
                  <span className="text-sm text-foreground">{tokenData.request?.daterequested}</span>
                </div>
                {tokenData.request?.description && (
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Description</span>
                    <span className="text-sm text-foreground text-right max-w-[200px]">{tokenData.request?.description}</span>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="text-center bg-amber-50 border border-amber-200 rounded-lg py-4">
                <p className="text-[10px] text-amber-700 uppercase tracking-widest font-bold">Amount Requested</p>
                <p className="text-2xl font-black text-amber-900">{fmt(tokenData.request?.amount)}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">{tokenData.request?.priority} Priority</Badge>
              </div>

              {/* Action Buttons */}
              {!showRejectForm ? (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-base"
                    onClick={() => handleAction('approve')}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive"
                    className="font-bold py-6 text-base"
                    onClick={() => setShowRejectForm(true)}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Textarea
                    placeholder="Reason for rejection (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => handleAction('reject')}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Confirm Reject
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center mt-2">
                🔒 This is a single-use, secure link. It expires in 48 hours.
              </p>
            </CardContent>
          </>
        )}

        {/* Processing */}
        {state === 'processing' && (
          <CardContent className="py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Processing your action...</p>
          </CardContent>
        )}

        {/* Success */}
        {state === 'success' && (
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Action Complete</h2>
            <p className="text-muted-foreground">{resultMessage}</p>
          </CardContent>
        )}

        {/* Error */}
        {state === 'error' && (
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Action Failed</h2>
            <p className="text-muted-foreground">{resultMessage}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ApproveAction;
