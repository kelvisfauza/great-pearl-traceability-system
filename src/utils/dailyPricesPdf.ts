import jsPDF from 'jspdf';
import { COMPANY_NAME, COMPANY_TAGLINE, COMPANY_ADDRESS, COMPANY_PHONES, COMPANY_EMAIL, COMPANY_WEBSITE, COMPANY_REG } from './companyBrand';

export interface DailyPriceSnapshot {
  ice_arabica: number | null;
  robusta: number | null;
  exchange_rate: number | null;
  drugar_local: number | null;
  wugar_local: number | null;
  robusta_faq_local: number | null;
  arabica_buying_price: number | null;
  robusta_buying_price: number | null;
  sorted_price: number | null;
  arabica_outturn: number | null;
  robusta_outturn: number | null;
  last_updated: string | null;
}

export const kampalaDate = (date: Date) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Kampala', day: '2-digit', month: 'long', year: 'numeric',
}).format(date);

export function buildDailyPricesPdf(prices: DailyPriceSnapshot, date: Date, code: string, qr: string, logo: string) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const fmt = (n: number | null, decimals = 0) => n == null || !Number.isFinite(n) || n <= 0
    ? 'Not set' : n.toLocaleString('en-UG', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
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
  const section = (title: string, y: number) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(title, 15, y);
    doc.line(15, y + 3, 195, y + 3);
  };
  section('LOCAL MARKET PRICES  /  UGX per kg', 86);
  [ ['Drugar', prices.drugar_local], ['Wugar', prices.wugar_local], ['Robusta FAQ', prices.robusta_faq_local], ['Sorted', prices.sorted_price] ].forEach(([label, value], i) => {
    const y = 100 + i * 15;
    doc.setFontSize(14); doc.text(String(label), 18, y);
    doc.setFontSize(26); doc.text(fmt(value as number | null), 192, y, { align: 'right' });
  });
  section('BUYING PRICES  /  UGX per kg', 159);
  doc.setFontSize(12);
  doc.text(`Arabica (${fmt(prices.arabica_outturn)}% outturn)`, 18, 172);
  doc.text(fmt(prices.arabica_buying_price), 192, 172, { align: 'right' });
  doc.text(`Robusta (${fmt(prices.robusta_outturn)}% outturn)`, 18, 183);
  doc.text(fmt(prices.robusta_buying_price), 192, 183, { align: 'right' });
  section('ICE MARKET REFERENCES & EXCHANGE RATE', 197);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
  doc.text('ICE Arabica (US cents/lb)', 18, 209);
  doc.text(fmt(prices.ice_arabica, 2), 192, 209, { align: 'right' });
  doc.text('ICE Robusta (USD/tonne)', 18, 219);
  doc.text(fmt(prices.robusta, 2), 192, 219, { align: 'right' });
  doc.text('USD / UGX', 18, 229);
  doc.text(fmt(prices.exchange_rate, 2), 192, 229, { align: 'right' });
  doc.line(15, 239, 195, 239);
  doc.addImage(qr, 'PNG', 15, 245, 26, 26);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('Scan to verify this price sheet', 47, 251);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Verification: ${code}`, 47, 258);
  const updated = prices.last_updated ? new Date(prices.last_updated) : null;
  doc.text(`Prices last updated: ${updated && !Number.isNaN(updated.getTime()) ? kampalaDate(updated) : 'Not recorded'}`, 47, 265);
  doc.setFontSize(8); doc.text(`${COMPANY_NAME} | Quality Department`, 15, 284);
  doc.text('Page 1 of 1', 195, 284, { align: 'right' });
  return doc;
}