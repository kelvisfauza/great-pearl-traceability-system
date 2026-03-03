import { AlertTriangle } from "lucide-react";
import MyDeductions from "@/components/attendance/MyDeductions";

const MyDeductionsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
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
