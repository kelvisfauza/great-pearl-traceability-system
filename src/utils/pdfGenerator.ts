import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface StoreReport {
  id: string;
  date: string;
  coffee_type: string;
  kilograms_bought: number;
  average_buying_price: number;
  kilograms_sold: number;
  bags_sold: number;
  sold_to?: string;
  bags_left: number;
  kilograms_left: number;
  kilograms_unbought: number;
  advances_given: number;
  comments?: string;
  input_by: string;
  attachment_name?: string;
  scanner_used?: string;
}

export const generateStoreReportPDF = (report: StoreReport, preview: boolean = false) => {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text('DAILY STORE REPORT', 105, 25, { align: 'center' });
  
  // Date
  doc.setFontSize(14);
  doc.setTextColor(52, 73, 94);
  doc.text(`Report Date: ${format(new Date(report.date), 'MMMM dd, yyyy')}`, 105, 35, { align: 'center' });
  
  // Divider line
  doc.setDrawColor(189, 195, 199);
  doc.line(20, 45, 190, 45);
  
  let yPosition = 55;
  
  // Report Information Section
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80);
  doc.text('Report Information', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  
  // Two column layout for basic info
  const leftCol = 20;
  const rightCol = 110;
  
  doc.text('Coffee Type:', leftCol, yPosition);
  doc.text(report.coffee_type, leftCol + 30, yPosition);
  
  doc.text('Input By:', rightCol, yPosition);
  doc.text(report.input_by, rightCol + 25, yPosition);
  yPosition += 8;
  
  if (report.scanner_used) {
    doc.text('Scanner Used:', leftCol, yPosition);
    doc.text(report.scanner_used, leftCol + 35, yPosition);
    yPosition += 8;
  }
  
  yPosition += 10;
  
  // Purchase Section
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80);
  doc.text('Purchase Details', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  
  doc.text('Kilograms Bought:', leftCol, yPosition);
  doc.text(`${report.kilograms_bought} kg`, leftCol + 40, yPosition);
  
  doc.text('Average Price:', rightCol, yPosition);
  doc.text(`UGX ${report.average_buying_price.toLocaleString()}/kg`, rightCol + 30, yPosition);
  yPosition += 8;
  
  doc.text('Advances Given:', leftCol, yPosition);
  doc.text(`UGX ${report.advances_given.toLocaleString()}`, leftCol + 35, yPosition);
  yPosition += 15;
  
  // Sales Section
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80);
  doc.text('Sales Details', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  
  doc.text('Kilograms Sold:', leftCol, yPosition);
  doc.text(`${report.kilograms_sold} kg`, leftCol + 35, yPosition);
  
  doc.text('Bags Sold:', rightCol, yPosition);
  doc.text(`${report.bags_sold}`, rightCol + 25, yPosition);
  yPosition += 8;
  
  if (report.sold_to) {
    doc.text('Sold To:', leftCol, yPosition);
    doc.text(report.sold_to, leftCol + 20, yPosition);
    yPosition += 8;
  }
  
  yPosition += 10;
  
  // Inventory Section
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80);
  doc.text('Current Inventory', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  
  doc.text('Bags Left:', leftCol, yPosition);
  doc.text(`${report.bags_left}`, leftCol + 25, yPosition);
  
  doc.text('Kilograms Left:', rightCol, yPosition);
  doc.text(`${report.kilograms_left} kg`, rightCol + 35, yPosition);
  yPosition += 8;
  
  doc.text('Kilograms Unbought:', leftCol, yPosition);
  doc.text(`${report.kilograms_unbought} kg`, leftCol + 45, yPosition);
  yPosition += 15;
  
  // Comments Section
  if (report.comments) {
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Comments', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    
    // Handle long comments with text wrapping
    const comments = doc.splitTextToSize(report.comments, 150);
    doc.text(comments, 20, yPosition);
    yPosition += comments.length * 6 + 10;
  }
  
  // Document Information
  if (report.attachment_name) {
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Attached Document', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    doc.text(`Document: ${report.attachment_name}`, 20, yPosition);
    yPosition += 10;
  }
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(149, 165, 166);
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}`, 105, 280, { align: 'center' });
  doc.text('Coffee ERP System - Store Management Report', 105, 290, { align: 'center' });
  
  // Save or preview the PDF
  const fileName = `store-report-${format(new Date(report.date), 'yyyy-MM-dd')}-${report.coffee_type.replace(/\s+/g, '-')}.pdf`;
  
  if (preview) {
    // Open PDF in new tab for preview
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
  } else {
    // Download the PDF
    doc.save(fileName);
  }
};

export const generateMultipleReportsPDF = (reports: StoreReport[], title: string = 'Store Reports') => {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(44, 62, 80);
  doc.text(title.toUpperCase(), 105, 25, { align: 'center' });
  
  // Date range
  const dates = reports.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  doc.setFontSize(12);
  doc.setTextColor(52, 73, 94);
  doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 105, 35, { align: 'center' });
  
  // Summary Statistics
  const totalKgsBought = reports.reduce((sum, r) => sum + r.kilograms_bought, 0);
  const totalKgsSold = reports.reduce((sum, r) => sum + r.kilograms_sold, 0);
  const totalAdvances = reports.reduce((sum, r) => sum + r.advances_given, 0);
  
  let yPosition = 50;
  
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text('Summary Statistics', 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  doc.setTextColor(52, 73, 94);
  
  doc.text(`Total Reports: ${reports.length}`, 20, yPosition);
  doc.text(`Total Kg Bought: ${totalKgsBought.toLocaleString()} kg`, 70, yPosition);
  doc.text(`Total Kg Sold: ${totalKgsSold.toLocaleString()} kg`, 140, yPosition);
  yPosition += 6;
  
  doc.text(`Total Advances: UGX ${totalAdvances.toLocaleString()}`, 20, yPosition);
  yPosition += 15;
  
  // Table Header
  doc.setFontSize(12);
  doc.setTextColor(44, 62, 80);
  doc.text('Date', 20, yPosition);
  doc.text('Coffee Type', 45, yPosition);
  doc.text('Bought (kg)', 80, yPosition);
  doc.text('Sold (kg)', 115, yPosition);
  doc.text('Price/kg', 145, yPosition);
  doc.text('Advances', 175, yPosition);
  
  // Table line
  doc.setDrawColor(189, 195, 199);
  doc.line(20, yPosition + 2, 190, yPosition + 2);
  yPosition += 8;
  
  // Table content
  doc.setFontSize(10);
  doc.setTextColor(52, 73, 94);
  
  reports.forEach(report => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.text(format(new Date(report.date), 'MM/dd'), 20, yPosition);
    doc.text(report.coffee_type.substring(0, 12), 45, yPosition);
    doc.text(report.kilograms_bought.toString(), 80, yPosition);
    doc.text(report.kilograms_sold.toString(), 115, yPosition);
    doc.text(`${report.average_buying_price.toLocaleString()}`, 145, yPosition);
    doc.text(`${report.advances_given.toLocaleString()}`, 175, yPosition);
    
    yPosition += 6;
  });
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(149, 165, 166);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')} - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }
  
  // Save the PDF
  const fileName = `store-reports-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};