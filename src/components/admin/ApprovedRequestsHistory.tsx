import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Clock, User } from 'lucide-react';
import { useUnifiedApprovalRequests } from '@/hooks/useUnifiedApprovalRequests';
import { supabase } from '@/integrations/supabase/client';

interface ApprovedRequest {
  id: string;
  type: string;
  title: string;
  status: string;
  approvedAt: Date;
  approvedBy?: string;
  department?: string;
  amount?: number;
  source: 'supabase' | 'firebase';
}

const ApprovedRequestsHistory = () => {
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  const fetchApprovedRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch approved requests from different tables
      const [approvalRequests, deletionRequests, editRequests] = await Promise.all([
        supabase
          .from('approval_requests')
          .select('*')
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('deletion_requests')
          .select('*')
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('edit_requests')
          .select('*')
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(20)
      ]);

      const unified: ApprovedRequest[] = [
        ...(approvalRequests.data || []).map(req => ({
          id: req.id,
          type: 'approval',
          title: req.title || 'Approval Request',
          status: req.status,
          approvedAt: new Date(req.updated_at),
          approvedBy: req.admin_approved_by || req.finance_approved_by,
          department: req.department,
          amount: parseFloat(req.amount) || 0,
          source: 'supabase' as const
        })),
        ...(deletionRequests.data || []).map(req => ({
          id: req.id,
          type: 'deletion',
          title: `Delete ${req.table_name} record`,
          status: req.status,
          approvedAt: new Date(req.updated_at),
          approvedBy: req.reviewed_by,
          department: req.requested_by_department,
          source: 'supabase' as const
        })),
        ...(editRequests.data || []).map(req => ({
          id: req.id,
          type: 'modification',
          title: `Edit ${req.table_name} record`,
          status: req.status,
          approvedAt: new Date(req.updated_at),
          department: req.requested_by_department,
          source: 'supabase' as const
        }))
      ];

      // Sort by approved date
      unified.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
      
      setApprovedRequests(unified);
    } catch (error) {
      console.error('Error fetching approved requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'approval': return 'bg-green-100 text-green-800';
      case 'deletion': return 'bg-red-100 text-red-800';
      case 'modification': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approved Requests History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading approved requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Approved Requests History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {approvedRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No approved requests found
            </div>
          ) : (
            <div className="space-y-3">
              {approvedRequests.map((request) => (
                <div 
                  key={request.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={getTypeColor(request.type)}>
                        {request.type}
                      </Badge>
                      {request.department && (
                        <Badge variant="outline">
                          {request.department}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">{request.title}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(request.approvedAt)}
                      </span>
                      {request.approvedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.approvedBy}
                        </span>
                      )}
                      {request.amount && (
                        <span className="font-medium">
                          UGX {request.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ApprovedRequestsHistory;