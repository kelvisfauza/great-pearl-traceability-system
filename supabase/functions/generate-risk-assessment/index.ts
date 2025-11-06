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

    // Get user info from auth header
    const authHeader = req.headers.get('authorization');
    let userName = 'Risk Analyst';
    let user = null;
    let employee = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
      
      if (user) {
        // Fetch user details from employees table
        const { data: employeeData } = await supabase
          .from('employees')
          .select('full_name, role')
          .eq('user_id', user.id)
          .single();
        
        employee = employeeData;
        
        if (employee) {
          userName = `${employee.full_name}${employee.role ? ` - ${employee.role}` : ''}`;
        }
      }
    }

    console.log('Fetching data for risk assessment...');

    // Fetch previous risk assessments (last 3)
    const { data: previousAssessments } = await supabase
      .from('risk_assessments')
      .select('generated_at, assessment_content')
      .order('generated_at', { ascending: false })
      .limit(3);

    console.log(`Found ${previousAssessments?.length || 0} previous assessments`);

    // Fetch data from Firebase Firestore using REST API
    const firebaseProjectId = 'great-new';
    const firebaseResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents/coffee_records`,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    let coffeeRecords = [];
    if (firebaseResponse.ok) {
      const firebaseData = await firebaseResponse.json();
      coffeeRecords = firebaseData.documents?.map((doc: any) => {
        const fields = doc.fields || {};
        return {
          kilograms: parseFloat(fields.kilograms?.doubleValue || fields.kilograms?.integerValue || '0'),
          coffee_type: fields.coffee_type?.stringValue || ''
        };
      }) || [];
    }

    // Fetch relevant data from Supabase
    const [
      { data: employees },
      { data: expenses },
      { data: suppliers },
      { data: salesTransactions },
      { data: moneyRequests },
      { data: paymentRecords }
    ] = await Promise.all([
      supabase.from('employees').select('department, status').eq('status', 'Active'),
      supabase.from('approval_requests').select('department, status, amount').limit(100),
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
        totalKilograms: coffeeRecords?.reduce((sum, record) => sum + (Number(record.kilograms) || 0), 0) || 0,
        totalRecords: coffeeRecords?.length || 0,
        coffeeTypes: [...new Set(coffeeRecords?.map(r => r.coffee_type))].length || 0
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

IMPORTANT: Start the report with this exact header structure:
**Date:** [Current date in format: Month Day, Year]
**Prepared for:** Management Board
**Prepared by:** ${userName}

Then continue with: "This report provides a detailed risk assessment..."

${previousAssessments && previousAssessments.length > 0 ? `
PREVIOUS ASSESSMENTS CONTEXT:
You have access to ${previousAssessments.length} previous risk assessment(s). Use these to:
1. Identify new risks that weren't present before
2. Track progress on previously identified risks
3. Avoid repeating the same analysis
4. Highlight trends and changes

Previous assessment dates: ${previousAssessments.map((a: any) => new Date(a.generated_at).toLocaleDateString()).join(', ')}

Focus on what's NEW, CHANGED, or WORSENED since the last assessment. Don't repeat risks that were already thoroughly covered unless their status has changed significantly.
` : ''}

Format the rest of the response as structured markdown with clear sections and bullet points.`
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

    // Save the assessment to the database
    const { error: saveError } = await supabase
      .from('risk_assessments')
      .insert({
        generated_by_user_id: user?.id,
        generated_by_name: userName,
        generated_by_role: employee?.role || null,
        assessment_content: riskAssessment,
        data_summary: dataSummary
      });

    if (saveError) {
      console.error('Error saving assessment:', saveError);
      // Don't fail the request, just log the error
    } else {
      console.log('Assessment saved to database successfully');
    }

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
