import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Clock, User, DollarSign, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ApprovedRequest {
  id: string;
  type: string;
  title: string;
  status: string;
  approvedAt: Date;
  approvedBy?: string;
  department?: string;
  amount?: number;
  financeApproved?: boolean;
  financeApprovedBy?: string;
  financeApprovedAt?: Date;
  adminApproved?: boolean;
  adminApprovedBy?: string;
  adminApprovedAt?: Date;
}

const ApprovedRequestsHistory = () => {
  const [recentRequests, setRecentRequests] = useState<ApprovedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ApprovedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFiltered, setShowFiltered] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterLoading, setFilterLoading] = useState(false);

  useEffect(() => {
    fetchRecentApprovals();
  }, []);

  const APPROVED_STATUSES = ['approved', 'Approved', 'completed', 'Completed', 'paid', 'Paid', 'disbursed', 'Disbursed'];

  const fetchAll = async (dateFilter?: { start: string; end: string }) => {
    const sb: any = supabase;
    const apply = (q: any, col = 'updated_at') => {
      if (dateFilter) {
        return q.gte(col, dateFilter.start).lte(col, dateFilter.end + 'T23:59:59');
      }
      return q.limit(20);
    };

    const safe = async (p: Promise<any>) => {
      try { const r = await p; return r.data || []; } catch (e) { console.warn('approval source failed', e); return []; }
    };

    const results: any[] = await Promise.all([
      safe(apply(sb.from('approval_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('deletion_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('edit_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('contract_renewal_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('meal_disbursements').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('service_provider_payments').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('provider_submission_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('support_staff_per_diem').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('employee_salary_advances').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('price_approval_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('instant_withdrawals').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('admin_initiated_withdrawals').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('contract_approvals').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('monthly_overtime_reviews').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('transfer_reversal_requests').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('absence_appeals').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('loans').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('overtime_awards').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
      safe(apply(sb.from('bonuses').select('*').in('status', APPROVED_STATUSES).order('updated_at', { ascending: false }))),
    ]);
    const [
      approvalRequests,
      deletionRequests,
      editRequests,
      contractRenewals,
      mealDisbursements,
      providerPayments,
      providerSubmissions,
      supportPerDiem,
      salaryAdvances,
      priceApprovals,
      instantWd,
      adminWd,
      contractApprovals,
      overtimeReviews,
      transferReversals,
      absenceAppeals,
      loans,
      overtimeAwards,
      bonuses,
    ] = results;

    const num = (v: any) => (v == null ? 0 : parseFloat(v.toString()) || 0);
    const d = (v: any) => (v ? new Date(v) : undefined);

    const unified: ApprovedRequest[] = [
      ...approvalRequests.map((r: any) => ({
        id: r.id, type: r.type === 'Salary Advance' ? 'salary advance' : r.type === 'Withdrawal Request' ? 'withdrawal' : r.type === 'Money Request' ? 'money' : 'expense',
        title: r.title || r.reason || 'Request', status: r.status,
        approvedAt: new Date(r.admin_final_approval_at || r.finance_review_at || r.admin_approved_at || r.finance_approved_at || r.updated_at),
        approvedBy: r.admin_approved_by || r.finance_approved_by, department: r.department, amount: num(r.amount),
        financeApproved: !!(r.finance_approved || r.finance_review_at), financeApprovedBy: r.finance_review_by || r.finance_approved_by, financeApprovedAt: d(r.finance_review_at || r.finance_approved_at),
        adminApproved: !!(r.admin_approved || r.admin_final_approval_at), adminApprovedBy: r.admin_final_approval_by || r.admin_approved_by, adminApprovedAt: d(r.admin_final_approval_at || r.admin_approved_at),
      })),
      ...deletionRequests.map((r: any) => ({ id: r.id, type: 'deletion', title: `Delete ${r.table_name} record`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.reviewed_by, department: r.requested_by_department, adminApproved: true, adminApprovedBy: r.reviewed_by })),
      ...editRequests.map((r: any) => ({ id: r.id, type: 'modification', title: `Edit ${r.table_name} record`, status: r.status, approvedAt: new Date(r.updated_at), department: r.requested_by_department, adminApproved: true })),
      ...contractRenewals.map((r: any) => ({ id: r.id, type: 'contract renewal', title: `Contract renewal - ${r.employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.reviewed_by, department: r.department })),
      ...mealDisbursements.map((r: any) => ({ id: r.id, type: 'meal disbursement', title: `Meal - ${r.recipient_name || r.provider_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'Operations' })),
      ...providerPayments.map((r: any) => ({ id: r.id, type: 'provider payment', title: `Provider - ${r.provider_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'Finance' })),
      ...providerSubmissions.map((r: any) => ({ id: r.id, type: 'provider submission', title: r.provider_name || 'Provider submission', status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.reviewed_by, amount: num(r.amount) })),
      ...supportPerDiem.map((r: any) => ({ id: r.id, type: 'per diem', title: `Per-diem - ${r.staff_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'HR' })),
      ...salaryAdvances.map((r: any) => ({ id: r.id, type: 'salary advance', title: `Salary advance - ${r.employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'HR' })),
      ...priceApprovals.map((r: any) => ({ id: r.id, type: 'price approval', title: r.title || 'Price approval', status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, department: r.department })),
      ...instantWd.map((r: any) => ({ id: r.id, type: 'withdrawal', title: `Instant withdrawal - ${r.channel || 'MoMo'}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'Finance' })),
      ...adminWd.map((r: any) => ({ id: r.id, type: 'admin withdrawal', title: `Admin withdrawal - ${r.target_employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.initiated_by, amount: num(r.amount), department: 'Admin' })),
      ...contractApprovals.map((r: any) => ({ id: r.id, type: 'contract', title: r.title || `Contract approval`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, department: r.department })),
      ...overtimeReviews.map((r: any) => ({ id: r.id, type: 'overtime', title: `Overtime review - ${r.employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.reviewed_by, amount: num(r.total_amount), department: 'HR' })),
      ...transferReversals.map((r: any) => ({ id: r.id, type: 'reversal', title: `Transfer reversal`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.reviewed_by, amount: num(r.amount), department: 'Finance' })),
      ...absenceAppeals.map((r: any) => ({ id: r.id, type: 'absence appeal', title: `Absence appeal - ${r.employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.reviewed_by, department: 'HR' })),
      ...loans.map((r: any) => ({ id: r.id, type: 'loan', title: `Loan - ${r.borrower_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'Finance' })),
      ...overtimeAwards.map((r: any) => ({ id: r.id, type: 'overtime award', title: `Overtime award - ${r.employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'HR' })),
      ...bonuses.map((r: any) => ({ id: r.id, type: 'bonus', title: r.title || `Bonus - ${r.employee_name || ''}`, status: r.status, approvedAt: new Date(r.updated_at), approvedBy: r.approved_by, amount: num(r.amount), department: 'HR' })),
    ];

    unified.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
    return unified;
  };

  const fetchRecentApprovals = async () => {
    try {
      setLoading(true);
      const unified = await fetchAll();
      setRecentRequests(unified.slice(0, 25));
    } catch (error) {
      console.error('Error fetching approved requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredApprovals = async () => {
    if (!startDate || !endDate) return;
    try {
      setFilterLoading(true);
      const unified = await fetchAll({ start: startDate, end: endDate });
      setFilteredRequests(unified);
      setShowFiltered(true);
    } catch (error) {
      console.error('Error fetching filtered requests:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expense': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'deletion': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'modification': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'money': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'withdrawal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'admin withdrawal': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'contract renewal':
      case 'contract': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'meal disbursement':
      case 'provider payment':
      case 'provider submission': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'per diem':
      case 'salary advance':
      case 'overtime':
      case 'overtime award':
      case 'absence appeal':
      case 'bonus': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      case 'price approval': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case 'reversal': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      case 'loan': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderRequestItem = (request: ApprovedRequest) => (
    <div 
      key={request.id}
      className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getTypeColor(request.type)}>
            {request.type}
          </Badge>
          {request.department && (
            <Badge variant="outline" className="text-xs">
              {request.department}
            </Badge>
          )}
        </div>
        {request.amount && request.amount > 0 && (
          <span className="text-sm font-semibold text-foreground">
            UGX {request.amount.toLocaleString()}
          </span>
        )}
      </div>
      
      <p className="font-medium text-sm text-foreground">{request.title}</p>
      
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(request.approvedAt)}
        </span>
        
        {/* Admin Approval Status */}
        {request.adminApproved && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Admin: {request.adminApprovedBy || 'Approved'}
          </span>
        )}
        
        {/* Finance Approval Status */}
        {request.financeApproved && (
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <DollarSign className="h-3 w-3" />
            Finance: {request.financeApprovedBy || 'Approved'}
          </span>
        )}
        
        {/* Fallback for general approver */}
        {!request.adminApproved && !request.financeApproved && request.approvedBy && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {request.approvedBy}
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approval History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading approval history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Approval History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recent 10 Approvals */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Most Recent Approvals</h4>
          <ScrollArea className="h-[350px]">
            {recentRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No approved requests found.</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {recentRequests.map(renderRequestItem)}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Date Filter Section */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Older Approvals by Date
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={fetchFilteredApprovals} 
                  disabled={!startDate || !endDate || filterLoading}
                  className="w-full sm:w-auto"
                >
                  {filterLoading ? 'Loading...' : 'Search'}
                </Button>
              </div>
            </div>

            {showFiltered && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Results ({filteredRequests.length} found)
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setShowFiltered(false); setFilteredRequests([]); }}
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-[300px]">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No approvals found for this date range.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-4">
                      {filteredRequests.map(renderRequestItem)}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default ApprovedRequestsHistory;
