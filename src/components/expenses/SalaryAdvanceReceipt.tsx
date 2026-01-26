import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { SalaryAdvance } from '@/hooks/useSalaryAdvances';

interface SalaryAdvanceReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  advance: SalaryAdvance;
  requestDetails?: {
    requestType: string;
    grossSalary: number;
    deductionAmount: number;
    netSalary: number;
    reason: string;
  };
  employeeName: string;
  employeeDepartment: string;
  employeePosition?: string;
}

const SalaryAdvanceReceipt: React.FC<SalaryAdvanceReceiptProps> = ({
  isOpen,
  onClose,
  advance,
  requestDetails,
  employeeName,
  employeeDepartment,
  employeePosition
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Advance Request - ${advance.employee_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px;
              background: white;
            }
            .receipt {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #333;
            }
            .header {
              background: linear-gradient(135deg, #0d3d1f 0%, #1a5f2a 100%);
              color: white;
              padding: 25px 30px;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .logo-img {
              width: 70px;
              height: 70px;
              border-radius: 8px;
              background: white;
              padding: 5px;
            }
            .company-info h1 {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .company-info p {
              font-size: 11px;
              opacity: 0.9;
            }
            .doc-badge {
              background: rgba(255,255,255,0.2);
              padding: 12px 20px;
              border-radius: 8px;
              text-align: center;
            }
            .doc-badge h2 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .doc-badge p {
              font-size: 10px;
              opacity: 0.8;
            }
            .content {
              padding: 25px 30px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: #0d3d1f;
              margin-bottom: 12px;
              padding-bottom: 6px;
              border-bottom: 2px solid #0d3d1f;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 20px;
            }
            .info-item label {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              display: block;
              margin-bottom: 3px;
            }
            .info-item span {
              font-size: 13px;
              font-weight: 500;
            }
            .advance-box {
              background: #fff3cd;
              border: 2px solid #ffc107;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
            }
            .advance-box h3 {
              color: #856404;
              font-size: 14px;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .advance-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .advance-item {
              background: white;
              padding: 10px;
              border-radius: 4px;
            }
            .advance-item label {
              font-size: 10px;
              color: #666;
              display: block;
            }
            .advance-item span {
              font-size: 14px;
              font-weight: bold;
              color: #856404;
            }
            .calculation-box {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 20px;
            }
            .calc-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #dee2e6;
            }
            .calc-row:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 16px;
              color: #0d3d1f;
              padding-top: 12px;
              border-top: 2px solid #0d3d1f;
            }
            .calc-row.deduction {
              color: #dc3545;
            }
            .reason-box {
              background: #f0f0f0;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .reason-box label {
              font-size: 10px;
              color: #666;
              text-transform: uppercase;
              display: block;
              margin-bottom: 5px;
            }
            .reason-box p {
              font-size: 12px;
              line-height: 1.5;
            }
            .signature-section {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .signature-block {
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 40px;
              padding-top: 8px;
              font-size: 11px;
              color: #666;
            }
            .footer {
              background: #f8f9fa;
              padding: 15px 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: bold;
              background: #fff3cd;
              color: #856404;
            }
            @media print {
              body { padding: 0; }
              .receipt { border: 1px solid #333; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const newBalance = requestDetails 
    ? advance.remaining_balance - requestDetails.deductionAmount 
    : advance.remaining_balance;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Salary Advance Request Receipt</span>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="receipt">
          {/* Header */}
          <div className="header" style={{ 
            background: 'linear-gradient(135deg, #0d3d1f 0%, #1a5f2a 100%)',
            color: 'white',
            padding: '25px 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img 
                src="/lovable-uploads/great-pearl-coffee-logo.png" 
                alt="Great Pearl Coffee" 
                className="logo-img"
                style={{ width: '70px', height: '70px', borderRadius: '8px', background: 'white', padding: '5px' }}
              />
              <div className="company-info">
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>Great Pearl Coffee Factory</h1>
                <p style={{ fontSize: '11px', opacity: 0.9 }}>Delivering coffee from the heart of Rwenzori</p>
                <p style={{ fontSize: '10px', opacity: 0.8 }}>info@greatpearlcoffee.com</p>
              </div>
            </div>
            <div className="doc-badge" style={{ 
              background: 'rgba(255,255,255,0.2)',
              padding: '12px 20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>SALARY REQUEST</h2>
              <p style={{ fontSize: '10px', opacity: 0.8 }}>With Advance Deduction</p>
              <p style={{ fontSize: '10px', marginTop: '4px' }}>{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Content */}
          <div className="content" style={{ padding: '25px 30px' }}>
            {/* Employee Information */}
            <h3 className="section-title" style={{ 
              fontSize: '14px', fontWeight: 'bold', color: '#0d3d1f',
              marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid #0d3d1f'
            }}>Employee Information</h3>
            <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="info-item">
                <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Full Name</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{employeeName}</span>
              </div>
              <div className="info-item">
                <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Department</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{employeeDepartment}</span>
              </div>
              <div className="info-item">
                <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Position</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{employeePosition || 'Staff'}</span>
              </div>
              <div className="info-item">
                <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>Request Type</label>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{requestDetails?.requestType || 'Salary Request'}</span>
              </div>
            </div>

            {/* Outstanding Advance */}
            <div className="advance-box" style={{ 
              background: '#fff3cd', border: '2px solid #ffc107',
              borderRadius: '8px', padding: '15px', marginBottom: '20px'
            }}>
              <h3 style={{ color: '#856404', fontSize: '14px', marginBottom: '10px' }}>
                ⚠️ Outstanding Salary Advance
              </h3>
              <div className="advance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div className="advance-item" style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Original Amount</label>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#856404', display: 'block' }}>
                    UGX {advance.original_amount.toLocaleString()}
                  </span>
                </div>
                <div className="advance-item" style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Current Balance</label>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#856404', display: 'block' }}>
                    UGX {advance.remaining_balance.toLocaleString()}
                  </span>
                </div>
                <div className="advance-item" style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Minimum Payment</label>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#856404', display: 'block' }}>
                    UGX {advance.minimum_payment.toLocaleString()}
                  </span>
                </div>
                <div className="advance-item" style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#666' }}>Advance Date</label>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#856404', display: 'block' }}>
                    {new Date(advance.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Calculation */}
            {requestDetails && (
              <>
                <h3 className="section-title" style={{ 
                  fontSize: '14px', fontWeight: 'bold', color: '#0d3d1f',
                  marginBottom: '12px', paddingBottom: '6px', borderBottom: '2px solid #0d3d1f'
                }}>Payment Calculation</h3>
                <div className="calculation-box" style={{ 
                  background: '#f8f9fa', border: '1px solid #dee2e6',
                  borderRadius: '8px', padding: '15px', marginBottom: '20px'
                }}>
                  <div className="calc-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #dee2e6' }}>
                    <span>Gross Salary ({requestDetails.requestType})</span>
                    <span>UGX {requestDetails.grossSalary.toLocaleString()}</span>
                  </div>
                  <div className="calc-row deduction" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #dee2e6', color: '#dc3545' }}>
                    <span>Less: Advance Deduction</span>
                    <span>- UGX {requestDetails.deductionAmount.toLocaleString()}</span>
                  </div>
                  <div className="calc-row" style={{ 
                    display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                    fontWeight: 'bold', fontSize: '16px', color: '#0d3d1f', borderTop: '2px solid #0d3d1f'
                  }}>
                    <span>Net Salary Payable</span>
                    <span>UGX {requestDetails.netSalary.toLocaleString()}</span>
                  </div>
                </div>

                {/* New Balance After Payment */}
                <div style={{ 
                  background: '#d4edda', border: '1px solid #28a745',
                  borderRadius: '8px', padding: '15px', marginBottom: '20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#155724', textTransform: 'uppercase' }}>New Advance Balance After This Payment</label>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#155724', display: 'block' }}>
                      UGX {newBalance.toLocaleString()}
                      {newBalance === 0 && <span style={{ marginLeft: '10px', fontSize: '14px' }}>✅ FULLY PAID</span>}
                    </span>
                  </div>
                  <span className="status-badge" style={{ 
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px',
                    fontWeight: 'bold', background: '#fff3cd', color: '#856404'
                  }}>
                    PENDING APPROVAL
                  </span>
                </div>

                {/* Reason */}
                <div className="reason-box" style={{ background: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <label style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>
                    Reason for Request
                  </label>
                  <p style={{ fontSize: '12px', lineHeight: 1.5 }}>{requestDetails.reason}</p>
                </div>
              </>
            )}

            {/* Signature Section */}
            <div className="signature-section" style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd'
            }}>
              <div className="signature-block" style={{ textAlign: 'center' }}>
                <div className="signature-line" style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '8px', fontSize: '11px', color: '#666' }}>
                  Employee Signature
                </div>
              </div>
              <div className="signature-block" style={{ textAlign: 'center' }}>
                <div className="signature-line" style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '8px', fontSize: '11px', color: '#666' }}>
                  Finance Officer
                </div>
              </div>
              <div className="signature-block" style={{ textAlign: 'center' }}>
                <div className="signature-line" style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '8px', fontSize: '11px', color: '#666' }}>
                  Authorized Approver
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer" style={{ 
            background: '#f8f9fa', padding: '15px 30px',
            textAlign: 'center', fontSize: '10px', color: '#666', borderTop: '1px solid #ddd'
          }}>
            <p>This document is a request for salary payment with advance deduction. Approval is required before payment.</p>
            <p style={{ marginTop: '5px' }}>Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryAdvanceReceipt;
