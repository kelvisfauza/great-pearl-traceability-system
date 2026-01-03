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

  const fetchRecentApprovals = async () => {
    try {
      setLoading(true);
      
      const [approvalRequests, deletionRequests, editRequests, moneyRequests] = await Promise.all([
        supabase
          .from('approval_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('deletion_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('edit_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .order('updated_at', { ascending: false })
          .limit(15),
        supabase
          .from('money_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .order('updated_at', { ascending: false })
          .limit(15)
      ]);

      const unified = mapToUnifiedRequests(approvalRequests.data, deletionRequests.data, editRequests.data, moneyRequests.data);
      unified.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
      
      setRecentRequests(unified.slice(0, 10));
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
      
      const [approvalRequests, deletionRequests, editRequests, moneyRequests] = await Promise.all([
        supabase
          .from('approval_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .gte('updated_at', startDate)
          .lte('updated_at', endDate + 'T23:59:59')
          .order('updated_at', { ascending: false }),
        supabase
          .from('deletion_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .gte('updated_at', startDate)
          .lte('updated_at', endDate + 'T23:59:59')
          .order('updated_at', { ascending: false }),
        supabase
          .from('edit_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .gte('updated_at', startDate)
          .lte('updated_at', endDate + 'T23:59:59')
          .order('updated_at', { ascending: false }),
        supabase
          .from('money_requests')
          .select('*')
          .in('status', ['approved', 'Approved'])
          .gte('updated_at', startDate)
          .lte('updated_at', endDate + 'T23:59:59')
          .order('updated_at', { ascending: false })
      ]);

      const unified = mapToUnifiedRequests(approvalRequests.data, deletionRequests.data, editRequests.data, moneyRequests.data);
      unified.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
      
      setFilteredRequests(unified);
      setShowFiltered(true);
    } catch (error) {
      console.error('Error fetching filtered requests:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  const mapToUnifiedRequests = (
    approvalData: any[] | null,
    deletionData: any[] | null,
    editData: any[] | null,
    moneyData: any[] | null
  ): ApprovedRequest[] => {
    return [
      ...(approvalData || []).map(req => ({
        id: req.id,
        type: 'expense',
        title: req.title || 'Expense Request',
        status: req.status,
        approvedAt: new Date(req.updated_at),
        approvedBy: req.admin_approved_by || req.finance_approved_by,
        department: req.department,
        amount: req.amount || 0,
        financeApproved: req.finance_approved,
        financeApprovedBy: req.finance_approved_by,
        financeApprovedAt: req.finance_approved_at ? new Date(req.finance_approved_at) : undefined,
        adminApproved: req.admin_approved,
        adminApprovedBy: req.admin_approved_by,
        adminApprovedAt: req.admin_approved_at ? new Date(req.admin_approved_at) : undefined,
      })),
      ...(deletionData || []).map(req => ({
        id: req.id,
        type: 'deletion',
        title: `Delete ${req.table_name} record`,
        status: req.status,
        approvedAt: new Date(req.updated_at),
        approvedBy: req.reviewed_by,
        department: req.requested_by_department,
        adminApproved: true,
        adminApprovedBy: req.reviewed_by,
      })),
      ...(editData || []).map(req => ({
        id: req.id,
        type: 'modification',
        title: `Edit ${req.table_name} record`,
        status: req.status,
        approvedAt: new Date(req.updated_at),
        department: req.requested_by_department,
        adminApproved: true,
      })),
      ...(moneyData || []).map(req => ({
        id: req.id,
        type: 'money',
        title: req.reason || 'Money Request',
        status: req.status,
        approvedAt: new Date(req.admin_approved_at || req.finance_approved_at || req.updated_at),
        approvedBy: req.admin_approved_by || req.finance_approved_by,
        department: 'Finance',
        amount: req.amount ? parseFloat(req.amount.toString()) : 0,
        financeApproved: req.finance_approved,
        financeApprovedBy: req.finance_approved_by,
        financeApprovedAt: req.finance_approved_at ? new Date(req.finance_approved_at) : undefined,
        adminApproved: req.admin_approved,
        adminApprovedBy: req.admin_approved_by,
        adminApprovedAt: req.admin_approved_at ? new Date(req.admin_approved_at) : undefined,
      }))
    ];
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'expense': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'deletion': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'modification': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'money': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
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
