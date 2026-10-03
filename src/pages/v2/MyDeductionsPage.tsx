import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
          <h1 className="text-3xl font-bold text-foreground">My Deductions</h1>
          <p className="text-muted-foreground mt-2">This page is temporarily unavailable.</p>
        </div>
      </div>
    </div>
  );
};

export default MyDeductionsPage;
