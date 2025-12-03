import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DailyReportForm } from './DailyReportForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { format, subDays } from 'date-fns';

export const DailyReportReminder = () => {
  const { employee } = useAuth();
  const [showReminder, setShowReminder] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [missedReportDate, setMissedReportDate] = useState<string | null>(null);
  const [showMissedReportPrompt, setShowMissedReportPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayReportSubmitted, setTodayReportSubmitted] = useState(false);

  const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');
  const getYesterdayDate = () => format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const isAfter6PM = () => {
    const now = new Date();
    return now.getHours() >= 18;
  };

  const isBefore7PM = () => {
    const now = new Date();
    return now.getHours() < 19;
  };

  const checkTodayReport = useCallback(async () => {
    if (!employee) return false;

    const { data } = await supabase
      .from('employee_daily_reports')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('report_date', getTodayDate())
      .limit(1);

    const hasReport = data && data.length > 0;
    setTodayReportSubmitted(hasReport);
    return hasReport;
  }, [employee]);

  const checkYesterdayReport = useCallback(async () => {
    if (!employee) return true;

    const { data } = await supabase
      .from('employee_daily_reports')
      .select('id')
      .eq('employee_id', employee.id)
      .eq('report_date', getYesterdayDate())
      .limit(1);

    return data && data.length > 0;
  }, [employee]);

  const checkAndShowReminders = useCallback(async () => {
    if (!employee) {
      setLoading(false);
      return;
    }

    // Always check today's report status first
    const todayReportExists = await checkTodayReport();
    
    // If today's report is already submitted, close all reminders and don't show any new ones
    if (todayReportExists) {
      setShowReminder(false);
      setShowMissedReportPrompt(false);
      setLoading(false);
      return;
    }

    // Check for missed report from yesterday (only if today's report not submitted)
    const yesterdayReportExists = await checkYesterdayReport();
    if (!yesterdayReportExists) {
      const dismissedKey = `missed_report_dismissed_${employee.id}_${getYesterdayDate()}`;
      if (!localStorage.getItem(dismissedKey)) {
        setMissedReportDate(getYesterdayDate());
        setShowMissedReportPrompt(true);
        setLoading(false);
        return;
      }
    }

    // Check for today's report reminder if it's after 6 PM and before 7 PM
    if (isAfter6PM() && isBefore7PM()) {
      const dismissedKey = `report_reminder_dismissed_${employee.id}_${getTodayDate()}`;
      if (!localStorage.getItem(dismissedKey)) {
        setShowReminder(true);
      }
    }

    setLoading(false);
  }, [employee, checkTodayReport, checkYesterdayReport]);

  useEffect(() => {
    // Initial check after 10 minutes delay (600000ms)
    const initialTimeout = setTimeout(() => {
      checkAndShowReminders();
    }, 600000); // 10 minutes delay

    // Also do an immediate check to set initial state (without showing popups)
    if (employee) {
      checkTodayReport();
    }

    // Set up interval to check every 10 minutes during the reminder window (6-7 PM)
    const interval = setInterval(() => {
      // Don't show if form is open or report already submitted
      if (isAfter6PM() && isBefore7PM() && !showForm && !todayReportSubmitted) {
        checkAndShowReminders();
      }
    }, 600000); // Check every 10 minutes

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkAndShowReminders, checkTodayReport, showForm, todayReportSubmitted, employee]);

  // Real-time subscription to auto-dismiss when report is submitted
  useEffect(() => {
    if (!employee) return;

    const channel = supabase
      .channel('daily-report-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_daily_reports',
          filter: `employee_id=eq.${employee.id}`,
        },
        (payload) => {
          // Check if the inserted report is for today
          const reportDate = (payload.new as any)?.report_date;
          if (reportDate === getTodayDate()) {
            setTodayReportSubmitted(true);
            setShowReminder(false);
            setShowForm(false);
          }
          // Also dismiss missed report prompt if that date was filled
          if (reportDate === missedReportDate) {
            setShowMissedReportPrompt(false);
            setMissedReportDate(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee, missedReportDate]);

  const handleDismissReminder = () => {
    if (employee) {
      localStorage.setItem(`report_reminder_dismissed_${employee.id}_${getTodayDate()}`, 'true');
    }
    setShowReminder(false);
  };

  const handleDismissMissedReport = () => {
    if (employee && missedReportDate) {
      localStorage.setItem(`missed_report_dismissed_${employee.id}_${missedReportDate}`, 'true');
    }
    setShowMissedReportPrompt(false);
    setMissedReportDate(null);
  };

  const handleCreateReport = () => {
    setShowReminder(false);
    setShowForm(true);
  };

  const handleCreateMissedReport = () => {
    setShowMissedReportPrompt(false);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setMissedReportDate(null);
    setTodayReportSubmitted(true);
    // Recheck in case there are other pending items
    checkAndShowReminders();
  };

  if (loading || !employee) return null;

  // Don't render anything if today's report is submitted (extra safety check)
  if (todayReportSubmitted && !showMissedReportPrompt && !showForm) return null;

  return (
    <>
      {/* Evening Reminder Dialog (6-7 PM) */}
      <Dialog open={showReminder && !todayReportSubmitted} onOpenChange={setShowReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              Daily Report Reminder
            </DialogTitle>
            <DialogDescription>
              It's time to submit your daily report. Please complete your report before 7 PM.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Hi {employee.name},</strong>
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                Please take a few minutes to document your activities for today. Your daily report helps track progress and ensures nothing is missed.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDismissReminder}>
              Remind Me Later
            </Button>
            <Button onClick={handleCreateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missed Report Prompt (on login) */}
      <Dialog open={showMissedReportPrompt} onOpenChange={setShowMissedReportPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Missed Daily Report
            </DialogTitle>
            <DialogDescription>
              You didn't submit your report for {missedReportDate ? format(new Date(missedReportDate), 'MMMM d, yyyy') : 'yesterday'}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm">
                <strong>Hi {employee.name},</strong>
              </p>
              <p className="text-sm mt-2">
                Please complete your missed report to maintain accurate records. This helps the team track activities and progress.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDismissMissedReport}>
              Skip for Now
            </Button>
            <Button onClick={handleCreateMissedReport}>
              <FileText className="h-4 w-4 mr-2" />
              Complete Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Form */}
      <DailyReportForm
        open={showForm}
        onOpenChange={setShowForm}
        reportDate={missedReportDate || undefined}
        onSuccess={handleFormSuccess}
      />
    </>
  );
};
