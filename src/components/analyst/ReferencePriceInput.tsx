import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReferencePrices } from '@/hooks/useReferencePrices';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
}

const ReferencePriceInput: React.FC = () => {
  const { toast } = useToast();
  const { prices: currentPrices, loading: hookLoading, savePrices } = useReferencePrices();
  
  const [prices, setPrices] = useState<ReferencePrices>({
    iceArabica: 185.50,
    robusta: 2450,
    exchangeRate: 3750,
    drugarLocal: 8500,
    wugarLocal: 8200,
    robustaFaqLocal: 7800
  });
  const [loading, setLoading] = useState(false);

  // Update local state when Supabase data changes
  useEffect(() => {
    setPrices({
      iceArabica: currentPrices.iceArabica,
      robusta: currentPrices.robusta,
      exchangeRate: currentPrices.exchangeRate,
      drugarLocal: currentPrices.drugarLocal,
      wugarLocal: currentPrices.wugarLocal,
      robustaFaqLocal: currentPrices.robustaFaqLocal
    });
  }, [currentPrices]);

  const handleInputChange = (field: keyof ReferencePrices, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPrices(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await savePrices(prices);
      
      toast({
        title: "Reference Prices Updated",
        description: "New reference prices have been saved successfully"
      });
    } catch (error) {
      console.error('Error saving prices:', error);
      toast({
        title: "Error",
        description: "Failed to save reference prices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPrices({
      iceArabica: 185.50,
      robusta: 2450,
      exchangeRate: 3750,
      drugarLocal: 8500,
      wugarLocal: 8200,
      robustaFaqLocal: 7800
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reference Price Management</CardTitle>
        {currentPrices.lastUpdated && (
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(currentPrices.lastUpdated).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* International Markets */}
        <div>
          <h3 className="text-lg font-semibold mb-3">International Markets</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="iceArabica">ICE Arabica C (¢/lb)</Label>
              <Input
                id="iceArabica"
                type="number"
                step="0.01"
                value={prices.iceArabica}
                onChange={(e) => handleInputChange('iceArabica', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robusta">Robusta ($/MT)</Label>
              <Input
                id="robusta"
                type="number"
                step="1"
                value={prices.robusta}
                onChange={(e) => handleInputChange('robusta', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exchangeRate">USD/UGX Exchange Rate</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="1"
                value={prices.exchangeRate}
                onChange={(e) => handleInputChange('exchangeRate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Local Markets */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Local Markets (UGX/kg)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="drugarLocal">Drugar</Label>
              <Input
                id="drugarLocal"
                type="number"
                step="50"
                value={prices.drugarLocal}
                onChange={(e) => handleInputChange('drugarLocal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wugarLocal">Wugar</Label>
              <Input
                id="wugarLocal"
                type="number"
                step="50"
                value={prices.wugarLocal}
                onChange={(e) => handleInputChange('wugarLocal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaFaqLocal">Robusta FAQ</Label>
              <Input
                id="robustaFaqLocal"
                type="number"
                step="50"
                value={prices.robustaFaqLocal}
                onChange={(e) => handleInputChange('robustaFaqLocal', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={loading || hookLoading}>
            {loading ? 'Saving...' : 'Save Reference Prices'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferencePriceInput;
