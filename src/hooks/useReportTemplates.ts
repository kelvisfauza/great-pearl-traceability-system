import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  supported_formats: string[];
  data_sources: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useReportTemplates = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('report_templates')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true });

        if (fetchError) throw fetchError;

        // Map and cast data_sources from Json to string[]
        const mappedTemplates = (data || []).map(template => ({
          ...template,
          data_sources: Array.isArray(template.data_sources) 
            ? template.data_sources as string[]
            : []
        }));

        setTemplates(mappedTemplates);
        setError(null);
      } catch (err) {
        console.error('Error fetching report templates:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error
  };
};