import { supabase } from '@/integrations/supabase/client';

interface MetricData {
  metric_type: string;
  category: string;
  label?: string;
  value_text?: string;
  value_numeric?: number;
  target?: number;
  percentage?: number;
  change_percentage?: number;
  trend?: string;
  icon?: string;
  color?: string;
  month?: string;
}

export const calculateMetricsFromFirebase = async () => {
  console.log('📊 Starting metrics calculation from Supabase...');

  try {
    // Fetch coffee records from Supabase
    const { data: coffeeRecords, error: coffeeError } = await supabase
      .from('coffee_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (coffeeError) {
      console.error('Error fetching coffee records:', coffeeError);
      throw coffeeError;
    }

    // Calculate totals from coffee records
    let totalBags = 0;
    let totalKg = 0;
    
    (coffeeRecords || []).forEach(record => {
      totalBags += record.bags || 0;
      totalKg += record.kilograms || 0;
    });

    // Count active COFFEE suppliers from Supabase
    const { count: activeSuppliers, error: supplierError } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });
    
    if (supplierError) {
      console.error('Error fetching suppliers:', supplierError);
    }

    // Fetch sales from Supabase
    const { data: salesRecords, error: salesError } = await supabase
      .from('sales_transactions')
      .select('*');

    if (salesError) {
      console.error('Error fetching sales:', salesError);
    }

    // Calculate revenue from sales
    let totalRevenue = 0;
    (salesRecords || []).forEach(record => {
      totalRevenue += record.total_amount || 0;
    });
    const revenueInMillions = (totalRevenue / 1_000_000).toFixed(1);

    // Calculate quality score (records with status "assessed" or "completed")
    const assessedRecords = (coffeeRecords || []).filter(record => {
      const status = record.status;
      return status === 'quality_review' || status === 'pricing' || status === 'batched';
    }).length;
    const qualityScore = (coffeeRecords || []).length > 0 
      ? ((assessedRecords / coffeeRecords.length) * 100).toFixed(1)
      : '0.0';

    console.log('📊 Calculated metrics:', {
      totalBags,
      totalKg,
      activeSuppliers: activeSuppliers || 0,
      revenue: totalRevenue,
      qualityScore
    });

    // Get previous metrics for trend calculation
    const { data: previousMetrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('month', 'previous');

    const getPreviousValue = (category: string) => {
      const prev = previousMetrics?.find(m => m.category === category);
      return prev?.value_numeric || 0;
    };

    const calculateTrend = (current: number, previous: number): { change: number, trend: string } => {
      if (previous === 0) return { change: 0, trend: 'stable' };
      const change = ((current - previous) / previous) * 100;
      return {
        change: parseFloat(change.toFixed(1)),
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      };
    };

    const productionTrend = calculateTrend(totalBags, getPreviousValue('production'));
    const revenueTrend = calculateTrend(totalRevenue, getPreviousValue('finance'));
    const supplierTrend = calculateTrend(activeSuppliers || 0, getPreviousValue('suppliers'));
    const qualityTrend = calculateTrend(parseFloat(qualityScore), getPreviousValue('quality'));

    // Prepare key metrics
    const keyMetrics: MetricData[] = [
      {
        metric_type: 'key_metric',
        category: 'production',
        label: 'Total Production',
        value_text: `${totalBags.toLocaleString()} bags`,
        change_percentage: productionTrend.change,
        trend: productionTrend.trend,
        icon: 'Package',
        color: 'text-blue-600'
      },
      {
        metric_type: 'key_metric',
        category: 'quality',
        label: 'Quality Score',
        value_text: `${qualityScore}%`,
        change_percentage: qualityTrend.change,
        trend: qualityTrend.trend,
        icon: 'Award',
        color: 'text-green-600'
      },
      {
        metric_type: 'key_metric',
        category: 'finance',
        label: 'Revenue',
        value_text: `UGX ${revenueInMillions}M`,
        change_percentage: revenueTrend.change,
        trend: revenueTrend.trend,
        icon: 'DollarSign',
        color: 'text-yellow-600'
      },
      {
        metric_type: 'key_metric',
        category: 'suppliers',
        label: 'Active Suppliers',
        value_text: `${activeSuppliers || 0}`,
        change_percentage: supplierTrend.change,
        trend: supplierTrend.trend,
        icon: 'Users',
        color: 'text-purple-600'
      }
    ];

    // Prepare performance metrics with targets
    const productionTarget = 3000;
    const qualityTarget = 95;
    const salesTarget = 900;
    const efficiencyTarget = 90;

    const productionPercentage = (totalBags / productionTarget) * 100;
    const qualityPercentage = (parseFloat(qualityScore) / qualityTarget) * 100;
    const salesValue = (salesRecords || []).length;
    const salesPercentage = (salesValue / salesTarget) * 100;
    const efficiencyValue = 87.3;
    const efficiencyPercentage = (efficiencyValue / efficiencyTarget) * 100;

    const performanceMetrics: MetricData[] = [
      {
        metric_type: 'performance',
        category: 'Production',
        value_numeric: totalBags,
        target: productionTarget,
        percentage: parseFloat(productionPercentage.toFixed(1)),
        change_percentage: productionTrend.change,
        trend: productionTrend.trend,
        month: 'current'
      },
      {
        metric_type: 'performance',
        category: 'Quality',
        value_numeric: parseFloat(qualityScore),
        target: qualityTarget,
        percentage: parseFloat(qualityPercentage.toFixed(1)),
        change_percentage: qualityTrend.change,
        trend: qualityTrend.trend,
        month: 'current'
      },
      {
        metric_type: 'performance',
        category: 'Sales',
        value_numeric: salesValue,
        target: salesTarget,
        percentage: parseFloat(salesPercentage.toFixed(1)),
        change_percentage: revenueTrend.change,
        trend: revenueTrend.trend,
        month: 'current'
      },
      {
        metric_type: 'performance',
        category: 'Efficiency',
        value_numeric: efficiencyValue,
        target: efficiencyTarget,
        percentage: parseFloat(efficiencyPercentage.toFixed(1)),
        change_percentage: -2.1,
        trend: 'down',
        month: 'current'
      }
    ];

    // Delete old current metrics
    await supabase
      .from('metrics')
      .delete()
      .eq('month', 'current');

    // Insert new metrics
    const allMetrics = [...keyMetrics, ...performanceMetrics];
    const { error: insertError } = await supabase
      .from('metrics')
      .insert(allMetrics);

    if (insertError) {
      console.error('❌ Error inserting metrics:', insertError);
      throw insertError;
    }

    console.log('✅ Successfully calculated and stored metrics');

    return {
      success: true,
      metrics: {
        totalBags,
        totalKg,
        revenue: totalRevenue,
        qualityScore,
        activeSuppliers: activeSuppliers || 0
      }
    };
  } catch (error) {
    console.error('❌ Error calculating metrics:', error);
    throw error;
  }
};
