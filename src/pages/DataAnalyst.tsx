import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MarketMonitor from '@/components/analyst/MarketMonitor';
import ProcurementAdvisory from '@/components/analyst/ProcurementAdvisory';
import OutturnSimulator from '@/components/analyst/OutturnSimulator';
import PriceRecommendationPanel from '@/components/analyst/PriceRecommendationPanel';
import TrendAnalysisPanel from '@/components/analyst/TrendAnalysisPanel';
import ReferencePriceInput from '@/components/analyst/ReferencePriceInput';
import PriceOverview from '@/components/analyst/PriceOverview';
import PriceTrendsChart from '@/components/analyst/PriceTrendsChart';
import DailyMarketReport from '@/components/analyst/DailyMarketReport';
import AnalystDailyReminders from '@/components/analyst/AnalystDailyReminders';

const DataAnalyst = () => {
  const [activeTab, setActiveTab] = useState('price-overview');

  return (
    <Layout title="Data Analytics" subtitle="Market analysis, pricing intelligence & price management">
      {/* Daily reminders for data analyst */}
      <AnalystDailyReminders 
        onNavigateToSetPrices={() => setActiveTab('set-prices')}
        onNavigateToDailyReports={() => setActiveTab('daily-reports')}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="price-overview">Price Overview</TabsTrigger>
          <TabsTrigger value="set-prices">Set Prices</TabsTrigger>
          <TabsTrigger value="price-trends">Price Trends</TabsTrigger>
          <TabsTrigger value="market-monitor">Market Monitor</TabsTrigger>
          <TabsTrigger value="daily-reports">Daily Reports</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="outturn">Outturn Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="price-overview">
          <PriceOverview />
        </TabsContent>

        <TabsContent value="set-prices">
          <ReferencePriceInput />
        </TabsContent>

        <TabsContent value="price-trends">
          <div className="space-y-6">
            <PriceTrendsChart />
            <TrendAnalysisPanel />
          </div>
        </TabsContent>

        <TabsContent value="market-monitor">
          <MarketMonitor />
        </TabsContent>

        <TabsContent value="daily-reports">
          <DailyMarketReport />
        </TabsContent>

        <TabsContent value="procurement">
          <div className="space-y-6">
            <ProcurementAdvisory />
            <PriceRecommendationPanel />
          </div>
        </TabsContent>

        <TabsContent value="outturn">
          <OutturnSimulator />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default DataAnalyst;
