
import React from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarketMonitor from '@/components/analyst/MarketMonitor';
import ProcurementAdvisory from '@/components/analyst/ProcurementAdvisory';
import OutturnSimulator from '@/components/analyst/OutturnSimulator';
import PriceRecommendationPanel from '@/components/analyst/PriceRecommendationPanel';
import TrendAnalysisPanel from '@/components/analyst/TrendAnalysisPanel';

const DataAnalyst = () => {
  return (
    <Layout title="Data Analytics" subtitle="Advanced market analysis and pricing intelligence">
      <Tabs defaultValue="price-recommendations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="price-recommendations">Price Recommendations</TabsTrigger>
          <TabsTrigger value="trend-analysis">Trend Analysis</TabsTrigger>
          <TabsTrigger value="market-monitor">Market Monitor</TabsTrigger>
          <TabsTrigger value="procurement">Procurement Advisory</TabsTrigger>
          <TabsTrigger value="outturn">Outturn Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="price-recommendations">
          <PriceRecommendationPanel />
        </TabsContent>

        <TabsContent value="trend-analysis">
          <TrendAnalysisPanel />
        </TabsContent>

        <TabsContent value="market-monitor">
          <MarketMonitor />
        </TabsContent>

        <TabsContent value="procurement">
          <ProcurementAdvisory />
        </TabsContent>

        <TabsContent value="outturn">
          <OutturnSimulator />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default DataAnalyst;
