import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, TrendingUp, FileText, Clock, Moon } from 'lucide-react';
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
  const [showEveningReminder, setShowEveningReminder] = useState(false);
  const [pricesSetToday, setPricesSetToday] = useState(false);
  const [reportCreatedToday, setReportCreatedToday] = useState(false);
  const [tomorrowPricesSet, setTomorrowPricesSet] = useState(false);
  const [loading, setLoading] = useState(true);

  const isDataAnalyst = employee?.department === 'Data Analysis' || 
                        employee?.permissions?.includes('Data Analysis') ||
                        employee?.position?.toLowerCase().includes('analyst');

  const getEATDate = () => {
    const now = new Date();
    return new Date(now.getTime() + (3 * 60 * 60 * 1000));
  };

  const getTodayDate = () => getEATDate().toISOString().split('T')[0];
  
  const getTomorrowDate = () => {
    const eat = getEATDate();
    eat.setUTCDate(eat.getUTCDate() + 1);
    return eat.toISOString().split('T')[0];
  };

  const getEATHour = () => getEATDate().getUTCHours();

  const checkPricesSetForDate = async (targetDate: string): Promise<boolean> => {
    try {
      // Check price_approval_requests for pending or approved
      const { data } = await (supabase as any)
        .from('price_approval_requests')
        .select('id')
        .eq('target_date', targetDate)
        .in('status', ['pending', 'approved'])
        .limit(1);

      if (data && data.length > 0) return true;

      // Fallback: check price_history
      const { data: ph } = await (supabase as any)
        .from('price_history')
        .select('id')
        .eq('price_date', targetDate)
        .limit(1);

      return ph && ph.length > 0;
    } catch (error) {
      console.error('Error checking prices:', error);
      return false;
    }
  };

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

  useEffect(() => {
    if (!isDataAnalyst) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      setLoading(true);
      const today = getTodayDate();
      const eatHour = getEATHour();
      
      const pricesSet = await checkPricesSetForDate(today);
      const reportCreated = await checkReportCreatedToday();
      
      setPricesSetToday(pricesSet);
      setReportCreatedToday(reportCreated);
      
      // Morning: show price reminder if not set
      if (!pricesSet && eatHour < 19) {
        const dismissedKey = `price_reminder_dismissed_${today}`;
        if (!localStorage.getItem(dismissedKey)) {
          setShowPriceReminder(true);
        }
      }
      
      // Evening (after 7 PM): check if tomorrow's prices are set
      if (eatHour >= 19) {
        const tomorrow = getTomorrowDate();
        const tomorrowSet = await checkPricesSetForDate(tomorrow);
        setTomorrowPricesSet(tomorrowSet);
        
        if (!tomorrowSet) {
          const dismissedKey = `evening_price_reminder_dismissed_${today}`;
          if (!localStorage.getItem(dismissedKey)) {
            setShowEveningReminder(true);
          }
        }
      }
      
      // Report reminder after 7pm
      if (eatHour >= 19 && !reportCreated) {
        const dismissedKey = `report_reminder_dismissed_${today}`;
        if (!localStorage.getItem(dismissedKey)) {
          setShowReportReminder(true);
        }
      }
      
      setLoading(false);
    };

    checkStatus();

    // Re-check every 10 minutes
    const intervalId = setInterval(async () => {
      const eatHour = getEATHour();
      
      if (eatHour >= 19) {
        const tomorrow = getTomorrowDate();
        const tomorrowSet = await checkPricesSetForDate(tomorrow);
        setTomorrowPricesSet(tomorrowSet);
        
        if (!tomorrowSet) {
          const dismissedKey = `evening_price_reminder_dismissed_${getTodayDate()}`;
          if (!localStorage.getItem(dismissedKey)) {
            setShowEveningReminder(true);
            toast({
              title: "Set Tomorrow's Prices",
              description: "Please set tomorrow's buying prices before end of day.",
              duration: 10000,
            });
          }
        }
      }
      
      if (eatHour >= 19 && !reportCreatedToday) {
        const created = await checkReportCreatedToday();
        if (!created) {
          const dismissedKey = `report_reminder_dismissed_${getTodayDate()}`;
          if (!localStorage.getItem(dismissedKey)) {
            setShowReportReminder(true);
          }
        } else {
          setReportCreatedToday(true);
        }
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isDataAnalyst]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!isDataAnalyst) return;

    const channel = supabase
      .channel('price-updates-reminder')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'price_approval_requests' },
        () => {
          setPricesSetToday(true);
          setTomorrowPricesSet(true);
          setShowPriceReminder(false);
          setShowEveningReminder(false);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_reports' },
        () => {
          setReportCreatedToday(true);
          setShowReportReminder(false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDataAnalyst]);

  const handleDismissPriceReminder = () => {
    localStorage.setItem(`price_reminder_dismissed_${getTodayDate()}`, 'true');
    setShowPriceReminder(false);
  };

  const handleDismissEveningReminder = () => {
    localStorage.setItem(`evening_price_reminder_dismissed_${getTodayDate()}`, 'true');
    setShowEveningReminder(false);
  };

  const handleDismissReportReminder = () => {
    localStorage.setItem(`report_reminder_dismissed_${getTodayDate()}`, 'true');
    setShowReportReminder(false);
  };

  const handleSetPrices = () => {
    setShowPriceReminder(false);
    setShowEveningReminder(false);
    onNavigateToSetPrices?.();
  };

  const handleCreateReport = () => {
    setShowReportReminder(false);
    onNavigateToDailyReports?.();
  };

  if (!isDataAnalyst || loading) return null;

  return (
    <>
      {/* Morning Price Reminder */}
      <Dialog open={showPriceReminder} onOpenChange={setShowPriceReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Good Morning! Set Today's Prices
            </DialogTitle>
            <DialogDescription>
              Please set the buying prices for today ({new Date().toLocaleDateString('en-UG', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}). The procurement team needs updated prices.
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

      {/* Evening - Set Tomorrow's Prices */}
      <Dialog open={showEveningReminder} onOpenChange={setShowEveningReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              Set Tomorrow's Prices
            </DialogTitle>
            <DialogDescription>
              It's evening — please set tomorrow's buying prices before you leave. 
              This ensures the team has prices ready at the start of business tomorrow.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-accent/50 border border-border p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>If you don't set prices tonight, you'll be required to set them first thing tomorrow morning before accessing other features.</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDismissEveningReminder}>
              I'll Do It Later
            </Button>
            <Button onClick={handleSetPrices}>
              Set Tomorrow's Prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evening Report Reminder */}
      <Dialog open={showReportReminder} onOpenChange={setShowReportReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-destructive" />
              Daily Market Report Needed
            </DialogTitle>
            <DialogDescription>
              Dear {employee?.name || 'Analyst'}, please create today's market report 
              before end of day.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDismissReportReminder}>
              Dismiss for Now
            </Button>
            <Button onClick={handleCreateReport} variant="destructive">
              Create Report Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AnalystDailyReminders;
