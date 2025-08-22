export const getStandardPrintStyles = () => `
  @page {
    margin: 0.5in;
    size: A4;
  }
  
  body { 
    font-family: Arial, sans-serif; 
    margin: 0; 
    padding: 20px;
    line-height: 1.4;
    color: #333;
  }
  
  .print-header {
    text-align: center;
    border-bottom: 2px solid #333;
    padding-bottom: 15px;
    margin-bottom: 20px;
  }
  
  .company-logo, img {
    height: 40px !important;
    width: auto !important;
    max-width: 80px !important;
    margin: 0 auto 8px !important;
    display: block !important;
  }
  
  .company-name {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #1a365d;
  }
  
  .company-details {
    font-size: 12px;
    color: #666;
    margin-bottom: 15px;
    line-height: 1.6;
  }
  
  .document-title {
    font-size: 18px;
    font-weight: bold;
    margin: 15px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .document-info {
    font-size: 12px;
    color: #666;
    margin-bottom: 10px;
  }
  
  .content-section {
    margin: 20px 0;
    break-inside: avoid;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 15px;
    padding: 10px;
    background: #f8f9fa;
    border-left: 4px solid #007bff;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 14px;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: #f8f9fa;
    font-weight: bold;
  }
  
  .amount {
    text-align: right;
    font-weight: 500;
  }
  
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
    font-size: 12px;
  }
  
  .signatures div {
    text-align: center;
    flex: 1;
    margin: 0 20px;
  }
  
  .signature-line {
    border-top: 1px solid #000;
    margin: 20px auto 10px;
    width: 200px;
  }
  
  .footer {
    text-align: center;
    font-size: 10px;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 15px;
    margin-top: 40px;
  }
  
  .no-print {
    display: none !important;
  }
  
  .page-break {
    page-break-before: always;
  }
  
  .positive {
    color: #28a745;
  }
  
  .negative {
    color: #dc3545;
  }
  
  .total-row {
    background-color: #f1f3f4;
    font-weight: bold;
  }
`;