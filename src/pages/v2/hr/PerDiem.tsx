import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { Wallet } from "lucide-react";
import AwardPerDiemDialog from "@/components/v2/hr/AwardPerDiemDialog";

const PerDiemPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-8 w-8 text-orange-600" />
              <h1 className="text-4xl font-bold text-foreground">Per Diem Awards</h1>
            </div>
            <p className="text-muted-foreground text-lg">Award per diem allowances to employees</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>

          <div className="lg:col-span-3">
            <AwardPerDiemDialog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerDiemPage;
