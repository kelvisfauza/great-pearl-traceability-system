import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface GRNPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: any;
  storeRecord: any;
  formatCurrency: (amount: number) => string;
}

const GRNPrintModal = ({
  isOpen,
  onClose,
  assessment,
  storeRecord,
  formatCurrency
}: GRNPrintModalProps) => {
  const { employee } = useAuth();

  if (!assessment || !storeRecord) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Goods Received Note - ${storeRecord.batch_number}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #000;
              }
              .grn-container {
                max-width: 900px;
                margin: auto;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .details, .footer {
                margin-top: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
              }
              th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                margin-top: 50px;
              }
              .signature {
                width: 30%;
                text-align: center;
              }
              .signature-line {
                margin-top: 60px;
                border-top: 1px solid #000;
              }
            </style>
          </head>
          <body>
            <div class="grn-container">
              <div class="header">
                <h1>Great Pearl Coffee Factory</h1>
                <p><strong>Goods Received Note (GRN)</strong></p>
              </div>

              <div class="details">
                <p><strong>Batch Number:</strong> ${storeRecord.batch_number}</p>
                <p><strong>Supplier:</strong> ${storeRecord.supplier_name || "N/A"}</p>
                <p><strong>Date:</strong> ${new Date(storeRecord.timestamp).toLocaleDateString()}</p>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity (kg)</th>
                    <th>Unit Price (UGX)</th>
                    <th>Total (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${assessment.coffee_type} - Moisture: ${assessment.moisture}%</td>
                    <td>${storeRecord.total_kg}</td>
                    <td>${formatCurrency(storeRecord.unit_price)}</td>
                    <td>${formatCurrency(storeRecord.total_amount)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="footer">
                <div class="signature">
                  <p>Delivered By</p>
                  <div class="signature-line"></div>
                </div>
                <div class="signature">
                  <p>Received By</p>
                  <div class="signature-line"></div>
                </div>
                <div class="signature">
                  <p>Store Manager</p>
                  <div class="signature-line"></div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogHeader>
        <DialogTitle>Print Goods Received Note</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <Button onClick={handlePrint} className="mt-4">
          <Printer className="mr-2 h-4 w-4" />
          Print GRN
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default GRNPrintModal;
