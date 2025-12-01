
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Filter, Download } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ReportGenerator = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('PDF');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const { generateReport } = useReports();
  const { templates, loading } = useReportTemplates();

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredReports = selectedCategory === 'all' 
    ? templates 
    : templates.filter(report => report.category === selectedCategory);

  const handleGenerateReport = async (template: typeof templates[0]) => {
    try {
      setGeneratingReport(template.id);
      
      // Call the edge function to generate actual report
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          template_id: template.id,
          template_name: template.name,
          category: template.category,
          data_sources: template.data_sources,
          format: selectedFormat
        }
      });

      if (error) throw error;

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to generate report');
      }

      // Create downloadable file
      const reportContent = JSON.stringify(data.report, null, 2);
      const blob = new Blob([reportContent], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Also save to reports table for history
      generateReport.mutate({
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        type: template.name,
        category: template.category,
        format: selectedFormat
      });

      toast.success(`${template.name} generated and downloaded successfully!`);
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Generator
            </CardTitle>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedFormat} onValueChange={setSelectedFormat}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="Excel">Excel</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No report templates found
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{report.name}</p>
                        <Badge variant="secondary">{report.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Frequency: {report.frequency}
                        </span>
                        <div className="flex gap-1">
                          {report.supported_formats.map((fmt) => (
                            <Badge key={fmt} variant="outline" className="text-xs">
                              {fmt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleGenerateReport(report)}
                  className="ml-4"
                  disabled={generatingReport === report.id}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generatingReport === report.id ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportGenerator;
