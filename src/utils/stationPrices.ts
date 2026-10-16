// Station/location-based buying price table (Head Office, Kyarumba, Rubirizi).
// Used by the Data Analyst price form, the admin approval panel, the approval
// emails (full table) and the SMS broadcasts (summarised).

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

/** Full HTML table for emails, styled like the shared market price sheets. */
export function buildStationPriceTableHtml(prices: StationPriceValues): string {
  const header =
    '<tr style="background:#1e3a8a;color:#ffffff;">' +
    '<th style="padding:8px 10px;text-align:left;border:1px solid #cbd5e1;">Location / Region</th>' +
    '<th style="padding:8px 10px;text-align:left;border:1px solid #cbd5e1;">Quality</th>' +
    '<th style="padding:8px 10px;text-align:right;border:1px solid #cbd5e1;">UGX/Kg</th></tr>';

  const rows: string[] = [];
  STATION_LOCATIONS.forEach((location) => {
    const locationRows = STATION_PRICE_ROWS.filter((r) => r.location === location);
    locationRows.forEach((row, i) => {
      const value = fmtUgx(prices[row.key]);
      const locationCell =
        i === 0
          ? `<td rowspan="${locationRows.length}" style="padding:8px 10px;border:1px solid #cbd5e1;font-weight:bold;vertical-align:top;">${location}</td>`
          : '';
      rows.push(
        `<tr>${locationCell}` +
          `<td style="padding:8px 10px;border:1px solid #cbd5e1;">${row.quality}</td>` +
          `<td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:right;font-weight:bold;">${value}</td></tr>`
      );
    });
  });

  return (
    '<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">' +
    header +
    rows.join('') +
    '</table>'
  );
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
