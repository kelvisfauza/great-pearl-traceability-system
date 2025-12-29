import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyReportForm } from './MonthlyReportForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, FileText } from 'lucide-react';
import { format, endOfMonth, isAfter, startOfMonth, subMonths } from 'date-fns';

export const MonthlyReportReminder = () => {
  const { employee } = useAuth();
  const [showReminder, setShowReminder] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportMonth, setReportMonth] = useState<string>('');

  // Check if user is Data Analyst (they use daily reports instead)
  const isDataAnalyst = employee?.department?.toLowerCase().includes('data') || 
                        employee?.position?.toLowerCase().includes('analyst');

  const isEndOfMonth = () => {
    const now = new Date();
    const endOfCurrentMonth = endOfMonth(now);
    const daysUntilEndOfMonth = endOfCurrentMonth.getDate() - now.getDate();
    // Show reminder in the last 3 days of the month
    return daysUntilEndOfMonth <= 2;
  };

  const getCurrentMonthKey = () => format(new Date(), 'yyyy-MM');
  
  const getPreviousMonthKey = () => format(subMonths(new Date(), 1), 'yyyy-MM');

  const checkMonthlyReport = useCallback(async (monthKey: string) => {
    if (!employee) return true;

    // Check if a monthly report exists for this month
    const startDate = startOfMonth(new Date(monthKey + '-01'));
    const endDate = endOfMonth(new Date(monthKey + '-01'));

    const { data } = await supabase
      .from('employee_daily_reports')
      .select('id, report_data')
      .eq('employee_id', employee.id)
      .gte('report_date', format(startDate, 'yyyy-MM-dd'))
      .lte('report_date', format(endDate, 'yyyy-MM-dd'));

    // Check if any report has monthly data
    const hasMonthlyReport = data?.some(report => {
      const reportData = report.report_data as Record<string, unknown>;
      return reportData?.is_monthly_report === true;
    });

    return hasMonthlyReport || false;
  }, [employee]);

  const checkAndShowReminders = useCallback(async () => {
    if (!employee || isDataAnalyst) {
      setLoading(false);
      return;
    }

    // Check if it's end of month
    if (!isEndOfMonth()) {
      setLoading(false);
      return;
    }

    const currentMonth = getCurrentMonthKey();
    const dismissedKey = `monthly_report_dismissed_${employee.id}_${currentMonth}`;

    // Check if already dismissed
    if (localStorage.getItem(dismissedKey)) {
      setLoading(false);
      return;
    }

    // Check if monthly report already submitted for this month
    const hasReport = await checkMonthlyReport(currentMonth);
    if (hasReport) {
      setLoading(false);
      return;
    }

    setReportMonth(currentMonth);
    setShowReminder(true);
    setLoading(false);
  }, [employee, isDataAnalyst, checkMonthlyReport]);

  useEffect(() => {
    // Initial check after 5 seconds delay
    const initialTimeout = setTimeout(() => {
      checkAndShowReminders();
    }, 5000);

    return () => {
      clearTimeout(initialTimeout);
    };
  }, [checkAndShowReminders]);

  // Real-time subscription to auto-dismiss when report is submitted
  useEffect(() => {
    if (!employee) return;

    const channel = supabase
      .channel('monthly-report-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_daily_reports',
          filter: `employee_id=eq.${employee.id}`,
        },
        (payload) => {
          const reportData = (payload.new as any)?.report_data;
          if (reportData?.is_monthly_report === true) {
            setShowReminder(false);
            setShowForm(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee]);

  const handleDismissReminder = () => {
    if (employee) {
      localStorage.setItem(`monthly_report_dismissed_${employee.id}_${getCurrentMonthKey()}`, 'true');
    }
    setShowReminder(false);
  };

  const handleCreateReport = () => {
    setShowReminder(false);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setShowReminder(false);
  };

  // Don't render for Data Analysts (they use daily reports)
  if (loading || !employee || isDataAnalyst) return null;

  const monthName = reportMonth ? format(new Date(reportMonth + '-01'), 'MMMM yyyy') : '';

  return (
    <>
      {/* Monthly Report Reminder Dialog */}
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              Monthly Report Due
            </DialogTitle>
            <DialogDescription>
              It's the end of the month. Please submit your monthly summary report for {monthName}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>Hi {employee.name},</strong>
              </p>
              <p className="text-sm mt-2">
                Please take a few minutes to reflect on your work this month. Your monthly report helps track progress, identify achievements, and plan for the coming month.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDismissReminder}>
              Remind Me Later
            </Button>
            <Button onClick={handleCreateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Create Monthly Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monthly Report Form */}
      <MonthlyReportForm
        open={showForm}
        onOpenChange={setShowForm}
        reportMonth={reportMonth}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};
