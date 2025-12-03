import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { departmentQuestions, getQuestionsForDepartment, ReportQuestion } from '@/config/departmentReportQuestions';
import { FileText, Send, Clock, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DailyReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDate?: string;
  onSuccess?: () => void;
}

const MAX_REPORTS_PER_DAY = 2;

// All available departments for cross-support
const ALL_DEPARTMENTS = [
  'Quality Control',
  'Store',
  'Finance',
  'Sales',
  'Human Resources',
  'Administration',
  'Data Analysis',
  'Field Operations',
  'Operations',
  'EUDR Documentation',
  'Support Staff',
  'IT',
];

export const DailyReportForm = ({ open, onOpenChange, reportDate, onSuccess }: DailyReportFormProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | number | string[]>>({});
  const [supportedDepartments, setSupportedDepartments] = useState<string[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [checkingReports, setCheckingReports] = useState(true);

  const primaryDepartment = employee?.department || 'Default';
  const primaryQuestions = getQuestionsForDepartment(primaryDepartment);
  const dateForReport = reportDate || format(new Date(), 'yyyy-MM-dd');
  const isBackdatedReport = reportDate && reportDate !== format(new Date(), 'yyyy-MM-dd');

  // Check how many reports the user has submitted today
  useEffect(() => {
    const checkReportCount = async () => {
      if (!employee || !open) return;
      
      setCheckingReports(true);
      try {
        const { data, error } = await supabase
          .from('employee_daily_reports')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('report_date', dateForReport);

        if (error) throw error;
        setReportCount(data?.length || 0);
      } catch (error) {
        console.error('Error checking report count:', error);
      } finally {
        setCheckingReports(false);
      }
    };

    checkReportCount();
  }, [employee, dateForReport, open]);

  // Get available departments (exclude employee's primary department)
  const availableDepartments = useMemo(() => {
    return ALL_DEPARTMENTS.filter(dept => 
      dept.toLowerCase() !== primaryDepartment.toLowerCase()
    );
  }, [primaryDepartment]);

  // Get all questions including supported departments
  const allQuestions = useMemo(() => {
    const questions: { department: string; questions: ReportQuestion[] }[] = [
      { department: primaryDepartment, questions: primaryQuestions }
    ];

    supportedDepartments.forEach(dept => {
      const deptQuestions = departmentQuestions[dept];
      if (deptQuestions) {
        questions.push({ department: dept, questions: deptQuestions });
      }
    });

    return questions;
  }, [primaryDepartment, primaryQuestions, supportedDepartments]);

  const handleInputChange = (questionId: string, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiselectChange = (questionId: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const currentValues = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...currentValues, option] };
      } else {
        return { ...prev, [questionId]: currentValues.filter(v => v !== option) };
      }
    });
  };

  const handleDepartmentToggle = (department: string, checked: boolean) => {
    if (checked) {
      setSupportedDepartments(prev => [...prev, department]);
    } else {
      setSupportedDepartments(prev => prev.filter(d => d !== department));
      // Clear data for that department's questions
      const deptQuestions = departmentQuestions[department];
      if (deptQuestions) {
        setFormData(prev => {
          const newData = { ...prev };
          deptQuestions.forEach(q => {
            delete newData[`${department}_${q.id}`];
          });
          return newData;
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!employee) {
      toast({ title: 'Error', description: 'You must be logged in to submit a report', variant: 'destructive' });
      return;
    }

    // Check report limit
    if (reportCount >= MAX_REPORTS_PER_DAY) {
      toast({ 
        title: 'Report Limit Reached', 
        description: `You can only submit a maximum of ${MAX_REPORTS_PER_DAY} reports per day.`, 
        variant: 'destructive' 
      });
      return;
    }

    // Validate required fields for primary department only
    const missingRequired = primaryQuestions
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
      // Include supported departments in report data
      const reportDataWithDepts = {
        ...formData,
        supported_departments: supportedDepartments,
        report_number: reportCount + 1,
      };

      // Use insert instead of upsert to allow multiple reports
      const { error } = await supabase.from('employee_daily_reports').insert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        department: employee.department,
        report_date: dateForReport,
        report_data: reportDataWithDepts,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Report Submitted',
        description: `Your daily report ${reportCount + 1} of ${MAX_REPORTS_PER_DAY} for ${format(new Date(dateForReport), 'MMMM d, yyyy')} has been saved.`,
      });

      setFormData({});
      setSupportedDepartments([]);
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

  const renderQuestion = (question: ReportQuestion, prefix: string = '') => {
    const fieldId = prefix ? `${prefix}_${question.id}` : question.id;
    const value = formData[fieldId];

    switch (question.type) {
      case 'number':
        return (
          <Input
            type="number"
            id={fieldId}
            value={(value as string | number) || ''}
            onChange={(e) => handleInputChange(fieldId, e.target.value ? Number(e.target.value) : '')}
            placeholder={question.placeholder || '0'}
            className="mt-1"
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={question.placeholder}
            className="mt-1 min-h-[80px]"
          />
        );
      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(val) => handleInputChange(fieldId, val)}
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
      case 'multiselect':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="mt-2 space-y-2 bg-muted/30 p-3 rounded-lg max-h-[200px] overflow-y-auto">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldId}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => handleMultiselectChange(fieldId, option, checked as boolean)}
                />
                <label
                  htmlFor={`${fieldId}-${option}`}
                  className="text-sm leading-none cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      default:
        return (
          <Input
            type="text"
            id={fieldId}
            value={(value as string) || ''}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={question.placeholder}
            className="mt-1"
          />
        );
    }
  };

  const canSubmit = reportCount < MAX_REPORTS_PER_DAY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Daily Report - {primaryDepartment}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isBackdatedReport ? (
              <span className="text-amber-600">Missed report for {format(new Date(dateForReport), 'MMMM d, yyyy')}</span>
            ) : (
              <span>Report for {format(new Date(dateForReport), 'MMMM d, yyyy')}</span>
            )}
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
              {reportCount}/{MAX_REPORTS_PER_DAY} reports today
            </span>
          </DialogDescription>
        </DialogHeader>

        {!canSubmit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have reached the maximum of {MAX_REPORTS_PER_DAY} reports for today. You cannot submit more reports until tomorrow.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Supported Departments Section */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Did you support any other department today?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {availableDepartments.map((dept) => (
                  <div key={dept} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dept-${dept}`}
                      checked={supportedDepartments.includes(dept)}
                      onCheckedChange={(checked) => handleDepartmentToggle(dept, checked as boolean)}
                      disabled={!canSubmit}
                    />
                    <label
                      htmlFor={`dept-${dept}`}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {dept}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions by Department */}
            {allQuestions.map(({ department, questions }, index) => (
              <div key={department} className="space-y-4">
                {index > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-primary mb-3">
                      {department} Support
                    </h3>
                  </div>
                )}
                {index === 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {department} Questions
                  </h3>
                )}
                {questions.map((question) => {
                  const isSupported = index > 0;
                  const prefix = isSupported ? department : '';
                  return (
                    <div key={`${department}-${question.id}`} className="space-y-1">
                      <Label htmlFor={prefix ? `${prefix}_${question.id}` : question.id} className="flex items-center gap-1 text-sm">
                        {question.label}
                        {question.required && !isSupported && <span className="text-destructive">*</span>}
                      </Label>
                      {renderQuestion(question, prefix)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !canSubmit || checkingReports}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Submitting...' : checkingReports ? 'Checking...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
