import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getQuestionsForDepartment, ReportQuestion } from '@/config/departmentReportQuestions';
import { FileText, Send, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface DailyReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDate?: string; // For missed reports
  onSuccess?: () => void;
}

export const DailyReportForm = ({ open, onOpenChange, reportDate, onSuccess }: DailyReportFormProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | number>>({});

  const department = employee?.department || 'Default';
  const questions = getQuestionsForDepartment(department);
  const dateForReport = reportDate || format(new Date(), 'yyyy-MM-dd');
  const isBackdatedReport = reportDate && reportDate !== format(new Date(), 'yyyy-MM-dd');

  const handleInputChange = (questionId: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!employee) {
      toast({ title: 'Error', description: 'You must be logged in to submit a report', variant: 'destructive' });
      return;
    }

    // Validate required fields
    const missingRequired = questions
      .filter(q => q.required && !formData[q.id])
      .map(q => q.label);

    if (missingRequired.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingRequired.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('employee_daily_reports').upsert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        department: employee.department,
        report_date: dateForReport,
        report_data: formData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      }, {
        onConflict: 'employee_id,report_date',
      });

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: `Your daily report for ${format(new Date(dateForReport), 'MMMM d, yyyy')} has been saved.`,
      });

      setFormData({});
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = (question: ReportQuestion) => {
    const value = formData[question.id] || '';

    switch (question.type) {
      case 'number':
        return (
          <Input
            type="number"
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value ? Number(e.target.value) : '')}
            placeholder={question.placeholder || '0'}
            className="mt-1"
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="mt-1 min-h-[80px]"
          />
        );
      case 'select':
        return (
          <Select
            value={value as string}
            onValueChange={(val) => handleInputChange(question.id, val)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            type="text"
            id={question.id}
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="mt-1"
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Daily Report - {department}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isBackdatedReport ? (
              <span className="text-amber-600">Missed report for {format(new Date(dateForReport), 'MMMM d, yyyy')}</span>
            ) : (
              <span>Report for {format(new Date(dateForReport), 'MMMM d, yyyy')}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-2">
            {questions.map((question) => (
              <div key={question.id} className="space-y-1">
                <Label htmlFor={question.id} className="flex items-center gap-1">
                  {question.label}
                  {question.required && <span className="text-destructive">*</span>}
                </Label>
                {renderQuestion(question)}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
