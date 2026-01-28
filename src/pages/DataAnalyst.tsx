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
import MarketIntelligencePanel from '@/components/analyst/MarketIntelligencePanel';
import PriceCalculator from '@/components/analyst/PriceCalculator';

const DataAnalyst = () => {
  const [activeTab, setActiveTab] = useState('price-overview');

  return (
    <Layout title="Data Analytics" subtitle="Market analysis & price management">
      {/* Daily reminders for data analyst */}
      <AnalystDailyReminders 
        onNavigateToSetPrices={() => setActiveTab('set-prices')}
        onNavigateToDailyReports={() => setActiveTab('market-intel')}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-muted/50 p-1 rounded-xl gap-1">
            <TabsTrigger value="price-overview" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Overview</TabsTrigger>
            <TabsTrigger value="price-calc" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Calculator</TabsTrigger>
            <TabsTrigger value="set-prices" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Set Prices</TabsTrigger>
            <TabsTrigger value="market-intel" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Market Intel</TabsTrigger>
            <TabsTrigger value="price-trends" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Trends</TabsTrigger>
            <TabsTrigger value="market-monitor" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Market</TabsTrigger>
            <TabsTrigger value="daily-reports" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Reports</TabsTrigger>
            <TabsTrigger value="procurement" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Procurement</TabsTrigger>
            <TabsTrigger value="outturn" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-4">Outturn</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="price-overview">
          <PriceOverview />
        </TabsContent>

        <TabsContent value="price-calc">
          <PriceCalculator />
        </TabsContent>

        <TabsContent value="set-prices">
          <ReferencePriceInput />
        </TabsContent>

        <TabsContent value="market-intel">
          <MarketIntelligencePanel />
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
