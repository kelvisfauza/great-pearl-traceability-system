
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, User } from "lucide-react";

interface SalaryPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
  onPaymentProcessed: (payment: any) => void;
}

const SalaryPaymentModal = ({ open, onOpenChange, employees, onPaymentProcessed }: SalaryPaymentModalProps) => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [paymentData, setPaymentData] = useState({
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
      const employee = employees.find(e => e.id === parseInt(empId));
      if (employee) {
        const salary = parseInt(employee.salary.replace(/[^\d]/g, ''));
        return total + salary;
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
    const bonuses = parseInt(paymentData.bonuses) || 0;
    const deductions = parseInt(paymentData.deductions) || 0;
    const totalPayment = totalBaseSalary + bonuses - deductions;

    const payment = {
      id: Date.now(),
      month: paymentData.month,
      employees: selectedEmployees.length,
      totalPay: `UGX ${totalPayment.toLocaleString()}`,
      bonuses: `UGX ${bonuses.toLocaleString()}`,
      deductions: `UGX ${deductions.toLocaleString()}`,
      status: "Processed",
      processedBy: "John Mbale",
      processedDate: new Date().toLocaleDateString(),
      paymentMethod: paymentData.paymentMethod,
      notes: paymentData.notes,
      employeeDetails: selectedEmployees.map(empId => {
        const employee = employees.find(e => e.id === parseInt(empId));
        return {
          id: employee?.id,
          name: employee?.name,
          salary: employee?.salary,
          department: employee?.department
        };
      })
    };

    onPaymentProcessed(payment);
    toast({
      title: "Success",
      description: `Salary payment processed for ${selectedEmployees.length} employees`
    });
    
    setSelectedEmployees([]);
    setPaymentData({
      month: new Date().toISOString().slice(0, 7),
      bonuses: "", deductions: "", notes: "", paymentMethod: "Bank Transfer"
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Salary Payment</DialogTitle>
          <DialogDescription>Select employees and process monthly salary payments</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="month">Payment Month</Label>
              <Input
                id="month"
                type="month"
                value={paymentData.month}
                onChange={(e) => setPaymentData(prev => ({ ...prev, month: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentData.paymentMethod} onValueChange={(value) => setPaymentData(prev => ({ ...prev, paymentMethod: value }))}>
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
                        checked={selectedEmployees.includes(employee.id.toString())}
                        onChange={() => handleEmployeeToggle(employee.id.toString())}
                      />
                      <label htmlFor={`emp-${employee.id}`} className="flex items-center space-x-3 cursor-pointer">
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-500">{employee.position} - {employee.department}</p>
                        </div>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{employee.salary}</Badge>
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
                value={paymentData.bonuses}
                onChange={(e) => setPaymentData(prev => ({ ...prev, bonuses: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="deductions">Total Deductions (UGX)</Label>
              <Input
                id="deductions"
                type="number"
                value={paymentData.deductions}
                onChange={(e) => setPaymentData(prev => ({ ...prev, deductions: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Payment Notes</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for this payment batch"
              rows={3}
            />
          </div>

          {selectedEmployees.length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Payment Summary</h4>
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
                  <span>Total: UGX {(calculateTotalSalary() + parseInt(paymentData.bonuses || "0") - parseInt(paymentData.deductions || "0")).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={selectedEmployees.length === 0}>
              Process Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryPaymentModal;
