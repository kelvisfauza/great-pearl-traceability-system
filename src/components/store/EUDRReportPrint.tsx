import React from 'react';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';

interface EUDRReportPrintProps {
  reportType: string;
  startDate: string;
  endDate: string;
  totalDocumented: number;
  availableStock: number;
  totalSold: number;
  activeBatches: number;
  documents: any[];
  sales: any[];
}

const EUDRReportPrint: React.FC<EUDRReportPrintProps> = ({
  reportType,
  startDate,
  endDate,
  totalDocumented,
  availableStock,
  totalSold,
  activeBatches,
  documents,
  sales
}) => {
  return (
    <>
      {/* Print Styles */}
      <style>{`
        /* Print Styles */
        @media print {
          .print-content {
            display: block !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-content, .print-content * {
            visibility: visible;
          }
          
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .company-logo {
            height: 60px;
            width: auto;
            max-width: 120px;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .print-table th, .print-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 11px;
          }
          
          .print-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
          }
          
          .print-summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          
          .print-summary-card {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .section-header {
            background-color: #f8f9fa !important;
            border-bottom: 2px solid #22c55e;
            margin: 20px 0 10px 0;
            padding: 8px 12px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
          }
        }
      `}</style>

      <div className="print-content hidden">
        {/* Standard Company Header */}
        <StandardPrintHeader 
          title="EUDR COMPLIANCE REPORT"
          subtitle={`EU Deforestation Regulation Compliance Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
          documentNumber={`EUDR-${reportType.toUpperCase()}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`}
          additionalInfo={`Report Period: ${startDate} to ${endDate}`}
        />

        {/* Executive Summary */}
        <section className="mb-6">
          <div className="section-header">Executive Summary</div>
          <div className="print-summary">
            <div className="print-summary-card">
              <h3 className="font-semibold text-blue-600">Total Documented</h3>
              <p className="text-xl font-bold">{totalDocumented.toLocaleString()}kg</p>
              <p className="text-xs text-gray-500">EUDR Compliant Coffee</p>
            </div>
            <div className="print-summary-card">
              <h3 className="font-semibold text-green-600">Available Stock</h3>
              <p className="text-xl font-bold">{availableStock.toLocaleString()}kg</p>
              <p className="text-xs text-gray-500">Ready for Sale</p>
            </div>
            <div className="print-summary-card">
              <h3 className="font-semibold text-purple-600">Total Sold</h3>
              <p className="text-xl font-bold">{totalSold.toLocaleString()}kg</p>
              <p className="text-xs text-gray-500">Traced Coffee Sold</p>
            </div>
            <div className="print-summary-card">
              <h3 className="font-semibold text-orange-600">Active Batches</h3>
              <p className="text-xl font-bold">{activeBatches}</p>
              <p className="text-xs text-gray-500">5-Tonne Batches</p>
            </div>
          </div>
        </section>

        {/* EUDR Compliance Metrics */}
        <section className="mb-6">
          <div className="section-header">EUDR Compliance Metrics</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="print-summary-card">
              <h4 className="font-medium">Traceability Rate</h4>
              <p className="text-lg font-bold text-green-600">{documents.length > 0 ? '100%' : '0%'}</p>
              <p className="text-xs text-gray-500">All batches documented</p>
            </div>
            <div className="print-summary-card">
              <h4 className="font-medium">Documentation Coverage</h4>
              <p className="text-lg font-bold text-blue-600">
                {Math.round((totalDocumented / Math.max(totalDocumented + totalSold, 1)) * 100)}%
              </p>
              <p className="text-xs text-gray-500">Coffee with documentation</p>
            </div>
            <div className="print-summary-card">
              <h4 className="font-medium">Sales Efficiency</h4>
              <p className="text-lg font-bold text-purple-600">
                {Math.round((totalSold / Math.max(totalDocumented, 1)) * 100)}%
              </p>
              <p className="text-xs text-gray-500">Documented coffee sold</p>
            </div>
          </div>
        </section>

        {/* Documentation Details */}
        <section className="mb-6">
          <div className="section-header">Documentation Summary</div>
          <table className="print-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Batch Number</th>
                <th>Coffee Type</th>
                <th>Total KG</th>
                <th>Bulked KG</th>
                <th>Receipts</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, index) => (
                <tr key={index}>
                  <td>{doc.date}</td>
                  <td>{doc.batch_number}</td>
                  <td className="capitalize">{doc.coffee_type}</td>
                  <td>{(doc.total_kilograms || 0).toLocaleString()}</td>
                  <td>{(doc.total_bulked_coffee || 0).toLocaleString()}</td>
                  <td>{doc.total_receipts}</td>
                  <td className="capitalize">{doc.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Sales Details */}
        {sales.length > 0 && (
          <section className="page-break">
            <div className="section-header">Sales Summary</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Sale Date</th>
                  <th>Customer</th>
                  <th>Batch</th>
                  <th>Coffee Type</th>
                  <th>Kilograms</th>
                  <th>Price (UGX)</th>
                  <th>Total Value (UGX)</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, index) => (
                  <tr key={index}>
                    <td>{sale.sale_date}</td>
                    <td>{sale.sold_to}</td>
                    <td>{sale.batch_identifier}</td>
                    <td className="capitalize">{sale.coffee_type}</td>
                    <td>{sale.kilograms.toLocaleString()}</td>
                    <td>{sale.sale_price.toLocaleString()}</td>
                    <td>{(sale.kilograms * sale.sale_price).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200">
              <h4 className="font-semibold mb-2">Sales Summary Totals</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Total Kilograms Sold:</strong> {sales.reduce((sum, sale) => sum + sale.kilograms, 0).toLocaleString()}kg</p>
                  <p><strong>Number of Sales:</strong> {sales.length}</p>
                </div>
                <div>
                  <p><strong>Total Revenue:</strong> UGX {sales.reduce((sum, sale) => sum + (sale.kilograms * sale.sale_price), 0).toLocaleString()}</p>
                  <p><strong>Average Price:</strong> UGX {Math.round(sales.reduce((sum, sale) => sum + sale.sale_price, 0) / sales.length).toLocaleString()}/kg</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p><strong>GREAT PEARL COFFEE FACTORY</strong> - EUDR Compliance Report</p>
          <p>This report contains confidential business information and is intended for authorized personnel only.</p>
          <p className="mt-2">Report Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </>
  );
};

export default EUDRReportPrint;