import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOvertimeAwards } from '@/hooks/useOvertimeAwards';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { Clock, DollarSign, Printer, CheckCircle } from 'lucide-react';

interface OvertimeAwardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OvertimeAwardModal = ({ open, onOpenChange }: OvertimeAwardModalProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [awardDetails, setAwardDetails] = useState<any>(null);

  const { createOvertimeAward } = useOvertimeAwards();
  const { employees } = useUnifiedEmployees();

  const activeEmployees = employees.filter(emp => emp.status === 'Active');
  const selectedEmployee = activeEmployees.find(emp => emp.id === selectedEmployeeId);

  // Calculate total amount (4000 UGX per hour)
  const totalMinutes = (hours * 60) + minutes;
  const totalAmount = (totalMinutes / 60) * 4000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) return;

    setSubmitting(true);

    const success = await createOvertimeAward(
      selectedEmployee.id,
      selectedEmployee.name,
      selectedEmployee.email,
      selectedEmployee.department,
      hours,
      minutes,
      notes
    );

    setSubmitting(false);

    if (success) {
      // Store award details for receipt
      setAwardDetails({
        employeeName: selectedEmployee.name,
        employeeEmail: selectedEmployee.email,
        department: selectedEmployee.department,
        hours,
        minutes,
        totalAmount,
        notes,
        date: new Date().toLocaleDateString()
      });
      setShowSuccess(true);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !awardDetails) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Overtime Award Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            .document-title {
              font-size: 18px;
              color: #666;
            }
            .content {
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 12px;
              border-bottom: 1px solid #eee;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
            .info-value {
              color: #333;
            }
            .total-section {
              background: #f5f5f5;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
              text-align: center;
            }
            .total-label {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .total-amount {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
            }
            .instructions {
              background: #fffbeb;
              border: 1px solid #fbbf24;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .instructions-title {
              font-weight: bold;
              color: #92400e;
              margin-bottom: 10px;
            }
            .instructions-text {
              color: #78350f;
              font-size: 14px;
              line-height: 1.6;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Great Pearl Coffee</div>
            <div class="document-title">Overtime Award Receipt</div>
          </div>

          <div class="content">
            <div class="info-row">
              <span class="info-label">Employee Name:</span>
              <span class="info-value">${awardDetails.employeeName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${awardDetails.employeeEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department:</span>
              <span class="info-value">${awardDetails.department}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date Awarded:</span>
              <span class="info-value">${awardDetails.date}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Hours:</span>
              <span class="info-value">${awardDetails.hours} hours ${awardDetails.minutes} minutes</span>
            </div>
            ${awardDetails.notes ? `
            <div class="info-row">
              <span class="info-label">Notes:</span>
              <span class="info-value">${awardDetails.notes}</span>
            </div>
            ` : ''}
          </div>

          <div class="total-section">
            <div class="total-label">Total Overtime Amount</div>
            <div class="total-amount">UGX ${awardDetails.totalAmount.toLocaleString()}</div>
          </div>

          <div class="instructions">
            <div class="instructions-title">📋 How to Claim Your Overtime</div>
            <div class="instructions-text">
              1. Keep this receipt safe<br>
              2. Log in to the system and go to "My Expenses"<br>
              3. Click on "Overtime Claims" tab<br>
              4. Click "Claim" on your pending overtime<br>
              5. You will receive a reference number for payment collection<br>
              6. Present the reference number to Finance for payment
            </div>
          </div>

          <div class="footer">
            <p>This is an official overtime award receipt from Great Pearl Coffee</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleClose = () => {
    setShowSuccess(false);
    setAwardDetails(null);
    setSelectedEmployeeId('');
    setHours(0);
    setMinutes(0);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showSuccess ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5" />}
            {showSuccess ? 'Overtime Awarded Successfully' : 'Award Overtime'}
          </DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">Overtime Successfully Awarded</h3>
                  <p className="text-sm text-green-700">
                    {awardDetails?.employeeName} has been awarded {awardDetails?.hours} hours and {awardDetails?.minutes} minutes of overtime
                    worth UGX {awardDetails?.totalAmount.toLocaleString()}.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Print the award receipt for the employee</li>
                <li>Give the receipt to {awardDetails?.employeeName}</li>
                <li>Employee will claim through the system</li>
                <li>Finance will process the payment</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hours</Label>
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Minutes</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-lg font-bold flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {totalAmount.toLocaleString()} UGX
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Rate: 4,000 UGX per hour
            </div>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this overtime..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedEmployeeId || (hours === 0 && minutes === 0) || submitting}
              className="flex-1"
            >
              {submitting ? 'Awarding...' : 'Award Overtime'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
