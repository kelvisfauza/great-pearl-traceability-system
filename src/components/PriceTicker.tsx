import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Coffee, DollarSign } from 'lucide-react';
import { useReferencePrices } from '@/hooks/useReferencePrices';

const PriceTicker = () => {
  const { prices, loading } = useReferencePrices();

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-8 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Current Prices</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            USD/UGX: {prices.exchangeRate.toLocaleString()}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {/* Buying Prices */}
          <div className="text-center p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Coffee className="h-3 w-3 text-amber-700" />
              <span className="text-xs text-amber-700 font-medium">Arabica</span>
            </div>
            <div className="font-bold text-sm text-amber-900 dark:text-amber-100">
              {prices.arabicaBuyingPrice.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">UGX/kg</div>
          </div>
          
          <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Coffee className="h-3 w-3 text-emerald-700" />
              <span className="text-xs text-emerald-700 font-medium">Robusta</span>
            </div>
            <div className="font-bold text-sm text-emerald-900 dark:text-emerald-100">
              {prices.robustaBuyingPrice.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">UGX/kg</div>
          </div>

          {/* Separator */}
          <div className="hidden lg:block border-l border-border"></div>

          {/* Local Markets */}
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-xs text-muted-foreground mb-1">Drugar</div>
            <div className="font-semibold text-sm">{prices.drugarLocal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">UGX/kg</div>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-xs text-muted-foreground mb-1">Wugar</div>
            <div className="font-semibold text-sm">{prices.wugarLocal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">UGX/kg</div>
          </div>
          
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-xs text-muted-foreground mb-1">Rob. FAQ</div>
            <div className="font-semibold text-sm">{prices.robustaFaqLocal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">UGX/kg</div>
          </div>

          {/* ICE Markets */}
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-700 font-medium mb-1">ICE Arabica</div>
            <div className="font-semibold text-sm text-blue-900 dark:text-blue-100">{prices.iceArabica.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">¢/lb</div>
          </div>
        </div>
        
        {prices.lastUpdated && (
          <div className="mt-3 text-xs text-muted-foreground text-center">
            Last updated: {new Date(prices.lastUpdated).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceTicker;
