import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSMSNotifications } from "@/hooks/useSMSNotifications";
import { useMonthlySalaryTracking } from "@/hooks/useMonthlySalaryTracking";
import { DollarSign, AlertTriangle, Send, User, Calendar, Info } from "lucide-react";

interface IndividualSalaryRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted: (request: any) => void;
  employees?: any[]; // Add employees prop for HR to select from
}

const IndividualSalaryRequestModal = ({ open, onOpenChange, onRequestSubmitted, employees = [] }: IndividualSalaryRequestModalProps) => {
  const { employee: currentUser } = useAuth();
  const { toast } = useToast();
  const { sendSalaryInitializedSMS } = useSMSNotifications();
  
  const [requestData, setRequestData] = useState({
    selectedEmployeeId: "",
    paymentType: "mid-month",
    reason: "",
    phoneNumber: "",
    notes: "",
    requestAmount: 0
  });

  // Check if current user is HR and has employees to select from
  const isHR = employees.length > 0;
  const selectedEmployee = isHR 
    ? employees.find(emp => emp.id === requestData.selectedEmployeeId) 
    : currentUser;

  // Track salary period and availability
  const { periodInfo, loading: periodLoading } = useMonthlySalaryTracking(
    selectedEmployee?.email,
    selectedEmployee?.salary || 0
  );

  // Update request amount when employee or period changes
  useEffect(() => {
    if (selectedEmployee && periodInfo.canRequest) {
      setRequestData(prev => ({
        ...prev,
        requestAmount: periodInfo.availableAmount
      }));
    }
  }, [selectedEmployee, periodInfo]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: isHR ? "Please select an employee" : "Employee information not found",
        variant: "destructive"
      });
      return;
    }

    // Check if requests are allowed in current period
    if (!periodInfo.canRequest) {
      toast({
        title: "Request Not Allowed",
        description: periodInfo.message,
        variant: "destructive"
      });
      return;
    }

    // Validate requested amount
    if (requestData.requestAmount <= 0 || requestData.requestAmount > periodInfo.availableAmount) {
      toast({
        title: "Invalid Amount",
        description: `Please enter an amount between UGX 1 and UGX ${periodInfo.availableAmount.toLocaleString()}`,
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

    const phoneNumber = requestData.phoneNumber || selectedEmployee.phone;
    if (!phoneNumber?.trim()) {
      toast({
        title: "Error",
        description: "Please provide a phone number for payment",
        variant: "destructive"
      });
      return;
    }

    const amount = requestData.requestAmount;
    const requestTitle = periodInfo.periodType === "mid-month" 
      ? `Mid-Month Salary Request - ${selectedEmployee.name}`
      : `End-Month Salary Request - ${selectedEmployee.name}`;

    const salaryRequest = {
      department: "Human Resources",
      type: "Employee Salary Request",
      title: requestTitle,
      description: `${periodInfo.periodType === "mid-month" ? "Mid-month" : "End-of-month"} salary request`,
      amount: `UGX ${amount.toLocaleString()}`,
      requestedby: currentUser?.email || 'HR Manager',
      daterequested: new Date().toISOString().split('T')[0],
      priority: "Normal",
      status: "Pending",
      details: {
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        employee_email: selectedEmployee.email,
        employee_phone: phoneNumber,
        employee_department: selectedEmployee.department,
        employee_position: selectedEmployee.position,
        payment_type: periodInfo.periodType,
        monthly_salary: selectedEmployee.salary,
        requested_amount: amount,
        already_paid_this_month: periodInfo.alreadyRequested,
        available_balance: periodInfo.availableAmount,
        reason: requestData.reason,
        notes: requestData.notes,
        requires_dual_approval: true,
        finance_approved: false,
        admin_approved: false,
        requested_by_hr: isHR,
        hr_user: currentUser?.name || 'HR Manager'
      }
    };

    onRequestSubmitted(salaryRequest);
    
    // Send SMS notification about salary initialization
    try {
      sendSalaryInitializedSMS(
        selectedEmployee.name,
        phoneNumber,
        amount,
        periodInfo.periodType as 'mid-month' | 'end-month'
      );
    } catch (smsError) {
      console.error('SMS notification failed:', smsError);
      // Don't block the request if SMS fails
    }
    
    // Reset form
    setRequestData({
      selectedEmployeeId: "",
      paymentType: "mid-month",
      reason: "",
      phoneNumber: "",
      notes: "",
      requestAmount: 0
    });

    // Send in-app notification
    toast({
      title: "Salary Request Submitted",
      description: `Dear ${selectedEmployee.name}, your ${periodInfo.periodType === "mid-month" ? "mid month" : "end of month"} salary of UGX ${amount.toLocaleString()} has been initialized. Once approved you will receive it ASAP.`,
    });
  };

  if (!isHR && !currentUser) {
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
          {isHR && (
            <div className="space-y-1">
              <Label htmlFor="employee" className="text-sm">Select Employee *</Label>
              <Select 
                value={requestData.selectedEmployeeId} 
                onValueChange={(value) => setRequestData(prev => ({ 
                  ...prev, 
                  selectedEmployeeId: value,
                  phoneNumber: employees.find(emp => emp.id === value)?.phone || ""
                }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department} (UGX {emp.salary?.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedEmployee && (
            <div className="space-y-2">
              <div className="bg-blue-50 p-2 rounded text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Employee:</span>
                  <span className="font-medium">{selectedEmployee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Salary:</span>
                  <span className="font-semibold">UGX {selectedEmployee.salary?.toLocaleString() || 0}</span>
                </div>
              </div>

              {/* Period and Availability Info */}
              {periodLoading ? (
                <div className="text-center py-2 text-xs text-muted-foreground">
                  Checking availability...
                </div>
              ) : (
                <Alert className={periodInfo.canRequest ? "border-green-200 bg-green-50 py-2" : "border-red-200 bg-red-50 py-2"}>
                  <Calendar className={`h-3 w-3 ${periodInfo.canRequest ? 'text-green-600' : 'text-red-600'}`} />
                  <AlertDescription className={`${periodInfo.canRequest ? 'text-green-800' : 'text-red-800'} text-xs`}>
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {periodInfo.periodType === 'mid-month' && 'Mid-Month Period (13th-15th)'}
                        {periodInfo.periodType === 'end-month' && 'End-Month Period (31st-2nd)'}
                        {periodInfo.periodType === 'closed' && 'Period Closed'}
                      </div>
                      <div>{periodInfo.message}</div>
                      {periodInfo.alreadyRequested > 0 && (
                        <div className="text-xs mt-1 pt-1 border-t border-current/20">
                          Already requested this month: UGX {periodInfo.alreadyRequested.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="requestAmount" className="text-sm">Request Amount (UGX) *</Label>
            <Input
              id="requestAmount"
              type="number"
              value={requestData.requestAmount}
              onChange={(e) => setRequestData(prev => ({ ...prev, requestAmount: Number(e.target.value) }))}
              max={periodInfo.availableAmount}
              min={0}
              placeholder="Enter amount"
              className="h-9 text-sm"
              disabled={!periodInfo.canRequest}
              required
            />
            {periodInfo.canRequest && (
              <p className="text-xs text-muted-foreground">
                Maximum: UGX {periodInfo.availableAmount.toLocaleString()}
              </p>
            )}
          </div>

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

          {selectedEmployee && requestData.requestAmount > 0 && (
            <div className="bg-green-50 p-2 rounded">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Requesting:</span>
                <span className="font-bold text-green-700">
                  UGX {requestData.requestAmount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-9">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!periodInfo.canRequest || !selectedEmployee || requestData.requestAmount <= 0} 
              className="flex-1 h-9"
            >
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