export const getStandardPrintStyles = () => `
  @page {
    margin: 0.4in;
    size: A4;
  }
  
  body { 
    font-family: Arial, sans-serif; 
    margin: 0; 
    padding: 15px;
    line-height: 1.2;
    color: #333;
    font-size: 12px;
  }
  
  .print-header {
    text-align: center;
    border-bottom: 2px solid #333;
    padding-bottom: 12px;
    margin-bottom: 15px;
  }
  
  .company-logo, img {
    height: 35px !important;
    width: auto !important;
    max-width: 70px !important;
    margin: 0 auto 6px !important;
    display: block !important;
  }
  
  .company-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1a365d;
  }
  
  .company-details {
    font-size: 10px;
    color: #666;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  
  .document-title {
    font-size: 16px;
    font-weight: bold;
    margin: 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  .document-info {
    font-size: 10px;
    color: #666;
    margin-bottom: 6px;
  }
  
  .content-section {
    margin: 12px 0;
    break-inside: avoid;
  }
  
  .section-title {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    padding: 6px;
    background: #f8f9fa;
    border-left: 3px solid #007bff;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 11px;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 4px 6px;
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
    margin-top: 25px;
    font-size: 10px;
  }
  
  .signatures div {
    text-align: center;
    flex: 1;
    margin: 0 15px;
  }
  
  .signature-line {
    border-top: 1px solid #000;
    margin: 15px auto 8px;
    width: 150px;
  }
  
  .footer {
    text-align: center;
    font-size: 9px;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 10px;
    margin-top: 25px;
  }
  
  .quality-table {
    margin: 8px 0;
  }
  
  .quality-table table {
    margin: 5px 0;
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