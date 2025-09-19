import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, AlertTriangle, Send, User } from "lucide-react";

interface IndividualSalaryRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted: (request: any) => void;
}

const IndividualSalaryRequestModal = ({ open, onOpenChange, onRequestSubmitted }: IndividualSalaryRequestModalProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [requestData, setRequestData] = useState({
    paymentType: "mid-month",
    reason: "",
    phoneNumber: employee?.phone || "",
    notes: ""
  });
  const [showMidMonthAlert, setShowMidMonthAlert] = useState(true);

  const handlePaymentTypeChange = (type: string) => {
    setRequestData(prev => ({ ...prev, paymentType: type }));
    setShowMidMonthAlert(type === "mid-month");
  };

  const calculateRequestAmount = () => {
    if (!employee?.salary) return 0;
    return requestData.paymentType === "mid-month" ? employee.salary / 2 : employee.salary;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee) {
      toast({
        title: "Error",
        description: "Employee information not found",
        variant: "destructive"
      });
      return;
    }

    if (!requestData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for this salary request",
        variant: "destructive"
      });
      return;
    }

    if (!requestData.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please provide your phone number for payment",
        variant: "destructive"
      });
      return;
    }

    const amount = calculateRequestAmount();
    const requestTitle = requestData.paymentType === "mid-month" 
      ? `Mid-Month Salary Request - ${employee.name}`
      : `End-Month Salary Request - ${employee.name}`;

    const salaryRequest = {
      department: "Human Resources",
      type: "Employee Salary Request",
      title: requestTitle,
      description: `${requestData.paymentType === "mid-month" ? "Mid-month" : "End-of-month"} salary request`,
      amount: `UGX ${amount.toLocaleString()}`,
      requestedby: employee.email,
      daterequested: new Date().toISOString().split('T')[0],
      priority: "Normal",
      status: "Pending",
      details: {
        employee_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        employee_phone: requestData.phoneNumber,
        employee_department: employee.department,
        employee_position: employee.position,
        payment_type: requestData.paymentType,
        monthly_salary: employee.salary,
        requested_amount: amount,
        reason: requestData.reason,
        notes: requestData.notes,
        requires_dual_approval: true,
        finance_approved: false,
        admin_approved: false
      }
    };

    onRequestSubmitted(salaryRequest);
    
    // Send SMS notification about salary initialization
    try {
      console.log(`Sending SMS to ${employee.name} at ${requestData.phoneNumber}: Dear ${employee.name}, your ${requestData.paymentType === "mid-month" ? "mid month" : "end of month"} salary of UGX ${amount.toLocaleString()} has been initialized. Once approved you will receive it ASAP.`);
    } catch (smsError) {
      console.error('SMS notification failed:', smsError);
    }
    
    // Reset form
    setRequestData({
      paymentType: "mid-month",
      reason: "",
      phoneNumber: employee?.phone || "",
      notes: ""
    });
    setShowMidMonthAlert(true);

    // Send in-app notification
    toast({
      title: "Salary Request Submitted",
      description: `Dear ${employee.name}, your ${requestData.paymentType === "mid-month" ? "mid month" : "end of month"} salary of UGX ${amount.toLocaleString()} has been initialized. Once approved you will receive it ASAP.`,
    });
  };

  if (!employee) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-4 w-4" />
            Request Salary
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-blue-50 p-2 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span>Employee:</span>
              <span className="font-medium">{employee.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly Salary:</span>
              <span className="font-semibold">UGX {employee.salary?.toLocaleString() || 0}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="paymentType" className="text-sm">Payment Type</Label>
            <Select value={requestData.paymentType} onValueChange={handlePaymentTypeChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mid-month">Mid-Month (50%)</SelectItem>
                <SelectItem value="end-month">End-Month (100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showMidMonthAlert && (
            <Alert className="border-orange-200 bg-orange-50 py-2">
              <AlertTriangle className="h-3 w-3 text-orange-600" />
              <AlertDescription className="text-orange-800 text-xs">
                <strong>Mid-Month:</strong> Requesting 50% salary (UGX {(employee.salary / 2).toLocaleString()}). Requires dual approval.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Label htmlFor="reason" className="text-sm">Reason *</Label>
            <Textarea
              id="reason"
              value={requestData.reason}
              onChange={(e) => setRequestData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Why do you need this payment?"
              rows={2}
              className="text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phoneNumber" className="text-sm">Payment Phone *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={requestData.phoneNumber}
              onChange={(e) => setRequestData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+256XXXXXXXXX"
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-sm">Notes</Label>
            <Textarea
              id="notes"
              value={requestData.notes}
              onChange={(e) => setRequestData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional info..."
              rows={2}
              className="text-sm"
            />
          </div>

          <div className="bg-green-50 p-2 rounded">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Amount:</span>
              <span className="font-bold text-green-700">
                UGX {calculateRequestAmount().toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-9">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-9">
              <Send className="h-3 w-3 mr-1" />
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IndividualSalaryRequestModal;