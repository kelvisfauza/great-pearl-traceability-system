import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface GRNPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: any;
  storeRecord: any;
  formatCurrency: (amount: number) => string;
}

const GRNPrintModal = ({ isOpen, onClose, assessment, storeRecord, formatCurrency }: GRNPrintModalProps) => {
  const { employee } = useAuth();
  
  if (!assessment || !storeRecord) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('grn-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>GRN - ${storeRecord.batch_number}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .grn { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .company-name { font-size: 24px; font-weight: bold; color: #16a34a; }
                .company-details { font-size: 14px; color: #666; margin-top: 10px; }
                .grn-title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
                .section { margin: 20px 0; }
                .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #16a34a; padding-bottom: 5px; }
                .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
                .detail-label { font-weight: bold; width: 200px; }
                .assessment-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                .assessment-table th, .assessment-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .assessment-table th { background-color: #f5f5f5; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
                .signature { margin-top: 40px; }
                .signature-line { border-top: 1px solid #000; width: 200px; margin: 20px auto; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
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
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleDownload = () => {
    const element = document.getElementById('grn-content');
    if (element) {
      const printContent = element.innerHTML;
      const blob = new Blob([`
        <html>
          <head>
            <title>GRN - ${storeRecord.batch_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .grn { max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; color: #16a34a; }
              .company-details { font-size: 14px; color: #666; margin-top: 10px; }
              .grn-title { font-size: 20px; font-weight: bold; margin: 20px 0; text-align: center; }
              .section { margin: 20px 0; }
              .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #16a34a; padding-bottom: 5px; }
              .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
              .detail-label { font-weight: bold; width: 200px; }
              .assessment-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              .assessment-table th, .assessment-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .assessment-table th { background-color: #f5f5f5; }
              .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
              .signature { margin-top: 40px; }
              .signature-line { border-top: 1px solid #000; width: 200px; margin: 20px auto; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `], { type: 'text/html' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grn-${storeRecord.batch_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Goods Received Note (GRN)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div id="grn-content" className="grn">
            <div className="header">
              <div className="company-name">Great Pearl Coffee Factory</div>
              <div className="company-details">
                <div>P.O. Box 1234, Kampala, Uganda</div>
                <div>Tel: +256-XXX-XXXXXX | Email: info@greatpearl.com</div>
                <div>TIN: 1234567890</div>
              </div>
            </div>

            <div className="grn-title">GOODS RECEIVED NOTE</div>

            <div className="section">
              <div className="section-title">GRN Details</div>
              <div className="detail-row">
                <span className="detail-label">GRN No:</span>
                <span>{storeRecord.batch_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Supplier Details</div>
              <div className="detail-row">
                <span className="detail-label">Supplier Name:</span>
                <span>{storeRecord.supplier_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Delivery Date:</span>
                <span>{storeRecord.date}</span>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Coffee Details</div>
              <div className="detail-row">
                <span className="detail-label">Coffee Type:</span>
                <span>{storeRecord.coffee_type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Batch Number:</span>
                <span>{storeRecord.batch_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Weight (kg):</span>
                <span>{storeRecord.kilograms?.toLocaleString()} kg</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Number of Bags:</span>
                <span>{storeRecord.bags}</span>
              </div>
            </div>

            <div className="section">
              <div className="section-title">Quality Assessment Results</div>
              <table className="assessment-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Moisture Content</td>
                    <td>{assessment.moisture}%</td>
                    <td>{assessment.moisture <= 12 ? 'Acceptable' : 'High'}</td>
                  </tr>
                  <tr>
                    <td>Group 1 Defects</td>
                    <td>{assessment.group1_defects}%</td>
                    <td>{assessment.group1_defects <= 5 ? 'Acceptable' : 'High'}</td>
                  </tr>
                  <tr>
                    <td>Group 2 Defects</td>
                    <td>{assessment.group2_defects}%</td>
                    <td>{assessment.group2_defects <= 10 ? 'Acceptable' : 'High'}</td>
                  </tr>
                  <tr>
                    <td>Below 12 Screen</td>
                    <td>{assessment.below12}%</td>
                    <td>{assessment.below12 <= 5 ? 'Acceptable' : 'High'}</td>
                  </tr>
                  <tr>
                    <td>Pods</td>
                    <td>{assessment.pods}%</td>
                    <td>{assessment.pods <= 3 ? 'Acceptable' : 'High'}</td>
                  </tr>
                  <tr>
                    <td>Husks</td>
                    <td>{assessment.husks}%</td>
                    <td>{assessment.husks <= 2 ? 'Acceptable' : 'High'}</td>
                  </tr>
                  <tr>
                    <td>Stones</td>
                    <td>{assessment.stones}%</td>
                    <td>{assessment.stones <= 1 ? 'Acceptable' : 'High'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="section">
              <div className="section-title">Assessment Summary</div>
              <div className="detail-row">
                <span className="detail-label">Assessed By:</span>
                <span>{assessment.assessed_by}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Assessment Date:</span>
                <span>{assessment.date_assessed}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Suggested Price:</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(assessment.suggested_price)}</span>
              </div>
              {assessment.comments && (
                <div className="detail-row">
                  <span className="detail-label">Comments:</span>
                  <span>{assessment.comments}</span>
                </div>
              )}
            </div>

            <div className="signature">
              <div className="detail-row">
                <span className="detail-label">Printed By:</span>
                <span>{employee?.name || 'Quality Controller'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Print Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="signature-line"></div>
              <div style={{ textAlign: 'center' }}>Authorized Signature & Company Stamp</div>
            </div>

            <div className="footer">
              <p>This is a computer-generated Goods Received Note.</p>
              <p>For any queries, please contact the Quality Control Department.</p>
            </div>
          </div>

          <div className="flex gap-4 justify-end no-print">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print GRN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;