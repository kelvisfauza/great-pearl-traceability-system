import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ReturnToProcurementButton from './approval/ReturnToProcurementButton';
import { CheckCircle, XCircle, RefreshCw, Clock, User, Calendar, DollarSign, Eye, FileText, TrendingUp, AlertTriangle, Package, Settings, Banknote, Search } from 'lucide-react';
import { useUnifiedApprovalRequests, UnifiedApprovalRequest } from '@/hooks/useUnifiedApprovalRequests';
import { useToast } from '@/hooks/use-toast';
import { useProcurementRecommendations } from '@/hooks/useProcurementRecommendations';
import { RejectionModal } from './workflow/RejectionModal';
import { WorkflowTracker } from './workflow/WorkflowTracker';
import { DynamicDetailedView } from './workflow/DynamicDetailedView';
import { AuditPrintModal } from './workflow/AuditPrintModal';
import { DelegateApprovalModal } from './approval/DelegateApprovalModal';
import { DisbursePaymentModal, DisburseTarget } from './approval/DisbursePaymentModal';
import FingerprintApprovalDialog, { FingerprintApprovalTarget } from './approval/FingerprintApprovalDialog';
import { requiresFingerprintApproval } from '@/utils/fingerprintApproval';
import ApprovalCodeDialog, { ApprovalCodeTarget } from './approval/ApprovalCodeDialog';
import { AwaitingDisbursementPanel } from './approval/AwaitingDisbursementPanel';
import { isWithdrawalRequest, needsSecondAdminApproval } from '@/lib/withdrawalApprovalRules';
import { useProcurementReviews } from '@/hooks/useProcurementReviews';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const POLLING_INTERVAL = 10000; // 10 seconds

