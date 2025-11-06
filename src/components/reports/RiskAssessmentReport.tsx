import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Download, TrendingUp, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import StandardPrintHeader from "@/components/print/StandardPrintHeader";

const RiskAssessmentReport = () => {
  const [assessment, setAssessment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const { toast } = useToast();

  const generateAssessment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-risk-assessment');

      if (error) throw error;

      setAssessment(data.assessment);
      setGeneratedAt(new Date(data.generatedAt).toLocaleString());
      
      toast({
        title: "Risk Assessment Generated",
        description: "AI-powered risk analysis completed successfully.",
      });
    } catch (error) {
      console.error('Error generating risk assessment:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate risk assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([assessment], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `risk-assessment-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              <CardTitle>AI-Powered Risk Assessment Report</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button 
                onClick={generateAssessment} 
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Generate Assessment
                  </>
                )}
              </Button>
              {assessment && (
                <>
                  <Button 
                    onClick={handlePrint} 
                    variant="outline"
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Report
                  </Button>
                  <Button 
                    onClick={downloadReport} 
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {assessment && (
            <div className="hidden print:block mb-6">
              <StandardPrintHeader 
                title="Risk Assessment Report"
                subtitle="AI-Powered Comprehensive Risk Analysis"
                includeDate={true}
              />
            </div>
          )}
          {!assessment && !loading && (
            <div className="text-center py-12 print:hidden">
              <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Risk Assessment Generated</h3>
              <p className="text-muted-foreground mb-4">
                Click "Generate Assessment" to create an AI-powered risk analysis across all departments.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 print:hidden">
              <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold mb-2">Analyzing Your Operations</p>
              <p className="text-muted-foreground">
                AI is analyzing data across all departments to identify potential risks...
              </p>
            </div>
          )}

          {assessment && !loading && (
            <div>
              {generatedAt && (
                <div className="mb-4 p-3 bg-muted rounded-lg print:hidden">
                  <p className="text-sm text-muted-foreground">
                    Generated: <span className="font-semibold">{generatedAt}</span>
                  </p>
                </div>
              )}
              <div className="prose prose-sm max-w-none dark:prose-invert print:prose-print">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 print:text-xl print:mt-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 print:text-lg print:mt-3" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 print:text-base print:mt-2" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-1 mb-4 print:mb-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-sm print:text-xs" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-3 text-sm print:text-xs print:mb-2" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                  }}
                >
                  {assessment}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskAssessmentReport;
