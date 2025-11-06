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

    // Calculate date ranges for trend analysis
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch comprehensive data from ALL departments and systems
    const [
      { data: allEmployees },
      { data: companyEmployees },
      { data: expenses },
      { data: suppliers },
      { data: supplierContracts },
      { data: supplierAdvances },
      { data: salesTransactions },
      { data: salesRecent },
      { data: moneyRequests },
      { data: paymentRecords },
      { data: inventoryItems },
      { data: inventoryMovements },
      { data: purchaseOrders },
      { data: millingTransactions },
      { data: salaryPayments },
      { data: salaryPayslips },
      { data: overtimeAwards },
      { data: auditLogs },
      { data: deletionRequests },
      { data: dailyTasks },
      { data: archivedRequests }
    ] = await Promise.all([
      supabase.from('employees').select('*'),
      supabase.from('company_employees').select('*'),
      supabase.from('approval_requests').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('suppliers').select('*'),
      supabase.from('supplier_contracts').select('*').order('date', { ascending: false }).limit(100),
      supabase.from('supplier_advances').select('*').order('issued_at', { ascending: false }).limit(100),
      supabase.from('sales_transactions').select('*').order('date', { ascending: false }).limit(200),
      supabase.from('sales_transactions').select('*').gte('date', last30Days.toISOString().split('T')[0]),
      supabase.from('money_requests').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('payment_records').select('*').order('date', { ascending: false }).limit(200),
      supabase.from('inventory_items').select('*'),
      supabase.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('purchase_orders').select('*').order('order_date', { ascending: false }).limit(100),
      supabase.from('milling_transactions').select('*').order('date', { ascending: false }).limit(200),
      supabase.from('salary_payments').select('*').order('processed_date', { ascending: false }).limit(50),
      supabase.from('salary_payslips').select('*').order('generated_date', { ascending: false }).limit(200),
      supabase.from('overtime_awards').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('deletion_requests').select('*').order('requested_at', { ascending: false }).limit(100),
      supabase.from('daily_tasks').select('*').gte('date', last60Days.toISOString().split('T')[0]),
      supabase.from('archived_money_requests').select('*').order('archived_at', { ascending: false }).limit(100)
    ]);

    console.log('Calculating comprehensive metrics...');

    // Calculate detailed metrics for each department
    const dataSummary = {
      timestamp: now.toISOString(),
      overview: {
        totalEmployees: allEmployees?.length || 0,
        activeEmployees: allEmployees?.filter(e => e.status === 'Active').length || 0,
        inactiveEmployees: allEmployees?.filter(e => e.status !== 'Active').length || 0,
        companyEmployees: companyEmployees?.length || 0,
        totalSuppliers: suppliers?.length || 0,
        dataQuality: {
          auditLogsCount: auditLogs?.length || 0,
          deletionRequestsPending: deletionRequests?.filter(d => d.status === 'pending').length || 0
        }
      },
      
      humanResources: {
        systemUsers: {
          total: allEmployees?.length || 0,
          active: allEmployees?.filter(e => e.status === 'Active').length || 0,
          inactive: allEmployees?.filter(e => e.status !== 'Active').length || 0,
          disabled: allEmployees?.filter(e => e.disabled === true).length || 0,
          trainingAccounts: allEmployees?.filter(e => e.is_training_account === true).length || 0,
          byDepartment: allEmployees?.reduce((acc: any, emp) => {
            acc[emp.department] = (acc[emp.department] || 0) + 1;
            return acc;
          }, {}),
          byRole: allEmployees?.reduce((acc: any, emp) => {
            acc[emp.role] = (acc[emp.role] || 0) + 1;
            return acc;
          }, {})
        },
        companyEmployees: {
          total: companyEmployees?.length || 0,
          active: companyEmployees?.filter(e => e.status === 'Active').length || 0,
          inactive: companyEmployees?.filter(e => e.status !== 'Active').length || 0,
          totalBaseSalary: companyEmployees?.reduce((sum, e) => sum + (Number(e.base_salary) || 0), 0) || 0,
          totalAllowances: companyEmployees?.reduce((sum, e) => sum + (Number(e.allowances) || 0), 0) || 0,
          byDepartment: companyEmployees?.reduce((acc: any, emp) => {
            acc[emp.department] = (acc[emp.department] || 0) + 1;
            return acc;
          }, {})
        },
        salaryData: {
          recentPayments: salaryPayments?.length || 0,
          totalPaid: salaryPayments?.reduce((sum, s) => sum + (Number(s.total_pay) || 0), 0) || 0,
          pendingPayments: salaryPayments?.filter(s => s.status === 'Pending').length || 0,
          payslipsGenerated: salaryPayslips?.length || 0
        },
        overtime: {
          totalAwards: overtimeAwards?.length || 0,
          pending: overtimeAwards?.filter(o => o.status === 'pending').length || 0,
          completed: overtimeAwards?.filter(o => o.status === 'completed').length || 0,
          totalAmount: overtimeAwards?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0
        }
      },

      procurement: {
        suppliers: {
          total: suppliers?.length || 0,
          byOrigin: suppliers?.reduce((acc: any, s) => {
            acc[s.origin] = (acc[s.origin] || 0) + 1;
            return acc;
          }, {}),
          totalOpeningBalance: suppliers?.reduce((sum, s) => sum + (Number(s.opening_balance) || 0), 0) || 0
        },
        contracts: {
          total: supplierContracts?.length || 0,
          active: supplierContracts?.filter(c => c.status === 'Active').length || 0,
          voided: supplierContracts?.filter(c => c.status === 'Voided').length || 0,
          totalExpected: supplierContracts?.filter(c => c.status === 'Active').reduce((sum, c) => sum + (Number(c.kilograms_expected) || 0), 0) || 0,
          totalAdvancesGiven: supplierContracts?.reduce((sum, c) => sum + (Number(c.advance_given) || 0), 0) || 0
        },
        advances: {
          total: supplierAdvances?.length || 0,
          open: supplierAdvances?.filter(a => !a.is_closed).length || 0,
          closed: supplierAdvances?.filter(a => a.is_closed).length || 0,
          totalOutstanding: supplierAdvances?.filter(a => !a.is_closed).reduce((sum, a) => sum + (Number(a.outstanding_ugx) || 0), 0) || 0,
          totalAmount: supplierAdvances?.reduce((sum, a) => sum + (Number(a.amount_ugx) || 0), 0) || 0
        },
        purchaseOrders: {
          total: purchaseOrders?.length || 0,
          byStatus: purchaseOrders?.reduce((acc: any, po) => {
            acc[po.status] = (acc[po.status] || 0) + 1;
            return acc;
          }, {}),
          totalAmount: purchaseOrders?.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0) || 0,
          totalQuantity: purchaseOrders?.reduce((sum, po) => sum + (Number(po.quantity) || 0), 0) || 0
        }
      },

      inventory: {
        firebase: {
          totalKilograms: coffeeRecords?.reduce((sum, record) => sum + (Number(record.kilograms) || 0), 0) || 0,
          totalRecords: coffeeRecords?.length || 0,
          byType: coffeeRecords?.reduce((acc: any, r) => {
            acc[r.coffee_type] = (acc[r.coffee_type] || 0) + Number(r.kilograms || 0);
            return acc;
          }, {})
        },
        supabase: {
          totalItems: inventoryItems?.length || 0,
          totalBags: inventoryItems?.reduce((sum, i) => sum + (Number(i.total_bags) || 0), 0) || 0,
          totalKilograms: inventoryItems?.reduce((sum, i) => sum + (Number(i.total_kilograms) || 0), 0) || 0,
          byType: inventoryItems?.reduce((acc: any, i) => {
            acc[i.coffee_type] = (acc[i.coffee_type] || 0) + Number(i.total_kilograms || 0);
            return acc;
          }, {}),
          byLocation: inventoryItems?.reduce((acc: any, i) => {
            acc[i.location] = (acc[i.location] || 0) + Number(i.total_kilograms || 0);
            return acc;
          }, {})
        },
        movements: {
          total: inventoryMovements?.length || 0,
          byType: inventoryMovements?.reduce((acc: any, m) => {
            acc[m.movement_type] = (acc[m.movement_type] || 0) + 1;
            return acc;
          }, {}),
          totalQuantity: inventoryMovements?.reduce((sum, m) => sum + (Number(m.quantity_kg) || 0), 0) || 0
        }
      },

      sales: {
        transactions: {
          total: salesTransactions?.length || 0,
          last30Days: salesRecent?.length || 0,
          totalRevenue: salesTransactions?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0,
          revenueL30D: salesRecent?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0,
          totalWeight: salesTransactions?.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 0,
          avgPrice: salesTransactions?.length ? (salesTransactions.reduce((sum, s) => sum + (Number(s.unit_price) || 0), 0) / salesTransactions.length) : 0,
          byCustomer: salesTransactions?.reduce((acc: any, s) => {
            acc[s.customer] = (acc[s.customer] || 0) + Number(s.total_amount || 0);
            return acc;
          }, {})
        }
      },

      milling: {
        transactions: {
          total: millingTransactions?.length || 0,
          totalKgsHulled: millingTransactions?.reduce((sum, m) => sum + (Number(m.kgs_hulled) || 0), 0) || 0,
          totalRevenue: millingTransactions?.reduce((sum, m) => sum + (Number(m.total_amount) || 0), 0) || 0,
          totalPaid: millingTransactions?.reduce((sum, m) => sum + (Number(m.amount_paid) || 0), 0) || 0,
          totalBalance: millingTransactions?.reduce((sum, m) => sum + (Number(m.balance) || 0), 0) || 0,
          byCustomer: millingTransactions?.reduce((acc: any, m) => {
            acc[m.customer_name] = (acc[m.customer_name] || 0) + 1;
            return acc;
          }, {})
        }
      },

      finance: {
        expenses: {
          total: expenses?.length || 0,
          pending: expenses?.filter(e => e.status === 'pending').length || 0,
          approved: expenses?.filter(e => e.status === 'approved').length || 0,
          rejected: expenses?.filter(e => e.status === 'rejected').length || 0,
          totalAmount: expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0,
          pendingAmount: expenses?.filter(e => e.status === 'pending').reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0,
          byDepartment: expenses?.reduce((acc: any, e) => {
            acc[e.department] = (acc[e.department] || 0) + Number(e.amount || 0);
            return acc;
          }, {})
        },
        moneyRequests: {
          total: moneyRequests?.length || 0,
          pending: moneyRequests?.filter(m => m.status === 'pending').length || 0,
          approved: moneyRequests?.filter(m => m.status === 'approved').length || 0,
          totalAmount: moneyRequests?.reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0,
          pendingAmount: moneyRequests?.filter(m => m.status === 'pending').reduce((sum, m) => sum + (Number(m.amount) || 0), 0) || 0
        },
        payments: {
          total: paymentRecords?.length || 0,
          pending: paymentRecords?.filter(p => p.status === 'Pending').length || 0,
          completed: paymentRecords?.filter(p => p.status === 'Completed').length || 0,
          totalAmount: paymentRecords?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0,
          pendingAmount: paymentRecords?.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0,
          bySupplier: paymentRecords?.reduce((acc: any, p) => {
            acc[p.supplier] = (acc[p.supplier] || 0) + Number(p.amount || 0);
            return acc;
          }, {})
        },
        cashFlow: {
          totalInflow: (salesTransactions?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0) +
                      (millingTransactions?.reduce((sum, m) => sum + (Number(m.amount_paid) || 0), 0) || 0),
          totalOutflow: (paymentRecords?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0) +
                       (expenses?.filter(e => e.status === 'approved').reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0),
          netCashFlow: 0 // Will calculate below
        },
        archivedData: {
          archivedRequests: archivedRequests?.length || 0,
          archivedAmount: archivedRequests?.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || 0
        }
      },

      operations: {
        dailyTasks: {
          total: dailyTasks?.length || 0,
          byType: dailyTasks?.reduce((acc: any, t) => {
            acc[t.task_type] = (acc[t.task_type] || 0) + 1;
            return acc;
          }, {}),
          byDepartment: dailyTasks?.reduce((acc: any, t) => {
            acc[t.department] = (acc[t.department] || 0) + 1;
            return acc;
          }, {}),
          totalAmount: dailyTasks?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0
        },
        systemActivity: {
          auditLogs: auditLogs?.length || 0,
          deletionRequests: {
            total: deletionRequests?.length || 0,
            pending: deletionRequests?.filter(d => d.status === 'pending').length || 0,
            approved: deletionRequests?.filter(d => d.status === 'approved').length || 0,
            rejected: deletionRequests?.filter(d => d.status === 'rejected').length || 0
          }
        }
      }
    };

    // Calculate net cash flow
    dataSummary.finance.cashFlow.netCashFlow = 
      dataSummary.finance.cashFlow.totalInflow - dataSummary.finance.cashFlow.totalOutflow;

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
            content: 'You are an expert business risk analyst specializing in coffee trading and processing operations. Your task is to perform a comprehensive, data-driven risk assessment by analyzing operational data from ALL departments and systems. Identify patterns, anomalies, inefficiencies, and vulnerabilities that could impact the business.'
          },
          {
            role: 'user',
            content: `Generate an EXTREMELY DETAILED risk assessment report for a coffee trading and processing company. 

You have access to comprehensive operational data covering ALL business areas:

${JSON.stringify(dataSummary, null, 2)}

ANALYSIS REQUIREMENTS:

Conduct a thorough investigation of EVERY department and operational area:

## 1. HUMAN RESOURCES & WORKFORCE RISKS
- Analyze system users vs company employees discrepancies
- Review staffing distribution across departments
- Assess salary structures, overtime patterns, and compensation risks
- Identify inactive/disabled accounts and access control issues
- Evaluate training account usage and employee onboarding
- Check for department understaffing or overstaffing
- Review role distribution and permission management

## 2. PROCUREMENT & SUPPLIER RISKS
- Evaluate supplier concentration and origin diversification
- Analyze contract fulfillment and advance recovery rates
- Assess outstanding supplier advances and recovery risks
- Review purchase order completion rates and delays
- Identify supplier payment patterns and credit exposure
- Evaluate advance-to-delivery ratios
- Check for contract voidance patterns

## 3. INVENTORY & STOCK MANAGEMENT RISKS
- Compare Firebase vs Supabase inventory discrepancies
- Analyze inventory turnover rates by coffee type
- Assess stock levels vs sales velocity
- Review inventory movement patterns (in/out)
- Identify slow-moving or dead stock
- Evaluate storage location distribution
- Check for inventory data quality issues

## 4. SALES & REVENUE RISKS
- Analyze sales trends (last 30 days vs historical)
- Review customer concentration and dependency
- Assess pricing consistency and margin patterns
- Evaluate sales transaction completion rates
- Identify revenue fluctuations and seasonal patterns
- Check average transaction values and volumes
- Review customer payment behaviors

## 5. MILLING & PROCESSING RISKS
- Analyze milling transaction volumes and trends
- Review customer balance accumulation patterns
- Assess collection rates and outstanding balances
- Evaluate processing capacity utilization
- Identify customer payment reliability issues

## 6. FINANCIAL & CASH FLOW RISKS
- Calculate and analyze net cash flow position
- Review pending payment accumulations by department
- Assess expense approval rates and rejection patterns
- Evaluate money request patterns and amounts
- Analyze payment timing and cash cycle efficiency
- Review department-wise spending patterns
- Identify budget overruns or unusual expenses
- Check archived data for historical patterns

## 7. OPERATIONAL EFFICIENCY RISKS
- Review daily task completion rates by department
- Analyze deletion request patterns (what's being deleted and why)
- Evaluate audit log activity for anomalies
- Assess system usage patterns across departments
- Identify operational bottlenecks or delays
- Review cross-department workflow efficiency

## 8. DATA INTEGRITY & COMPLIANCE RISKS
- Identify data quality issues across systems
- Review deletion request justifications
- Assess audit trail completeness
- Evaluate record-keeping practices
- Check for data synchronization issues (Firebase vs Supabase)

FOR EACH RISK IDENTIFIED:
1. **Risk Category & Title**
2. **Risk Level**: Critical/High/Medium/Low (with justification based on data)
3. **Affected Departments**: List all impacted areas
4. **Data Evidence**: Cite specific metrics from the data
5. **Business Impact**: Quantify potential financial/operational impact
6. **Root Causes**: Identify underlying issues (3-5 points)
7. **Mitigation Strategies**: Provide actionable recommendations (5-7 specific steps)
8. **Priority**: 1 (Immediate) to 5 (Monitor) with timeline
9. **Key Metrics to Monitor**: Specific KPIs to track

REPORT STRUCTURE:

**Date:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
**Prepared for:** Management Board
**Prepared by:** ${userName}
**Data Period:** ${last60Days.toLocaleDateString()} to ${now.toLocaleDateString()}

## EXECUTIVE SUMMARY
[2-3 paragraph overview highlighting the most critical findings]

## CRITICAL RISKS (Immediate Action Required)
[Top 3-5 most severe risks requiring urgent attention]

## DEPARTMENTAL RISK ANALYSIS
[Detailed analysis for each department]

## CROSS-FUNCTIONAL RISKS
[Risks affecting multiple departments]

## TREND ANALYSIS
[Patterns identified in the data]

## RECOMMENDED ACTION PLAN
[Prioritized list of actions with owners and timelines]

${previousAssessments && previousAssessments.length > 0 ? `
HISTORICAL CONTEXT:
You have ${previousAssessments.length} previous assessment(s) from: ${previousAssessments.map((a: any) => new Date(a.generated_at).toLocaleDateString()).join(', ')}

CRITICAL INSTRUCTIONS FOR HISTORICAL ANALYSIS:
1. **Compare and Contrast**: Identify what has CHANGED since the last assessment
2. **Track Progress**: Note improvements or deteriorations in previously identified risks
3. **New Risks Only**: Focus heavily on NEW risks that weren't present before
4. **Trend Identification**: Highlight emerging patterns across assessments
5. **Avoid Repetition**: Don't rehash old risks unless their severity has significantly changed

Previous Assessment Summary:
${previousAssessments.map((a: any, idx: number) => `
Assessment ${idx + 1} (${new Date(a.generated_at).toLocaleDateString()}):
${a.assessment_content.substring(0, 500)}...
`).join('\n')}
` : 'This is the FIRST risk assessment for this organization. Establish baseline metrics and risk profiles.'}

Make this report COMPREHENSIVE, DATA-DRIVEN, and ACTIONABLE. Use specific numbers and percentages from the data to support every risk identification.`
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
