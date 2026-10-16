import jsPDF from 'jspdf';
import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONES, COMPANY_EMAIL, COMPANY_WEBSITE, COMPANY_REG } from './companyBrand';
import { STATION_PRICE_ROWS, type StationParams, type StationPriceValues } from './stationPrices';

export interface DailyPriceSnapshot extends StationPriceValues {
  ice_arabica: number | null;
  robusta: number | null;
  exchange_rate: number | null;
  station_params?: StationParams | null;
  last_updated: string | null;
}

export const kampalaDate = (date: Date) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Kampala', day: '2-digit', month: 'long', year: 'numeric',
}).format(date);

export function buildDailyPricesPdf(prices: DailyPriceSnapshot, date: Date, code: string, qr: string, logo: string) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const fmt = (n: number | null | undefined, decimals = 0) => n == null || !Number.isFinite(n) || n <= 0
    ? '—' : n.toLocaleString('en-UG', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
  const fmtPct = (n: number | null | undefined) => n == null || !Number.isFinite(n) || n <= 0 ? '—' : `${n}%`;

  // Header
  doc.setTextColor(0);
  doc.addImage(logo, 'PNG', 15, 13, 25, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(COMPANY_NAME, 45, 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(COMPANY_TAGLINE, 45, 27);
  doc.text(COMPANY_ADDRESS, 45, 33);
  doc.text(COMPANY_PHONES, 45, 39);
  doc.setFontSize(8);
  doc.text(`${COMPANY_EMAIL} | ${COMPANY_WEBSITE}`, 15, 46);
  doc.text(COMPANY_REG, 15, 51);
  doc.line(15, 55, 195, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(21);
  doc.text("TODAY'S COFFEE PRICES", 105, 66, { align: 'center' });
  doc.setFontSize(12);
  doc.text(kampalaDate(date), 105, 74, { align: 'center' });

  // Station prices & quality parameters table
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('STATION PRICES & QUALITY PARAMETERS  /  UGX per kg', 15, 84);
  doc.line(15, 87, 195, 87);

  const cols = { location: 18, quality: 55, price: 105, moisture: 135, outturn: 160, fm: 188 };
  let y = 94;
  doc.setFontSize(9);
  doc.text('Location', cols.location, y);
  doc.text('Quality', cols.quality, y);
  doc.text('UGX/kg', cols.price, y, { align: 'right' });
  doc.text('Moisture', cols.moisture, y, { align: 'right' });
  doc.text('Outturn', cols.outturn, y, { align: 'right' });
  doc.text('Total FM', cols.fm, y, { align: 'right' });
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  let lastLocation = '';
  STATION_PRICE_ROWS.forEach((row, i) => {
    if (i > 0) {
      doc.setDrawColor(210);
      doc.line(15, y - 5, 195, y - 5);
      doc.setDrawColor(0);
    }
    const params = prices.station_params?.[row.key];
    const showLocation = row.location !== lastLocation;
    lastLocation = row.location;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    if (showLocation) doc.text(row.location, cols.location, y);
    doc.setFont('helvetica', 'normal');
    doc.text(row.quality, cols.quality, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text(fmt(prices[row.key]), cols.price, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(fmtPct(params?.moisture), cols.moisture, y, { align: 'right' });
    doc.text(fmtPct(params?.outturn), cols.outturn, y, { align: 'right' });
    doc.text(fmtPct(params?.fm), cols.fm, y, { align: 'right' });
    y += 8;
  });
  doc.line(15, y - 5, 195, y - 5);

  // ICE market references
  y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('ICE MARKET REFERENCES & EXCHANGE RATE', 15, y);
  doc.line(15, y + 3, 195, y + 3);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text('ICE Arabica (US cents/lb)', 18, y + 12);
  doc.text(fmt(prices.ice_arabica, 2), 192, y + 12, { align: 'right' });
  doc.text('ICE Robusta (USD/tonne)', 18, y + 21);
  doc.text(fmt(prices.robusta, 2), 192, y + 21, { align: 'right' });
  doc.text('USD / UGX', 18, y + 30);
  doc.text(fmt(prices.exchange_rate, 2), 192, y + 30, { align: 'right' });
  doc.line(15, y + 36, 195, y + 36);

  // Verification QR footer
  const qrY = y + 42;
  doc.addImage(qr, 'PNG', 15, qrY, 26, 26);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Scan to verify this price sheet', 47, qrY + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Verification: ${code}`, 47, qrY + 13);
  const updated = prices.last_updated ? new Date(prices.last_updated) : null;
  doc.text(`Prices last updated: ${updated && !Number.isNaN(updated.getTime()) ? kampalaDate(updated) : 'Not recorded'}`, 47, qrY + 20);
  doc.setFontSize(8); doc.text(`${COMPANY_NAME} | Quality Department`, 15, 284);
  doc.text('Page 1 of 1', 195, 284, { align: 'right' });
  return doc;
}
