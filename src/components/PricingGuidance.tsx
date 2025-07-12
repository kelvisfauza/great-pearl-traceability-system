
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { usePrices } from '@/contexts/PriceContext';

interface PricingGuidanceProps {
  coffeeType: string;
  suggestedPrice: number;
}

const PricingGuidance: React.FC<PricingGuidanceProps> = ({ coffeeType, suggestedPrice }) => {
  const { prices } = usePrices();

  const getMarketPrice = (type: string) => {
    switch (type.toLowerCase()) {
      case 'drugar':
        return prices.drugarLocal;
      case 'wugar':
        return prices.wugarLocal;
      case 'robusta':
        return prices.robustaFaqLocal;
      default:
        return prices.drugarLocal;
    }
  };

  const getCurrentMarketPrice = getMarketPrice(coffeeType);
  const priceDifference = suggestedPrice - getCurrentMarketPrice;
  const pricePercentDiff = (priceDifference / getCurrentMarketPrice) * 100;

  const getPriceStatus = () => {
    if (Math.abs(pricePercentDiff) <= 5) {
      return {
        status: 'good',
        icon: CheckCircle,
        message: 'Price aligns with current market',
        variant: 'default' as const
      };
    } else if (pricePercentDiff > 5) {
      return {
        status: 'high',
        icon: AlertTriangle,
        message: 'Price above market - verify quality justifies premium',
        variant: 'destructive' as const
      };
    } else {
      return {
        status: 'low',
        icon: Info,
        message: 'Price below market - potential profit opportunity',
        variant: 'secondary' as const
      };
    }
  };

  const priceStatus = getPriceStatus();
  const StatusIcon = priceStatus.icon;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pricing Guidance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Current Market ({coffeeType}):</span>
            <div className="font-semibold">UGX {getCurrentMarketPrice.toLocaleString()}/kg</div>
          </div>
          <div>
            <span className="text-gray-600">Your Suggested Price:</span>
            <div className="font-semibold">UGX {suggestedPrice.toLocaleString()}/kg</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <StatusIcon className="h-4 w-4" />
          <span className="text-sm">{priceStatus.message}</span>
          <Badge variant={priceStatus.variant} className="ml-auto">
            {priceDifference > 0 ? '+' : ''}{priceDifference.toFixed(0)} UGX
            ({pricePercentDiff > 0 ? '+' : ''}{pricePercentDiff.toFixed(1)}%)
          </Badge>
        </div>

        <div className="text-xs text-gray-500">
          Based on live market data • Consider quality parameters and outturn rates
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingGuidance;
