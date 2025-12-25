import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendSMS(phone: string, message: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  // Format phone number
  let formattedPhone = phone.toString().trim();
  if (!formattedPhone.startsWith('+')) {
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+256' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('256')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+256' + formattedPhone;
    }
  }
  
  // Handle multiple phone numbers (take first one)
  if (formattedPhone.includes('/')) {
    formattedPhone = formattedPhone.split('/')[0].trim();
  }

  try {
    const response = await fetch('https://yoolasms.com/api/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
        api_key: apiKey
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('YOOLA_SMS_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { target, staffMessage, supplierMessage } = await req.json();

    const results = {
      staffSent: 0,
      staffFailed: 0,
      supplierSent: 0,
      supplierFailed: 0,
      errors: [] as string[]
    };

    // Send to staff if requested
    if (target === 'staff' || target === 'both') {
      const { data: employees } = await supabase
        .from('employees')
        .select('name, phone')
        .eq('status', 'active')
        .not('phone', 'is', null);

      if (employees) {
        for (const employee of employees) {
          if (employee.phone) {
            const result = await sendSMS(employee.phone, staffMessage, apiKey);
            if (result.success) {
              results.staffSent++;
              console.log(`✅ Staff SMS sent to ${employee.name}`);
            } else {
              results.staffFailed++;
              results.errors.push(`Staff ${employee.name}: ${result.error}`);
            }
          }
        }
      }
    }

    // Send to suppliers if requested
    if (target === 'suppliers' || target === 'both') {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('name, phone')
        .not('phone', 'is', null);

      if (suppliers) {
        for (const supplier of suppliers) {
          if (supplier.phone) {
            const result = await sendSMS(supplier.phone, supplierMessage, apiKey);
            if (result.success) {
              results.supplierSent++;
              console.log(`✅ Supplier SMS sent to ${supplier.name}`);
            } else {
              results.supplierFailed++;
              results.errors.push(`Supplier ${supplier.name}: ${result.error}`);
            }
          }
        }
      }
    }

    console.log('Christmas SMS results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Christmas messages sent! Staff: ${results.staffSent} sent, ${results.staffFailed} failed. Suppliers: ${results.supplierSent} sent, ${results.supplierFailed} failed.`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending Christmas SMS:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
