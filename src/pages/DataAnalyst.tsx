
import MarketMonitor from "@/components/analyst/MarketMonitor";
import ProcurementAdvisory from "@/components/analyst/ProcurementAdvisory";
import OutturnSimulator from "@/components/analyst/OutturnSimulator";
import { Layout } from "@/components/Layout";

const DataAnalyst = () => {
  return (
    <Layout title="Data Analyst Dashboard" subtitle="Market analysis and procurement insights">
      <div className="space-y-8">
        <MarketMonitor />
        <ProcurementAdvisory />
        <OutturnSimulator />
      </div>
    </Layout>
  );
};

export default DataAnalyst;