const ApprovalCenter = () => {
  const { requests, loading, updateRequestStatus, fetchRequests } = useUnifiedApprovalRequests();
  const { recommendations, loading: recommendationsLoading } = useProcurementRecommendations();
  const { reviews: procurementReviews, refresh: refreshProcurementReviews } = useProcurementReviews(requests.map((r) => r.id));
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'withdrawal' | 'second' | 'failed'>('all');
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<UnifiedApprovalRequest | null>(null);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [detailedViewModalOpen, setDetailedViewModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [workflowDataForPrint, setWorkflowDataForPrint] = useState<any>(null);
  const { toast } = useToast();
  const [delegateModal, setDelegateModal] = useState<{ open: boolean; reason: string; requestId: string; amount: number; title?: string }>({ open: false, reason: '', requestId: '', amount: 0 });
  const [disburseTarget, setDisburseTarget] = useState<DisburseTarget | null>(null);
  const [fingerprintTarget, setFingerprintTarget] = useState<FingerprintApprovalTarget | null>(null);
  const [codeTarget, setCodeTarget] = useState<ApprovalCodeTarget | null>(null);

  // Only fresh money requests go through Procurement first. Staff withdrawals,
  // failed-payout retries and already-approved items are never reviewed there.
  const requiresProcurementGate = (request: UnifiedApprovalRequest) => {
    if (request.type !== 'general') return false;
    const rt = request.requestType || '';
    if (/withdraw|failed payout|retry/i.test(rt)) return false;
    if (/payout failed/i.test(request.status || '')) return false;
    return true;
  };

  const isAwaitingProcurement = (request: UnifiedApprovalRequest) => {
    if (!requiresProcurementGate(request)) return false;
    const decision = procurementReviews[request.id]?.decision;
    return !decision || decision === 'pending' || decision === 'returned';
  };

  // Auto-refresh pending requests in background to prevent double approvals
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if not currently processing an action
      if (!processingId) {
        // Silent background refresh - don't show loading state
        fetchRequests(true);
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [processingId, fetchRequests]);

  /**
   * Money-related approvals must be confirmed with the admin's fingerprint
   * (scanned on their phone) before the status is changed.
   */
  const handleApproval = async (request: UnifiedApprovalRequest, fingerprintVerified = false) => {
    if (isAwaitingProcurement(request)) {
      toast({
        title: 'Procurement review required',
        description: 'Admin approval is locked until Procurement submits its decision.',
        variant: 'destructive',
      });
      return;
    }
    if (!fingerprintVerified && requiresFingerprintApproval(request.amount, request.type)) {
      const amt = typeof request.amount === 'number' ? request.amount : parseFloat(String(request.amount)) || 0;
      setFingerprintTarget({
        title: request.title,
        amount: amt,
        requestId: request.id,
        onConfirmed: () => handleApproval(request, true),
      });
      return;
    }
    // Prevent double-click: if already processing any request, block
    if (processingId) {
      console.warn('⛔ Already processing a request, ignoring duplicate click');
      return;
    }
    setProcessingId(request.id);
    try {
      const result = await updateRequestStatus(request, 'Approved');
      if (result && typeof result === 'object' && 'blocked' in result) {
        const amt = typeof request.amount === 'number' ? request.amount : parseFloat(String(request.amount)) || 0;
        setDelegateModal({ open: true, reason: result.reason, requestId: request.id, amount: amt, title: request.title });
      } else if (result === true) {
        toast({
          title: "✅ Approved Successfully",
          description: `${request.title} has been approved.`,
        });
        // If this approval fully cleared the request, prompt for payment release
        if (request.source === 'supabase') {
          const { data: fresh } = await (supabase as any)
            .from('approval_requests')
            .select('id, status, amount, title, disbursement_phone, requestedby_name, requestedby, details, payout_status')
            .eq('id', request.id)
            .maybeSingle();
          const done = String(fresh?.status || '').toLowerCase() === 'approved';
          const notPaid = !['sent', 'processing', 'cash_disbursed'].includes(String(fresh?.payout_status || ''));
          if (fresh && done && notPaid) {
            const d = fresh.details || {};
            setDisburseTarget({
              requestId: fresh.id,
              title: fresh.title,
              amount: Number(fresh.amount) || 0,
              phone: fresh.disbursement_phone || d?.recipient_phone || d?.beneficiary_phone || d?.phone || '',
              recipientName: d?.recipient_name || d?.beneficiary_name || d?.employee_name || fresh.requestedby_name || fresh.requestedby,

            });
          }
        }
      } else if (result === false) {
        toast({
          title: "Approval Failed",
          description: "Could not process this approval. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast({
        title: "Approval Error",
        description: error?.message || "An unexpected error occurred while approving.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayCash = async (request: UnifiedApprovalRequest) => {
    if (processingId) return;
    setProcessingId(request.id);
    try {
      const withdrawalId = request.details?.withdrawal_id || request.id;
      const recipientName = request.details?.requester_name || request.requestedBy || 'Employee';
      const phoneNumber = request.details?.disbursement_phone || request.details?.phone_number || '';
      const amount = Number(request.amount);
      
      // Update the withdrawal to cash, clear payout error, mark as sent
      const { error } = await (supabase as any)
        .from('approval_requests')
        .update({
          channel: 'CASH',
          payment_channel: 'CASH',
          payout_status: 'sent',
          payout_error: null,
          payout_ref: `CASH-${Date.now()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) {
        toast({ title: 'Error', description: 'Failed to switch to cash payment', variant: 'destructive' });
        console.error('Pay cash error:', error);
      } else {
        toast({ title: 'Switched to Cash', description: `UGX ${amount.toLocaleString()} marked as cash payment. Please hand over the cash to ${recipientName}.` });
        
        // Send SMS notification to the user about cash payment
        if (phoneNumber) {
          try {
            await supabase.functions.invoke('send-sms', {
              body: {
                phone: phoneNumber,
                message: `Dear ${recipientName}, MoMo payout of UGX ${amount.toLocaleString()} failed. Cash has been prepared for you. Please collect from the office.`,
                userName: recipientName,
                messageType: 'withdrawal_cash_fallback'
              }
            });
            console.log('Cash fallback SMS sent to', phoneNumber);
          } catch (smsErr) {
            console.error('Failed to send cash fallback SMS:', smsErr);
          }
        }
        
        await fetchRequests(true);
      }
    } catch (err) {
      console.error('Pay cash error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejection = (request: UnifiedApprovalRequest) => {
    if (isAwaitingProcurement(request)) {
      toast({
        title: 'Procurement review required',
        description: 'Admin rejection is locked until Procurement submits its decision.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedRequest(request);
    setRejectionModalOpen(true);
  };

  const handleRejectionConfirm = async (reason: string, comments?: string) => {
    if (!selectedRequest) return;
    
    setProcessingId(selectedRequest.id);
    try {
      const success = await updateRequestStatus(selectedRequest, 'Rejected', reason, comments);
    } catch (error) {
      console.error('Error processing rejection:', error);
    } finally {
      setProcessingId(null);
      setSelectedRequest(null);
    }
  };

  const handleViewWorkflow = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setWorkflowModalOpen(true);
  };

  const handleViewDetailedWorkflow = (request: UnifiedApprovalRequest) => {
    setSelectedRequest(request);
    setSelectedPaymentId(request.originalPaymentId || request.details?.paymentId || null);
    setDetailedViewModalOpen(true);
  };

  const handleDetailedApproval = async () => {
    if (!selectedRequest) return;
    await handleApproval(selectedRequest);
    setDetailedViewModalOpen(false);
  };

  const handleDetailedRejection = () => {
    setDetailedViewModalOpen(false);
    if (selectedRequest) {
      handleRejection(selectedRequest);
    }
  };

  const handlePrintAudit = (workflowData: any) => {
    setWorkflowDataForPrint(workflowData);
    setPrintModalOpen(true);
  };

  const handleRefresh = async () => {
    await fetchRequests();
    toast({
      title: "Refreshed",
      description: "All approval requests have been refreshed"
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string, requestType: string) => {
    if (type === 'modification') return Settings;
    if (requestType === 'Store Report Deletion') return FileText;
    if (requestType === 'User Registration') return User;
    if (requestType === 'Salary Payment') return DollarSign;
    if (requestType === 'Bank Transfer') return DollarSign;
    return Package;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'modification': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'deletion': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatAmount = (amount: string | number) => {
    if (!amount || amount === 0 || amount === '0') return 'N/A';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
    
    if (isNaN(numericAmount)) {
      return amount;
    }
    
    return `UGX ${numericAmount.toLocaleString()}`;
  };

  const SOURCE_LABELS: Record<string, string> = {
    supabase: 'System',
    firebase: 'Legacy System',
    wallet: 'Wallet',
    manual: 'Manual Entry',
  };

  const formatSource = (source?: string | null) => {
    if (!source) return 'System';
    const key = String(source).toLowerCase();
    if (SOURCE_LABELS[key]) return SOURCE_LABELS[key];
    return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const counts = {
    all: requests.length,
    withdrawal: requests.filter((r) => isWithdrawalRequest(r.requestType, r.details)).length,
    second: requests.filter((r) => r.status === 'Pending Admin 2').length,
    failed: requests.filter((r) => r.details?.is_failed_payout).length,
  };
  const totalValue = requests.reduce((sum, r) => {
    const n = typeof r.amount === 'string' ? parseFloat(String(r.amount).replace(/[^\d.-]/g, '')) : Number(r.amount);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const visible = requests.filter((r) => {
    if (filter === 'withdrawal' && !isWithdrawalRequest(r.requestType, r.details)) return false;
    if (filter === 'second' && r.status !== 'Pending Admin 2') return false;
    if (filter === 'failed' && !r.details?.is_failed_payout) return false;
    if (!q) return true;
    return [r.title, r.requestedBy, r.department, r.requestType, r.description]
      .some((v) => String(v ?? '').toLowerCase().includes(q));
  });
  const selected = visible.find((r) => r.id === selectedId) || visible[0] || null;
  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'withdrawal', label: 'Withdrawals' },
    { key: 'second', label: 'Needs 2nd admin' },
    { key: 'failed', label: 'Failed payouts' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Pending requests</h3>
          <p className="text-xs text-muted-foreground">Select a request on the left to review and decide.</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, title or department" className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? 'default' : 'outline'}
              className={`rounded-md shrink-0 ${filter === f.key ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md border-transparent' : ''}`}
              onClick={() => setFilter(f.key)}>
              {f.label}
              <span className={`ml-2 rounded-full px-1.5 text-xs ${filter === f.key ? 'bg-background/25' : 'bg-primary/10 text-primary'}`}>{counts[f.key]}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Requests — inbox layout */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center"><CheckCircle className="h-7 w-7" /></div>
          <h3 className="text-lg font-semibold">{requests.length === 0 ? 'All caught up' : 'Nothing matches'}</h3>
          <p className="text-sm text-muted-foreground">{requests.length === 0 ? 'No requests are waiting for approval.' : 'Try a different search or filter.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="rounded-xl border bg-card overflow-hidden lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
            {visible.map((r) => {
              const Icon = getTypeIcon(r.type, r.requestType);
              const active = selected?.id === r.id;
              const failed = !!r.details?.is_failed_payout;
              const second = r.status === 'Pending Admin 2';
              const chip = failed
                ? 'bg-destructive/15 text-destructive'
                : second
                  ? 'bg-accent/25 text-accent-foreground'
                  : active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/10 text-primary';
              return (
                <button key={r.id} onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-l-4 transition-colors ${
                    failed ? 'border-l-destructive' : active ? 'border-l-primary' : second ? 'border-l-accent' : 'border-l-transparent'
                  } ${active ? 'bg-primary/10' : failed ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/50'}`}>
                  <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${chip}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{r.requestedBy}</p>
                      <p className={`text-sm font-semibold shrink-0 ${failed ? 'text-destructive' : 'text-primary'}`}>{formatAmount(r.amount)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">{r.title}</p>
                      {failed ? <span className="text-[10px] font-semibold uppercase text-destructive">Failed</span>
                        : second ? <span className="text-[10px] font-semibold uppercase text-accent-foreground bg-accent/25 rounded-full px-1.5">2nd admin</span>
                        : <span className="text-[10px] text-muted-foreground shrink-0">{r.dateRequested}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="min-w-0 order-first lg:order-none">
          {(selected ? [selected] : []).map((request) => {
            const TypeIcon = getTypeIcon(request.type, request.requestType);
            const awaitingProcurement = isAwaitingProcurement(request);
            const failed = !!request.details?.is_failed_payout;
            return (
              <div key={request.id} className="rounded-xl border bg-card p-5 sm:p-7 shadow-lg relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-accent to-secondary" />
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-md">
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold truncate">{request.title}</h3>
                        <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-primary/20">{request.type === 'modification' ? 'Modification' : request.requestType}</Badge>
                        <Badge variant="outline" className="rounded-full capitalize">{request.priority}</Badge>
                      </div>
                      {request.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{request.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{request.requestedBy}{request.department ? ` · ${request.department}` : ''}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{request.dateRequested}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatSource(request.source)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0 rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold text-primary">{formatAmount(request.amount)}</p>
                    <div className="flex sm:justify-end gap-1 mt-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetailedWorkflow(request)}>
                        <FileText className="h-4 w-4 mr-1" /> Details
                      </Button>
                      {(request.originalPaymentId || request.details?.paymentId) && (
                        <Button variant="ghost" size="sm" onClick={() => handleViewWorkflow(request.originalPaymentId || request.details?.paymentId || '')}>
                          <Eye className="h-4 w-4 mr-1" /> Workflow
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-3 [&>div]:mb-0">
                      {/* Procurement first-stage review */}
                      {(() => {
                        if (!requiresProcurementGate(request)) return null;
                        const review = procurementReviews[request.id];
                        if (!review) {
                          return (
                            <div className="mb-4 p-3 bg-muted/60 border border-dashed rounded-lg">
                              <p className="text-xs text-muted-foreground">
                                Procurement review: <strong>not yet reviewed</strong> by the procurement office.
                              </p>
                            </div>
                          );
                        }
                        const cleared = review.decision === 'approved';
                        const rejected = review.decision === 'rejected';
                        const returned = review.decision === 'returned';
                        return (
                          <div className={`mb-4 p-3 rounded-lg border ${
                            cleared
                              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                              : rejected
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                          }`}>
                            <p className="text-sm font-medium">
                              {cleared
                                ? `Cleared by procurement (${review.reviewed_by || 'Procurement'})`
                                : rejected
                                  ? `Rejected at procurement (${review.reviewed_by || 'Procurement'})`
                                  : returned
                                    ? `Sent back to procurement for changes (by ${review.returned_by || 'admin'})`
                                    : 'Awaiting procurement review'}
                            </p>
                            {returned && review.return_reason && (
                              <p className="text-xs text-muted-foreground mt-1"><strong>Requested change:</strong> {review.return_reason}</p>
                            )}
                            {review.notes && (
                              <p className="text-xs text-muted-foreground mt-1"><strong>Observations:</strong> {review.notes}</p>
                            )}
                            {review.edited_amount != null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>Amount corrected:</strong> {formatAmount(review.original_amount || 0)} → {formatAmount(review.edited_amount)}
                              </p>
                            )}
                            {review.recommended_admin_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>Forwarded to:</strong> {review.recommended_admin_name}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Failed payout banner */}
                      {request.details?.is_failed_payout && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="font-medium text-red-800 dark:text-red-200">
                              Payout Failed — Money was NOT sent
                            </span>
                          </div>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Error: {request.details?.payout_error || 'Unknown error'} 
                            {request.details?.payout_attempted_at && ` • Last attempt: ${new Date(request.details.payout_attempted_at).toLocaleString()}`}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Phone: {request.details?.disbursement_phone || request.details?.phone_number || 'N/A'}
                          </p>
                        </div>
                      )}

                      {/* 3-tier approval progress indicator */}
                      {request.status === 'Pending Admin 2' && (
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-amber-800 dark:text-amber-200">
                              Admin 1 approved ({request.details?.admin_approved_1_by || 'Admin'}) — Awaiting 2nd admin approval
                            </span>
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            High-value request ({formatAmount(request.amount)}) requires Finance review + 2 admin approvals.
                          </p>
                        </div>
                      )}

                      {needsSecondAdminApproval(request.amount, isWithdrawalRequest(request.requestType, request.details)) && request.status !== 'Pending Admin 2' && !request.details?.is_failed_payout && (
                        <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Needs two administrator approvals before Finance.
                          </p>
                        </div>
                      )}

                      {request.batchNumber && (
                        <div className="mb-4 p-2 bg-muted rounded">
                          <p className="text-sm"><strong>Batch:</strong> {request.batchNumber}</p>
                          {request.reason && <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>}
                          {request.comments && <p className="text-sm"><strong>Comments:</strong> {request.comments}</p>}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {request.details?.is_failed_payout ? (
                          <>
                            <Button
                              onClick={() => handleApproval(request)}
                              disabled={processingId === request.id || awaitingProcurement}
                              title={awaitingProcurement ? 'Procurement must complete its review first' : undefined}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Retry Payout
                            </Button>
                            <Button
                              onClick={() => handlePayCash(request)}
                              disabled={processingId === request.id}
                              variant="outline"
                              className="border-green-600 text-green-700 hover:bg-green-50"
                            >
                              <Banknote className="h-4 w-4 mr-2" />
                              Pay Cash Instead
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleApproval(request)}
                              disabled={processingId === request.id || awaitingProcurement}
                              title={awaitingProcurement ? 'Procurement must complete its review first' : undefined}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {request.status === 'Pending Admin 2' ? 'Approve (Admin 2)' : 
                               needsSecondAdminApproval(request.amount, isWithdrawalRequest(request.requestType, request.details)) ? 'Approve (Admin 1)' : 'Approve'}
                            </Button>
                            <Button
                              onClick={() => handleRejection(request)}
                              disabled={processingId === request.id || awaitingProcurement}
                              title={awaitingProcurement ? 'Procurement must complete its review first' : undefined}
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            {request.type === 'general' && !/withdraw/i.test(request.requestType || '') && (
                              <ReturnToProcurementButton
                                sourceTable="approval_requests"
                                recordId={request.id}
                                title={request.title}
                                requestedBy={request.requestedBy}
                                amount={request.amount}
                                disabled={processingId === request.id}
                                onReturned={refreshProcurementReviews}
                              />
                            )}
                          </>
                        )}
                        {processingId === request.id && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            {request.details?.is_failed_payout ? 'Retrying payout...' : 'Processing...'}
                          </div>
                        )}
                      </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Procurement recommendations (secondary) */}
      {recommendations.length > 0 && !recommendationsLoading && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer flex items-center gap-2 font-medium">
            <TrendingUp className="h-4 w-4 text-primary" /> Procurement recommendations ({recommendations.length})
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={rec.id || index} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{rec.grade}</span>
                  <Badge variant={rec.action === 'Strong Buy' ? 'default' : 'outline'} className="rounded-full">{rec.action}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">UGX {rec.priceRange}</p>
                <p className="text-xs text-muted-foreground mt-1">{rec.confidence}% confidence · {rec.risk} risk · {rec.timeframe}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      <RejectionModal
        open={rejectionModalOpen}
        onClose={() => {
          setRejectionModalOpen(false);
          setSelectedRequest(null);
        }}
        onConfirm={handleRejectionConfirm}
        title="Reject Request"
        description="Please provide a reason for rejecting this request. This will help the requesting department understand what needs to be modified."
      />

      <Dialog open={workflowModalOpen} onOpenChange={setWorkflowModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow History</DialogTitle>
          </DialogHeader>
          {selectedPaymentId && (
            <WorkflowTracker paymentId={selectedPaymentId} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={detailedViewModalOpen} onOpenChange={setDetailedViewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Request Review</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <DynamicDetailedView
              request={selectedRequest}
              onApprove={handleDetailedApproval}
              onReject={handleDetailedRejection}
              onPrint={handlePrintAudit}
            />
          )}
        </DialogContent>
      </Dialog>

      {printModalOpen && workflowDataForPrint && selectedRequest && (
        <AuditPrintModal
          open={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          workflowData={workflowDataForPrint}
          requestId={selectedRequest.id}
        />
      )}
      <DelegateApprovalModal
        open={delegateModal.open}
        onClose={() => setDelegateModal({ open: false, reason: '', requestId: '', amount: 0 })}
        violationReason={delegateModal.reason}
        requestId={delegateModal.requestId}
        requestType="expense_request"
        requestAmount={delegateModal.amount}
        requestTitle={delegateModal.title}
      />
      <DisbursePaymentModal
        target={disburseTarget}
        onClose={() => setDisburseTarget(null)}
        onDone={() => fetchRequests(true)}
      />
      <FingerprintApprovalDialog
        target={fingerprintTarget}
        onClose={() => setFingerprintTarget(null)}
        onUseSmsCode={(t) => setCodeTarget({
          targetType: 'approval_request',
          targetId: t.requestId || 'unknown',
          label: t.title,
          amount: t.amount,
          onVerified: () => { void t.onConfirmed(); },
        })}
      />
      <ApprovalCodeDialog target={codeTarget} onClose={() => setCodeTarget(null)} />
    </div>
  );
};

export default ApprovalCenter;