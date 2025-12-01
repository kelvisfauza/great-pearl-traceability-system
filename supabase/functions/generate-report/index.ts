import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  template_id: string;
  template_name: string;
  category: string;
  data_sources: string[];
  format: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { template_id, template_name, category, data_sources, format }: ReportRequest = await req.json();

    console.log(`📊 Generating ${format} report: ${template_name} (${category})`);
    console.log(`📋 Data sources:`, data_sources);

    // Fetch data based on data_sources
    const reportData: any = {
      metadata: {
        template_name,
        category,
        generated_at: new Date().toISOString(),
        format
      },
      data: {}
    };

    // Fetch data from each source
    for (const source of data_sources) {
      try {
        console.log(`Fetching data from: ${source}`);
        
        const { data, error } = await supabase
          .from(source)
          .select('*')
          .limit(1000); // Limit for performance

        if (error) {
          console.error(`Error fetching ${source}:`, error);
          reportData.data[source] = { error: error.message };
        } else {
          reportData.data[source] = data;
          console.log(`✅ Fetched ${data?.length || 0} records from ${source}`);
        }
      } catch (err: any) {
        console.error(`Error processing ${source}:`, err);
        reportData.data[source] = { error: err.message };
      }
    }

    // Generate report based on category and format
    let reportContent = '';
    let summaryStats: any = {};

    // Calculate summary statistics based on category
    switch (category) {
      case 'Finance':
        const payments = reportData.data.payment_records || [];
        const transactions = reportData.data.finance_cash_transactions || [];
        const sales = reportData.data.sales_transactions || [];
        
        summaryStats = {
          total_payments: payments.length,
          total_payment_amount: payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
          total_cash_transactions: transactions.length,
          total_sales: sales.length,
          total_revenue: sales.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0)
        };
        break;

      case 'Sales':
        const salesData = reportData.data.sales_transactions || [];
        summaryStats = {
          total_sales: salesData.length,
          total_weight_kg: salesData.reduce((sum: number, s: any) => sum + (Number(s.weight) || 0), 0),
          total_revenue: salesData.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0),
          unique_customers: new Set(salesData.map((s: any) => s.customer)).size
        };
        break;

      case 'Operations':
        const inventory = reportData.data.inventory_items || [];
        summaryStats = {
          total_inventory_items: inventory.length,
          total_bags: inventory.reduce((sum: number, i: any) => sum + (Number(i.total_bags) || 0), 0),
          total_kilograms: inventory.reduce((sum: number, i: any) => sum + (Number(i.total_kilograms) || 0), 0)
        };
        break;

      case 'Procurement':
        const suppliers = reportData.data.suppliers || [];
        const contracts = reportData.data.supplier_contracts || [];
        const paymentRecords = reportData.data.payment_records || [];
        
        // Calculate supplier performance metrics
        const supplierPayments: { [key: string]: { count: number, total: number, supplier: any } } = {};
        
        paymentRecords.forEach((payment: any) => {
          const supplierName = payment.supplier_name;
          if (!supplierName) return;
          
          if (!supplierPayments[supplierName]) {
            supplierPayments[supplierName] = {
              count: 0,
              total: 0,
              supplier: suppliers.find((s: any) => s.name === supplierName) || { name: supplierName }
            };
          }
          
          supplierPayments[supplierName].count++;
          supplierPayments[supplierName].total += Number(payment.amount) || 0;
        });
        
        // Sort suppliers by total payments
        const sortedSuppliers = Object.values(supplierPayments)
          .sort((a, b) => b.total - a.total);
        
        const topSuppliers = sortedSuppliers.slice(0, 5);
        const bottomSuppliers = sortedSuppliers.slice(-5).reverse();
        
        summaryStats = {
          total_suppliers: suppliers.length,
          active_contracts: contracts.filter((c: any) => c.status === 'Active').length,
          total_contracts: contracts.length,
          total_payments: paymentRecords.length,
          total_paid_amount: paymentRecords.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
          top_supplier: topSuppliers[0] ? {
            name: topSuppliers[0].supplier.name,
            payments: topSuppliers[0].count,
            total_amount: topSuppliers[0].total
          } : null,
          top_5_suppliers: topSuppliers.map((s) => ({
            name: s.supplier.name,
            payments: s.count,
            total_amount: s.total,
            supplier_code: s.supplier.supplier_code
          })),
          bottom_5_suppliers: bottomSuppliers.map((s) => ({
            name: s.supplier.name,
            payments: s.count,
            total_amount: s.total,
            supplier_code: s.supplier.supplier_code
          }))
        };
        break;

      case 'Inventory':
        const invItems = reportData.data.inventory_items || [];
        const movements = reportData.data.inventory_movements || [];
        summaryStats = {
          total_items: invItems.length,
          total_movements: movements.length,
          total_stock: invItems.reduce((sum: number, i: any) => sum + (Number(i.total_kilograms) || 0), 0)
        };
        break;

      case 'Quality':
        const assessments = reportData.data.quality_assessments || [];
        summaryStats = {
          total_assessments: assessments.length,
          approved: assessments.filter((a: any) => a.status === 'approved').length,
          pending: assessments.filter((a: any) => a.status === 'pending').length,
          rejected: assessments.filter((a: any) => a.status === 'rejected').length
        };
        break;
    }

    // Build the report response
    const reportResult = {
      success: true,
      report: {
        template_id,
        template_name,
        category,
        format,
        generated_at: new Date().toISOString(),
        summary: summaryStats,
        data_sources: Object.keys(reportData.data).map(source => ({
          source,
          record_count: Array.isArray(reportData.data[source]) ? reportData.data[source].length : 0,
          has_error: !!reportData.data[source]?.error
        })),
        raw_data: reportData.data
      }
    };

    console.log(`✅ Report generated successfully with ${Object.keys(reportData.data).length} data sources`);

    return new Response(
      JSON.stringify(reportResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Error generating report:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate report'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});