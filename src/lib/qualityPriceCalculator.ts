import { supabase } from "@/integrations/supabase/client";

export interface QualityCalculatorInputs {
  refPrice: string;
  moisture: string;
  gp1: string;
  gp2: string;
  less12: string;
  pods: string;
  husks: string;
  stones: string;
  robustaInArabica: string;
  discretion: string;
}

export interface QualityCalculatorResults {
  finalPrice: number | null;
  outturnPrice: number | null;
  outturn: number | null;
  cleanD14: number | null;
  fm: number;
  rejectFinal: boolean;
  note: string;
}

export const defaultCalculatorInputs: QualityCalculatorInputs = {
  refPrice: '',
  moisture: '',
  gp1: '',
  gp2: '',
  less12: '0',
  pods: '0',
  husks: '0',
  stones: '0',
  robustaInArabica: '0',
  discretion: '0',
};

export const parseInputNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface AssessmentReadings {
  moisture?: number | null;
  group1_defects?: number | null;
  group2_defects?: number | null;
  pods?: number | null;
  husks?: number | null;
  fm?: number | null;
  robusta_in_arabica?: number | null;
  less12?: number | null;
}

export const buildCalculatorInputs = (
  readings: AssessmentReadings,
  coffeeType?: string,
  refPrice?: number,
): QualityCalculatorInputs => {
  const pods = readings.pods ?? 0;
  const husks = readings.husks ?? 0;
  const fm = readings.fm ?? 0;
  const derivedStones = Math.max(0, fm - pods - husks);
  const isArabica = coffeeType?.toLowerCase().includes('arabica');

  return {
    refPrice: refPrice ? String(refPrice) : '',
    moisture: String(readings.moisture ?? ''),
    gp1: String(readings.group1_defects ?? 0),
    gp2: String(readings.group2_defects ?? 0),
    less12: String(readings.less12 ?? 0),
    pods: String(pods),
    husks: String(husks),
    stones: String(derivedStones),
    robustaInArabica: String(readings.robusta_in_arabica ?? 0),
    discretion: isArabica ? '500' : '0',
  };
};

