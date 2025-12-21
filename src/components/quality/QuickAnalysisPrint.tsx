import { forwardRef } from 'react';
import { format } from 'date-fns';

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
}

const QuickAnalysisPrint = forwardRef<HTMLDivElement, QuickAnalysisPrintProps>(
  ({ analysis }, ref) => {
    const fmt = (n: number) => n?.toLocaleString('en-UG', { maximumFractionDigits: 0 }) || '—';
    const pct = (n: number) => n?.toFixed(1) + '%' || '—';

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto print:p-6">
        {/* Company Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">KAJON Coffee Limited</h1>
          <p className="text-sm mt-1">Kanoni, Kazo District, Uganda</p>
          <p className="text-sm">Tel: +256 782 123 456 | Email: info@kajoncoffee.com</p>
          <div className="mt-4 bg-gray-100 py-2">
            <h2 className="text-lg font-bold">COFFEE QUALITY ANALYSIS REPORT</h2>
          </div>
        </div>

        {/* Analysis Details */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-2">
            <div className="flex">
              <span className="font-semibold w-32">Supplier:</span>
              <span>{analysis.supplier_name}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Coffee Type:</span>
              <span className="uppercase">{analysis.coffee_type}</span>
            </div>
            <div className="flex">
              <span className="font-semibold w-32">Reference Price:</span>
              <span>UGX {fmt(analysis.ref_price)}/kg</span>
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="flex justify-end">
              <span className="font-semibold w-32 text-left">Date:</span>
              <span>{format(new Date(analysis.created_at), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-end">
              <span className="font-semibold w-32 text-left">Time:</span>
              <span>{format(new Date(analysis.created_at), 'HH:mm')}</span>
            </div>
            <div className="flex justify-end">
              <span className="font-semibold w-32 text-left">Analyzed By:</span>
              <span>{analysis.created_by}</span>
            </div>
          </div>
        </div>

        {/* Quality Parameters Table */}
        <div className="mb-6">
          <h3 className="font-bold text-sm uppercase bg-gray-200 p-2 mb-2">Quality Parameters</h3>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium w-1/4">Moisture</td>
                <td className="py-2">{pct(analysis.moisture)}</td>
                <td className="py-2 font-medium w-1/4">GP1 Defects</td>
                <td className="py-2">{pct(analysis.gp1)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium">GP2 Defects</td>
                <td className="py-2">{pct(analysis.gp2)}</td>
                <td className="py-2 font-medium">Less-12</td>
                <td className="py-2">{pct(analysis.less12)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium">Pods</td>
                <td className="py-2">{pct(analysis.pods)}</td>
                <td className="py-2 font-medium">Husks</td>
                <td className="py-2">{pct(analysis.husks)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium">Stones</td>
                <td className="py-2">{pct(analysis.stones)}</td>
                <td className="py-2 font-medium">Discretion</td>
                <td className="py-2">UGX {fmt(analysis.discretion)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Derived Values */}
        <div className="mb-6">
          <h3 className="font-bold text-sm uppercase bg-gray-200 p-2 mb-2">Calculated Results</h3>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-medium w-1/4">Foreign Matter (FM)</td>
                <td className="py-2">{pct(analysis.fm)}</td>
                <td className="py-2 font-medium w-1/4">Actual Outturn</td>
                <td className="py-2">{pct(analysis.actual_ott)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-medium">Clean D14</td>
                <td className="py-2">{pct(analysis.clean_d14)}</td>
                <td className="py-2 font-medium">Outturn</td>
                <td className="py-2">{analysis.is_rejected ? 'REJECT' : pct(analysis.outturn)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Price Results */}
        <div className="mb-6">
          <h3 className="font-bold text-sm uppercase bg-gray-200 p-2 mb-2">Price Analysis</h3>
          <div className="grid grid-cols-2 gap-8 p-4 border">
            <div className="text-center">
              <p className="text-sm text-gray-600">Outturn Price</p>
              <p className={`text-2xl font-bold ${analysis.is_rejected ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.is_rejected ? 'REJECT' : `UGX ${fmt(analysis.outturn_price)}`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Final Price</p>
              <p className={`text-2xl font-bold ${analysis.is_rejected ? 'text-red-600' : 'text-green-600'}`}>
                {analysis.is_rejected ? 'REJECT' : `UGX ${fmt(analysis.final_price)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Quality Note */}
        <div className="mb-8">
          <h3 className="font-bold text-sm uppercase bg-gray-200 p-2 mb-2">Quality Assessment</h3>
          <div className={`p-4 border-l-4 ${analysis.is_rejected ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <p className="font-medium">{analysis.quality_note || 'Standard quality assessment'}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t">
          <div>
            <div className="border-b border-black w-48 mb-2"></div>
            <p className="text-sm font-medium">Quality Officer</p>
            <p className="text-xs text-gray-600">Date: ________________</p>
          </div>
          <div className="text-right">
            <div className="border-b border-black w-48 ml-auto mb-2"></div>
            <p className="text-sm font-medium">Supplier Representative</p>
            <p className="text-xs text-gray-600">Date: ________________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-8 right-8 text-center text-xs text-gray-500 border-t pt-4">
          <p>This is an official quality analysis document from KAJON Coffee Limited</p>
          <p>Generated on {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </div>
    );
  }
);

QuickAnalysisPrint.displayName = 'QuickAnalysisPrint';

export default QuickAnalysisPrint;
