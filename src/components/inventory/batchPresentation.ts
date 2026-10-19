import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

export const batchDateLabel = (value?: string | null) => {
  if (!value) return 'Not recorded';
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd MMM yyyy') : 'Not recorded';
};

export const batchAgeDays = (value: string, today = new Date()) => {
  const date = parseISO(value);
  return isValid(date) ? Math.max(0, differenceInCalendarDays(today, date)) : null;
};

export const qualityRange = (values: Array<number | null | undefined>) => {
  const recorded = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!recorded.length) return 'Not recorded';
  const min = Math.min(...recorded);
  const max = Math.max(...recorded);
  return min === max ? `${min.toFixed(1)}%` : `${min.toFixed(1)}–${max.toFixed(1)}%`;
};

export const remainingPurchaseValue = (remainingKg: number, totalKg: number, pricedKg: number, averageCost: number) =>
  totalKg > 0 && Math.abs(pricedKg - totalKg) < 0.01 ? remainingKg * averageCost : null;