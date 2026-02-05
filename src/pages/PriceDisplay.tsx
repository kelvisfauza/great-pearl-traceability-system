import React, { useEffect, useState } from 'react';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { Coffee, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const PriceDisplay = () => {
  const { prices, loading, fetchPrices } = useReferencePrices();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // Keep screen awake
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
          console.log('Wake Lock activated - screen will stay on');
        }
      } catch (err) {
        console.log('Wake Lock not supported or failed:', err);
      }
    };

    requestWakeLock();

    // Re-acquire wake lock if page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPrices();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d3d1f] flex items-center justify-center">
        <div className="animate-spin">
          <RefreshCw className="h-16 w-16 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d3d1f] via-[#1a5c35] to-[#0d3d1f] text-white p-8 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <img 
            src="/lovable-uploads/great-pearl-coffee-logo.png" 
            alt="Great Pearl Coffee" 
            className="h-24 w-auto"
          />
        </div>
        <h1 className="text-5xl font-bold tracking-wide">GREAT PEARL COFFEE</h1>
        <p className="text-2xl text-white/80 mt-2">Today's Buying Prices</p>
      </div>

      {/* Date and Time */}
      <div className="text-center mb-12">
        <p className="text-4xl font-light">
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </p>
        <p className="text-6xl font-bold mt-2 font-mono">
          {format(currentTime, 'HH:mm:ss')}
        </p>
      </div>

      {/* Price Cards */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
        {/* Arabica */}
        <div className="bg-gradient-to-br from-amber-600/30 to-amber-900/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-amber-500/50 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-amber-500/30 rounded-2xl">
              <Coffee className="h-12 w-12 text-amber-300" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-amber-200">ARABICA</h2>
              <p className="text-amber-300/80 text-lg">Washed Arabica</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-7xl font-bold text-amber-100">
                {formatCurrency(prices.arabicaBuyingPrice)}
              </p>
              <p className="text-2xl text-amber-300 mt-2">UGX / KG</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center border-t border-amber-500/30 pt-6">
            <div>
              <p className="text-amber-400 text-sm">Outturn</p>
              <p className="text-2xl font-semibold">{prices.arabicaOutturn}%</p>
            </div>
            <div>
              <p className="text-amber-400 text-sm">Moisture</p>
              <p className="text-2xl font-semibold">{prices.arabicaMoisture}%</p>
            </div>
            <div>
              <p className="text-amber-400 text-sm">FM</p>
              <p className="text-2xl font-semibold">{prices.arabicaFm}%</p>
            </div>
          </div>
        </div>

        {/* Robusta */}
        <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-emerald-500/50 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-emerald-500/30 rounded-2xl">
              <Coffee className="h-12 w-12 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-emerald-200">ROBUSTA</h2>
              <p className="text-emerald-300/80 text-lg">FAQ Robusta</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-7xl font-bold text-emerald-100">
                {formatCurrency(prices.robustaBuyingPrice)}
              </p>
              <p className="text-2xl text-emerald-300 mt-2">UGX / KG</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center border-t border-emerald-500/30 pt-6">
            <div>
              <p className="text-emerald-400 text-sm">Outturn</p>
              <p className="text-2xl font-semibold">{prices.robustaOutturn}%</p>
            </div>
            <div>
              <p className="text-emerald-400 text-sm">Moisture</p>
              <p className="text-2xl font-semibold">{prices.robustaMoisture}%</p>
            </div>
            <div>
              <p className="text-emerald-400 text-sm">FM</p>
              <p className="text-2xl font-semibold">{prices.robustaFm}%</p>
            </div>
          </div>
        </div>

        {/* Sorted Coffee */}
        <div className="bg-gradient-to-br from-purple-600/30 to-purple-900/30 backdrop-blur-sm rounded-3xl p-8 border-2 border-purple-500/50 flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-purple-500/30 rounded-2xl">
              <Coffee className="h-12 w-12 text-purple-300" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-purple-200">SORTED</h2>
              <p className="text-purple-300/80 text-lg">Sorted Coffee</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-7xl font-bold text-purple-100">
                {formatCurrency(prices.sortedPrice || 0)}
              </p>
              <p className="text-2xl text-purple-300 mt-2">UGX / KG</p>
            </div>
          </div>
          <div className="mt-6 text-center border-t border-purple-500/30 pt-6">
            <p className="text-purple-400 text-lg">Premium Grade Sorted</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-4 text-white/60">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Prices</span>
          </div>
          <span>•</span>
          <span>Updates every 30 seconds</span>
          {prices.lastUpdated && (
            <>
              <span>•</span>
              <span>Last updated: {format(new Date(prices.lastUpdated), 'HH:mm')}</span>
            </>
          )}
        </div>
        <p className="text-white/40 mt-4 text-sm">www.greatpearlcoffeesystem.site</p>
      </div>
    </div>
  );
};

export default PriceDisplay;
