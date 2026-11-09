export const coffeeRejectionLimits = {
  moisture: 18, gp1: 14, gp2: 28, less12: 4, pods: 4, husks: 4, stones: 4,
} as const;

export type CoffeeRejectionReadings = Record<keyof typeof coffeeRejectionLimits, number> & {
  robustaInArabica?: number;
};

export function coffeeRejectionReason(readings: CoffeeRejectionReadings, isArabica = true): string | null {
  if (isArabica && (readings.robustaInArabica ?? 0) > 3) return 'Robusta in Arabica exceeds 3%.';
  const labels = { moisture: 'Moisture', gp1: 'Group 1', gp2: 'Group 2', less12: 'Less 12', pods: 'Pods', husks: 'Husks', stones: 'Stones' };
  for (const key of Object.keys(coffeeRejectionLimits) as (keyof typeof coffeeRejectionLimits)[]) {
    if (readings[key] > coffeeRejectionLimits[key]) return `${labels[key]} exceeds ${coffeeRejectionLimits[key]}% (${readings[key]}%).`;
  }
  return null;
}