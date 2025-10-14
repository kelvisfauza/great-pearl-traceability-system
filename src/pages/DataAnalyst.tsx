
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import MarketMonitor from '@/components/analyst/MarketMonitor';
import ProcurementAdvisory from '@/components/analyst/ProcurementAdvisory';
import OutturnSimulator from '@/components/analyst/OutturnSimulator';
import PriceRecommendationPanel from '@/components/analyst/PriceRecommendationPanel';
import TrendAnalysisPanel from '@/components/analyst/TrendAnalysisPanel';
import { PriceUpdateModal } from '@/components/analyst/PriceUpdateModal';

const DataAnalyst = () => {
  const [priceUpdateModalOpen, setPriceUpdateModalOpen] = useState(false);

  return (
    <Layout title="Data Analytics" subtitle="Advanced market analysis and pricing intelligence">
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setPriceUpdateModalOpen(true)}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Update Market Prices
        </Button>
      </div>

      <PriceUpdateModal 
        open={priceUpdateModalOpen} 
        onOpenChange={setPriceUpdateModalOpen}
      />

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
