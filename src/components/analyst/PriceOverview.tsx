import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const PriceOverview: React.FC = () => {
  const { comparison, calculateChange } = usePriceHistory(30);
  const { prices: currentPrices } = useReferencePrices();

  const renderChange = (change: number, percent: number) => {
    if (Math.abs(percent) < 0.01) {
      return (
        <span className="flex items-center text-muted-foreground text-sm">
          <Minus className="h-4 w-4 mr-1" /> No change
        </span>
      );
    }
    const isPositive = change > 0;
    return (
      <span className={cn(
        "flex items-center text-sm font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
        {isPositive ? '+' : ''}{change.toLocaleString()} ({percent.toFixed(1)}%)
      </span>
    );
  };

  const PriceCard = ({ 
    title, 
    currentValue, 
    previousValue, 
    unit,
    colorClass 
  }: { 
    title: string; 
    currentValue: number; 
    previousValue?: number;
    unit: string;
    colorClass: string;
  }) => {
    const { change, percent } = calculateChange(currentValue, previousValue);
    
    return (
      <div className={cn("p-4 rounded-lg border", colorClass)}>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">
          {unit === 'UGX' ? `UGX ${currentValue.toLocaleString()}` : 
           unit === '¢/lb' ? `${currentValue.toFixed(2)} ¢/lb` :
           unit === '$/MT' ? `$${currentValue.toLocaleString()}/MT` :
           currentValue.toLocaleString()}
        </p>
        {previousValue !== undefined && renderChange(change, percent)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Current Buying Prices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Today's Buying Prices
            {comparison.yesterday && (
              <span className="text-sm font-normal text-muted-foreground">
                vs Yesterday
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PriceCard
              title="Arabica Buying Price"
              currentValue={currentPrices.arabicaBuyingPrice}
              previousValue={comparison.yesterday?.arabica_buying_price}
              unit="UGX"
              colorClass="bg-amber-50 dark:bg-amber-950/20 border-amber-200"
            />
            <PriceCard
              title="Robusta Buying Price"
              currentValue={currentPrices.robustaBuyingPrice}
              previousValue={comparison.yesterday?.robusta_buying_price}
              unit="UGX"
              colorClass="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Local Market Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Local Market Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PriceCard
              title="Drugar"
              currentValue={currentPrices.drugarLocal}
              previousValue={comparison.yesterday?.drugar_local}
              unit="UGX"
              colorClass="bg-purple-50 dark:bg-purple-950/20 border-purple-200"
            />
            <PriceCard
              title="Wugar"
              currentValue={currentPrices.wugarLocal}
              previousValue={comparison.yesterday?.wugar_local}
              unit="UGX"
              colorClass="bg-blue-50 dark:bg-blue-950/20 border-blue-200"
            />
            <PriceCard
              title="Robusta FAQ"
              currentValue={currentPrices.robustaFaqLocal}
              previousValue={comparison.yesterday?.robusta_faq_local}
              unit="UGX"
              colorClass="bg-red-50 dark:bg-red-950/20 border-red-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* International Markets */}
      <Card>
        <CardHeader>
          <CardTitle>International Markets (ICE)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PriceCard
              title="ICE Arabica C"
              currentValue={currentPrices.iceArabica}
              previousValue={comparison.yesterday?.ice_arabica}
              unit="¢/lb"
              colorClass="bg-amber-50 dark:bg-amber-950/20 border-amber-200"
            />
            <PriceCard
              title="ICE Robusta"
              currentValue={currentPrices.robusta}
              previousValue={comparison.yesterday?.robusta_international}
              unit="$/MT"
              colorClass="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200"
            />
            <PriceCard
              title="USD/UGX Rate"
              currentValue={currentPrices.exchangeRate}
              previousValue={comparison.yesterday?.exchange_rate}
              unit=""
              colorClass="bg-gray-50 dark:bg-gray-950/20 border-gray-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Historical Comparison */}
      {(comparison.lastWeek || comparison.lastMonth) && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Metric</th>
                    <th className="text-right py-2 font-medium">Today</th>
                    <th className="text-right py-2 font-medium">Yesterday</th>
                    <th className="text-right py-2 font-medium">Last Week</th>
                    <th className="text-right py-2 font-medium">Last Month</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-amber-700 font-medium">Arabica Price</td>
                    <td className="py-2 text-right font-bold">{currentPrices.arabicaBuyingPrice.toLocaleString()}</td>
                    <td className="py-2 text-right">{comparison.yesterday?.arabica_buying_price?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastWeek?.arabica_buying_price?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastMonth?.arabica_buying_price?.toLocaleString() || '-'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-emerald-700 font-medium">Robusta Price</td>
                    <td className="py-2 text-right font-bold">{currentPrices.robustaBuyingPrice.toLocaleString()}</td>
                    <td className="py-2 text-right">{comparison.yesterday?.robusta_buying_price?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastWeek?.robusta_buying_price?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastMonth?.robusta_buying_price?.toLocaleString() || '-'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Drugar</td>
                    <td className="py-2 text-right font-bold">{currentPrices.drugarLocal.toLocaleString()}</td>
                    <td className="py-2 text-right">{comparison.yesterday?.drugar_local?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastWeek?.drugar_local?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastMonth?.drugar_local?.toLocaleString() || '-'}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">ICE Arabica (¢/lb)</td>
                    <td className="py-2 text-right font-bold">{currentPrices.iceArabica.toFixed(2)}</td>
                    <td className="py-2 text-right">{comparison.yesterday?.ice_arabica?.toFixed(2) || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastWeek?.ice_arabica?.toFixed(2) || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastMonth?.ice_arabica?.toFixed(2) || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">ICE Robusta ($/MT)</td>
                    <td className="py-2 text-right font-bold">{currentPrices.robusta.toLocaleString()}</td>
                    <td className="py-2 text-right">{comparison.yesterday?.robusta_international?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastWeek?.robusta_international?.toLocaleString() || '-'}</td>
                    <td className="py-2 text-right">{comparison.lastMonth?.robusta_international?.toLocaleString() || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PriceOverview;
