import V2Navigation from "@/components/v2/V2Navigation";
import PriceTicker from "@/components/PriceTicker";
import { ShieldAlert } from "lucide-react";
import AbsenceAppealManager from "@/components/hr/AbsenceAppealManager";

const AbsenceAppealsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="h-8 w-8 text-orange-600" />
              <h1 className="text-4xl font-bold text-foreground">Absence Appeals</h1>
            </div>
            <p className="text-muted-foreground text-lg">Review and manage employee absence deduction appeals</p>
          </div>
          <PriceTicker />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <V2Navigation />
          </div>
          <div className="lg:col-span-3">
            <AbsenceAppealManager />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsenceAppealsPage;
