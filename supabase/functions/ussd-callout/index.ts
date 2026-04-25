import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { normalizePhone } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log(`[USSD Callout] Incoming request:`, JSON.stringify(body));

    const { datetime, anumbermsisdn, signature, product_key } = body;

    if (!anumbermsisdn || !product_key) {
      return new Response(JSON.stringify({
        validated: false,
        message: "Missing required fields",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize the phone number from USSD
    const cleanPhone = normalizePhone(anumbermsisdn);

    // Build IPN URLs
    const successIpnUrl = `${supabaseUrl}/functions/v1/ussd-payment-success`;
    const failureIpnUrl = `${supabaseUrl}/functions/v1/ussd-payment-failure`;

    // ── product_key = 1: Pay Milling Fees ──
    if (product_key === "1" || product_key === 1) {
      // Look up customer by phone number
      const { data: customer, error: custError } = await supabase
        .from("milling_customers")
        .select("id, full_name, current_balance, phone")
        .or(`phone.eq.${cleanPhone},phone.eq.0${cleanPhone.slice(3)}`)
        .eq("status", "active")
        .maybeSingle();

      if (custError) {
        console.error(`[USSD Callout] DB error:`, custError);
        return new Response(JSON.stringify({
          validated: false,
          message: "System error. Please try again later.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!customer) {
        console.log(`[USSD Callout] No customer found for phone ${cleanPhone}`);
        return new Response(JSON.stringify({
          validated: false,
          message: "No account found for this phone number. Please contact Great Agro Coffee.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const balance = customer.current_balance || 0;

      if (balance <= 0) {
        return new Response(JSON.stringify({
          validated: true,
          message: `Customer Name: ${customer.full_name}\nYou have no outstanding milling fees.\nThank you!`,
          ussd_processor_params: {
            outstanding_milling_fees: "0",
            outstanding_milling_fees_formatted: "UGX 0",
            payment_external_reference: customer.id,
          },
          success_ipn_url: successIpnUrl,
          failure_ipn_url: failureIpnUrl,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a unique external reference for tracking
      const paymentRef = `USSD-MILL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const formattedBalance = `UGX ${balance.toLocaleString()}`;

      console.log(`[USSD Callout] Customer ${customer.full_name}, balance: ${balance}, ref: ${paymentRef}`);

      return new Response(JSON.stringify({
        validated: true,
        message: `Customer Name: ${customer.full_name}\nOutstanding Milling Fees: ${formattedBalance}\nSelect 1 to proceed to payment option`,
        ussd_processor_params: {
          outstanding_milling_fees: String(balance),
          outstanding_milling_fees_formatted: formattedBalance,
          payment_external_reference: paymentRef,
          customer_id: customer.id,
          customer_name: customer.full_name,
        },
        success_ipn_url: successIpnUrl,
        failure_ipn_url: failureIpnUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── product_key = 2: Other Services ──
    if (product_key === "2" || product_key === 2) {
      const paymentRef = `USSD-SVC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Load active services from DB so admins can manage the menu
      const { data: services, error: svcError } = await supabase
        .from("ussd_services")
        .select("service_key, name")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (svcError) {
        console.error(`[USSD Callout] Failed to load services:`, svcError);
      }

      const serviceList = (services && services.length > 0)
        ? services.map((s) => `${s.service_key}.${s.name}`).join("\n")
        : "1.Transport Recovery\n2.Pay Loaders\n3.Advance Recovery";

      return new Response(JSON.stringify({
        validated: true,
        message: "Select 1 to proceed to available services",
        ussd_processor_params: {
          other_services: serviceList,
          payment_external_reference: paymentRef,
        },
        success_ipn_url: successIpnUrl,
        failure_ipn_url: failureIpnUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unknown product_key
    return new Response(JSON.stringify({
      validated: false,
      message: "Invalid option selected. Please try again.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[USSD Callout] Error:", error);
    return new Response(JSON.stringify({
      validated: false,
      message: "System error. Please try again later.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
