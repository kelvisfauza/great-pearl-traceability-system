import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee, DollarSign, Clock } from 'lucide-react';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { format } from 'date-fns';

const BuyingRecommendationsCard = () => {
  const { prices, loading } = useReferencePrices();

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-3">
          <div className="h-10 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Arabica */}
          <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
            <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Arabica</span>
            <span className="ml-auto text-base font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap">
              USh {fmt(prices.arabicaBuyingPrice)}/kg
            </span>
            <span className="hidden md:inline text-xs text-muted-foreground whitespace-nowrap">
              OT:{prices.arabicaOutturn}% · M:{prices.arabicaMoisture}% · FM:{prices.arabicaFm}%
            </span>
          </div>

          {/* Robusta */}
          <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
            <Coffee className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Robusta</span>
            <span className="ml-auto text-base font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
              USh {fmt(prices.robustaBuyingPrice)}/kg
            </span>
            <span className="hidden md:inline text-xs text-muted-foreground whitespace-nowrap">
              OT:{prices.robustaOutturn}% · M:{prices.robustaMoisture}% · FM:{prices.robustaFm}%
            </span>
          </div>

          {/* ICE + timestamp */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>ICE ${prices.iceArabica?.toFixed(2) || '0.00'}/lb</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Clock className="h-2.5 w-2.5 mr-0.5" />
              {prices.lastUpdated
                ? format(new Date(prices.lastUpdated), 'HH:mm')
                : '--'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BuyingRecommendationsCard;
