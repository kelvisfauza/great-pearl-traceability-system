import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Report {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  status: string;
  format: string;
  file_size?: string;
  downloads: number;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching reports from Supabase...');
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Supabase reports:', data);
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive"
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportData: {
    name: string;
    type: string;
    category: string;
    format: string;
  }) => {
    try {
      console.log('Generating report in Supabase:', reportData);
      
      const reportDoc = {
        name: reportData.name,
        type: reportData.type,
        category: reportData.category,
        format: reportData.format,
        description: `${reportData.type} report for ${reportData.category}`,
        status: 'Ready',
        file_size: '2.5 MB',
        downloads: 0,
        generated_by: 'System'
      };

      const { data, error } = await supabase
        .from('reports')
        .insert([reportDoc])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Report generated with ID:', data.id);
      
      toast({
        title: "Success",
        description: "Report generated successfully"
      });
      
      await fetchReports();
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      console.log('Deleting report from Supabase:', reportId);
      
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Report deleted successfully"
      });
      
      await fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateReportDownloads = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ downloads: reports.find(r => r.id === reportId)?.downloads + 1 || 1 })
        .eq('id', reportId);

      if (error) {
        throw error;
      }
      
      await fetchReports();
    } catch (error) {
      console.error('Error updating downloads:', error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    loading,
    generateReport,
    deleteReport,
    updateReportDownloads,
    refetch: fetchReports
  };
};