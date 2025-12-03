import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, TrendingUp, FileText, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalystDailyRemindersProps {
  onNavigateToSetPrices?: () => void;
  onNavigateToDailyReports?: () => void;
}

const AnalystDailyReminders: React.FC<AnalystDailyRemindersProps> = ({
  onNavigateToSetPrices,
  onNavigateToDailyReports
}) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [showPriceReminder, setShowPriceReminder] = useState(false);
  const [showReportReminder, setShowReportReminder] = useState(false);
  const [pricesSetToday, setPricesSetToday] = useState(false);
  const [reportCreatedToday, setReportCreatedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is data analyst (Denis or has Data Analysis permission)
  const isDataAnalyst = employee?.department === 'Data Analysis' || 
                        employee?.permissions?.includes('Data Analysis') ||
                        employee?.position?.toLowerCase().includes('analyst');

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if current time is after 7pm (19:00)
  const isAfter7PM = () => {
    const now = new Date();
    return now.getHours() >= 19;
  };

  // Check if prices were set today
  const checkPricesSetToday = async (): Promise<boolean> => {
    try {
      const today = getTodayDate();
      // Use any to avoid type instantiation issues with price_history
      const client = supabase as any;
      const { data, error } = await client
        .from('price_history')
        .select('id')
        .eq('date', today)
        .limit(1);

      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      console.error('Error checking prices:', error);
      return false;
    }
  };

  // Check if market report was created today
  const checkReportCreatedToday = async (): Promise<boolean> => {
    try {
      const today = getTodayDate();
      const { data, error } = await supabase
        .from('market_reports')
        .select('id')
        .eq('report_date', today)
        .limit(1);

      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    } catch (error) {
      console.error('Error checking report:', error);
      return false;
    }
  };

  // Initial check on component mount
  useEffect(() => {
    if (!isDataAnalyst) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      setLoading(true);
      
      const pricesSet = await checkPricesSetToday();
      const reportCreated = await checkReportCreatedToday();
      
      setPricesSetToday(pricesSet);
      setReportCreatedToday(reportCreated);
      
      // Show price reminder if prices not set (morning reminder)
      if (!pricesSet) {
        // Check if we already showed this today (use localStorage)
        const dismissedKey = `price_reminder_dismissed_${getTodayDate()}`;
        const dismissed = localStorage.getItem(dismissedKey);
        if (!dismissed) {
          setShowPriceReminder(true);
        }
      }
      
      // Show report reminder if after 7pm and report not created
      if (isAfter7PM() && !reportCreated) {
        const dismissedKey = `report_reminder_dismissed_${getTodayDate()}`;
        const dismissed = localStorage.getItem(dismissedKey);
        if (!dismissed) {
          setShowReportReminder(true);
        }
      }
      
      setLoading(false);
    };

    checkStatus();

    // Set up interval to check for 7pm report reminder
    const intervalId = setInterval(() => {
      if (isAfter7PM() && !reportCreatedToday) {
        checkReportCreatedToday().then(created => {
          if (!created) {
            const dismissedKey = `report_reminder_dismissed_${getTodayDate()}`;
            const dismissed = localStorage.getItem(dismissedKey);
            if (!dismissed) {
              setShowReportReminder(true);
              // Also show toast notification
              toast({
                title: "Daily Report Reminder",
                description: "Please create today's market report before end of day.",
                duration: 10000,
              });
            }
          } else {
            setReportCreatedToday(true);
          }
        });
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(intervalId);
  }, [isDataAnalyst]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!isDataAnalyst) return;

    const today = getTodayDate();

    // Subscribe to price_history changes
    const priceChannel = supabase
      .channel('price-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'price_history',
          filter: `date=eq.${today}`
        },
        () => {
          setPricesSetToday(true);
          setShowPriceReminder(false);
        }
      )
      .subscribe();

    // Subscribe to market_reports changes
    const reportChannel = supabase
      .channel('report-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_reports',
          filter: `report_date=eq.${today}`
        },
        () => {
          setReportCreatedToday(true);
          setShowReportReminder(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(priceChannel);
      supabase.removeChannel(reportChannel);
    };
  }, [isDataAnalyst]);

  const handleDismissPriceReminder = () => {
    const dismissedKey = `price_reminder_dismissed_${getTodayDate()}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowPriceReminder(false);
  };

  const handleDismissReportReminder = () => {
    const dismissedKey = `report_reminder_dismissed_${getTodayDate()}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowReportReminder(false);
  };

  const handleSetPrices = () => {
    setShowPriceReminder(false);
    onNavigateToSetPrices?.();
  };

  const handleCreateReport = () => {
    setShowReportReminder(false);
    onNavigateToDailyReports?.();
  };

  if (!isDataAnalyst || loading) return null;

  return (
    <>
      {/* Morning Price Reminder Dialog */}
      <Dialog open={showPriceReminder} onOpenChange={setShowPriceReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Good Morning! Set Today's Prices
            </DialogTitle>
            <DialogDescription>
              Please set the buying prices for today ({new Date().toLocaleDateString('en-UG', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}). This helps the team make informed procurement decisions.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Prices should be set at the start of each business day</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDismissPriceReminder}>
              Remind Me Later
            </Button>
            <Button onClick={handleSetPrices}>
              Set Prices Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evening Report Reminder Dialog */}
      <Dialog open={showReportReminder} onOpenChange={setShowReportReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Daily Market Report Needed
            </DialogTitle>
            <DialogDescription>
              Dear {employee?.name || 'Analyst'}, please create today's market report. 
              This report helps the team understand market movements and plan for tomorrow.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <Bell className="h-4 w-4" />
              <span>Reminders will continue every 10 minutes until the report is created</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDismissReportReminder}>
              Dismiss for Now
            </Button>
            <Button onClick={handleCreateReport} className="bg-orange-600 hover:bg-orange-700">
              Create Report Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AnalystDailyReminders;
