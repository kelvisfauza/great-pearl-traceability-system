
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { usePrices } from '@/contexts/PriceContext';

const PriceTicker = () => {
  const { prices } = usePrices();

  const priceItems = [
    {
      label: 'ICE Arabica',
      value: prices.iceArabica,
      unit: 'USD¢/lb',
      change: 2.5,
      type: 'international'
    },
    {
      label: 'Robusta',
      value: prices.robusta,
      unit: 'USD/ton',
      change: -1.2,
      type: 'international'
    },
    {
      label: 'Drugar Local',
      value: prices.drugarLocal,
      unit: 'UGX/kg',
      change: 1.8,
      type: 'local'
    },
    {
      label: 'Wugar Local',
      value: prices.wugarLocal,
      unit: 'UGX/kg',
      change: 0.5,
      type: 'local'
    },
    {
      label: 'Robusta FAQ',
      value: prices.robustaFaqLocal,
      unit: 'UGX/kg',
      change: -0.8,
      type: 'local'
    }
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Live Market Prices</h3>
          </div>
          <div className="text-sm text-gray-500">
            USD/UGX: {prices.exchangeRate.toFixed(0)}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {priceItems.map((item, index) => (
            <div key={index} className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600 mb-1">{item.label}</div>
              <div className="font-semibold text-sm">
                {item.value.toLocaleString()} {item.unit}
              </div>
              <div className="flex items-center justify-center mt-1">
                {item.change > 0 ? (
                  <div className="flex items-center text-green-600 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{item.change}%
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 text-xs">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {item.change}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-xs text-gray-500 text-center">
          Prices update automatically • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceTicker;
