import { useState, useMemo } from 'react';
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
import { FileText, Send, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

interface DailyReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDate?: string;
  onSuccess?: () => void;
}

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
  const [formData, setFormData] = useState<Record<string, string | number>>({});
  const [supportedDepartments, setSupportedDepartments] = useState<string[]>([]);

  const primaryDepartment = employee?.department || 'Default';
  const primaryQuestions = getQuestionsForDepartment(primaryDepartment);
  const dateForReport = reportDate || format(new Date(), 'yyyy-MM-dd');
  const isBackdatedReport = reportDate && reportDate !== format(new Date(), 'yyyy-MM-dd');

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

  const handleInputChange = (questionId: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [questionId]: value }));
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

    // Validate required fields for primary department only
    const missingRequired = primaryQuestions
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
      // Include supported departments in report data
      const reportDataWithDepts = {
        ...formData,
        supported_departments: supportedDepartments,
      };

      const { error } = await supabase.from('employee_daily_reports').upsert({
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        department: employee.department,
        report_date: dateForReport,
        report_data: reportDataWithDepts,
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
    const value = formData[fieldId] || '';

    switch (question.type) {
      case 'number':
        return (
          <Input
            type="number"
            id={fieldId}
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value ? Number(e.target.value) : '')}
            placeholder={question.placeholder || '0'}
            className="mt-1"
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
            placeholder={question.placeholder}
            className="mt-1 min-h-[80px]"
          />
        );
      case 'select':
        return (
          <Select
            value={value as string}
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
      default:
        return (
          <Input
            type="text"
            id={fieldId}
            value={value}
            onChange={(e) => handleInputChange(fieldId, e.target.value)}
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
            Daily Report - {primaryDepartment}
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
                {questions.map((question) => {
                  const isSupported = index > 0;
                  const prefix = isSupported ? department : '';
                  return (
                    <div key={`${department}-${question.id}`} className="space-y-1">
                      <Label htmlFor={prefix ? `${prefix}_${question.id}` : question.id} className="flex items-center gap-1">
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
          <Button onClick={handleSubmit} disabled={loading}>
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
