import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PriceApprovalRequest {
  id: string;
  submitted_by: string;
  submitted_by_email: string;
  submitted_at: string;
  ice_arabica: number | null;
  robusta: number | null;
  exchange_rate: number | null;
  drugar_local: number | null;
  wugar_local: number | null;
  robusta_faq_local: number | null;
  arabica_outturn: number | null;
  arabica_moisture: number | null;
  arabica_fm: number | null;
  arabica_buying_price: number;
  robusta_outturn: number | null;
  robusta_moisture: number | null;
  robusta_fm: number | null;
  robusta_buying_price: number;
  notify_suppliers: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  suggested_arabica_price: number | null;
  suggested_robusta_price: number | null;
  is_correction: boolean;
  created_at: string;
  updated_at: string;
}

export const usePriceApprovals = () => {
  const [pendingRequests, setPendingRequests] = useState<PriceApprovalRequest[]>([]);
  const [myPendingRequest, setMyPendingRequest] = useState<PriceApprovalRequest | null>(null);
  const [myRejectedRequests, setMyRejectedRequests] = useState<PriceApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('price_approval_requests')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setPendingRequests((data || []) as PriceApprovalRequest[]);
    } catch (error) {
      console.error('Error fetching pending price requests:', error);
    }
  }, []);

  const fetchMyRequests = useCallback(async (userEmail: string) => {
    try {
      // Fetch my pending request (only one should be active at a time)
      const { data: pending, error: pendingError } = await supabase
        .from('price_approval_requests')
        .select('*')
        .eq('submitted_by_email', userEmail)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingError) throw pendingError;
      setMyPendingRequest((pending as PriceApprovalRequest) || null);

      // Fetch my rejected requests (to show feedback)
      const { data: rejected, error: rejectedError } = await supabase
        .from('price_approval_requests')
        .select('*')
        .eq('submitted_by_email', userEmail)
        .eq('status', 'rejected')
        .order('reviewed_at', { ascending: false })
        .limit(5);

      if (rejectedError) throw rejectedError;
      setMyRejectedRequests((rejected || []) as PriceApprovalRequest[]);
    } catch (error) {
      console.error('Error fetching my price requests:', error);
    }
  }, []);

  // Check if prices have already been approved today (for correction detection)
  const checkIfCorrectionNeeded = async (): Promise<boolean> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's an approved price request for today
      const { data: approvedToday } = await supabase
        .from('price_approval_requests')
        .select('id')
        .eq('status', 'approved')
        .gte('reviewed_at', `${today}T00:00:00`)
        .lte('reviewed_at', `${today}T23:59:59`)
        .limit(1);

      return (approvedToday && approvedToday.length > 0);
    } catch (error) {
      console.error('Error checking for correction:', error);
      return false;
    }
  };

  const submitForApproval = async (
    prices: {
      iceArabica: number;
      robusta: number;
      exchangeRate: number;
      drugarLocal: number;
      wugarLocal: number;
      robustaFaqLocal: number;
      arabicaOutturn: number;
      arabicaMoisture: number;
      arabicaFm: number;
      arabicaBuyingPrice: number;
      robustaOutturn: number;
      robustaMoisture: number;
      robustaFm: number;
      robustaBuyingPrice: number;
    },
    submittedBy: string,
    submittedByEmail: string,
    notifySuppliers: boolean
  ) => {
    try {
      // Auto-detect if this is a correction
      const isCorrection = await checkIfCorrectionNeeded();
      
      const { error } = await supabase
        .from('price_approval_requests')
        .insert({
          submitted_by: submittedBy,
          submitted_by_email: submittedByEmail,
          ice_arabica: prices.iceArabica,
          robusta: prices.robusta,
          exchange_rate: prices.exchangeRate,
          drugar_local: prices.drugarLocal,
          wugar_local: prices.wugarLocal,
          robusta_faq_local: prices.robustaFaqLocal,
          arabica_outturn: prices.arabicaOutturn,
          arabica_moisture: prices.arabicaMoisture,
          arabica_fm: prices.arabicaFm,
          arabica_buying_price: prices.arabicaBuyingPrice,
          robusta_outturn: prices.robustaOutturn,
          robusta_moisture: prices.robustaMoisture,
          robusta_fm: prices.robustaFm,
          robusta_buying_price: prices.robustaBuyingPrice,
          notify_suppliers: notifySuppliers,
          is_correction: isCorrection,
          status: 'pending'
        });

      if (error) throw error;
      
      toast({
        title: isCorrection ? "Price Correction Submitted" : "Price Update Submitted",
        description: isCorrection 
          ? "Your price correction has been sent for admin approval."
          : "Your price update has been sent for admin approval."
      });

      return true;
    } catch (error) {
      console.error('Error submitting price for approval:', error);
      toast({
        title: "Submission Failed",
        description: "Could not submit price update for approval",
        variant: "destructive"
      });
      return false;
    }
  };

  const approveRequest = async (
    requestId: string,
    reviewerName: string,
    reviewerEmail: string
  ) => {
    try {
      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('price_approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Check if approver is the same as submitter
      if (request.submitted_by_email === reviewerEmail) {
        toast({
          title: "Cannot Approve",
          description: "You cannot approve your own price update request",
          variant: "destructive"
        });
        return false;
      }

      // Mark as approved
      const { error: updateError } = await supabase
        .from('price_approval_requests')
        .update({
          status: 'approved',
          reviewed_by: reviewerName,
          reviewed_by_email: reviewerEmail,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: "Request Approved",
        description: "The price update has been approved. Prices are now being updated."
      });

      // Return the request data for further processing
      return request as PriceApprovalRequest;
    } catch (error) {
      console.error('Error approving price request:', error);
      toast({
        title: "Approval Failed",
        description: "Could not approve the price request",
        variant: "destructive"
      });
      return false;
    }
  };

  const rejectRequest = async (
    requestId: string,
    reviewerName: string,
    reviewerEmail: string,
    rejectionReason: string,
    suggestedArabicaPrice?: number,
    suggestedRobustaPrice?: number
  ) => {
    try {
      const { error } = await supabase
        .from('price_approval_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewerName,
          reviewed_by_email: reviewerEmail,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          suggested_arabica_price: suggestedArabicaPrice || null,
          suggested_robusta_price: suggestedRobustaPrice || null
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "The price update has been rejected and sent back to the analyst."
      });

      return true;
    } catch (error) {
      console.error('Error rejecting price request:', error);
      toast({
        title: "Rejection Failed",
        description: "Could not reject the price request",
        variant: "destructive"
      });
      return false;
    }
  };

  const dismissRejection = async (requestId: string) => {
    try {
      // We just remove it from the UI by marking it as reviewed by the analyst
      // In a real app you might delete it or add a "dismissed" flag
      const { error } = await supabase
        .from('price_approval_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      
      setMyRejectedRequests(prev => prev.filter(r => r.id !== requestId));
      return true;
    } catch (error) {
      console.error('Error dismissing rejection:', error);
      return false;
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await fetchPendingRequests();
      setLoading(false);
    };

    fetchAll();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('price_approval_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_approval_requests'
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingRequests]);

  return {
    pendingRequests,
    myPendingRequest,
    myRejectedRequests,
    loading,
    submitForApproval,
    approveRequest,
    rejectRequest,
    dismissRejection,
    fetchMyRequests,
    fetchPendingRequests
  };
};
