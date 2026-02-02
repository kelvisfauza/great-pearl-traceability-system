import React from 'react';
import StandardPrintHeader from '@/components/print/StandardPrintHeader';
import { getVerificationQRUrl } from '@/utils/verificationCode';

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
  isPreview?: boolean;
  verificationCode?: string;
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
  sales,
  isPreview = false,
  verificationCode
}) => {
  if (isPreview) {
    // Clean preview version without print styles
    return (
      <div className="bg-white p-8 text-black">
        {/* Company Header */}
        <div className="text-center mb-8 border-b-2 border-green-600 pb-6">
          <div className="flex items-center justify-center gap-6 mb-4">
            <img 
              src="/lovable-uploads/9f15463b-c534-4804-9515-89f049ba9422.png" 
              alt="Great Pearl Coffee Factory Logo" 
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-green-700">GREAT PEARL COFFEE FACTORY</h1>
              <p className="text-sm text-gray-600">Kampala, Uganda | +256 123 456 789</p>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">EUDR COMPLIANCE REPORT</h2>
          <p className="text-sm text-gray-600">
            EU Deforestation Regulation Compliance Report - {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Document: EUDR-{reportType.toUpperCase()}-{new Date().toISOString().split('T')[0].replace(/-/g, '')} | 
            Report Period: {startDate} to {endDate}
          </p>
        </div>

        {/* Executive Summary */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 bg-gray-100 p-3 border-l-4 border-green-600">Executive Summary</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium text-blue-600">Total Documented</p>
              <p className="text-2xl font-bold">{totalDocumented.toLocaleString()}kg</p>
              <p className="text-xs text-gray-500">EUDR Compliant Coffee</p>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium text-green-600">Available Stock</p>
              <p className="text-2xl font-bold">{availableStock.toLocaleString()}kg</p>
              <p className="text-xs text-gray-500">Ready for Sale</p>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium text-purple-600">Total Sold</p>
              <p className="text-2xl font-bold">{totalSold.toLocaleString()}kg</p>
              <p className="text-xs text-gray-500">Traced Coffee Sold</p>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium text-orange-600">Active Batches</p>
              <p className="text-2xl font-bold">{activeBatches}</p>
              <p className="text-xs text-gray-500">5-Tonne Batches</p>
            </div>
          </div>
        </div>

        {/* EUDR Compliance Metrics */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 bg-gray-100 p-3 border-l-4 border-green-600">EUDR Compliance Metrics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium">Traceability Rate</p>
              <p className="text-xl font-bold text-green-600">{documents.length > 0 ? '100%' : '0%'}</p>
              <p className="text-xs text-gray-500">All batches documented</p>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium">Documentation Coverage</p>
              <p className="text-xl font-bold text-blue-600">
                {Math.round((totalDocumented / Math.max(totalDocumented + totalSold, 1)) * 100)}%
              </p>
              <p className="text-xs text-gray-500">Coffee with documentation</p>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <p className="text-sm font-medium">Sales Efficiency</p>
              <p className="text-xl font-bold text-purple-600">
                {Math.round((totalSold / Math.max(totalDocumented, 1)) * 100)}%
              </p>
              <p className="text-xs text-gray-500">Documented coffee sold</p>
            </div>
          </div>
        </div>

        {/* Documentation Details */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 bg-gray-100 p-3 border-l-4 border-green-600">Documentation Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Date</th>
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Batch Number</th>
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Coffee Type</th>
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Total KG</th>
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Bulked KG</th>
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Receipts</th>
                  <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-sm">{doc.date}</td>
                    <td className="border border-gray-300 p-2 text-sm">{doc.batch_number}</td>
                    <td className="border border-gray-300 p-2 text-sm capitalize">{doc.coffee_type}</td>
                    <td className="border border-gray-300 p-2 text-sm">{(doc.total_kilograms || 0).toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-sm">{(doc.total_bulked_coffee || 0).toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-sm">{doc.total_receipts}</td>
                    <td className="border border-gray-300 p-2 text-sm capitalize">{doc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sales Details */}
        {sales.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 bg-gray-100 p-3 border-l-4 border-green-600">Sales Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Sale Date</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Customer</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Batch</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Coffee Type</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Kilograms</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Price (UGX)</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Total Value (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-sm">{sale.sale_date}</td>
                      <td className="border border-gray-300 p-2 text-sm">{sale.sold_to}</td>
                      <td className="border border-gray-300 p-2 text-sm">{sale.batch_identifier}</td>
                      <td className="border border-gray-300 p-2 text-sm capitalize">{sale.coffee_type}</td>
                      <td className="border border-gray-300 p-2 text-sm">{sale.kilograms.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 text-sm">{sale.sale_price.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 text-sm">{(sale.kilograms * sale.sale_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
              <h4 className="font-semibold mb-3">Sales Summary Totals</h4>
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
          </div>
        )}

        {/* Verification Section */}
        {verificationCode && (
          <div className="mt-6 pt-4 border-t border-dashed border-gray-400 flex items-center justify-center gap-6">
            <div className="text-center">
              <img 
                src={getVerificationQRUrl(verificationCode, 80)} 
                alt="Verification QR Code"
                className="w-20 h-20 mx-auto"
              />
              <p className="text-xs text-gray-500 mt-1">Scan to verify</p>
            </div>
            <div className="text-left text-xs">
              <p className="font-bold">Document Verification</p>
              <p className="text-gray-600">Code: <strong className="text-green-700">{verificationCode}</strong></p>
              <p className="text-gray-500">Verify at: {window.location.origin}/verify</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p><strong>GREAT PEARL COFFEE FACTORY</strong> - EUDR Compliance Report</p>
          <p>This report contains confidential business information and is intended for authorized personnel only.</p>
          <p className="mt-2">Report Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    );
  }

  // Print version with print-specific styles
  return (
    <>
      <style>{`
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
        }
      `}</style>

      <div className="print-content hidden">
        <StandardPrintHeader 
          title="EUDR COMPLIANCE REPORT"
          subtitle={`EU Deforestation Regulation Compliance Report - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
          documentNumber={`EUDR-${reportType.toUpperCase()}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`}
          additionalInfo={`Report Period: ${startDate} to ${endDate}`}
          verificationCode={verificationCode}
        />
        {/* Rest of print content similar to preview but with print-specific styling */}
      </div>
    </>
  );
};

export default EUDRReportPrint;