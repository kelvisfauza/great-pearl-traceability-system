import { forwardRef } from 'react';

interface RobustaAnalysis {
  id: string;
  supplier_name: string;
  ref_price: number;
  moisture: number;
  g1_defects: number;
  g2_defects: number;
  less12: number;
  total_defects: number;
  outturn: number;
  pods: number;
  husks: number;
  stones: number;
  discretion: number;
  total_fm: number;
  is_rejected: boolean;
  moisture_deduction_percent: number;
  total_deduction_percent: number;
  deduction_per_kg: number;
  actual_price_per_kg: number;
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
          {analysis.is_rejected && (
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '10px', 
              fontWeight: 'bold', 
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              padding: '2px 6px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              REJECTED
            </p>
          )}
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

      {/* FM Status */}
      <div style={{ 
        marginBottom: '12px', 
        padding: '10px', 
        backgroundColor: analysis.is_rejected ? '#fef2f2' : '#dcfce7', 
        borderRadius: '4px',
        border: analysis.is_rejected ? '2px solid #dc2626' : '2px solid #166534'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '9px', color: '#666', display: 'block' }}>Total FM (Pods + Husks + Stones)</span>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: analysis.is_rejected ? '#dc2626' : '#166534' }}>
              {fmt(analysis.total_fm)}%
            </span>
          </div>
          <span style={{ 
            fontWeight: 'bold', 
            fontSize: '12px', 
            color: analysis.is_rejected ? '#dc2626' : '#166534',
            backgroundColor: analysis.is_rejected ? '#fee2e2' : '#bbf7d0',
            padding: '4px 12px',
            borderRadius: '4px'
          }}>
            {analysis.is_rejected ? 'REJECTED' : 'ACCEPTED'}
          </span>
        </div>
        {analysis.is_rejected && (
          <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#dc2626' }}>
            FM exceeds 6% threshold - Sample does not meet quality requirements
          </p>
        )}
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
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Moisture Content</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%' }}>{fmt(analysis.moisture)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>G1 Defects</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.g1_defects)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>G2 Defects</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.g2_defects)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Less 12</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.less12)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Discretion</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb' }}>UGX {fmtCurrency(analysis.discretion)}/kg</td>
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
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>Stones</td>
            <td colSpan={3} style={{ padding: '5px', border: '1px solid #e5e7eb' }}>{fmt(analysis.stones)}%</td>
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
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Moisture Deduction</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%' }}>{fmt(analysis.moisture_deduction_percent)}%</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '25%' }}>Total Price Deduction</td>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', width: '25%', fontWeight: 'bold' }}>{fmt(analysis.total_deduction_percent)}%</td>
          </tr>
          <tr>
            <td style={{ padding: '5px', border: '1px solid #e5e7eb', backgroundColor: '#fef2f2' }}>Deduction per kg</td>
            <td colSpan={3} style={{ padding: '5px', border: '1px solid #e5e7eb', fontWeight: 'bold', color: '#dc2626' }}>UGX {fmtCurrency(analysis.deduction_per_kg)}</td>
          </tr>
        </tbody>
      </table>

      {/* Final Results */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '9px' }}>
        <thead>
          <tr style={{ backgroundColor: analysis.is_rejected ? '#dc2626' : '#166534', color: 'white' }}>
            <th colSpan={2} style={{ padding: '6px', textAlign: 'left', fontSize: '10px' }}>
              Final Price Calculation {analysis.is_rejected && '(REJECTED)'}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb', width: '50%', fontSize: '11px' }}>
              <strong>Reference Price</strong>
            </td>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}>
              UGX {fmtCurrency(analysis.ref_price)}/kg
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fef2f2', fontSize: '11px' }}>
              <strong>Deduction per kg</strong>
            </td>
            <td style={{ padding: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: '#dc2626' }}>
              - UGX {fmtCurrency(analysis.deduction_per_kg)}
            </td>
          </tr>
          <tr>
            <td style={{ 
              padding: '10px', 
              border: '1px solid #e5e7eb', 
              backgroundColor: analysis.is_rejected ? '#fef2f2' : '#dcfce7', 
              fontSize: '12px' 
            }}>
              <strong>{analysis.is_rejected ? 'PRICE (IF ACCEPTED)' : 'ACTUAL PRICE PER KG'}</strong>
            </td>
            <td style={{ 
              padding: '10px', 
              border: '1px solid #e5e7eb', 
              backgroundColor: analysis.is_rejected ? '#fef2f2' : '#dcfce7', 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: analysis.is_rejected ? '#dc2626' : '#166534',
              textDecoration: analysis.is_rejected ? 'line-through' : 'none'
            }}>
              UGX {fmtCurrency(analysis.actual_price_per_kg)}
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