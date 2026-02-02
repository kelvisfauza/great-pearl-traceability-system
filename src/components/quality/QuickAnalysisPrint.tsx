import { forwardRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getVerificationQRUrl } from '@/utils/verificationCode';

interface QuickAnalysisData {
  id: string;
  supplier_name: string;
  coffee_type: string;
  ref_price: number;
  moisture: number;
  gp1: number;
  gp2: number;
  less12: number;
  pods: number;
  husks: number;
  stones: number;
  discretion: number;
  fm: number;
  actual_ott: number;
  clean_d14: number;
  outturn: number;
  outturn_price: number;
  final_price: number;
  quality_note: string;
  is_rejected: boolean;
  created_by: string;
  created_at: string;
}

interface QuickAnalysisPrintProps {
  analysis: QuickAnalysisData;
  verificationCode?: string | null;
}

const QuickAnalysisPrint = forwardRef<HTMLDivElement, QuickAnalysisPrintProps>(
  ({ analysis, verificationCode }, ref) => {
    const fmt = (n: number) => n?.toLocaleString('en-UG', { maximumFractionDigits: 0 }) || '—';
    const pct = (n: number) => n?.toFixed(1) + '%' || '—';

    return (
      <div ref={ref} className="p-4 bg-white text-black w-[210mm] h-[297mm] mx-auto print:p-4 relative overflow-hidden" style={{ fontSize: '11px' }}>
        {/* Company Header */}
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <img 
            src="/images/great-pearl-coffee-logo.png" 
            alt="Great Pearl Coffee Logo" 
            className="h-14 mx-auto mb-1"
          />
          <h1 className="text-lg font-bold uppercase tracking-wide">GREAT PEARL COFFEE</h1>
          <p className="text-xs">Kasese, Uganda | Tel: +256781121639 | www.greatpearlcoffee.com</p>
          <div className="mt-2 bg-gray-100 py-1">
            <h2 className="text-base font-bold">COFFEE QUALITY ANALYSIS REPORT</h2>
          </div>
        </div>

        {/* Analysis Details */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="space-y-1">
            <div className="flex">
              <span className="font-semibold w-28">Supplier:</span>
              <span>{analysis.supplier_name}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-28">Coffee Type:</span>
              <span className="uppercase">{analysis.coffee_type}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-28">Reference Price:</span>
              <span>UGX {fmt(analysis.ref_price)}/kg</span>
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex justify-end">
              <span className="font-semibold w-28 text-left">Date:</span>
              <span>{format(new Date(analysis.created_at), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-end">
              <span className="font-semibold w-28 text-left">Time:</span>
              <span>{format(new Date(analysis.created_at), 'HH:mm')}</span>
            </div>
            <div className="flex justify-end">
              <span className="font-semibold w-28 text-left">Analyzed By:</span>
              <span>{analysis.created_by}</span>
            </div>
          </div>
        </div>

        {/* Quality Parameters Table */}
        <div className="mb-3">
          <h3 className="font-bold text-xs uppercase bg-gray-200 p-1 mb-1">Quality Parameters</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-1 font-medium w-1/4">Moisture</td>
                <td className="py-1">{pct(analysis.moisture)}</td>
                <td className="py-1 font-medium w-1/4">GP1 Defects</td>
                <td className="py-1">{pct(analysis.gp1)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 font-medium">GP2 Defects</td>
                <td className="py-1">{pct(analysis.gp2)}</td>
                <td className="py-1 font-medium">Less-12</td>
                <td className="py-1">{pct(analysis.less12)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 font-medium">Pods</td>
                <td className="py-1">{pct(analysis.pods)}</td>
                <td className="py-1 font-medium">Husks</td>
                <td className="py-1">{pct(analysis.husks)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 font-medium">Stones</td>
                <td className="py-1">{pct(analysis.stones)}</td>
                <td className="py-1 font-medium">Discretion</td>
                <td className="py-1">UGX {fmt(analysis.discretion)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Derived Values */}
        <div className="mb-3">
          <h3 className="font-bold text-xs uppercase bg-gray-200 p-1 mb-1">Calculated Results</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-1 font-medium w-1/4">Foreign Matter (FM)</td>
                <td className="py-1">{pct(analysis.fm)}</td>
                <td className="py-1 font-medium w-1/4">Actual Outturn</td>
                <td className="py-1">{pct(analysis.actual_ott)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1 font-medium">Clean D14</td>
                <td className="py-1">{pct(analysis.clean_d14)}</td>
                <td className="py-1 font-medium">Outturn</td>
                <td className="py-1">{analysis.is_rejected ? 'REJECT' : pct(analysis.outturn)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Price Results */}
        <div className="mb-3">
          <h3 className="font-bold text-xs uppercase bg-gray-200 p-1 mb-1">Price Analysis</h3>
          <div className="grid grid-cols-2 gap-4 p-2 border">
            <div className="text-center">
              <p className="text-xs text-gray-600">Outturn Price</p>
              <p className={`text-xl font-bold ${analysis.is_rejected ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.is_rejected ? 'REJECT' : `UGX ${fmt(analysis.outturn_price)}`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">Final Price</p>
              <p className={`text-xl font-bold ${analysis.is_rejected ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.is_rejected ? 'REJECT' : `UGX ${fmt(analysis.final_price)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Quality Note */}
        <div className="mb-4">
          <h3 className="font-bold text-xs uppercase bg-gray-200 p-1 mb-1">Quality Assessment</h3>
          <div className={`p-2 border-l-4 ${analysis.is_rejected ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <p className="font-medium">{analysis.quality_note || 'Standard quality assessment'}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-4 border-t">
          <div>
            <div className="border-b border-black w-40 mb-1"></div>
            <p className="font-medium">Quality Officer</p>
            <p className="text-xs text-gray-600">Date: ________________</p>
          </div>
          <div className="text-right">
            <div className="border-b border-black w-40 ml-auto mb-1"></div>
            <p className="font-medium">Supplier Representative</p>
            <p className="text-xs text-gray-600">Date: ________________</p>
          </div>
        </div>

        {/* Verification QR Code */}
        {verificationCode && (
          <div className="absolute bottom-20 left-4 right-4 flex items-center justify-center gap-4 border-t border-dashed border-gray-400 pt-3">
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase font-semibold">Document Verification</p>
              <p className="text-sm font-mono font-bold text-green-700">{verificationCode}</p>
              <p className="text-xs text-gray-400">Scan QR to verify authenticity</p>
            </div>
            <div className="border border-gray-300 p-1 bg-white rounded">
              <img 
                src={getVerificationQRUrl(verificationCode, 70)} 
                alt="Verification QR Code"
                className="w-[70px] h-[70px]"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4 text-center text-xs text-gray-500 border-t pt-2">
          <p>This is an official quality analysis document from Great Pearl Coffee</p>
          <p>Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </div>
    );
  }
);

QuickAnalysisPrint.displayName = 'QuickAnalysisPrint';

export default QuickAnalysisPrint;
