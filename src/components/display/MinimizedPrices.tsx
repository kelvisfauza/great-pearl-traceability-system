import { memo, useState, useEffect } from 'react';
import { Coffee, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';

interface MinimizedPricesProps {
  prices: {
    arabicaBuyingPrice: number;
    robustaBuyingPrice: number;
    sortedPrice?: number;
  };
  onMaximize: () => void;
}

const MinimizedPrices = memo(({ prices, onMaximize }: MinimizedPricesProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div 
      className="fixed left-0 top-0 bottom-0 w-80 bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col"
      style={{ animation: 'slideInFromLeft 0.5s ease-out forwards' }}
    >
      {/* Header with Logo */}
      <div className="p-4 border-b border-white/10 text-center">
        <img 
          src="/lovable-uploads/great-pearl-coffee-logo.png" 
          alt="Great Pearl Coffee" 
          className="h-16 w-auto mx-auto mb-2"
        />
        <p className="text-white/60 text-sm">Today's Buying Prices</p>
      </div>

      {/* Date & Time */}
      <div className="p-4 text-center border-b border-white/10 bg-white/5">
        <p className="text-white/70 text-sm">{format(time, 'EEEE, MMM d, yyyy')}</p>
        <p className="text-white text-4xl font-mono font-bold">{format(time, 'HH:mm:ss')}</p>
      </div>

      {/* Prices */}
      <div className="flex-1 p-4 space-y-4">
        <div className="bg-gradient-to-r from-amber-600/30 to-amber-900/20 rounded-xl p-4 border border-amber-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="h-6 w-6 text-amber-400" />
            <span className="text-amber-200 font-semibold">ARABICA</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(prices.arabicaBuyingPrice)}</p>
          <p className="text-amber-300/70 text-sm">UGX/KG</p>
        </div>

        <div className="bg-gradient-to-r from-emerald-600/30 to-emerald-900/20 rounded-xl p-4 border border-emerald-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="h-6 w-6 text-emerald-400" />
            <span className="text-emerald-200 font-semibold">ROBUSTA</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(prices.robustaBuyingPrice)}</p>
          <p className="text-emerald-300/70 text-sm">UGX/KG</p>
        </div>

        <div className="bg-gradient-to-r from-purple-600/30 to-purple-900/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Coffee className="h-6 w-6 text-purple-400" />
            <span className="text-purple-200 font-semibold">SORTED</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(prices.sortedPrice || 0)}</p>
          <p className="text-purple-300/70 text-sm">UGX/KG</p>
        </div>
      </div>

      {/* Live indicator */}
      <div className="p-3 border-t border-white/10 flex items-center justify-center gap-2 text-white/50 text-xs">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live Prices</span>
      </div>

      <button
        onClick={onMaximize}
        className="m-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
      >
        <Maximize2 className="h-5 w-5" />
        Show Full Display
      </button>
    </div>
  );
});

MinimizedPrices.displayName = 'MinimizedPrices';

export default MinimizedPrices;
