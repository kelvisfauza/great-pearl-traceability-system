import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getQuestionsForDepartment } from '@/config/departmentReportQuestions';

interface DailyReport {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  department: string;
  report_date: string;
  report_data: Record<string, any>;
  status: string;
  submitted_at: string;
  created_at: string;
}

interface StaffReportsPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: DailyReport[];
  startDate: string;
  endDate: string;
  employeeName?: string;
}

export const StaffReportsPrint = ({
  open,
  onOpenChange,
  reports,
  startDate,
  endDate,
  employeeName
}: StaffReportsPrintProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Staff Daily Reports - ${startDate} to ${endDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-name { font-size: 20px; font-weight: bold; color: #166534; }
            .report-title { font-size: 16px; margin-top: 5px; }
            .period { font-size: 12px; color: #666; margin-top: 5px; }
            .report-card { border: 1px solid #ddd; margin-bottom: 15px; page-break-inside: avoid; }
            .report-header { background: #f5f5f5; padding: 10px; border-bottom: 1px solid #ddd; }
            .report-header h3 { font-size: 14px; margin-bottom: 3px; }
            .report-meta { font-size: 11px; color: #666; }
            .report-content { padding: 10px; }
            .question-item { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
            .question-label { font-weight: bold; font-size: 11px; color: #444; }
            .question-value { margin-top: 3px; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
            .no-reports { text-align: center; padding: 40px; color: #666; }
            @media print { .report-card { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const renderReportContent = (report: DailyReport) => {
    const questions = getQuestionsForDepartment(report.department);
    
    // Also check for supported departments in report_data
    const supportedDepts = report.report_data.supported_departments || [];
    const allDepartments = [report.department, ...supportedDepts];
    
    // Get all questions for all departments
    const allQuestions = allDepartments.flatMap(dept => 
      getQuestionsForDepartment(dept)
    );
    
    // Remove duplicates by id
    const uniqueQuestions = allQuestions.filter((q, i, arr) => 
      arr.findIndex(x => x.id === q.id) === i
    );

    return uniqueQuestions.map(question => {
      const value = report.report_data[question.id];
      if (value === undefined || value === '' || value === null) return null;

      let displayValue = value;
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      }

      return (
        <div key={question.id} className="question-item">
          <div className="question-label">{question.label}</div>
          <div className="question-value">{displayValue}</div>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Print Staff Reports</span>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          <div className="header">
            <div className="company-name">Great Pearl Coffee</div>
            <div className="report-title">Staff Daily Reports</div>
            <div className="period">
              Period: {format(parseISO(startDate), 'MMM d, yyyy')} - {format(parseISO(endDate), 'MMM d, yyyy')}
              {employeeName && <> • Employee: {employeeName}</>}
            </div>
            <div className="period">Total Reports: {reports.length}</div>
          </div>

          {reports.length === 0 ? (
            <div className="no-reports">No reports found for the selected period</div>
          ) : (
            reports.map(report => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <h3>{report.employee_name}</h3>
                  <div className="report-meta">
                    {report.department} • {format(parseISO(report.report_date), 'EEEE, MMMM d, yyyy')} • 
                    Submitted at {format(parseISO(report.submitted_at), 'h:mm a')}
                  </div>
                </div>
                <div className="report-content">
                  {renderReportContent(report)}
                </div>
              </div>
            ))
          )}

          <div className="footer">
            Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')} • Great Pearl Coffee Management System
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