export const calculateQualityPrice = (
  inputs: QualityCalculatorInputs,
  coffeeType?: string,
): QualityCalculatorResults => {
  const refPrice = parseInputNumber(inputs.refPrice);
  const moisture = parseInputNumber(inputs.moisture);
  const gp1 = parseInputNumber(inputs.gp1);
  const gp2 = parseInputNumber(inputs.gp2);
  const less12 = parseInputNumber(inputs.less12);
  const pods = parseInputNumber(inputs.pods);
  const husks = parseInputNumber(inputs.husks);
  const stones = parseInputNumber(inputs.stones);
  const robustaInArabica = parseInputNumber(inputs.robustaInArabica);
  const discretion = parseInputNumber(inputs.discretion);
  const totalFm = pods + husks + stones;
  const isArabica = coffeeType?.toLowerCase().includes('arabica');

  if (!refPrice) {
    return {
      finalPrice: null,
      outturnPrice: null,
      outturn: null,
      cleanD14: null,
      fm: totalFm,
      rejectFinal: false,
      note: 'Add a reference price to calculate the final price.',
    };
  }

  if (!isArabica) {
    const totalDefects = gp1 + gp2 + less12 + totalFm;
    const outturn = 100 - totalDefects;
    const moistureDeductionPercent = Math.max(0, moisture - 15);
    const totalDeductionPercent = less12 + totalFm + moistureDeductionPercent;
    const deductionPerKg = (refPrice * totalDeductionPercent) / 100 + discretion;
    const actualPricePerKg = Math.max(0, refPrice - deductionPerKg);
    const isRejected = totalFm > 6;

    return {
      finalPrice: isRejected ? null : actualPricePerKg,
      outturnPrice: null,
      outturn,
      cleanD14: null,
      fm: totalFm,
      rejectFinal: isRejected,
      note: isRejected
        ? `Rejected: Foreign matter ${totalFm.toFixed(1)}% exceeds 6%.`
        : `Deduction/kg: UGX ${Math.round(deductionPerKg).toLocaleString('en-UG')}`,
    };
  }

  const over = (value: number, limit: number) => Math.max(0, value - limit);
  const cleanD14 =
    100 -
    over(moisture, 14) -
    over(gp1, 4) -
    over(gp2, 10) -
    over(less12, 1) -
    robustaInArabica;

  const outturnRejected = less12 > 3 || robustaInArabica > 3 || gp1 > 12;
  const outturn = outturnRejected
    ? null
    : 100 -
      over(moisture, 14) -
      over(gp1, 4) -
      over(gp2, 10) -
      pods -
      husks -
      stones -
      over(less12, 1) -
      robustaInArabica;

  const moistPenalty = moisture >= 14 ? over(moisture, 14) * refPrice * 0.02 : 0;
  const gp1Penalty = over(gp1, 4) * 50;
  const gp2Penalty = over(gp2, 10) * 20;
  const d14LowPenalty = cleanD14 < 78 ? (78 - cleanD14) * 50 : 0;
  const d14HighBonus = cleanD14 > 82 ? (cleanD14 - 82) * 50 : 0;
  const rejectFinal = moisture > 16.5 || gp1 > 12 || gp2 > 25 || less12 > 3 || totalFm > 6 || pods > 6 || husks > 6 || stones > 6 || robustaInArabica > 3;

  const outturnPrice = rejectFinal
    ? null
    : refPrice +
      Math.min(((gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && robustaInArabica === 0) ? 2000 : 0) + d14HighBonus, 2000) -
      moistPenalty -
      gp1Penalty -
      gp2Penalty -
      d14LowPenalty +
      d14HighBonus -
      over(less12, 1) * 30 -
      robustaInArabica * 100 +
      discretion;

  const finalPrice = rejectFinal
    ? null
    : refPrice +
      Math.min(((gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0 && robustaInArabica === 0) ? 2000 : 0) + d14HighBonus, 2000) -
      moistPenalty -
      gp1Penalty -
      gp2Penalty -
      d14LowPenalty +
      d14HighBonus -
      (pods * 100 + husks * 150 + stones * 150) -
      over(less12, 1) * 40 -
      robustaInArabica * 100 +
      discretion;

  let note = 'Standard/Penalty Price Applied';
  if (robustaInArabica > 3) note = `Rejected: Robusta in Arabica exceeds 3% (${robustaInArabica.toFixed(1)}%).`;
  else if (gp1 > 12) note = `Rejected: GP1 defects exceed 12% (${gp1.toFixed(1)}%).`;
  else if (rejectFinal) note = 'Rejected by quality thresholds.';
  else if (gp1 <= 1 && gp2 <= 5 && moisture <= 13 && cleanD14 >= 80 && less12 <= 1 && pods === 0 && husks === 0 && stones === 0 && robustaInArabica === 0) note = 'Bonus: Premium Price Applied';

  return {
    finalPrice,
    outturnPrice,
    outturn,
    cleanD14,
    fm: totalFm,
    rejectFinal,
    note,
  };
};

/** Current reference (market) buying price for a coffee type. */
export const fetchReferencePrice = async (coffeeType?: string): Promise<number | null> => {
  try {
    const { data } = await supabase
      .from('market_prices')
      .select('arabica_buying_price, robusta_buying_price')
      .eq('price_type', 'reference_prices')
      .single();
    if (!data) return null;
    const isArabica = coffeeType?.toLowerCase().includes('arabica');
    return Number(isArabica ? data.arabica_buying_price : data.robusta_buying_price) || null;
  } catch {
    return null;
  }
};

/** Fields persisted on quality_assessments so reports can compare calculator vs paid price. */
export interface CalculatorSnapshot {
  calculator_price: number | null;
  calculator_ref_price: number | null;
  calculator_note: string | null;
  calculator_inputs: QualityCalculatorInputs | null;
  calculator_captured_at: string;
}

export const buildCalculatorSnapshot = (
  inputs: QualityCalculatorInputs,
  results: QualityCalculatorResults,
): CalculatorSnapshot => ({
  calculator_price: results.finalPrice != null ? Math.round(results.finalPrice) : null,
  calculator_ref_price: parseInputNumber(inputs.refPrice) || null,
  calculator_note: results.note || null,
  calculator_inputs: inputs,
  calculator_captured_at: new Date().toISOString(),
});

/** Convenience: compute + snapshot straight from assessment readings. */
export const snapshotFromReadings = async (
  readings: AssessmentReadings,
  coffeeType?: string,
): Promise<CalculatorSnapshot | null> => {
  const refPrice = await fetchReferencePrice(coffeeType);
  if (!refPrice) return null;
  const inputs = buildCalculatorInputs(readings, coffeeType, refPrice);
  return buildCalculatorSnapshot(inputs, calculateQualityPrice(inputs, coffeeType));
};
