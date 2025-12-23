import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { smsService } from "@/services/smsService";
import { Send, Loader2 } from "lucide-react";

interface SalaryPaymentMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeePhone: string;
}

const SalaryPaymentMessageDialog = ({ 
  isOpen, 
  onClose, 
  employeeName, 
  employeePhone 
}: SalaryPaymentMessageDialogProps) => {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const paymentModes = [
    { value: "cash", label: "Cash" },
    { value: "bank", label: "Bank Account" },
    { value: "mobile_money", label: "Mobile Money Account" },
  ];

  const getPaymentModeText = (mode: string): string => {
    switch (mode) {
      case "cash":
        return "cash";
      case "bank":
        return "bank account";
      case "mobile_money":
        return "mobile money account";
      default:
        return mode;
    }
  };

  const handleSend = async () => {
    if (!amount || !paymentMode) {
      toast({
        title: "Validation Error",
        description: "Please enter amount and select payment mode",
        variant: "destructive",
      });
      return;
    }

    if (!employeePhone) {
      toast({
        title: "No Phone Number",
        description: "This employee doesn't have a phone number registered",
        variant: "destructive",
      });
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const message = `Dear ${employeeName}, your salary payment of UGX ${amountNumber.toLocaleString()} has been dispersed to your ${getPaymentModeText(paymentMode)}. Great Pearl Coffee.`;
      
      console.log("Sending salary payment SMS to:", employeePhone);
      console.log("Message:", message);
      
      const result = await smsService.sendSMS(employeePhone, message);
      
      if (result.success) {
        toast({
          title: "Message Sent! ✓",
          description: `Salary payment notification sent to ${employeeName}`,
        });
        handleClose();
      } else {
        toast({
          title: "Failed to Send",
          description: result.error || "SMS sending failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending salary SMS:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setAmount("");
    setPaymentMode("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Salary Payment Message
          </DialogTitle>
          <DialogDescription>
            Send a salary payment notification to {employeeName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient</Label>
            <p className="p-2 bg-muted rounded text-sm">
              {employeeName} ({employeePhone || "No phone"})
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (UGX)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                {paymentModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {amount && paymentMode && (
            <div className="space-y-2">
              <Label>Message Preview</Label>
              <p className="p-3 bg-muted rounded text-sm border">
                Dear {employeeName}, your salary payment of UGX{" "}
                {parseFloat(amount || "0").toLocaleString()} has been dispersed to
                your {getPaymentModeText(paymentMode)}. Great Pearl Coffee.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !amount || !paymentMode}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryPaymentMessageDialog;
