import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, User, Send } from "lucide-react";

interface SalaryPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
  onPaymentRequestSubmitted: (request: any) => void;
}

const SalaryPaymentModal = ({ open, onOpenChange, employees, onPaymentRequestSubmitted }: SalaryPaymentModalProps) => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [requestData, setRequestData] = useState({
    month: new Date().toISOString().slice(0, 7),
    bonuses: "",
    deductions: "",
    notes: "",
    paymentMethod: "Bank Transfer"
  });
  const { toast } = useToast();

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const calculateTotalSalary = () => {
    return selectedEmployees.reduce((total, empId) => {
      const employee = employees.find(e => e.id === empId);
      if (employee) {
        return total + employee.salary;
      }
      return total;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one employee",
        variant: "destructive"
      });
      return;
    }

    const totalBaseSalary = calculateTotalSalary();
    const bonuses = parseInt(requestData.bonuses) || 0;
    const deductions = parseInt(requestData.deductions) || 0;
    const totalPayment = totalBaseSalary + bonuses - deductions;

    const paymentRequest = {
      department: "Human Resources",
      type: "Salary Payment",
      title: `Salary Payment - ${requestData.month}`,
      description: `Monthly salary payment for ${selectedEmployees.length} employees`,
      amount: `UGX ${totalPayment.toLocaleString()}`,
      requestedby: "HR Manager", // This should come from auth context
      daterequested: new Date().toISOString().split('T')[0],
      priority: "High",
      status: "Pending",
      details: {
        month: requestData.month,
        employee_count: selectedEmployees.length,
        total_salary: totalBaseSalary,
        bonuses: bonuses,
        deductions: deductions,
        total_amount: totalPayment,
        payment_method: requestData.paymentMethod,
        notes: requestData.notes,
        employee_details: selectedEmployees.map(empId => {
          const employee = employees.find(e => e.id === empId);
          return {
            id: employee?.id,
            name: employee?.name,
            salary: employee?.salary,
            department: employee?.department,
            position: employee?.position
          };
        })
      }
    };

    onPaymentRequestSubmitted(paymentRequest);
    
    // Reset form
    setSelectedEmployees([]);
    setRequestData({
      month: new Date().toISOString().slice(0, 7),
      bonuses: "", 
      deductions: "", 
      notes: "", 
      paymentMethod: "Bank Transfer"
    });

    toast({
      title: "Payment Request Submitted",
      description: "Your salary payment request has been sent to Finance for approval",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Submit Salary Payment Request
          </DialogTitle>
          <DialogDescription>
            Prepare salary payment request for Finance approval and processing
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Payment Month</Label>
              <Input
                id="month"
                type="month"
                value={requestData.month}
                onChange={(e) => setRequestData(prev => ({ ...prev, month: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={requestData.paymentMethod} onValueChange={(value) => setRequestData(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Select Employees</Label>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto mt-2">
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`emp-${employee.id}`}
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                      />
                      <label htmlFor={`emp-${employee.id}`} className="flex items-center space-x-3 cursor-pointer">
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-500">{employee.position} - {employee.department}</p>
                        </div>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">UGX {employee.salary.toLocaleString()}</Badge>
                      <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                        {employee.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bonuses">Total Bonuses (UGX)</Label>
              <Input
                id="bonuses"
                type="number"
                value={requestData.bonuses}
                onChange={(e) => setRequestData(prev => ({ ...prev, bonuses: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="deductions">Total Deductions (UGX)</Label>
              <Input
                id="deductions"
                type="number"
                value={requestData.deductions}
                onChange={(e) => setRequestData(prev => ({ ...prev, deductions: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Request Notes</Label>
            <Textarea
              id="notes"
              value={requestData.notes}
              onChange={(e) => setRequestData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for Finance team regarding this payroll request"
              rows={3}
            />
          </div>

          {selectedEmployees.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Payment Request Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Employees: {selectedEmployees.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>Base Salary: UGX {calculateTotalSalary().toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Total Request: UGX {(calculateTotalSalary() + parseInt(requestData.bonuses || "0") - parseInt(requestData.deductions || "0")).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-amber-50 rounded border-l-4 border-amber-400">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This request will be sent to Finance for review and approval. 
                  You'll be notified once it's processed.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={selectedEmployees.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Submit Request to Finance
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryPaymentModal;
