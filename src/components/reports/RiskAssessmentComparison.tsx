import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from 'react-markdown';

interface RiskAssessment {
  id: string;
  generated_at: string;
  generated_by_name: string;
  generated_by_role: string | null;
  assessment_content: string;
}

interface RiskAssessmentComparisonProps {
  assessments: RiskAssessment[];
  onBack: () => void;
}

export function RiskAssessmentComparison({ assessments, onBack }: RiskAssessmentComparisonProps) {
  if (assessments.length !== 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Comparison</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Please select exactly 2 assessments to compare
          </p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
        </CardContent>
      </Card>
    );
  }

  const [older, newer] = assessments.sort(
    (a, b) => new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
        <Button onClick={handlePrint}>
          Print Comparison
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Older Assessment */}
            <div className="border-r pr-6 print:border-r-2">
              <div className="mb-4 pb-4 border-b">
                <h3 className="font-semibold text-lg mb-2">Earlier Assessment</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(older.generated_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {older.generated_by_name}
                      {older.generated_by_role && ` - ${older.generated_by_role}`}
                    </span>
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[600px] print:h-auto">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                      p: ({ children }) => <p className="mb-2">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {older.assessment_content}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </div>

            {/* Newer Assessment */}
            <div className="pl-6 print:pl-0">
              <div className="mb-4 pb-4 border-b">
                <h3 className="font-semibold text-lg mb-2">Recent Assessment</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(newer.generated_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      {newer.generated_by_name}
                      {newer.generated_by_role && ` - ${newer.generated_by_role}`}
                    </span>
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[600px] print:h-auto">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
                      p: ({ children }) => <p className="mb-2">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >
                    {newer.assessment_content}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
