import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { useDisplayData } from '@/hooks/useDisplayData';
import { Coffee, RefreshCw, Minimize2, Maximize } from 'lucide-react';
import { format } from 'date-fns';
import MinimizedPrices from '@/components/display/MinimizedPrices';
import TopSuppliersSlide from '@/components/display/TopSuppliersSlide';
import TopBuyersSlide from '@/components/display/TopBuyersSlide';
import SupplierStatsSlide from '@/components/display/SupplierStatsSlide';
import TraceabilitySlide from '@/components/display/TraceabilitySlide';
import MillingSlide from '@/components/display/MillingSlide';
import CoffeeMapSlide from '@/components/display/CoffeeMapSlide';
import QualityProcessSlide from '@/components/display/QualityProcessSlide';
import ContactSlide from '@/components/display/ContactSlide';
import LiveTicker from '@/components/display/LiveTicker';
import DirectorateSlide from '@/components/display/DirectorateSlide';

const SLIDES = ['map', 'directorate', 'suppliers', 'buyers', 'stats', 'quality', 'traceability', 'milling', 'contact'] as const;
type SlideType = typeof SLIDES[number];

const SLIDE_DURATION = 10000;
const PRICE_DISPLAY_DURATION = 15000; // 15 seconds on full price view

// Memoized clock component to avoid re-rendering the entire page every second
const DigitalClock = memo(({ className }: { className?: string }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className={className}>{format(time, 'HH:mm:ss')}</span>;
});
DigitalClock.displayName = 'DigitalClock';

const DateDisplay = memo(({ className }: { className?: string }) => {
  const [date, setDate] = useState(new Date());
  // Only update date once a minute
  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  return <span className={className}>{format(date, 'EEEE, MMMM d, yyyy')}</span>;
});
DateDisplay.displayName = 'DateDisplay';

