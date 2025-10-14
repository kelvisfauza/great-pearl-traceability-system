
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Plus } from 'lucide-react';
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
      <div className="mb-4 flex justify-start gap-2">
        <Button 
          variant="outline"
          onClick={async () => {
            const testMessage = `Great Pearl Coffee updates, today ${new Date().toLocaleDateString('en-GB')} price, Arabica outturn 70%, moisture 12.5%, FM 5%, price UGX 8,500/kg. Deliver now to get served best.`;
            try {
              console.log('📱 Sending test SMS to 0781121639');
              const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
                },
                body: JSON.stringify({
                  phone: '0781121639',
                  message: testMessage,
                  userName: 'Test User',
                  messageType: 'price_update',
                  triggeredBy: 'Data Analyst Test',
                  department: 'Analyst'
                })
              });
              const result = await response.json();
              console.log('✅ Test SMS result:', result);
            } catch (error) {
              console.error('❌ Test SMS error:', error);
            }
          }}
        >
          Test SMS
        </Button>
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
