import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TruckData {
  truck_number: string;
  total_bags_loaded: number;
  total_weight_store: number;
  traceability_confirmed: boolean;
  lot_batch_references: string;
  quality_report_attached: boolean;
}

interface BuyerVerification {
  truck_number: number;
  buyer_bags_count: number;
  buyer_weight: number;
  store_weight: number;
  difference: number;
}

export interface DispatchReport {
  id: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  dispatch_date: string;
  dispatch_location: string;
  coffee_type: string;
  destination_buyer: string;
  dispatch_supervisor: string;
  vehicle_registrations: string;
  trucks: TruckData[];
  buyer_verification: BuyerVerification[];
  quality_checked_by_buyer: boolean;
  buyer_quality_remarks: string;
  bags_deducted: number;
  deduction_reasons: string[];
  total_deducted_weight: number;
  remarks: string;
  attachment_url: string | null;
  attachment_name: string | null;
  status: string;
}

export const useEUDRDispatchReports = () => {
  const [reports, setReports] = useState<DispatchReport[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eudr_dispatch_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse JSONB fields properly
      const parsedReports = (data || []).map(report => ({
        ...report,
        trucks: (Array.isArray(report.trucks) ? report.trucks : []) as unknown as TruckData[],
        buyer_verification: (Array.isArray(report.buyer_verification) ? report.buyer_verification : []) as unknown as BuyerVerification[],
        deduction_reasons: (Array.isArray(report.deduction_reasons) ? report.deduction_reasons : []) as string[]
      }));
      
      setReports(parsedReports as DispatchReport[]);
    } catch (error) {
      console.error('Error fetching dispatch reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dispatch reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getRecentReports = (limit: number = 5) => {
    return reports.slice(0, limit);
  };

  return {
    reports,
    loading,
    fetchReports,
    getRecentReports
  };
};
