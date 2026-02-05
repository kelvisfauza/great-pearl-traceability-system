import { Coffee } from 'lucide-react';
import { format } from 'date-fns';

interface MinimizedPricesProps {
  prices: {
    arabicaBuyingPrice: number;
    robustaBuyingPrice: number;
    sortedPrice?: number;
  };
  currentTime: Date;
  onMaximize: () => void;
}

const MinimizedPrices = ({ prices, currentTime, onMaximize }: MinimizedPricesProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="fixed right-4 top-4 bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/20 z-50 animate-fade-in">
      <div className="text-center mb-3">
        <p className="text-white/60 text-xs">{format(currentTime, 'EEE, MMM d')}</p>
        <p className="text-white text-xl font-mono font-bold">{format(currentTime, 'HH:mm')}</p>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-amber-400" />
          <span className="text-amber-200">Arabica:</span>
          <span className="text-white font-bold">{formatCurrency(prices.arabicaBuyingPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-200">Robusta:</span>
          <span className="text-white font-bold">{formatCurrency(prices.robustaBuyingPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 text-purple-400" />
          <span className="text-purple-200">Sorted:</span>
          <span className="text-white font-bold">{formatCurrency(prices.sortedPrice || 0)}</span>
        </div>
      </div>

      <button
        onClick={onMaximize}
        className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-xs transition-colors"
      >
        Show Full Prices
      </button>
    </div>
  );
};

export default MinimizedPrices;
