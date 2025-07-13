
import React from 'react';
import Layout from '@/components/Layout';
import MarketMonitor from '@/components/analyst/MarketMonitor';
import ProcurementAdvisory from '@/components/analyst/ProcurementAdvisory';
import OutturnSimulator from '@/components/analyst/OutturnSimulator';
import PriceManager from '@/components/analyst/PriceManager';

const DataAnalyst = () => {
  return (
    <Layout title="Data Analytics" subtitle="Market insights and procurement guidance">
      <div className="space-y-6">
        <PriceManager />
        <MarketMonitor />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProcurementAdvisory />
          <OutturnSimulator />
        </div>
      </div>
    </Layout>
  );
};

export default DataAnalyst;
