import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface RiskAssessment {
  id: string;
  generated_at: string;
  generated_by_name: string;
  generated_by_role: string | null;
  assessment_content: string;
}

interface RiskAssessmentHistoryProps {
  onSelectForComparison: (assessment: RiskAssessment) => void;
  selectedIds: string[];
}

export function RiskAssessmentHistory({ onSelectForComparison, selectedIds }: RiskAssessmentHistoryProps) {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select('id, generated_at, generated_by_name, generated_by_role, assessment_content')
        .order('generated_at', { ascending: false });

      if (error) throw error;

      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error("Failed to load assessment history");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No previous assessments found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Generate your first assessment to start tracking risk history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Assessment History
          <span className="text-sm font-normal text-muted-foreground">
            {selectedIds.length > 0 && `${selectedIds.length} selected for comparison`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {assessments.map((assessment) => {
              const isSelected = selectedIds.includes(assessment.id);
              return (
                <div
                  key={assessment.id}
                  className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                    isSelected ? 'bg-primary/5 border-primary' : 'hover:border-primary/50'
                  }`}
                  onClick={() => onSelectForComparison(assessment)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(assessment.generated_at), 'PPP')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>
                          {assessment.generated_by_name}
                          {assessment.generated_by_role && ` - ${assessment.generated_by_role}`}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
