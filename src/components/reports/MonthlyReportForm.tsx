import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Send } from 'lucide-react';
import { format, endOfMonth } from 'date-fns';
import { monthlyReportQuestions, ReportQuestion } from '@/config/departmentReportQuestions';

interface MonthlyReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportMonth?: string;
  onSuccess?: () => void;
}

export const MonthlyReportForm = ({ open, onOpenChange, reportMonth, onSuccess }: MonthlyReportFormProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const monthName = reportMonth ? format(new Date(reportMonth + '-01'), 'MMMM yyyy') : format(new Date(), 'MMMM yyyy');
  const reportDate = reportMonth 
    ? format(endOfMonth(new Date(reportMonth + '-01')), 'yyyy-MM-dd')
    : format(endOfMonth(new Date()), 'yyyy-MM-dd');

  useEffect(() => {
    if (open) {
      setFormData({});
    }
  }, [open]);

  const handleInputChange = (questionId: string, value: any) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelectToggle = (questionId: string, option: string) => {
    setFormData(prev => {
      const currentValues = prev[questionId] || [];
      const newValues = currentValues.includes(option)
        ? currentValues.filter((v: string) => v !== option)
        : [...currentValues, option];
      return { ...prev, [questionId]: newValues };
    });
  };

  const renderQuestion = (question: ReportQuestion) => {
    switch (question.type) {
      case 'number':
        return (
          <Input
            type="number"
            value={formData[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );
      case 'text':
        return (
          <Input
            type="text"
            value={formData[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={formData[question.id] || ''}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            rows={3}
          />
        );
      case 'select':
        return (
          <Select
            value={formData[question.id] || ''}
            onValueChange={(value) => handleInputChange(question.id, value)}
          >
            <SelectTrigger>
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
      case 'multiselect':
        return (
          <div className="space-y-2 border rounded-md p-3 max-h-40 overflow-y-auto">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${question.id}-${option}`}
                  checked={(formData[question.id] || []).includes(option)}
                  onCheckedChange={() => handleMultiSelectToggle(question.id, option)}
                />
                <label
                  htmlFor={`${question.id}-${option}`}
                  className="text-sm cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={question.id}
              checked={formData[question.id] || false}
              onCheckedChange={(checked) => handleInputChange(question.id, checked)}
            />
            <label htmlFor={question.id} className="text-sm">Yes</label>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!employee) {
      toast({ title: 'Error', description: 'You must be logged in to submit a report', variant: 'destructive' });
      return;
    }

    // Validate required fields
    const missingRequired = monthlyReportQuestions
      .filter(q => q.required && !formData[q.id])
      .map(q => q.label);

    if (missingRequired.length > 0) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in: ${missingRequired.slice(0, 3).join(', ')}${missingRequired.length > 3 ? '...' : ''}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const reportDataWithMeta = {
        ...formData,
        is_monthly_report: true,
        report_month: reportMonth || format(new Date(), 'yyyy-MM'),
      };

      const { error } = await supabase.from('employee_daily_reports').insert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        department: employee.department,
        report_date: reportDate,
        report_data: reportDataWithMeta,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Monthly Report Submitted',
        description: `Your monthly report for ${monthName} has been saved successfully.`,
      });

      setFormData({});
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting monthly report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Report - {monthName}
          </DialogTitle>
          <DialogDescription>
            Reflect on your work this month. Complete all required fields before submitting.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {monthlyReportQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Label className="flex items-center gap-1">
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
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Monthly Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
