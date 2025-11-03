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
    const { newRequest, userEmail } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch user's recent expense requests (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentRequests, error } = await supabaseClient
      .from('approval_requests')
      .select('*')
      .eq('requestedby', userEmail)
      .in('type', ['Expense Request', 'Requisition', 'Employee Salary Request', 'Salary Request'])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching recent requests:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recent requests' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no recent requests, no duplicates possible
    if (!recentRequests || recentRequests.length === 0) {
      return new Response(
        JSON.stringify({ isDuplicate: false, confidence: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to analyze for duplicates
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const prompt = `You are an expense request duplicate detector. Analyze if the new expense request is a duplicate or very similar to any recent requests.

New Request:
- Type: ${newRequest.type}
- Title: ${newRequest.title}
- Description: ${newRequest.description}
- Amount: ${newRequest.amount} UGX
- Date: ${new Date().toISOString()}

Recent Requests (last 30 days):
${recentRequests.map((req: any, idx: number) => `
${idx + 1}. Type: ${req.type}
   Title: ${req.title}
   Description: ${req.description}
   Amount: ${req.amount} UGX
   Date: ${req.created_at}
   Status: ${req.status}
`).join('\n')}

Analyze if the new request is:
1. An exact or near duplicate (same/similar description, amount, and timing)
2. A potential duplicate (similar purpose but different details)
3. Legitimate new request (clearly different purpose/timing)

Consider:
- Similar descriptions or purposes
- Similar amounts (within 20% difference)
- Timing (same day or consecutive days)
- Request status (pending requests are more concerning)

Respond with ONLY a JSON object in this exact format:
{
  "isDuplicate": true/false,
  "confidence": 0-100,
  "reason": "brief explanation",
  "matchedRequest": "title of matched request or null"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a duplicate expense detector. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiContent);
    
    // Parse AI response
    let result;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/) || aiContent.match(/```([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
      result = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: no duplicate detected if AI response is unparseable
      result = { isDuplicate: false, confidence: 0, reason: 'Unable to analyze', matchedRequest: null };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-duplicate-expense:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
