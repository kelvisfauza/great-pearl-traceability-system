import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

interface PriceCalculatorState {
  refPrice: string;
  moisture: string;
  gp1: string;
  gp2: string;
  less12: string;
  pods: string;
  husks: string;
  stones: string;
  discretion: string;
}

interface CalculationResults {
  fm: number;
  actualOtt: number;
  cleanD14: number;
  outturn: number | string;
  outturnPrice: number | string | null;
  finalPrice: number | string | null;
  qualityNote: string;
  rejectOutturnPrice: boolean;
  rejectFinal: boolean;
}

interface ArabicaPriceCalculatorProps {
  onPriceChange?: (finalPrice: number | null) => void;
  onCalculationChange?: (results: CalculationResults, calculatorState: PriceCalculatorState) => void;
  initialValues?: Partial<PriceCalculatorState>;
}

const ArabicaPriceCalculator = ({ onPriceChange, onCalculationChange, initialValues }: ArabicaPriceCalculatorProps) => {
  const [state, setState] = useState<PriceCalculatorState>({
    refPrice: initialValues?.refPrice || '',
    moisture: initialValues?.moisture || '',
    gp1: initialValues?.gp1 || '',
    gp2: initialValues?.gp2 || '',
    less12: initialValues?.less12 || '',
    pods: initialValues?.pods || '',
    husks: initialValues?.husks || '',
    stones: initialValues?.stones || '',
    discretion: initialValues?.discretion || ''
  });

  const [results, setResults] = useState<CalculationResults>({
    fm: 0,
    actualOtt: 0,
    cleanD14: 0,
    outturn: 0,
    outturnPrice: null,
    finalPrice: null,
    qualityNote: '',
    rejectOutturnPrice: false,
    rejectFinal: false
  });

  const over = (x: number, lim: number) => Math.max(0, x - lim);
  const fmt = (n: number) => isFinite(n) ? n.toLocaleString('en-UG', { maximumFractionDigits: 0 }) : '—';
  const pct = (n: number) => isFinite(n) ? n.toFixed(1) + '%' : '—';
  
  // Helper function to parse string values to numbers, defaulting to 0 for empty strings
  const parseValue = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const calculate = () => {
    // Parse all string values to numbers
    const refPrice = parseValue(state.refPrice);
    const moisture = parseValue(state.moisture);
    const gp1 = parseValue(state.gp1);
    const gp2 = parseValue(state.gp2);
    const less12 = parseValue(state.less12);
    const pods = parseValue(state.pods);
    const husks = parseValue(state.husks);
    const stones = parseValue(state.stones);
    const discretion = parseValue(state.discretion);

    // Derived calculations
    const fm = pods + husks + stones;
    const actualOtt = 100 - (gp1 + gp2 + pods + husks + stones + less12);

    // CLEAN (D14)
    const cleanD14 = 100
      - over(moisture, 14)
      - over(gp1, 4)
      - over(gp2, 10)
      - over(less12, 1);

    // OUTTURN
    let outturn: number | string;
    if (less12 > 3) {
      outturn = 'REJECT';
    } else {
      outturn = 100
        - over(moisture, 14)
        - over(gp1, 4)
        - over(gp2, 10)
        - (pods > 0 ? pods : 0)
        - (husks > 0 ? husks : 0)
        - (stones > 0 ? stones : 0)
        - over(less12, 1);
    }

    // Common penalty components
    const moistPenalty = (moisture >= 14) ? over(moisture, 14) * refPrice * 0.02 : 0;
    const gp1Penalty = over(gp1, 4) * 50;
    const gp2Penalty = over(gp2, 10) * 20;
    const d14LowPenalty = (cleanD14 < 78) ? (78 - cleanD14) * 50 : 0;
    const d14HighBonus = (cleanD14 > 82) ? (cleanD14 - 82) * 50 : 0;

    // OUTTURN PRICE
    let outturnPrice: number | string | null = null;
    const rejectOutturnPrice = (moisture > 16.5) || (gp1 > 10) || (gp2 > 25) || (less12 > 3) || (fm > 6);
    
    if (refPrice <= 0 || isNaN(refPrice)) {
      outturnPrice = null;
    } else if (rejectOutturnPrice) {
      outturnPrice = 'REJECT';
    } else {
      const premiumCondition = (gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1);
      const premiumBlock = Math.min((premiumCondition ? 2000 : 0) + d14HighBonus, 2000);
      const less12Penalty_OP = over(less12, 1) * 30;
      outturnPrice = refPrice + premiumBlock - moistPenalty - gp1Penalty - gp2Penalty - d14LowPenalty + d14HighBonus - less12Penalty_OP + discretion;
    }

    // FINAL PRICE
    let finalPrice: number | string | null = null;
    const rejectFinal = (moisture > 16.5) || (gp1 > 10) || (gp2 > 25) || (less12 > 3) || (fm > 6) || (pods > 6) || (husks > 6) || (stones > 6);
    
    if (refPrice <= 0 || isNaN(refPrice)) {
      finalPrice = null;
    } else if (rejectFinal) {
      finalPrice = 'REJECT';
    } else {
      const premiumConditionF = (gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0);
      const premiumBlockF = Math.min((premiumConditionF ? 2000 : 0) + d14HighBonus, 2000);
      const fmPenalty = pods * 100 + husks * 150 + stones * 150;
      const less12Penalty_FP = over(less12, 1) * 40;
      finalPrice = refPrice + premiumBlockF - moistPenalty - gp1Penalty - gp2Penalty - d14LowPenalty + d14HighBonus - fmPenalty - less12Penalty_FP + discretion;
    }

    // Quality Note
    let qualityNote = '';
    if (moisture > 16.5) qualityNote = `Rejected: Moisture above tolerance by ${(moisture - 16.5).toFixed(1)}%`;
    else if (gp1 > 10) qualityNote = `Rejected: GP1 defects above tolerance by ${(gp1 - 10).toFixed(1)}%`;
    else if (gp2 > 25) qualityNote = `Rejected: GP2 defects above tolerance by ${(gp2 - 25).toFixed(1)}%`;
    else if (less12 > 3) qualityNote = `Rejected: Less‑12 above tolerance by ${(less12 - 3).toFixed(1)}%`;
    else if (fm > 6) qualityNote = `Rejected: Foreign Matter above tolerance by ${(fm - 6).toFixed(1)}%`;
    else {
      qualityNote = ((gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0)
        ? 'Bonus: Premium Price Applied'
        : 'Standard/Penalty Price Applied');
    }

    const newResults = {
      fm,
      actualOtt,
      cleanD14,
      outturn,
      outturnPrice,
      finalPrice,
      qualityNote,
      rejectOutturnPrice,
      rejectFinal
    };

    setResults(newResults);

    // Notify parent of price change
    if (onPriceChange) {
      const numericFinalPrice = typeof finalPrice === 'number' ? finalPrice : null;
      onPriceChange(numericFinalPrice);
    }
    
    // Notify parent of all calculation results
    if (onCalculationChange) {
      onCalculationChange(newResults, state);
    }
  };

  useEffect(() => {
    calculate();
  }, [state]);

  const handleInputChange = (field: keyof PriceCalculatorState, value: string) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    setState({
      refPrice: '',
      moisture: '',
      gp1: '',
      gp2: '',
      less12: '',
      pods: '',
      husks: '',
      stones: '',
      discretion: ''
    });
  };

  const getBadgeVariant = (isReject: boolean) => {
    return isReject ? "destructive" : "default";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Arabica Price Calculator</h2>
          <Badge variant="outline">UGX</Badge>
        </div>
        <Button onClick={resetAll} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="refPrice">REF PRICE (UGX)</Label>
                  <Input
                    id="refPrice"
                    type="number"
                    value={state.refPrice}
                    onChange={(e) => handleInputChange('refPrice', e.target.value)}
                    step="1"
                    min="0"
                  />
                </div>
                <div></div>

                <div>
                  <Label htmlFor="moisture">MOISTURE (%)</Label>
                  <Input
                    id="moisture"
                    type="number"
                    value={state.moisture}
                    onChange={(e) => handleInputChange('moisture', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="gp1">GP 1 DEFECT (%)</Label>
                  <Input
                    id="gp1"
                    type="number"
                    value={state.gp1}
                    onChange={(e) => handleInputChange('gp1', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="gp2">GP 2 DEFECT (%)</Label>
                  <Input
                    id="gp2"
                    type="number"
                    value={state.gp2}
                    onChange={(e) => handleInputChange('gp2', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="less12">Less‑12 (%)</Label>
                  <Input
                    id="less12"
                    type="number"
                    value={state.less12}
                    onChange={(e) => handleInputChange('less12', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="pods">PODS (%)</Label>
                  <Input
                    id="pods"
                    type="number"
                    value={state.pods}
                    onChange={(e) => handleInputChange('pods', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="husks">HUSKS (%)</Label>
                  <Input
                    id="husks"
                    type="number"
                    value={state.husks}
                    onChange={(e) => handleInputChange('husks', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="stones">STONES (%)</Label>
                  <Input
                    id="stones"
                    type="number"
                    value={state.stones}
                    onChange={(e) => handleInputChange('stones', e.target.value)}
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="discretion">Discretion (± UGX)</Label>
                  <Input
                    id="discretion"
                    type="number"
                    value={state.discretion}
                    onChange={(e) => handleInputChange('discretion', e.target.value)}
                    step="1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Derived Values */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Derived</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">FM (Pods+Husks+Stones)</span>
                <span className="font-mono font-bold">{pct(results.fm)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Actual ott</span>
                <span className="font-mono font-bold">{pct(results.actualOtt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CLEAN (D14)</span>
                <span className="font-mono font-bold">{pct(results.cleanD14)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outturn & Outturn Price */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Outturn & Outturn Price</CardTitle>
            <Badge variant={getBadgeVariant(results.rejectOutturnPrice)}>
              {results.rejectOutturnPrice ? 'REJECT' : 'OK'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">OUTTURN</span>
              <span className="font-mono font-bold">
                {typeof results.outturn === 'string' ? results.outturn : pct(results.outturn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">OUTTURN PRICE (UGX)</span>
              <span className="font-mono font-bold text-lg">
                {results.outturnPrice === null ? '—' : 
                 typeof results.outturnPrice === 'string' ? results.outturnPrice : fmt(results.outturnPrice)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              • Premium block (cap 2,000 UGX) applies with strict cleanliness; D14&gt;82 adds 50 UGX/pt inside the cap. FM cash penalties are NOT applied here.
            </p>
          </CardContent>
        </Card>

        {/* Final Price */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Final Price</CardTitle>
            <Badge variant={getBadgeVariant(results.rejectFinal)}>
              {results.rejectFinal ? 'REJECT' : 'OK'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">FINAL PRICE (UGX)</span>
              <span className="font-mono font-bold text-lg">
                {results.finalPrice === null ? '—' : 
                 typeof results.finalPrice === 'string' ? results.finalPrice : fmt(results.finalPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">QUALITY NOTE</span>
              <span className="font-mono text-sm">{results.qualityNote}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              • Includes FM cash penalties (Pods 100, Husks 150, Stones 150 UGX per %). Less‑12 penalty is 40 UGX/pt over 1 here.
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default ArabicaPriceCalculator;