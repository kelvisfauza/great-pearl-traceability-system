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
  try {
    console.log('Generating PDF for report:', report.id, 'Preview mode:', preview);
    
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
    
    console.log('PDF document created successfully');
    
    // Save or preview the PDF
    const fileName = `store-report-${format(new Date(report.date), 'yyyy-MM-dd')}-${report.coffee_type.replace(/\s+/g, '-')}.pdf`;
    
    if (preview) {
      console.log('Opening PDF preview in new tab');
      // Create blob and open in new tab for preview
      const pdfBlob = doc.output('blob');
      console.log('PDF blob created:', pdfBlob.size, 'bytes');
      
      const url = URL.createObjectURL(pdfBlob);
      console.log('Object URL created:', url);
      
      // Try to open in new tab
      const newWindow = window.open('', '_blank');
      
      if (!newWindow) {
        console.error('Pop-up blocked or window.open failed');
        throw new Error('Pop-up blocked. Please allow pop-ups for this site to preview PDFs.');
      }
      
      // Write PDF content to the new window
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Store Report Preview</title>
          <style>
            body { margin: 0; padding: 0; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe src="${url}" type="application/pdf"></iframe>
        </body>
        </html>
      `);
      
      // Alternative fallback: create a download link in the new window if PDF viewer fails
      setTimeout(() => {
        if (newWindow && !newWindow.closed) {
          newWindow.document.body.innerHTML += `
            <div style="position: fixed; top: 10px; right: 10px; background: white; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
              <p>If PDF doesn't display, <a href="${url}" download="${fileName}">click here to download</a></p>
            </div>
          `;
        }
      }, 2000);
      
      // Clean up the URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 30000);
      
      console.log('PDF preview opened successfully');
    } else {
      console.log('Downloading PDF');
      // Download the PDF
      doc.save(fileName);
      console.log('PDF download initiated');
    }
  } catch (error) {
    console.error('Error in generateStoreReportPDF:', error);
    throw error;
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

// Sales Transaction Interface
export interface SalesTransaction {
  id: string;
  date: string;
  customer: string;
  coffee_type: string;
  moisture?: string | number;
  weight: number;
  unit_price: number;
  total_amount: number;
  truck_details: string;
  driver_details: string;
  status: string;
  grn_number?: string;
}

// Generate single sales transaction PDF
export const generateSalesTransactionPDF = (transaction: SalesTransaction) => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('SALES TRANSACTION REPORT', 105, 25, { align: 'center' });
    
    // Date
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text(`Transaction Date: ${format(new Date(transaction.date), 'MMMM dd, yyyy')}`, 105, 35, { align: 'center' });
    
    // Divider
    doc.setDrawColor(189, 195, 199);
    doc.line(20, 45, 190, 45);
    
    let yPosition = 55;
    
    // Customer Information
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Customer Information', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    
    const leftCol = 20;
    const rightCol = 110;
    
    doc.text('Customer:', leftCol, yPosition);
    doc.text(transaction.customer, leftCol + 25, yPosition);
    
    if (transaction.grn_number) {
      doc.text('GRN Number:', rightCol, yPosition);
      doc.text(transaction.grn_number, rightCol + 30, yPosition);
    }
    yPosition += 10;
    
    // Product Details
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Product Details', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    
    doc.text('Coffee Type:', leftCol, yPosition);
    doc.text(transaction.coffee_type, leftCol + 28, yPosition);
    
    if (transaction.moisture !== undefined && transaction.moisture !== null) {
      doc.text('Moisture:', rightCol, yPosition);
      doc.text(`${typeof transaction.moisture === 'number' ? transaction.moisture : parseFloat(transaction.moisture) || 0}%`, rightCol + 22, yPosition);
    }
    yPosition += 8;
    
    doc.text('Weight:', leftCol, yPosition);
    doc.text(`${transaction.weight.toLocaleString()} kg`, leftCol + 18, yPosition);
    
    doc.text('Unit Price:', rightCol, yPosition);
    doc.text(`UGX ${transaction.unit_price.toLocaleString()}/kg`, rightCol + 25, yPosition);
    yPosition += 10;
    
    // Total Amount - Highlighted
    doc.setFontSize(14);
    doc.setFillColor(46, 204, 113);
    doc.rect(leftCol - 2, yPosition - 6, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Total Amount:', leftCol, yPosition);
    doc.text(`UGX ${transaction.total_amount.toLocaleString()}`, leftCol + 35, yPosition);
    yPosition += 15;
    
    // Transport Details
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Transport Details', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    
    doc.text('Truck Details:', leftCol, yPosition);
    const truckText = doc.splitTextToSize(transaction.truck_details, 80);
    doc.text(truckText, leftCol + 30, yPosition);
    yPosition += truckText.length * 6;
    
    doc.text('Driver Details:', leftCol, yPosition);
    const driverText = doc.splitTextToSize(transaction.driver_details, 80);
    doc.text(driverText, leftCol + 30, yPosition);
    yPosition += driverText.length * 6 + 10;
    
    // Status
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Status:', leftCol, yPosition);
    
    // Color code status
    if (transaction.status === 'Completed') {
      doc.setTextColor(46, 204, 113);
    } else {
      doc.setTextColor(241, 196, 15);
    }
    doc.text(transaction.status, leftCol + 20, yPosition);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}`, 105, 280, { align: 'center' });
    doc.text('Coffee ERP System - Sales Transaction Report', 105, 290, { align: 'center' });
    
    // Save
    const fileName = `sales-${transaction.customer.replace(/\s+/g, '-')}-${format(new Date(transaction.date), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating sales PDF:', error);
    throw error;
  }
};

// Generate monthly sales summary report with statistics
export const generateMonthlySalesSummaryPDF = (transactions: SalesTransaction[], periodName: string = 'Sales Period') => {
  try {
    if (!transactions || transactions.length === 0) {
      throw new Error('No transactions available for report');
    }

    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('MONTHLY SALES SUMMARY REPORT', 105, 20, { align: 'center' });
    
    // Date range
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text(periodName, 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 105, 38, { align: 'center' });
    
    // Divider
    doc.setDrawColor(189, 195, 199);
    doc.line(20, 45, 190, 45);
    
    let yPosition = 55;
    
    // Key Metrics Section
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('KEY PERFORMANCE METRICS', 20, yPosition);
    yPosition += 12;
    
    // Calculate statistics
    const totalTransactions = transactions.length;
    const totalWeight = transactions.reduce((sum, t) => sum + t.weight, 0);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const avgPrice = totalWeight > 0 ? totalRevenue / totalWeight : 0;
    const avgTransactionSize = totalTransactions > 0 ? totalWeight / totalTransactions : 0;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Metrics boxes
    doc.setFillColor(46, 204, 113);
    doc.roundedRect(20, yPosition - 5, 80, 25, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL REVENUE', 60, yPosition, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`UGX ${totalRevenue.toLocaleString()}`, 60, yPosition + 8, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`${totalTransactions} transactions`, 60, yPosition + 14, { align: 'center' });
    
    doc.setFillColor(52, 152, 219);
    doc.roundedRect(110, yPosition - 5, 80, 25, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text('TOTAL WEIGHT SOLD', 150, yPosition, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`${totalWeight.toLocaleString()} kg`, 150, yPosition + 8, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Avg: ${avgTransactionSize.toFixed(0)} kg/sale`, 150, yPosition + 14, { align: 'center' });
    
    yPosition += 35;
    
    // Additional metrics
    doc.setFillColor(155, 89, 182);
    doc.roundedRect(20, yPosition - 5, 80, 20, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text('AVG PRICE PER KG', 60, yPosition, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`UGX ${Math.round(avgPrice).toLocaleString()}`, 60, yPosition + 8, { align: 'center' });
    
    doc.setFillColor(230, 126, 34);
    doc.roundedRect(110, yPosition - 5, 80, 20, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text('AVG TRANSACTION VALUE', 150, yPosition, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`UGX ${Math.round(avgTransactionValue).toLocaleString()}`, 150, yPosition + 8, { align: 'center' });
    
    yPosition += 30;
    
    // Coffee Type Breakdown
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('BREAKDOWN BY COFFEE TYPE', 20, yPosition);
    yPosition += 10;
    
    const coffeeBreakdown = transactions.reduce((acc, t) => {
      if (!acc[t.coffee_type]) {
        acc[t.coffee_type] = { weight: 0, revenue: 0, count: 0 };
      }
      acc[t.coffee_type].weight += t.weight;
      acc[t.coffee_type].revenue += t.total_amount;
      acc[t.coffee_type].count += 1;
      return acc;
    }, {} as Record<string, { weight: number; revenue: number; count: number }>);
    
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text('Coffee Type', 25, yPosition);
    doc.text('Transactions', 75, yPosition);
    doc.text('Weight (kg)', 115, yPosition);
    doc.text('Revenue (UGX)', 155, yPosition);
    
    doc.setDrawColor(189, 195, 199);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 8;
    
    Object.entries(coffeeBreakdown).forEach(([type, data]) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(type.substring(0, 20), 25, yPosition);
      doc.text(data.count.toString(), 85, yPosition, { align: 'center' });
      doc.text(data.weight.toLocaleString(), 125, yPosition, { align: 'center' });
      doc.text(data.revenue.toLocaleString(), 175, yPosition, { align: 'center' });
      yPosition += 6;
    });
    
    yPosition += 10;
    
    // Top Customers
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('TOP CUSTOMERS', 20, yPosition);
    yPosition += 10;
    
    const customerBreakdown = transactions.reduce((acc, t) => {
      if (!acc[t.customer]) {
        acc[t.customer] = { weight: 0, revenue: 0, count: 0 };
      }
      acc[t.customer].weight += t.weight;
      acc[t.customer].revenue += t.total_amount;
      acc[t.customer].count += 1;
      return acc;
    }, {} as Record<string, { weight: number; revenue: number; count: number }>);
    
    const topCustomers = Object.entries(customerBreakdown)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);
    
    doc.setFontSize(10);
    doc.setTextColor(52, 73, 94);
    doc.text('Customer', 25, yPosition);
    doc.text('Purchases', 80, yPosition);
    doc.text('Weight (kg)', 120, yPosition);
    doc.text('Revenue (UGX)', 160, yPosition);
    
    doc.setDrawColor(189, 195, 199);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 8;
    
    topCustomers.forEach(([customer, data], index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${index + 1}. ${customer.substring(0, 18)}`, 25, yPosition);
      doc.text(data.count.toString(), 90, yPosition, { align: 'center' });
      doc.text(data.weight.toLocaleString(), 130, yPosition, { align: 'center' });
      doc.text(data.revenue.toLocaleString(), 175, yPosition, { align: 'center' });
      yPosition += 6;
    });
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}`, 105, 285, { align: 'center' });
      doc.text(`Coffee ERP System - Sales Summary Report - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    // Save
    const fileName = `sales-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    
    return true;
  } catch (error) {
    console.error('Error generating monthly sales summary PDF:', error);
    throw error;
  }
};

// Finance Monthly Report Interface
export interface FinanceMonthlyData {
  period: { start: string; end: string };
  totalPaid: number;
  coffeePaid: number;
  suppliersPaid: number;
  expensesPaid: number;
  unpaidTransactions: number;
  unpaidAmount: number;
  openingBalance: number;
  closingBalance: number;
  cashIn: number;
  cashOut: number;
  supplierDetails: Array<{
    name: string;
    amount: number;
    batches: number;
  }>;
  expenseDetails: Array<{
    description: string;
    amount: number;
    date: string;
  }>;
  unpaidDetails: Array<{
    type: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

// Generate Finance Monthly Report PDF
export const generateFinanceMonthlyReportPDF = (data: FinanceMonthlyData) => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80);
    doc.text('MONTHLY FINANCE REPORT', 105, 20, { align: 'center' });
    
    // Period
    doc.setFontSize(14);
    doc.setTextColor(52, 73, 94);
    doc.text(`Period: ${format(new Date(data.period.start), 'MMMM yyyy')}`, 105, 30, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`${format(new Date(data.period.start), 'MMM dd')} - ${format(new Date(data.period.end), 'MMM dd, yyyy')}`, 105, 37, { align: 'center' });
    
    // Divider
    doc.setDrawColor(189, 195, 199);
    doc.line(20, 43, 190, 43);
    
    let yPosition = 52;
    
    // Summary Cards - 4 cards matching the on-screen layout
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('SUMMARY', 20, yPosition);
    yPosition += 8;
    
    // Card 1: Total Paid (top-left)
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(20, yPosition, 42, 24, 2, 2, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(20, yPosition, 42, 24, 2, 2);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Total Paid', 22, yPosition + 5);
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(`${data.totalPaid.toLocaleString()}`, 22, yPosition + 13);
    doc.setFontSize(8);
    doc.text('UGX', 22, yPosition + 20);
    
    // Card 2: Coffee Paid (top-right)
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(65, yPosition, 42, 24, 2, 2, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(65, yPosition, 42, 24, 2, 2);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Coffee Paid', 67, yPosition + 5);
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(`${data.coffeePaid.toLocaleString()}`, 67, yPosition + 13);
    doc.setFontSize(8);
    doc.text(`UGX | ${data.suppliersPaid} suppliers`, 67, yPosition + 20);
    
    // Card 3: Unpaid (bottom-left)
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(110, yPosition, 42, 24, 2, 2, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(110, yPosition, 42, 24, 2, 2);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Unpaid', 112, yPosition + 5);
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(`${data.unpaidAmount.toLocaleString()}`, 112, yPosition + 13);
    doc.setFontSize(8);
    doc.text(`UGX | ${data.unpaidTransactions} transactions`, 112, yPosition + 20);
    
    // Card 4: Closing Balance (bottom-right)
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(155, yPosition, 42, 24, 2, 2, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.roundedRect(155, yPosition, 42, 24, 2, 2);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Closing Balance', 157, yPosition + 5);
    doc.setFontSize(12);
    doc.setTextColor(44, 62, 80);
    doc.text(`${data.closingBalance.toLocaleString()}`, 157, yPosition + 13);
    doc.setFontSize(8);
    doc.text('UGX', 157, yPosition + 20);
    
    yPosition += 32;
    
    // Cash Flow Summary Table
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('CASH FLOW SUMMARY', 20, yPosition);
    yPosition += 8;
    
    // Table header
    doc.setFillColor(248, 250, 252);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(20, yPosition, 170, 8);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('Description', 25, yPosition + 5);
    doc.text('Amount (UGX)', 155, yPosition + 5);
    yPosition += 8;
    
    // Table rows
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    // Opening Balance
    doc.rect(20, yPosition, 170, 7);
    doc.text('Opening Balance', 25, yPosition + 5);
    doc.text(data.openingBalance.toLocaleString(), 185, yPosition + 5, { align: 'right' });
    yPosition += 7;
    
    // Total Cash In
    doc.rect(20, yPosition, 170, 7);
    doc.setTextColor(22, 163, 74);
    doc.text('Total Cash In', 25, yPosition + 5);
    doc.text(`+${data.cashIn.toLocaleString()}`, 185, yPosition + 5, { align: 'right' });
    yPosition += 7;
    
    // Total Cash Out
    doc.rect(20, yPosition, 170, 7);
    doc.setTextColor(220, 38, 38);
    doc.text('Total Cash Out', 25, yPosition + 5);
    doc.text(`-${data.cashOut.toLocaleString()}`, 185, yPosition + 5, { align: 'right' });
    yPosition += 7;
    
    // Closing Balance (bold border)
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.5);
    doc.rect(20, yPosition, 170, 8);
    doc.setLineWidth(0.2);
    doc.setFillColor(248, 250, 252);
    doc.rect(20, yPosition, 170, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Closing Balance', 25, yPosition + 5.5);
    doc.text(data.closingBalance.toLocaleString(), 185, yPosition + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPosition += 15;
    
    // Top Suppliers Paid Table
    if (data.supplierDetails.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('TOP SUPPLIERS PAID', 20, yPosition);
      yPosition += 8;
      
      // Table header
      doc.setFillColor(248, 250, 252);
      doc.rect(20, yPosition, 170, 8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, yPosition, 170, 8);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Supplier', 25, yPosition + 5);
      doc.text('Batches', 125, yPosition + 5, { align: 'center' });
      doc.text('Amount (UGX)', 185, yPosition + 5, { align: 'right' });
      yPosition += 8;
      
      // Table rows
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      data.supplierDetails.slice(0, 10).forEach((supplier, idx) => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Alternate row background
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(20, yPosition, 170, 6, 'F');
        }
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, yPosition, 170, 6);
        
        doc.text(supplier.name.substring(0, 40), 25, yPosition + 4);
        doc.text(supplier.batches.toString(), 125, yPosition + 4, { align: 'center' });
        doc.text(supplier.amount.toLocaleString(), 185, yPosition + 4, { align: 'right' });
        yPosition += 6;
      });
      
      yPosition += 10;
    } else {
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('TOP SUPPLIERS PAID', 20, yPosition);
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('No supplier payments this month', 25, yPosition);
      yPosition += 15;
    }
    
    // Unpaid Transactions Table
    if (data.unpaidDetails.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text('UNPAID TRANSACTIONS', 20, yPosition);
      yPosition += 8;
      
      // Table header
      doc.setFillColor(254, 242, 242);
      doc.rect(20, yPosition, 170, 8, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.rect(20, yPosition, 170, 8);
      doc.setFontSize(9);
      doc.setTextColor(153, 27, 27);
      doc.text('Type', 25, yPosition + 5);
      doc.text('Description', 60, yPosition + 5);
      doc.text('Date', 130, yPosition + 5);
      doc.text('Amount (UGX)', 185, yPosition + 5, { align: 'right' });
      yPosition += 8;
      
      // Table rows
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      data.unpaidDetails.forEach((item, idx) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Alternate row background
        if (idx % 2 === 0) {
          doc.setFillColor(254, 252, 252);
          doc.rect(20, yPosition, 170, 6, 'F');
        }
        doc.setDrawColor(254, 226, 226);
        doc.rect(20, yPosition, 170, 6);
        
        // Type badge
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
        doc.roundedRect(22, yPosition + 1, 30, 4, 1, 1, 'FD');
        doc.setFontSize(7);
        doc.setTextColor(153, 27, 27);
        doc.text(item.type.substring(0, 15), 37, yPosition + 3.5, { align: 'center' });
        
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(item.description.substring(0, 35), 60, yPosition + 4);
        doc.text(item.date, 130, yPosition + 4);
        doc.text(item.amount.toLocaleString(), 185, yPosition + 4, { align: 'right' });
        yPosition += 6;
      });
    }
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(149, 165, 166);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}`, 105, 285, { align: 'center' });
      doc.text(`Coffee ERP System - Finance Monthly Report - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    // Save
    const fileName = `finance-monthly-report-${format(new Date(data.period.start), 'yyyy-MM')}.pdf`;
    doc.save(fileName);
    
    return true;
  } catch (error) {
    console.error('Error generating finance monthly report PDF:', error);
    throw error;
  }
};

// Generate multiple sales transactions PDF
export const generateMultipleSalesPDF = (transactions: SalesTransaction[], title: string = 'Sales Transactions Report') => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text(title.toUpperCase(), 105, 25, { align: 'center' });
    
    // Date range
    const dates = transactions.map(t => new Date(t.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    
    doc.setFontSize(12);
    doc.setTextColor(52, 73, 94);
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 105, 35, { align: 'center' });
    
    // Summary Statistics
    const totalWeight = transactions.reduce((sum, t) => sum + t.weight, 0);
    const totalAmount = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const avgPrice = totalAmount / totalWeight;
    
    let yPosition = 50;
    
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text('Summary Statistics', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(52, 73, 94);
    
    doc.text(`Total Transactions: ${transactions.length}`, 20, yPosition);
    doc.text(`Total Weight: ${totalWeight.toLocaleString()} kg`, 80, yPosition);
    doc.text(`Avg Price: UGX ${Math.round(avgPrice).toLocaleString()}/kg`, 150, yPosition);
    yPosition += 6;
    
    doc.text(`Total Amount: UGX ${totalAmount.toLocaleString()}`, 20, yPosition);
    yPosition += 15;
    
    // Table Header
    doc.setFontSize(10);
    doc.setTextColor(44, 62, 80);
    doc.text('Date', 20, yPosition);
    doc.text('Customer', 42, yPosition);
    doc.text('Coffee Type', 75, yPosition);
    doc.text('Weight', 108, yPosition);
    doc.text('Price/kg', 130, yPosition);
    doc.text('Amount', 160, yPosition);
    
    // Table line
    doc.setDrawColor(189, 195, 199);
    doc.line(20, yPosition + 2, 190, yPosition + 2);
    yPosition += 8;
    
    // Table content
    doc.setFontSize(9);
    doc.setTextColor(52, 73, 94);
    
    transactions.forEach(transaction => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(format(new Date(transaction.date), 'MM/dd'), 20, yPosition);
      doc.text(transaction.customer.substring(0, 15), 42, yPosition);
      doc.text(transaction.coffee_type.substring(0, 15), 75, yPosition);
      doc.text(`${transaction.weight.toLocaleString()}`, 108, yPosition);
      doc.text(`${transaction.unit_price.toLocaleString()}`, 130, yPosition);
      doc.text(`${transaction.total_amount.toLocaleString()}`, 160, yPosition);
      
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
    
    // Save
    const fileName = `sales-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating sales PDF:', error);
    throw error;
  }
};