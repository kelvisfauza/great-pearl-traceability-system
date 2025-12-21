import { forwardRef } from 'react';

interface RobustaAnalysis {
  id: string;
  supplier_name: string;
  ref_price: number;
  total_weight: number;
  moisture: number;
  g1_defects: number;
  g2_defects: number;
  less12: number;
  total_defects: number;
  outturn: number;
  pods: number;
  husks: number;
  discretion: number;
  pods_kgs: number;
  husks_kgs: number;
  deductions_pods: number;
  deductions_husks: number;
  moisture_weight_loss: number;
  total_kgs_deducted: number;
  total_deductions: number;
  actual_price: number;
  amount_to_pay: number;
  created_by: string;
  created_at: string;
}

interface RobustaPrintProps {
  analysis: RobustaAnalysis;
}

const RobustaPrint = forwardRef<HTMLDivElement, RobustaPrintProps>(({ analysis }, ref) => {
  const fmt = (n: number) => n?.toLocaleString('en-UG', { maximumFractionDigits: 1 }) || '0';
  const fmtCurrency = (n: number) => n?.toLocaleString('en-UG', { maximumFractionDigits: 0 }) || '0';

  return (
    <div
      ref={ref}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '8mm 12mm',
        fontFamily: 'Arial, sans-serif',
        fontSize: '10px',
        color: '#000',
        backgroundColor: '#fff'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #166534', paddingBottom: '8px', marginBottom: '10px' }}>
        <img
          src="/images/great-pearl-coffee-logo.png"
          alt="Great Pearl Coffee"
          style={{ height: '50px', marginRight: '15px' }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>
            GREAT PEARL COFFEE
          </h1>
          <p style={{ margin: '2px 0', fontSize: '9px', color: '#666' }}>
            Kasese, Uganda | www.greatpearlcoffee.com | +256 781 121 639
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 'bold', color: '#166534' }}>
            ROBUSTA QUALITY ANALYSIS
          </p>
          <p style={{ margin: '2px 0', fontSize: '9px', color: '#666' }}>
            Date: {new Date(analysis.created_at).toLocaleDateString('en-UG')}
          </p>
        </div>
      </div>

      {/* Supplier Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
        <div>
          <span style={{ fontSize: '8px', color: '#666', display: 'block' }}>Supplier</span>
          <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{analysis.supplier_name}</span>
        </div>
        <div>
          <span style={{ fontSize: '8px', color: '#666', display: 'block' }}>Analyzed By</span>
          <span style={{ fontWeight: 'bold', fontSize: '11px' }}>{analysis.created_by}</span>
        </div>
        <div>
          <span style={{ fontSize: '8px', color: '#666', display: 'block' }}>Time</span>
          <span style={{ fontWeight: 'bold', fontSize: '11px' }}>
            {new Date(analysis.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Input Parameters */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: '#166534', color: 'white' }}>
            <th colSpan={4} style={{ padding: '6px', textAlign: 'left', fontSize: '10px' }}>Input Parameters</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Reference Price</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%' }}>UGX {fmtCurrency(analysis.ref_price)}/kg</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Total Weight</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%' }}>{fmt(analysis.total_weight)} kg</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Moisture Content</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.moisture)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>G1 Defects</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.g1_defects)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>G2 Defects</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.g2_defects)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Less 12</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.less12)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#dcfce7', fontWeight: 'bold' }}>Total Defects</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{fmt(analysis.total_defects)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#dcfce7', fontWeight: 'bold' }}>Outturn</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{fmt(analysis.outturn)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Pods</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.pods)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Husks</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.husks)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Discretion</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>UGX {fmtCurrency(analysis.discretion)}</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}></td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}></td>
          </tr>
        </tbody>
      </table>

      {/* Calculated Values */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: '#166534', color: 'white' }}>
            <th colSpan={4} style={{ padding: '6px', textAlign: 'left', fontSize: '10px' }}>Calculated Deductions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Pods (kg)</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%' }}>{fmt(analysis.pods_kgs)}</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Husks (kg)</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%' }}>{fmt(analysis.husks_kgs)}</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Deductions Pods</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>UGX {fmtCurrency(analysis.deductions_pods)}</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Deductions Husks</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>UGX {fmtCurrency(analysis.deductions_husks)}</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Moisture Weight Loss</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.moisture_weight_loss)} kg</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Total Kgs Deducted</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>{fmt(analysis.total_kgs_deducted)} kg</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Total Deductions (UGX)</td>
            <td colSpan={3} style={{ padding: '5px', border: '1px solid #e5e7eb', fontWeight: 'bold' }}>UGX {fmtCurrency(analysis.total_deductions)}</td>
          </tr>
        </tbody>
      </table>

      {/* Final Results */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: '#166534', color: 'white' }}>
            <th colSpan={2} style={{ padding: '6px', textAlign: 'left', fontSize: '10px' }}>Final Calculation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '50%', fontSize: '11px' }}>
              <strong>Actual Price (UGX/kg)</strong>
            </td>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontSize: '14px', fontWeight: 'bold', color: '#166534' }}>
              UGX {fmtCurrency(analysis.actual_price)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#dcfce7', fontSize: '11px' }}>
              <strong>Amount To Pay</strong>
            </td>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#dcfce7', fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>
              UGX {fmtCurrency(analysis.amount_to_pay)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '25px' }}>
        <div>
          <div style={{ borderTop: '1px solid #000', width: '80%', marginBottom: '3px' }}></div>
          <span style={{ fontSize: '8px', color: '#666' }}>Quality Analyst Signature</span>
        </div>
        <div>
          <div style={{ borderTop: '1px solid #000', width: '80%', marginBottom: '3px' }}></div>
          <span style={{ fontSize: '8px', color: '#666' }}>Supplier Signature</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '7px', color: '#9ca3af' }}>
          This is a computer-generated document. Analysis ID: {analysis.id}
        </p>
      </div>
    </div>
  );
});

RobustaPrint.displayName = 'RobustaPrint';

export default RobustaPrint;
