import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PriceGateOverlayProps {
  onNavigateToSetPrices: () => void;
  children: React.ReactNode;
}

const PriceGateOverlay: React.FC<PriceGateOverlayProps> = ({ onNavigateToSetPrices, children }) => {
  const { employee } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingDate, setMissingDate] = useState<string>('');

  const isDataAnalyst = employee?.department === 'Data Analysis' || 
                        employee?.permissions?.includes('Data Analysis') ||
                        employee?.position?.toLowerCase().includes('analyst');

  // Get EAT time (UTC+3)
  const getEATDate = () => {
    const now = new Date();
    const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return eatTime;
  };

  const getEATHour = () => getEATDate().getUTCHours();
  
  const getTodayEAT = () => getEATDate().toISOString().split('T')[0];
  
  const getYesterdayEAT = () => {
    const eat = getEATDate();
    eat.setUTCDate(eat.getUTCDate() - 1);
    return eat.toISOString().split('T')[0];
  };

  // Check if yesterday was a weekday
  const wasYesterdayWeekday = () => {
    const eat = getEATDate();
    eat.setUTCDate(eat.getUTCDate() - 1);
    const day = eat.getUTCDay();
    return day !== 0 && day !== 6; // Not Sunday or Saturday
  };

  const checkIfBlocked = async () => {
    if (!isDataAnalyst) {
      setLoading(false);
      return;
    }

    try {
      const today = getTodayEAT();
      const eatHour = getEATHour();
      
      // Before 7 PM: check if TODAY's prices have been submitted (approved or pending)
      // If it's morning and no prices exist for today, block the user
      if (eatHour < 19) {
        // Check if there's an approved or pending price request targeting today
        const { data: todayRequests } = await (supabase as any)
          .from('price_approval_requests')
          .select('id, status, target_date')
          .or(`target_date.eq.${today},and(target_date.is.null,submitted_at.gte.${today}T00:00:00)`)
          .in('status', ['pending', 'approved'])
          .limit(1);

        const hasTodayPrices = todayRequests && todayRequests.length > 0;

        if (!hasTodayPrices && wasYesterdayWeekday()) {
          // Also check if prices were set yesterday evening for today
          const yesterday = getYesterdayEAT();
          const { data: yesterdayEveningRequests } = await (supabase as any)
            .from('price_approval_requests')
            .select('id, status, target_date')
            .eq('target_date', today)
            .in('status', ['pending', 'approved'])
            .limit(1);

          if (!yesterdayEveningRequests || yesterdayEveningRequests.length === 0) {
            // Check price_history as fallback
            const { data: priceHistory } = await (supabase as any)
              .from('price_history')
              .select('id')
              .eq('price_date', today)
              .limit(1);

            if (!priceHistory || priceHistory.length === 0) {
              setIsBlocked(true);
              setMissingDate(today);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking price gate:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIfBlocked();
    
    // Re-check every 2 minutes
    const interval = setInterval(checkIfBlocked, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isDataAnalyst, employee]);

  // Listen for price submissions to unblock
  useEffect(() => {
    if (!isDataAnalyst || !isBlocked) return;

    const channel = supabase
      .channel('price-gate-watch')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'price_approval_requests',
        },
        () => {
          setIsBlocked(false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isDataAnalyst, isBlocked]);

  if (loading || !isBlocked) return <>{children}</>;

  const displayDate = new Date(missingDate + 'T00:00:00').toLocaleDateString('en-UG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="relative">
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none select-none opacity-30">
        {children}
      </div>
      
      {/* Blocking overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="max-w-lg mx-4 p-8 bg-card border-2 border-destructive/50 rounded-2xl shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Prices Not Set
            </h2>
            <p className="text-muted-foreground text-lg">
              Today's buying prices for <strong>{displayDate}</strong> have not been submitted yet.
            </p>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-left text-muted-foreground">
                The procurement team and buying stations cannot operate without today's prices. 
                Please set the prices immediately before accessing other features.
              </p>
            </div>
          </div>

          <Button 
            size="lg" 
            onClick={onNavigateToSetPrices}
            className="w-full text-lg py-6"
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            Set Prices Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PriceGateOverlay;
