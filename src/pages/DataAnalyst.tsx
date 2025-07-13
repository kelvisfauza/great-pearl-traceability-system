
import { MarketMonitor } from "@/components/analyst/MarketMonitor";
import { ProcurementAdvisory } from "@/components/analyst/ProcurementAdvisory";
import { OutturnSimulator } from "@/components/analyst/OutturnSimulator";

const DataAnalyst = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Analyst Dashboard</h1>
          <p className="text-gray-600 mt-2">Market analysis and procurement insights</p>
        </div>
        
        <div className="space-y-8">
          <MarketMonitor />
          <ProcurementAdvisory />
          <OutturnSimulator />
        </div>
      </div>
    </div>
  );
};

export default DataAnalyst;
