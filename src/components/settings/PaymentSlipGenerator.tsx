import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseEmployees } from "@/hooks/useFirebaseEmployees";
import { useToast } from "@/hooks/use-toast";
import { Printer, Download } from "lucide-react";

interface PaymentSlipGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentSlipGenerator = ({ isOpen, onClose }: PaymentSlipGeneratorProps) => {
  const { employees } = useFirebaseEmployees();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    employeeId: "",
    month: "",
    year: new Date().getFullYear().toString(),
    basicSalary: "",
    allowances: "",
    bonuses: "",
    overtime: "",
    deductions: "",
    advances: "",
    taxDeductions: "",
    comments: ""
  });

  const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);

  const calculateGrossPay = () => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const bonuses = parseFloat(formData.bonuses) || 0;
    const overtime = parseFloat(formData.overtime) || 0;
    return basic + allowances + bonuses + overtime;
  };

  const calculateTotalDeductions = () => {
    const deductions = parseFloat(formData.deductions) || 0;
    const advances = parseFloat(formData.advances) || 0;
    const tax = parseFloat(formData.taxDeductions) || 0;
    return deductions + advances + tax;
  };

  const calculateNetPay = () => {
    return calculateGrossPay() - calculateTotalDeductions();
  };

  const generatePaymentSlip = () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive"
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const paymentSlipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Slip - ${selectedEmployee.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .company-address { font-size: 14px; color: #666; }
          .slip-title { font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center; }
          .employee-info { margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .payments-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .payments-table th, .payments-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .payments-table th { background-color: #f5f5f5; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .net-pay { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; padding: 10px; border: 2px solid #000; }
          .comments { margin-top: 20px; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature { border-top: 1px solid #000; padding-top: 5px; width: 200px; text-align: center; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Coffee Company Ltd</div>
          <div class="company-address">
            P.O. Box 12345, Kampala, Uganda<br>
            Tel: +256 123 456 789 | Email: info@coffeecompany.com
          </div>
        </div>

        <div class="slip-title">SALARY PAYMENT SLIP</div>

        <div class="employee-info">
          <div class="info-row">
            <span><strong>Employee Name:</strong> ${selectedEmployee.name}</span>
            <span><strong>Employee ID:</strong> ${selectedEmployee.employee_id || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span><strong>Department:</strong> ${selectedEmployee.department}</span>
            <span><strong>Position:</strong> ${selectedEmployee.position}</span>
          </div>
          <div class="info-row">
            <span><strong>Payment Period:</strong> ${formData.month} ${formData.year}</span>
            <span><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <table class="payments-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (UGX)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td>
              <td>${parseFloat(formData.basicSalary || '0').toLocaleString()}</td>
            </tr>
            <tr>
              <td>Allowances</td>
              <td>${parseFloat(formData.allowances || '0').toLocaleString()}</td>
            </tr>
            <tr>
              <td>Bonuses</td>
              <td>${parseFloat(formData.bonuses || '0').toLocaleString()}</td>
            </tr>
            <tr>
              <td>Overtime</td>
              <td>${parseFloat(formData.overtime || '0').toLocaleString()}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Gross Pay</strong></td>
              <td><strong>${calculateGrossPay().toLocaleString()}</strong></td>
            </tr>
            <tr>
              <td>General Deductions</td>
              <td>(${parseFloat(formData.deductions || '0').toLocaleString()})</td>
            </tr>
            <tr>
              <td>Advances</td>
              <td>(${parseFloat(formData.advances || '0').toLocaleString()})</td>
            </tr>
            <tr>
              <td>Tax Deductions</td>
              <td>(${parseFloat(formData.taxDeductions || '0').toLocaleString()})</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Deductions</strong></td>
              <td><strong>(${calculateTotalDeductions().toLocaleString()})</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="net-pay">
          NET PAY: UGX ${calculateNetPay().toLocaleString()}
        </div>

        ${formData.comments ? `
        <div class="comments">
          <strong>Comments:</strong><br>
          ${formData.comments}
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature">
            <div>HR Manager</div>
          </div>
          <div class="signature">
            <div>Employee Signature</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(paymentSlipHTML);
    printWindow.document.close();
    printWindow.print();
    
    toast({
      title: "Success",
      description: "Payment slip generated successfully"
    });
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      month: "",
      year: new Date().getFullYear().toString(),
      basicSalary: "",
      allowances: "",
      bonuses: "",
      overtime: "",
      deductions: "",
      advances: "",
      taxDeductions: "",
      comments: ""
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Payment Slip</DialogTitle>
          <DialogDescription>
            Create a salary payment slip for an employee
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Employee Information</h3>
            
            <div>
              <Label htmlFor="employee">Select Employee</Label>
              <Select value={formData.employeeId} onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  employeeId: value,
                  basicSalary: employees.find(emp => emp.id === value)?.salary?.toString() || ""
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="month">Month</Label>
                <Select value={formData.month} onValueChange={(value) => setFormData(prev => ({ ...prev, month: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"].map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                />
              </div>
            </div>

            <h3 className="font-semibold mt-6">Earnings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basicSalary">Basic Salary (UGX)</Label>
                <Input
                  id="basicSalary"
                  type="number"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="allowances">Allowances (UGX)</Label>
                <Input
                  id="allowances"
                  type="number"
                  value={formData.allowances}
                  onChange={(e) => setFormData(prev => ({ ...prev, allowances: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bonuses">Bonuses (UGX)</Label>
                <Input
                  id="bonuses"
                  type="number"
                  value={formData.bonuses}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonuses: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="overtime">Overtime (UGX)</Label>
                <Input
                  id="overtime"
                  type="number"
                  value={formData.overtime}
                  onChange={(e) => setFormData(prev => ({ ...prev, overtime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Deductions</h3>
            
            <div>
              <Label htmlFor="deductions">General Deductions (UGX)</Label>
              <Input
                id="deductions"
                type="number"
                value={formData.deductions}
                onChange={(e) => setFormData(prev => ({ ...prev, deductions: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="advances">Advances (UGX)</Label>
              <Input
                id="advances"
                type="number"
                value={formData.advances}
                onChange={(e) => setFormData(prev => ({ ...prev, advances: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="taxDeductions">Tax Deductions (UGX)</Label>
              <Input
                id="taxDeductions"
                type="number"
                value={formData.taxDeductions}
                onChange={(e) => setFormData(prev => ({ ...prev, taxDeductions: e.target.value }))}
              />
            </div>

            <h3 className="font-semibold mt-6">Summary</h3>
            
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Gross Pay:</span>
                <span className="font-semibold">UGX {calculateGrossPay().toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Deductions:</span>
                <span className="font-semibold text-red-600">UGX {calculateTotalDeductions().toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Net Pay:</span>
                <span className="font-bold text-green-600">UGX {calculateNetPay().toLocaleString()}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="comments">Comments/Notes</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Any additional comments or notes..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={resetForm}>
            Reset Form
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={generatePaymentSlip}>
              <Printer className="h-4 w-4 mr-2" />
              Generate & Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSlipGenerator;