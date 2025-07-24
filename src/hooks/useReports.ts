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

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching reports...');
      
      // Mock data since reports table doesn't exist yet
      const mockReports: Report[] = [];
      
      console.log('Reports loaded:', mockReports.length);
      setReports(mockReports);
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
      console.log('Generating report:', reportData);
      
      const newReport: Report = {
        id: `report-${Date.now()}`,
        name: reportData.name,
        type: reportData.type,
        category: reportData.category,
        format: reportData.format,
        description: `${reportData.type} report for ${reportData.category}`,
        status: 'Ready',
        file_size: '2.5 MB',
        downloads: 0,
        generated_by: 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setReports(prev => [newReport, ...prev]);
      
      toast({
        title: "Success",
        description: "Report generated successfully"
      });
      
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
      console.log('Deleting report:', reportId);
      
      setReports(prev => prev.filter(report => report.id !== reportId));
      
      toast({
        title: "Success",
        description: "Report deleted successfully"
      });
      
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

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    loading,
    generateReport: {
      mutate: generateReport,
      isLoading: loading
    },
    deleteReport: {
      mutate: deleteReport,
      isLoading: loading
    },
    refetch: fetchReports
  };
};