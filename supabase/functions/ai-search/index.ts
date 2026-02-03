import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  userEmail: string;
  userPermissions: string[];
  userDepartment: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, userEmail, userPermissions, userDepartment }: SearchRequest = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [], suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔍 AI Search: "${query}" by ${userEmail} (${userDepartment})`);

    // Gather data from all tables based on permissions
    const searchData: Record<string, any[]> = {};
    const hasFullAccess = userPermissions.includes('*') || userPermissions.includes('Administration');
    const hasFinance = hasFullAccess || userPermissions.some(p => p.includes('Finance'));
    const hasStore = hasFullAccess || userPermissions.some(p => p.includes('Store'));
    const hasQuality = hasFullAccess || userPermissions.some(p => p.includes('Quality'));
    const hasHR = hasFullAccess || userPermissions.some(p => p.includes('Human Resources'));
    const hasSales = hasFullAccess || userPermissions.some(p => p.includes('Sales'));
    const hasEUDR = hasFullAccess || userPermissions.some(p => p.includes('EUDR') || p.includes('Store'));

    // Run parallel searches based on permissions
    const searchPromises: Promise<void>[] = [];

    // Suppliers - everyone can see
    searchPromises.push(
      supabase
        .from('suppliers')
        .select('id, name, code, phone, origin, status')
        .or(`name.ilike.%${query}%,code.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(15)
        .then(({ data }) => { if (data?.length) searchData.suppliers = data; })
    );

    // Coffee Records - everyone
    searchPromises.push(
      supabase
        .from('coffee_records')
        .select('id, batch_number, supplier_name, kilograms, bags, coffee_type, date, status')
        .or(`batch_number.ilike.%${query}%,supplier_name.ilike.%${query}%`)
        .limit(15)
        .then(({ data }) => { if (data?.length) searchData.coffee_records = data; })
    );

    // Employees - everyone can see basic info
    searchPromises.push(
      supabase
        .from('employees')
        .select('id, name, position, department, employee_id, email')
        .or(`name.ilike.%${query}%,employee_id.ilike.%${query}%,department.ilike.%${query}%,position.ilike.%${query}%`)
        .limit(15)
        .then(({ data }) => { if (data?.length) searchData.employees = data; })
    );

    // EUDR Documents
    if (hasEUDR) {
      searchPromises.push(
        supabase
          .from('eudr_documents')
          .select('id, batch_number, coffee_type, total_kilograms, status, date')
          .or(`batch_number.ilike.%${query}%,coffee_type.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.eudr_documents = data; })
      );
    }

    // Finance - Payment Records
    if (hasFinance) {
      searchPromises.push(
        supabase
          .from('payment_records')
          .select('id, batch_number, supplier, amount, status, date, amount_paid')
          .or(`batch_number.ilike.%${query}%,supplier.ilike.%${query}%,status.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.payment_records = data; })
      );

      searchPromises.push(
        supabase
          .from('approval_requests')
          .select('id, title, requestedby, amount, status, type, created_at, department')
          .or(`title.ilike.%${query}%,requestedby.ilike.%${query}%,type.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.approval_requests = data; })
      );

      searchPromises.push(
        supabase
          .from('money_requests')
          .select('id, reason, amount, status, request_type, employee_name, created_at')
          .or(`reason.ilike.%${query}%,employee_name.ilike.%${query}%,request_type.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.money_requests = data; })
      );
    }

    // Quality Assessments
    if (hasQuality) {
      searchPromises.push(
        supabase
          .from('quality_assessments')
          .select('id, batch_number, moisture, status, created_at')
          .ilike('batch_number', `%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.quality_assessments = data; })
      );
    }

    // Sales
    if (hasSales) {
      searchPromises.push(
        supabase
          .from('sales_transactions')
          .select('id, customer, weight, total_amount, coffee_type, date, truck_details')
          .or(`customer.ilike.%${query}%,coffee_type.ilike.%${query}%,truck_details.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.sales_transactions = data; })
      );
    }

    // Inventory
    if (hasStore) {
      searchPromises.push(
        supabase
          .from('inventory_batches')
          .select('id, batch_code, coffee_type, total_kilograms, remaining_kilograms, status')
          .or(`batch_code.ilike.%${query}%,coffee_type.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.inventory_batches = data; })
      );

      searchPromises.push(
        supabase
          .from('store_records')
          .select('id, batch_number, supplier_name, quantity_kg, transaction_date, reference_number')
          .or(`batch_number.ilike.%${query}%,supplier_name.ilike.%${query}%,reference_number.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.store_records = data; })
      );
    }

    // HR - Overtime
    if (hasHR) {
      searchPromises.push(
        supabase
          .from('overtime_awards')
          .select('id, reference_number, employee_name, employee_email, amount, status')
          .or(`reference_number.ilike.%${query}%,employee_name.ilike.%${query}%,employee_email.ilike.%${query}%`)
          .limit(15)
          .then(({ data }) => { if (data?.length) searchData.overtime_awards = data; })
      );
    }

    await Promise.all(searchPromises);

    console.log(`📊 Found data in tables:`, Object.keys(searchData).join(', '));

    // Use AI to analyze results and provide intelligent suggestions
    const aiPrompt = `You are a search assistant for a coffee trading company management system. 
The user searched for: "${query}"
User's department: ${userDepartment}
User's permissions: ${userPermissions.join(', ')}

Here is the data found across the system:
${JSON.stringify(searchData, null, 2)}

Analyze the search results and return a JSON response with:
1. "results" - An array of the most relevant results, each with:
   - id: the record ID
   - type: one of (supplier, batch, employee, payment, expense, quality, eudr, sale, inventory, overtime)
   - title: a clear title for the result
   - subtitle: helpful context (amount, date, status, etc.)
   - navigateTo: the appropriate URL path to view this item
   - department: which department this belongs to
   - module: the specific module name
   - relevance: a score from 0-100 indicating how relevant this is to the search
   
2. "suggestions" - An array of 2-3 smart suggestions based on what the user might be looking for:
   - text: the suggestion text
   - action: a suggested search query or navigation path

Prioritize results that:
- Match the user's department first
- Are exact or close matches to the query
- Have recent dates
- Are in active/pending status

Return ONLY valid JSON, no markdown or explanation.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a search results analyzer. Return only valid JSON." },
          { role: "user", content: aiPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        console.error("AI rate limited");
        // Fallback to basic results without AI
        return new Response(JSON.stringify({ 
          results: formatBasicResults(searchData, query),
          suggestions: [],
          fallback: true 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse AI response
    let parsedResults;
    try {
      // Clean up potential markdown code blocks
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResults = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", aiContent);
      parsedResults = { results: formatBasicResults(searchData, query), suggestions: [] };
    }

    console.log(`✅ AI Search complete: ${parsedResults.results?.length || 0} results`);

    return new Response(JSON.stringify(parsedResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Search error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Search failed",
      results: [],
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback function for basic results without AI
function formatBasicResults(searchData: Record<string, any[]>, query: string) {
  const results: any[] = [];
  
  if (searchData.suppliers) {
    searchData.suppliers.forEach(s => results.push({
      id: s.id,
      type: 'supplier',
      title: s.name,
      subtitle: `Code: ${s.code} | ${s.origin}`,
      navigateTo: `/suppliers?id=${s.id}`,
      department: 'Procurement',
      module: 'Suppliers',
      relevance: 80
    }));
  }
  
  if (searchData.coffee_records) {
    searchData.coffee_records.forEach(r => results.push({
      id: r.id,
      type: 'batch',
      title: `Batch: ${r.batch_number}`,
      subtitle: `${r.supplier_name} | ${r.kilograms}kg | ${r.coffee_type}`,
      navigateTo: `/quality-control`,
      department: 'Quality',
      module: 'Coffee Records',
      relevance: 85
    }));
  }
  
  if (searchData.eudr_documents) {
    searchData.eudr_documents.forEach(d => results.push({
      id: d.id,
      type: 'eudr',
      title: `EUDR: ${d.batch_number}`,
      subtitle: `${d.coffee_type} | ${d.total_kilograms}kg | ${d.status}`,
      navigateTo: `/eudr-documentation`,
      department: 'Store',
      module: 'EUDR Compliance',
      relevance: 90
    }));
  }
  
  if (searchData.employees) {
    searchData.employees.forEach(e => results.push({
      id: e.id,
      type: 'employee',
      title: e.name,
      subtitle: `${e.position} | ${e.department}`,
      navigateTo: `/human-resources`,
      department: 'HR',
      module: 'Employees',
      relevance: 75
    }));
  }
  
  if (searchData.payment_records) {
    searchData.payment_records.forEach(p => results.push({
      id: p.id,
      type: 'payment',
      title: `Payment: ${p.supplier}`,
      subtitle: `${p.batch_number} | ${p.amount?.toLocaleString()} UGX | ${p.status}`,
      navigateTo: `/finance`,
      department: 'Finance',
      module: 'Payments',
      relevance: 85
    }));
  }
  
  if (searchData.sales_transactions) {
    searchData.sales_transactions.forEach(s => results.push({
      id: s.id,
      type: 'sale',
      title: `Sale: ${s.customer}`,
      subtitle: `${s.weight}kg | ${s.total_amount?.toLocaleString()} UGX`,
      navigateTo: `/sales-marketing`,
      department: 'Sales',
      module: 'Sales',
      relevance: 80
    }));
  }
  
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, 20);
}
