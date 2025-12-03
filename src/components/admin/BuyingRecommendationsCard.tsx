import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Coffee, DollarSign, Droplets, Leaf, Clock } from 'lucide-react';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { format } from 'date-fns';

const BuyingRecommendationsCard = () => {
  const { prices, loading } = useReferencePrices();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => `${value}%`;

  if (loading) {
    return (
      <Card className="border-2 animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 hover:shadow-lg transition-all bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Coffee className="h-5 w-5 text-primary" />
            </div>
            <span>Today's Buying Prices</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {prices.lastUpdated 
              ? format(new Date(prices.lastUpdated), 'MMM dd, HH:mm')
              : 'Not set'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Arabica Section */}
        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Arabica
            </h3>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {formatCurrency(prices.arabicaBuyingPrice)}/kg
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Outturn: {formatPercentage(prices.arabicaOutturn)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Droplets className="h-3 w-3" />
              <span>Moisture: {formatPercentage(prices.arabicaMoisture)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Leaf className="h-3 w-3" />
              <span>FM: {formatPercentage(prices.arabicaFm)}</span>
            </div>
          </div>
        </div>

        {/* Robusta Section */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Robusta
            </h3>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(prices.robustaBuyingPrice)}/kg
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Outturn: {formatPercentage(prices.robustaOutturn)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Droplets className="h-3 w-3" />
              <span>Moisture: {formatPercentage(prices.robustaMoisture)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Leaf className="h-3 w-3" />
              <span>FM: {formatPercentage(prices.robustaFm)}</span>
            </div>
          </div>
        </div>

        {/* International Reference */}
        <div className="pt-3 border-t flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>ICE Arabica: ${prices.iceArabica?.toFixed(2) || '0.00'}/lb</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Robusta: ${prices.robusta?.toFixed(2) || '0.00'}/MT</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BuyingRecommendationsCard;
