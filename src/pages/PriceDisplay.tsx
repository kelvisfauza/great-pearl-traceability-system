import React, { useEffect, useState, useCallback } from 'react';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { Coffee, RefreshCw, Minimize2 } from 'lucide-react';
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

const SLIDES = ['map', 'suppliers', 'buyers', 'stats', 'quality', 'traceability', 'milling', 'contact'] as const;
type SlideType = typeof SLIDES[number];

const SLIDE_DURATION = 10000; // 10 seconds per slide
const PRICE_DISPLAY_DURATION = 12000; // 12 seconds on full price view

const PriceDisplay = () => {
  const { prices, loading, fetchPrices } = useReferencePrices();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
  const [showFullPrices, setShowFullPrices] = useState(true);
  const [currentSlide, setCurrentSlide] = useState<SlideType>('map');
  const [slideIndex, setSlideIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    });

    return () => { wakeLock?.release(); };
  }, []);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh prices
  useEffect(() => {
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Main slideshow logic
  useEffect(() => {
    if (!showFullPrices) {
      // Rotate slides
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setSlideIndex(prev => (prev + 1) % SLIDES.length);
          setIsTransitioning(false);
        }, 300);
      }, SLIDE_DURATION);
      return () => clearInterval(interval);
    } else {
      // After showing full prices, transition to slideshow
      const timeout = setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setShowFullPrices(false);
          setSlideIndex(0);
          setIsTransitioning(false);
        }, 500);
      }, PRICE_DISPLAY_DURATION);
      return () => clearTimeout(timeout);
    }
  }, [showFullPrices]);

  useEffect(() => {
    if (!showFullPrices) {
      setCurrentSlide(SLIDES[slideIndex]);
    }
  }, [slideIndex, showFullPrices]);

  const handleMaximize = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowFullPrices(true);
      setCurrentSlide('map');
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

  if (loading) {
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
      case 'suppliers': return <SlideWrapper><TopSuppliersSlide /></SlideWrapper>;
      case 'buyers': return <SlideWrapper><TopBuyersSlide /></SlideWrapper>;
      case 'stats': return <SlideWrapper><SupplierStatsSlide /></SlideWrapper>;
      case 'quality': return <SlideWrapper><QualityProcessSlide /></SlideWrapper>;
      case 'traceability': return <SlideWrapper><TraceabilitySlide /></SlideWrapper>;
      case 'milling': return <SlideWrapper><MillingSlide /></SlideWrapper>;
      case 'contact': return <SlideWrapper><ContactSlide /></SlideWrapper>;
      default: return null;
    }
  };

  // Slideshow view with TV-style sidebar
  if (!showFullPrices) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d3d1f] via-[#1a5c35] to-[#0d3d1f] text-white overflow-hidden pb-16">
        {/* Minimized Prices Sidebar - TV Style */}
        <MinimizedPrices 
          prices={prices} 
          currentTime={currentTime} 
          onMaximize={handleMaximize} 
        />

        {/* Main Slide Content - Pushed right for sidebar */}
        <div className="ml-80 min-h-screen flex flex-col pb-16">
          <div className="flex-1 flex items-center justify-center p-8">
            {renderSlide()}
          </div>

          {/* Bottom Bar with Slide Indicators */}
          <div className="pb-20 flex flex-col items-center gap-4">
            {/* Progress bar for current slide */}
            <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full transition-all"
                style={{ 
                  animation: `progressBar ${SLIDE_DURATION}ms linear`,
                  width: '100%'
                }}
                key={slideIndex}
              />
            </div>
            
            {/* Slide dots */}
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

        {/* Live Ticker at Bottom */}
        <LiveTicker />

        {/* CSS for progress animation */}
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
    <div className={`min-h-screen bg-gradient-to-br from-[#0d3d1f] via-[#1a5c35] to-[#0d3d1f] text-white p-8 flex flex-col transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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
        <p className="text-4xl font-light">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
        <p className="text-6xl font-bold mt-2 font-mono">{format(currentTime, 'HH:mm:ss')}</p>
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
