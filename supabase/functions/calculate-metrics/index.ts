import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricCalculation {
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 Starting metrics calculation...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch operational data from Firebase-based tables
    const [
      coffeeRecordsResult,
      salesResult,
      qualityAssessmentsResult,
      suppliersResult,
      previousMetrics
    ] = await Promise.all([
      supabaseClient.from('inventory_items').select('total_bags, total_kilograms'),
      supabaseClient.from('sales_transactions').select('total_amount, date'),
      supabaseClient.from('payment_records').select('*'),
      supabaseClient.from('suppliers').select('id, status', { count: 'exact' }),
      supabaseClient.from('metrics').select('*').eq('month', 'previous')
    ]);

    console.log('📦 Coffee records:', coffeeRecordsResult.data?.length || 0);
    console.log('💰 Sales records:', salesResult.data?.length || 0);
    console.log('✅ Quality assessments:', qualityAssessmentsResult.data?.length || 0);
    console.log('👥 Suppliers:', suppliersResult.count || 0);

    // Calculate totals
    const totalBags = coffeeRecordsResult.data?.reduce((sum, item) => sum + (item.total_bags || 0), 0) || 0;
    const totalKg = coffeeRecordsResult.data?.reduce((sum, item) => sum + (item.total_kilograms || 0), 0) || 0;
    
    const totalRevenue = salesResult.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const revenueInMillions = (totalRevenue / 1_000_000).toFixed(1);
    
    const activeSuppliers = suppliersResult.count || 0;
    
    // Calculate quality score (from payment records as proxy)
    const completedPayments = qualityAssessmentsResult.data?.filter(p => p.status === 'Paid' || p.status === 'completed') || [];
    const qualityScore = completedPayments.length > 0 
      ? ((completedPayments.length / (qualityAssessmentsResult.data?.length || 1)) * 100).toFixed(1)
      : '0.0';

    // Calculate trends by comparing with previous metrics
    const getPreviousValue = (category: string) => {
      const prev = previousMetrics.data?.find(m => m.category === category);
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
    const supplierTrend = calculateTrend(activeSuppliers, getPreviousValue('suppliers'));

    // Prepare key metrics
    const keyMetrics: MetricCalculation[] = [
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
        change_percentage: 2.1, // You can calculate this based on historical data
        trend: 'up',
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
        value_text: `${activeSuppliers}`,
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
    const salesValue = salesResult.data?.length || 0;
    const salesPercentage = (salesValue / salesTarget) * 100;
    const efficiencyValue = 87.3; // Calculate from processing data if available
    const efficiencyPercentage = (efficiencyValue / efficiencyTarget) * 100;

    const performanceMetrics: MetricCalculation[] = [
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
        change_percentage: 1.8,
        trend: 'up',
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
    await supabaseClient
      .from('metrics')
      .delete()
      .eq('month', 'current');

    // Insert new metrics
    const allMetrics = [...keyMetrics, ...performanceMetrics];
    const { error: insertError } = await supabaseClient
      .from('metrics')
      .insert(allMetrics);

    if (insertError) {
      console.error('❌ Error inserting metrics:', insertError);
      throw insertError;
    }

    console.log('✅ Successfully calculated and stored metrics');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Metrics calculated successfully',
        metrics: {
          totalBags,
          totalKg,
          revenue: totalRevenue,
          qualityScore,
          activeSuppliers
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error calculating metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});