
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Mock reports data since we're using Firebase only
export const useReports = () => {
  const [data, setData] = useState([
    { id: '1', name: 'December Production Summary', type: 'Production', category: 'Operations', status: 'Ready', format: 'PDF', file_size: '2.3 MB', downloads: 12, generated_by: 'System', created_at: new Date().toISOString() },
    { id: '2', name: 'Q4 Financial Report', type: 'Finance', category: 'Finance', status: 'Ready', format: 'Excel', file_size: '1.8 MB', downloads: 8, generated_by: 'System', created_at: new Date().toISOString() },
    { id: '3', name: 'Weekly Quality Report', type: 'Quality', category: 'Quality', status: 'Ready', format: 'PDF', file_size: '945 KB', downloads: 15, generated_by: 'System', created_at: new Date().toISOString() }
  ]);

  return {
    data,
    error: null,
    isLoading: false
  };
};

export const useGenerateReport = () => {
  const { toast } = useToast();

  const mutate = async ({ name, type, category, format }: { name: string; type: string; category: string; format: string; }) => {
    toast({
      title: "Report Generation Started",
      description: "Your report is being generated and will be available shortly.",
    });
  };

  return { mutate, isLoading: false };
};

export const useDeleteReport = () => {
  const { toast } = useToast();

  const mutate = async (reportId: string) => {
    toast({
      title: "Report Deleted",
      description: "The report has been successfully deleted.",
    });
  };

  return { mutate, isLoading: false };
};

export const useUpdateReportDownloads = () => {
  const mutate = async (reportId: string) => {
    console.log('Report downloaded:', reportId);
  };

  return { mutate, isLoading: false };
};