const PriceDisplay = () => {
  const { prices, loading, fetchPrices } = useReferencePrices();
  const displayData = useDisplayData();
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [showFullPrices, setShowFullPrices] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.log('Fullscreen failed:', err);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keep screen awake
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
        }
      } catch (err) {
        console.log('Wake Lock failed:', err);
      }
    };

    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      wakeLock?.release();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Auto-refresh prices every 60s (not 30s — less aggressive)
  useEffect(() => {
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Slideshow logic — single effect manages both modes
  useEffect(() => {
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);

    if (showFullPrices) {
      // After showing full prices, transition to slideshow
      slideTimerRef.current = setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setShowFullPrices(false);
          setSlideIndex(0);
          setIsTransitioning(false);
        }, 400);
      }, PRICE_DISPLAY_DURATION);
    } else {
      // Rotate slides
      slideTimerRef.current = setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setSlideIndex(prev => {
            const next = (prev + 1) % SLIDES.length;
            // When we loop back to 0, show full prices again
            if (next === 0) {
              setShowFullPrices(true);
              return 0;
            }
            return next;
          });
          setIsTransitioning(false);
        }, 300);
      }, SLIDE_DURATION);
    }

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [showFullPrices, slideIndex]);

  const currentSlide = SLIDES[slideIndex];

  const handleMaximize = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowFullPrices(true);
      setSlideIndex(0);
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowFullPrices(false);
      setSlideIndex(0);
      setIsTransitioning(false);
    }, 300);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading && !displayData.loaded) {
    return (
      <div className="min-h-screen bg-[#0d3d1f] flex items-center justify-center">
        <div className="animate-spin">
          <RefreshCw className="h-16 w-16 text-white" />
        </div>
      </div>
    );
  }

  const renderSlide = () => {
    const slideClass = `transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`;
    
    const SlideWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className={slideClass}>{children}</div>
    );

    switch (currentSlide) {
      case 'map': return <SlideWrapper><CoffeeMapSlide /></SlideWrapper>;
      case 'directorate': return <SlideWrapper><DirectorateSlide /></SlideWrapper>;
      case 'suppliers': return <SlideWrapper><TopSuppliersSlide data={displayData.topSuppliers} /></SlideWrapper>;
      case 'buyers': return <SlideWrapper><TopBuyersSlide data={displayData.topBuyers} /></SlideWrapper>;
      case 'stats': return <SlideWrapper><SupplierStatsSlide totalSuppliers={displayData.totalSuppliers} totalKgs={displayData.totalKgs} avgPerSupplier={displayData.avgPerSupplier} topDistricts={displayData.topDistricts} /></SlideWrapper>;
      case 'quality': return <SlideWrapper><QualityProcessSlide /></SlideWrapper>;
      case 'traceability': return <SlideWrapper><TraceabilitySlide tracedBatches={displayData.tracedBatches} eudrCompliant={displayData.eudrCompliant} totalDocs={displayData.totalDocs} /></SlideWrapper>;
      case 'milling': return <SlideWrapper><MillingSlide totalProcessed={displayData.totalProcessed} dispatched={displayData.dispatched} /></SlideWrapper>;
      case 'contact': return <SlideWrapper><ContactSlide /></SlideWrapper>;
      default: return null;
    }
  };

  // Slideshow view with TV-style sidebar
  if (!showFullPrices) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0d3d1f] via-[#1a5c35] to-[#0d3d1f] text-white overflow-hidden relative">
        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition-all hover:scale-110"
          title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
        >
          <Maximize className="h-5 w-5" />
        </button>
        <MinimizedPrices 
          prices={prices} 
          onMaximize={handleMaximize} 
        />

        <div className="ml-80 h-screen flex flex-col pb-14">
          <div className="flex-1 flex items-center justify-center p-8">
            {renderSlide()}
          </div>

          <div className="pb-20 flex flex-col items-center gap-4">
            <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full"
                style={{ 
                  animation: `progressBar ${SLIDE_DURATION}ms linear`,
                  width: '100%'
                }}
                key={slideIndex}
              />
            </div>
            
            <div className="flex gap-2">
              {SLIDES.map((slide, i) => (
                <button
                  key={slide}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setSlideIndex(i);
                      setIsTransitioning(false);
                    }, 300);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === slideIndex ? 'bg-green-400 w-8' : 'bg-white/30 w-2 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <LiveTicker />

        <style>{`
          @keyframes progressBar {
            from { width: 0%; }
            to { width: 100%; }
          }
          @keyframes slideInFromLeft {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Full Prices View
  return (
    <div className={`h-screen bg-gradient-to-br from-[#0d3d1f] via-[#1a5c35] to-[#0d3d1f] text-white p-8 flex flex-col overflow-hidden relative transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition-all hover:scale-110"
        title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
      >
        <Maximize className="h-5 w-5" />
      </button>
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
        <DateDisplay className="text-4xl font-light" />
        <div className="mt-2">
          <DigitalClock className="text-6xl font-bold font-mono" />
        </div>
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
              <p className="text-7xl font-bold text-amber-100">{formatCurrency(prices.arabicaBuyingPrice)}</p>
              <p className="text-2xl text-amber-300 mt-2">UGX / KG</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center border-t border-amber-500/30 pt-6">
            <div><p className="text-amber-400 text-sm">Outturn</p><p className="text-2xl font-semibold">{prices.arabicaOutturn}%</p></div>
            <div><p className="text-amber-400 text-sm">Moisture</p><p className="text-2xl font-semibold">{prices.arabicaMoisture}%</p></div>
            <div><p className="text-amber-400 text-sm">FM</p><p className="text-2xl font-semibold">{prices.arabicaFm}%</p></div>
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
              <p className="text-7xl font-bold text-emerald-100">{formatCurrency(prices.robustaBuyingPrice)}</p>
              <p className="text-2xl text-emerald-300 mt-2">UGX / KG</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center border-t border-emerald-500/30 pt-6">
            <div><p className="text-emerald-400 text-sm">Outturn</p><p className="text-2xl font-semibold">{prices.robustaOutturn}%</p></div>
            <div><p className="text-emerald-400 text-sm">Moisture</p><p className="text-2xl font-semibold">{prices.robustaMoisture}%</p></div>
            <div><p className="text-emerald-400 text-sm">FM</p><p className="text-2xl font-semibold">{prices.robustaFm}%</p></div>
          </div>
        </div>

        {/* Sorted */}
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
              <p className="text-7xl font-bold text-purple-100">{formatCurrency(prices.sortedPrice || 0)}</p>
              <p className="text-2xl text-purple-300 mt-2">UGX / KG</p>
            </div>
          </div>
          <div className="mt-6 text-center border-t border-purple-500/30 pt-6">
            <p className="text-purple-400 text-lg">Premium Grade Sorted</p>
          </div>
        </div>
      </div>

      {/* Footer with Minimize Button */}
      <div className="mt-8 text-center">
        <button
          onClick={handleMinimize}
          className="mb-4 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition-all hover:scale-105 flex items-center gap-2 mx-auto"
        >
          <Minimize2 className="h-5 w-5" />
          Start Slideshow
        </button>
        <div className="flex items-center justify-center gap-4 text-white/60">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Prices</span>
          </div>
          <span>•</span>
          <span>Updates every 60 seconds</span>
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
