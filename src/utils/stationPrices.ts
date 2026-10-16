// Station/location-based buying price table (Head Office, Kyarumba, Rubirizi).
// Used by the Data Analyst price form, the admin approval panel, the approval
// emails (full table) and the SMS broadcasts (summarised).
// Each row also carries quality parameters: moisture, outturn and total FM.

export interface StationPriceValues {
  drugar_local?: number | null;
  sorted_price?: number | null;
  robusta_faq_local?: number | null;
  wugar_local?: number | null;
  parchment_premium?: number | null;
  parchment_price?: number | null; // Ordinary parchment
  kyarumba_sorted?: number | null;
  kyarumba_ordinary?: number | null;
  kyarumba_undergrades?: number | null;
  rubirizi_drugar_clean?: number | null;
  rubirizi_ordinary?: number | null;
}

export interface StationQualityParam {
  moisture?: number | null;
  outturn?: number | null;
  fm?: number | null;
}

/** Quality parameters keyed by the same keys as StationPriceValues. */
export type StationParams = Partial<Record<keyof StationPriceValues, StationQualityParam>>;

export interface StationPriceRow {
  location: string;
  quality: string;
  key: keyof StationPriceValues;
}

export const STATION_PRICE_ROWS: StationPriceRow[] = [
  { location: 'Head Office', quality: 'Drugar', key: 'drugar_local' },
  { location: 'Head Office', quality: 'Sorted', key: 'sorted_price' },
  { location: 'Head Office', quality: 'Robusta', key: 'robusta_faq_local' },
  { location: 'Head Office', quality: 'Wugar / Dry Clean', key: 'wugar_local' },
  { location: 'Head Office', quality: 'Parchment Premium', key: 'parchment_premium' },
  { location: 'Head Office', quality: 'Ordinary Parchment', key: 'parchment_price' },
  { location: 'Kyarumba', quality: 'Sorted', key: 'kyarumba_sorted' },
  { location: 'Kyarumba', quality: 'Ordinary', key: 'kyarumba_ordinary' },
  { location: 'Kyarumba', quality: 'Undergrades', key: 'kyarumba_undergrades' },
  { location: 'Rubirizi', quality: 'Drugar Clean', key: 'rubirizi_drugar_clean' },
  { location: 'Rubirizi', quality: 'Ordinary', key: 'rubirizi_ordinary' },
];

export const STATION_LOCATIONS = ['Head Office', 'Kyarumba', 'Rubirizi'] as const;

const fmtUgx = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) || n <= 0 ? 'Not set' : `UGX ${n.toLocaleString('en-UG')}/kg`;

export interface StationPriceTableRow {
  location: string;
  quality: string;
  price: number | null;
  moisture?: number | null;
  outturn?: number | null;
  fm?: number | null;
}

/** Structured rows for rendering the full price table in emails. */
export function buildStationPriceRows(
  prices: StationPriceValues,
  params?: StationParams | null,
): StationPriceTableRow[] {
  return STATION_PRICE_ROWS.map((r) => ({
    location: r.location,
    quality: r.quality,
    price: prices[r.key] ?? null,
    moisture: params?.[r.key]?.moisture ?? null,
    outturn: params?.[r.key]?.outturn ?? null,
    fm: params?.[r.key]?.fm ?? null,
  }));
}

/** Short plain-text summary for SMS (character-conscious). */
export function buildStationPriceSmsSummary(prices: StationPriceValues): string {
  const short = (n: number | null | undefined) =>
    n == null || !Number.isFinite(n) || n <= 0 ? '-' : n.toLocaleString('en-UG');
  const lines = [
    `HQ: Drugar ${short(prices.drugar_local)}, Sorted ${short(prices.sorted_price)}, Robusta ${short(prices.robusta_faq_local)}, Wugar/DC ${short(prices.wugar_local)}, Parch Prem ${short(prices.parchment_premium)}, Parch Ord ${short(prices.parchment_price)}`,
    `Kyarumba: Sorted ${short(prices.kyarumba_sorted)}, Ord ${short(prices.kyarumba_ordinary)}, UG ${short(prices.kyarumba_undergrades)}`,
    `Rubirizi: Drugar Clean ${short(prices.rubirizi_drugar_clean)}, Ord ${short(prices.rubirizi_ordinary)}`,
  ];
  return lines.join('\n');
}
