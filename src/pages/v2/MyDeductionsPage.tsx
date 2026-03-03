import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import MyDeductions from "@/components/attendance/MyDeductions";

const MyDeductionsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            <h1 className="text-4xl font-bold text-foreground">My Deductions</h1>
          </div>
          <p className="text-muted-foreground text-lg">View your absence deductions and submit appeals</p>
        </div>
        <MyDeductions />
      </div>
    </div>
  );
};

export default MyDeductionsPage;
