import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching data for risk assessment...');

    // Fetch relevant data from different tables
    const [
      { data: employees },
      { data: expenses },
      { data: inventory },
      { data: suppliers },
      { data: salesTransactions },
      { data: moneyRequests },
      { data: paymentRecords }
    ] = await Promise.all([
      supabase.from('employees').select('department, status').eq('status', 'Active'),
      supabase.from('approval_requests').select('department, status, amount').limit(100),
      supabase.from('inventory_items').select('coffee_type, total_kilograms, status'),
      supabase.from('suppliers').select('name, origin'),
      supabase.from('sales_transactions').select('total_amount, status').limit(100),
      supabase.from('money_requests').select('amount, status').limit(100),
      supabase.from('payment_records').select('amount, status').limit(100)
    ]);

    // Prepare data summary for AI analysis
    const dataSummary = {
      employees: {
        total: employees?.length || 0,
        byDepartment: employees?.reduce((acc: any, emp) => {
          acc[emp.department] = (acc[emp.department] || 0) + 1;
          return acc;
        }, {})
      },
      expenses: {
        total: expenses?.length || 0,
        pending: expenses?.filter(e => e.status === 'pending').length || 0,
        totalAmount: expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0
      },
      inventory: {
        totalKilograms: inventory?.reduce((sum, i) => sum + (Number(i.total_kilograms) || 0), 0) || 0,
        coffeeTypes: inventory?.length || 0
      },
      suppliers: {
        total: suppliers?.length || 0
      },
      sales: {
        total: salesTransactions?.length || 0,
        totalRevenue: salesTransactions?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0
      },
      finances: {
        pendingPayments: paymentRecords?.filter(p => p.status === 'Pending').length || 0,
        moneyRequests: moneyRequests?.length || 0
      }
    };

    console.log('Calling Lovable AI for risk assessment...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business risk analyst specializing in coffee trading and processing operations. Analyze the provided data and generate a comprehensive risk assessment report covering all departments.'
          },
          {
            role: 'user',
            content: `Generate a detailed risk assessment report for a coffee trading company based on the following operational data:

${JSON.stringify(dataSummary, null, 2)}

Provide a comprehensive risk assessment covering:

1. **Store & Procurement Risks**: Analyze supplier dependencies, inventory levels, and procurement processes
2. **Finance Risks**: Evaluate pending payments, cash flow, and financial management
3. **Operations Risks**: Assess operational efficiency, employee distribution, and process bottlenecks
4. **Human Resources Risks**: Review staffing levels, department distribution, and HR processes
5. **Sales & Marketing Risks**: Examine sales performance and market dependencies
6. **Quality Control Risks**: Evaluate quality management processes
7. **IT & Security Risks**: Assess technology and data security vulnerabilities
8. **Logistics Risks**: Review supply chain and distribution risks

For each department, provide:
- Risk Level (Low/Medium/High/Critical)
- Key Risk Factors (3-5 points)
- Potential Impact
- Recommended Mitigation Strategies (3-5 actionable steps)
- Priority Level (1-5)

Format the response as structured markdown with clear sections and bullet points.`
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const riskAssessment = aiData.choices[0].message.content;

    console.log('Risk assessment generated successfully');

    return new Response(
      JSON.stringify({ 
        assessment: riskAssessment,
        dataSummary,
        generatedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error generating risk assessment:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate risk assessment' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
