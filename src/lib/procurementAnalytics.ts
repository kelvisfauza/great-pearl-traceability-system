export interface PurchaseDelivery {
  coffeeType: string;
  deliveryDate: string;
  kilograms: number;
  weight: number;
  pricePerKg: number | null;
  recordStatus: string;
}

export function procurementWeek(today: string) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const start = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 7);
  const end = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() - 14);
  return { start, end, previousStart: date.toISOString().slice(0, 10) };
}

export function summarizeProcurement(records: PurchaseDelivery[], start: string, end: string) {
  const groups = new Map<string, { coffeeType: string; deliveries: number; kilograms: number; bags: number; pricedKg: number; value: number; averagePrice: number | null }>();
  for (const record of records) {
    const date = record.deliveryDate.slice(0, 10);
    if (date < start || date >= end || ['quality_rejected', 'rejected', 'cancelled'].includes(record.recordStatus.toLowerCase())) continue;
    const key = record.coffeeType.trim().toLowerCase();
    const group = groups.get(key) ?? { coffeeType: key, deliveries: 0, kilograms: 0, bags: 0, pricedKg: 0, value: 0, averagePrice: null };
    group.deliveries += 1;
    group.kilograms += record.kilograms;
    group.bags += record.weight;
    if (record.pricePerKg != null && Number.isFinite(record.pricePerKg) && record.kilograms > 0) {
      group.pricedKg += record.kilograms;
      group.value += record.kilograms * record.pricePerKg;
      group.averagePrice = group.value / group.pricedKg;
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.coffeeType.localeCompare(b.coffeeType));
}

export function priceChange(current: number | null, previous: number | null) {
  return current == null || previous == null || previous <= 0 ? null : (current - previous) / previous * 100;
}