import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Coffee, TrendingUp, RefreshCw, Globe, ArrowRight, Save, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePriceCalculationHistory } from '@/hooks/usePriceCalculationHistory';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface PriceCalculation {
  icePrice: number;
  multiplier: number;
  marketPrice: number;
  gpcfPrice: number;
}

const GPCF_MARGIN = 500; // Fixed margin of 500 UGX

const PriceCalculator: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { history, loading: historyLoading, saveBothCalculations, fetchHistory } = usePriceCalculationHistory();
  const [saving, setSaving] = useState(false);
  // Robusta calculation ($/MT)
  const [robusta, setRobusta] = useState<PriceCalculation>({
    icePrice: 4147,
    multiplier: 3.18,
    marketPrice: 0,
    gpcfPrice: 0
  });
  
  // Arabica calculation (¢/lb)
  const [arabica, setArabica] = useState<PriceCalculation>({
    icePrice: 360,
    multiplier: 45,
    marketPrice: 0,
    gpcfPrice: 0
  });

  const [fetchingICE, setFetchingICE] = useState(false);

  // Calculate prices whenever inputs change
  useEffect(() => {
    const marketPrice = Math.round(robusta.icePrice * robusta.multiplier);
    const gpcfPrice = marketPrice - GPCF_MARGIN;
    setRobusta(prev => ({ ...prev, marketPrice, gpcfPrice }));
  }, [robusta.icePrice, robusta.multiplier]);

  useEffect(() => {
    const marketPrice = Math.round(arabica.icePrice * arabica.multiplier);
    const gpcfPrice = marketPrice - GPCF_MARGIN;
    setArabica(prev => ({ ...prev, marketPrice, gpcfPrice }));
  }, [arabica.icePrice, arabica.multiplier]);

  const handleRobustaChange = (field: 'icePrice' | 'multiplier', value: string) => {
    const numValue = parseFloat(value) || 0;
    setRobusta(prev => ({ ...prev, [field]: numValue }));
  };

  const handleArabicaChange = (field: 'icePrice' | 'multiplier', value: string) => {
    const numValue = parseFloat(value) || 0;
    setArabica(prev => ({ ...prev, [field]: numValue }));
  };

  const handleFetchICEPrices = async () => {
    try {
      setFetchingICE(true);
      console.log('🌐 Fetching ICE prices from Yahoo Finance...');

      const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/fetch-ice-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log('📊 ICE prices result:', result);

      if (result.success && result.data) {
        if (result.data.iceArabica) {
          setArabica(prev => ({ ...prev, icePrice: result.data.iceArabica }));
        }
        if (result.data.iceRobusta) {
          setRobusta(prev => ({ ...prev, icePrice: result.data.iceRobusta }));
        }

        toast({
          title: "ICE Prices Fetched",
          description: `Arabica: ${result.data.iceArabica || 'N/A'} ¢/lb, Robusta: ${result.data.iceRobusta || 'N/A'} $/MT`
        });
      } else {
        throw new Error(result.error || 'Failed to fetch ICE prices');
      }
    } catch (error) {
      console.error('Error fetching ICE prices:', error);
      toast({
        title: "Fetch Failed",
        description: "Could not fetch ICE market prices",
        variant: "destructive"
      });
    } finally {
      setFetchingICE(false);
    }
  };

  const handleResetDefaults = () => {
    setRobusta({
      icePrice: 4147,
      multiplier: 3.18,
      marketPrice: 0,
      gpcfPrice: 0
    });
    setArabica({
      icePrice: 360,
      multiplier: 45,
      marketPrice: 0,
      gpcfPrice: 0
    });
    toast({
      title: "Reset to Defaults",
      description: "All values have been reset to default"
    });
  };

  const handleSaveCalculations = async () => {
    if (!user?.email) {
      toast({
        title: "Not Authenticated",
        description: "Please log in to save calculations",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      await saveBothCalculations(
        {
          icePrice: robusta.icePrice,
          multiplier: robusta.multiplier,
          marketPrice: robusta.marketPrice,
          gpcfPrice: robusta.gpcfPrice
        },
        {
          icePrice: arabica.icePrice,
          multiplier: arabica.multiplier,
          marketPrice: arabica.marketPrice,
          gpcfPrice: arabica.gpcfPrice
        },
        user.email
      );
    } catch (error) {
      // Error already handled in hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Coffee Price Determinant
          </h2>
          <p className="text-muted-foreground">
            Calculate local buying prices from ICE market closure prices
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleFetchICEPrices}
            disabled={fetchingICE}
          >
            {fetchingICE ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            {fetchingICE ? 'Fetching...' : 'Fetch ICE Prices'}
          </Button>
          <Button variant="ghost" onClick={handleResetDefaults}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSaveCalculations} disabled={saving}>
            {saving ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Calculations'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Robusta Calculator */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Coffee className="h-5 w-5" />
              Robusta Coffee
              <Badge variant="outline" className="ml-auto text-xs">$/MT</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ICE Market Price Input */}
            <div className="space-y-2">
              <Label htmlFor="robustaIce" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                ICE Market Closure ($/MT)
              </Label>
              <Input
                id="robustaIce"
                type="number"
                step="1"
                value={robusta.icePrice}
                onChange={(e) => handleRobustaChange('icePrice', e.target.value)}
                className="text-lg font-semibold"
              />
            </div>

            {/* Multiplier Input */}
            <div className="space-y-2">
              <Label htmlFor="robustaMultiplier">
                Multiplying Factor
              </Label>
              <Input
                id="robustaMultiplier"
                type="number"
                step="0.01"
                value={robusta.multiplier}
                onChange={(e) => handleRobustaChange('multiplier', e.target.value)}
              />
            </div>

            <Separator />

            {/* Calculation Display */}
            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Calculation:</span>
                <span className="font-mono">
                  {robusta.icePrice.toLocaleString()} × {robusta.multiplier}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Current Market Price</span>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                    UGX {robusta.marketPrice.toLocaleString()}/kg
                  </span>
                </div>
              </div>

              <Separator className="bg-emerald-200 dark:bg-emerald-800" />

              <div className="flex items-center justify-between">
                <span className="font-medium">GPCF Buying Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">(-{GPCF_MARGIN})</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                    UGX {robusta.gpcfPrice.toLocaleString()}/kg
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arabica Calculator */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Coffee className="h-5 w-5" />
              Arabica Coffee
              <Badge variant="outline" className="ml-auto text-xs">¢/lb</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ICE Market Price Input */}
            <div className="space-y-2">
              <Label htmlFor="arabicaIce" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                ICE Market Closure (¢/lb)
              </Label>
              <Input
                id="arabicaIce"
                type="number"
                step="0.01"
                value={arabica.icePrice}
                onChange={(e) => handleArabicaChange('icePrice', e.target.value)}
                className="text-lg font-semibold"
              />
            </div>

            {/* Multiplier Input */}
            <div className="space-y-2">
              <Label htmlFor="arabicaMultiplier">
                Multiplying Factor
              </Label>
              <Input
                id="arabicaMultiplier"
                type="number"
                step="0.1"
                value={arabica.multiplier}
                onChange={(e) => handleArabicaChange('multiplier', e.target.value)}
              />
            </div>

            <Separator />

            {/* Calculation Display */}
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Calculation:</span>
                <span className="font-mono">
                  {arabica.icePrice.toLocaleString()} × {arabica.multiplier}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Current Market Price</span>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                    UGX {arabica.marketPrice.toLocaleString()}/kg
                  </span>
                </div>
              </div>

              <Separator className="bg-amber-200 dark:bg-amber-800" />

              <div className="flex items-center justify-between">
                <span className="font-medium">GPCF Buying Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">(-{GPCF_MARGIN})</span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-300">
                    UGX {arabica.gpcfPrice.toLocaleString()}/kg
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formula Reference */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Formula:</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <span className="font-mono bg-background px-2 py-1 rounded border">
                Market Price = ICE Price × Multiplier
              </span>
              <span className="font-mono bg-background px-2 py-1 rounded border">
                GPCF Price = Market Price - {GPCF_MARGIN} UGX
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Calculation History
            <Badge variant="outline" className="ml-2">Last 30 days</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No calculations saved yet. Calculate prices and click "Save Calculations" to track history.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">ICE Price</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead className="text-right">Market Price</TableHead>
                    <TableHead className="text-right">GPCF Price</TableHead>
                    <TableHead>Calculated By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(calc.calculated_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={calc.coffee_type === 'robusta' 
                            ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' 
                            : 'border-amber-500 text-amber-700 dark:text-amber-400'
                          }
                        >
                          {calc.coffee_type.charAt(0).toUpperCase() + calc.coffee_type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {calc.ice_price.toLocaleString()}
                        <span className="text-xs text-muted-foreground ml-1">
                          {calc.coffee_type === 'robusta' ? '$/MT' : '¢/lb'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">{calc.multiplier}</TableCell>
                      <TableCell className="text-right font-mono">
                        UGX {calc.market_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        UGX {calc.gpcf_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {calc.calculated_by}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceCalculator;
