
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Report = Tables<"reports">;

export const useReports = () => {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, type, category, format }: { 
      name: string; 
      type: string; 
      category: string; 
      format: string; 
    }) => {
      const { data, error } = await supabase
        .from("reports")
        .insert({
          name,
          type,
          category,
          format,
          status: "Processing",
          generated_by: "User"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Report Generation Started",
        description: "Your report is being generated and will be available shortly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to start report generation. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Report Deleted",
        description: "The report has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the report. Please try again.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateReportDownloads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      // First get the current downloads count
      const { data: report, error: fetchError } = await supabase
        .from("reports")
        .select("downloads")
        .eq("id", reportId)
        .single();

      if (fetchError) throw fetchError;

      // Increment the downloads count
      const newDownloads = (report.downloads || 0) + 1;

      const { error } = await supabase
        .from("reports")
        .update({ 
          downloads: newDownloads,
          updated_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};
