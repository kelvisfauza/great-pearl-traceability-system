import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MarketIntelligenceReport {
  id?: string;
  report_date: string;
  reporting_period: 'daily' | 'weekly' | 'monthly';
  coffee_type: 'robusta' | 'drugar';
  analyst_name: string;
  market_reference: 'ICE' | 'local' | 'buyer_indications';
  
  // Market Summary
  market_direction: 'bullish' | 'bearish' | 'sideways';
  key_market_drivers: string[];
  narrative_summary: string;
  
  // Price Movement
  opening_price: number;
  closing_price: number;
  highest_price: number;
  lowest_price: number;
  price_change_percent: number;
  price_movement_interpretation: string;
  
  // Volume & Supply
  global_supply_trend: 'increasing' | 'decreasing' | 'stable';
  regional_supply_trend: 'increasing' | 'decreasing' | 'stable';
  factory_intake_volume: number;
  buyer_demand_level: 'low' | 'moderate' | 'high' | 'very_high';
  
  // Comparative Analysis
  yesterday_comparison: string;
  weekly_comparison: string;
  monthly_comparison: string;
  
  // Market Indicators
  market_momentum: 'strong_up' | 'weak_up' | 'neutral' | 'weak_down' | 'strong_down';
  buyer_aggressiveness: 'passive' | 'moderate' | 'aggressive' | 'very_aggressive';
  selling_pressure: 'low' | 'moderate' | 'high' | 'very_high';
  risk_level: 'low' | 'medium' | 'high';
  
  // Outlook
  short_term_outlook: string;
  medium_term_outlook: string;
  outlook_supporting_reasons: string;
  
  // Recommendations
  recommended_action: 'buy' | 'hold' | 'delay' | 'release';
  recommended_price_range_min: number;
  recommended_price_range_max: number;
  volume_strategy: string;
  
  // Risks
  market_risks: string;
  operational_risks: string;
  compliance_risks: string;
  
  // Sign-off
  prepared_by: string;
  reviewed_by?: string;
  approved_at?: string;
  
  created_at?: string;
  updated_at?: string;
}

export const getDefaultReport = (coffeeType: 'robusta' | 'drugar', analystName: string): MarketIntelligenceReport => ({
  report_date: new Date().toISOString().split('T')[0],
  reporting_period: 'daily',
  coffee_type: coffeeType,
  analyst_name: analystName,
  market_reference: 'ICE',
  
  market_direction: 'sideways',
  key_market_drivers: [],
  narrative_summary: '',
  
  opening_price: 0,
  closing_price: 0,
  highest_price: 0,
  lowest_price: 0,
  price_change_percent: 0,
  price_movement_interpretation: '',
  
  global_supply_trend: 'stable',
  regional_supply_trend: 'stable',
  factory_intake_volume: 0,
  buyer_demand_level: 'moderate',
  
  yesterday_comparison: '',
  weekly_comparison: '',
  monthly_comparison: '',
  
  market_momentum: 'neutral',
  buyer_aggressiveness: 'moderate',
  selling_pressure: 'moderate',
  risk_level: 'medium',
  
  short_term_outlook: '',
  medium_term_outlook: '',
  outlook_supporting_reasons: '',
  
  recommended_action: 'hold',
  recommended_price_range_min: 0,
  recommended_price_range_max: 0,
  volume_strategy: '',
  
  market_risks: '',
  operational_risks: '',
  compliance_risks: '',
  
  prepared_by: analystName,
  reviewed_by: '',
});

export const useMarketIntelligenceReports = () => {
  const [reports, setReports] = useState<MarketIntelligenceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayRobustaReport, setTodayRobustaReport] = useState<MarketIntelligenceReport | null>(null);
  const [todayDrugarReport, setTodayDrugarReport] = useState<MarketIntelligenceReport | null>(null);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('market_intelligence_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching market intelligence reports:', error);
        return;
      }

      if (data) {
        setReports(data as MarketIntelligenceReport[]);
        
        // Check for today's reports
        const todayRobusta = data.find(r => r.report_date === today && r.coffee_type === 'robusta');
        const todayDrugar = data.find(r => r.report_date === today && r.coffee_type === 'drugar');
        
        setTodayRobustaReport(todayRobusta as MarketIntelligenceReport || null);
        setTodayDrugarReport(todayDrugar as MarketIntelligenceReport || null);
      }
    } catch (error) {
      console.error('Error fetching market intelligence reports:', error);
    } finally {
      setLoading(false);
    }
  }, [today]);

  const submitReport = async (report: MarketIntelligenceReport): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('market_intelligence_reports')
        .upsert({
          ...report,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'report_date,coffee_type'
        });

      if (error) {
        console.error('Error submitting report:', error);
        toast({
          title: "Error",
          description: `Failed to submit ${report.coffee_type} report: ${error.message}`,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Success",
        description: `${report.coffee_type === 'robusta' ? 'Robusta' : 'Drugar (Arabica)'} market intelligence report submitted successfully`,
      });

      fetchReports();
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive"
      });
      return false;
    }
  };

  const getReportsByType = (coffeeType: 'robusta' | 'drugar') => {
    return reports.filter(r => r.coffee_type === coffeeType);
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    reports,
    loading,
    todayRobustaReport,
    todayDrugarReport,
    submitReport,
    fetchReports,
    getReportsByType,
    hasSubmittedToday: {
      robusta: !!todayRobustaReport,
      drugar: !!todayDrugarReport
    }
  };
};
