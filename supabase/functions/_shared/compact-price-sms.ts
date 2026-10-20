/** Preserve station prices from legacy clients; never substitute later saved prices. */
export function parseLegacyStationPrices(message: string): { station: string; prices: { label: string; value: number }[] }[] {
  const stations: { station: string; prices: { label: string; value: number }[] }[] = [];
  for (const line of message.split('\n')) {
    const match = line.trim().match(/^(HQ|Head Office|Kyarumba|Rubirizi):\s*(.+)$/i);
    if (!match) continue;
    const station = /^(HQ|Head Office)$/i.test(match[1]) ? 'HEAD OFFICE' : match[1].toUpperCase();
    const prices: { label: string; value: number }[] = [];
    const pattern = /([A-Za-z][A-Za-z /]*?)\s+(?:UGX\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)(?=\s*(?:,|\||$))/g;
    for (const price of match[2].matchAll(pattern)) {
      prices.push({ label: price[1].trim(), value: Number(price[2].replaceAll(',', '')) });
    }
    if (prices.length) stations.push({ station, prices });
  }
  return stations;
}

export const PRICE_SMS_QUALITY_LIMITS = { moisture: 14, maxFm: 3 } as const;

/** Only transform the known old station format; leave modern and unrelated SMS untouched. */
export function compactLegacyPriceSms(message: string): string {
  if (!/Great Agro Coffee Price/i.test(message)) return message;
  const stations = parseLegacyStationPrices(message);
  if (!stations.some(row => row.station === 'HEAD OFFICE')) return message;
  const date = message.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] || '';
  const correction = /^CORRECTION:/i.test(message.trim());
  const lines = [`${correction ? 'CORRECTION: ' : ''}Great Agro Coffee Prices ${date} (UGX/kg)`];
  for (const row of stations) {
    lines.push(row.station);
    const perLine = row.station === 'HEAD OFFICE' ? 2 : 3;
    for (let i = 0; i < row.prices.length; i += perLine) {
      lines.push(row.prices.slice(i, i + perLine).map(price => `${price.label} ${price.value.toLocaleString('en-UG')}`).join(' | '));
    }
  }
  lines.push(`All: Moisture ${PRICE_SMS_QUALITY_LIMITS.moisture}%, FM max ${PRICE_SMS_QUALITY_LIMITS.maxFm}%`);
  if (correction) lines.push('Disregard previous prices.');
  return lines.join('\n');
}