import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { yoPayout, normalizePhone } from "../_shared/yo-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!serviceKey || !Deno.env.get("YO_API_USERNAME") || !Deno.env.get("YO_API_PASSWORD")) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { amount, depositPhone } = await req.json();

    if (!amount || !depositPhone) {
      return new Response(JSON.stringify({ error: "Missing amount or depositPhone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 2000) {
      return new Response(JSON.stringify({ error: "Minimum withdrawal is UGX 2,000" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email
    const { data: userData } = await supabaseAuth.auth.getUser();
    const userEmail = userData?.user?.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "Could not determine user email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unified user ID
    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { input_email: userEmail });
    const resolvedUserId = unifiedId || userId;

    // Verify wallet balance
    const { data: balanceData } = await supabase.rpc('get_user_balance_safe', { user_email: userEmail });
    const walletBalance = Number(balanceData?.[0]?.wallet_balance || 0);
    if (walletBalance < numAmount) {
      return new Response(JSON.stringify({ error: "Insufficient overall wallet balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = normalizePhone(depositPhone);
    const ref = `INSTANT-WD-${Date.now()}`;

    // Create tracking record
    const { data: instantRecord, error: insertErr } = await supabase
      .from('instant_withdrawals')
      .insert({
        user_id: resolvedUserId,
        amount: numAmount,
        phone_number: cleanPhone,
        payout_ref: ref,
        payout_status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create withdrawal record" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger Yo Payments payout
    console.log(`Instant withdrawal: ${cleanPhone}, UGX ${numAmount}, ref: ${ref}`);

    const result = await yoPayout({
      phone: cleanPhone,
      amount: numAmount,
      narrative: `Instant withdrawal - ${ref}`,
    });

    if (!result.success) {
      await supabase.from('instant_withdrawals')
        .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', instantRecord.id);

      return new Response(JSON.stringify({
        error: "Payout failed",
        details: result.errorMessage || "Yo Payments rejected the transaction",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txRef = result.transactionRef || ref;

    // Deduct from wallet via ledger
    const ledgerRef = `INSTANT-WD-${instantRecord.id}`;
    await supabase.from('ledger_entries').insert({
      user_id: resolvedUserId,
      entry_type: 'WITHDRAWAL',
      amount: -numAmount,
      reference: ledgerRef,
      source_category: 'WITHDRAWAL',
      metadata: {
        type: 'instant_withdrawal',
        phone: cleanPhone,
        payout_ref: txRef,
        instant_withdrawal_id: instantRecord.id,
      },
    });

    // Update tracking record
    await supabase.from('instant_withdrawals')
      .update({
        payout_status: 'success',
        payout_ref: txRef,
        ledger_reference: ledgerRef,
        completed_at: new Date().toISOString(),
      })
      .eq('id', instantRecord.id);

    // Send SMS
    const yoolaSmsApiKey = Deno.env.get("YOOLA_SMS_API_KEY");
    if (yoolaSmsApiKey) {
      const { data: emp } = await supabase
        .from('employees')
        .select('name, phone')
        .eq('email', userEmail)
        .maybeSingle();

      if (emp?.phone) {
        let smsPhone = emp.phone.replace(/\D/g, "");
        if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
        else if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
        else if (!smsPhone.startsWith("+")) smsPhone = "+256" + smsPhone;

        try {
          await fetch("https://yoolasms.com/api/v1/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: smsPhone,
              message: `Dear ${emp.name}, UGX ${numAmount.toLocaleString()} has been sent to ${depositPhone} from your wallet. Ref: ${txRef}. Great Agro Coffee.`,
              api_key: yoolaSmsApiKey,
            }),
          });
        } catch (smsErr) {
          console.error("SMS error:", smsErr);
        }
      }
    }

    // Send email notification
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'instant-withdrawal',
          recipientEmail: userEmail,
          data: {
            amount: String(numAmount),
            phone: depositPhone,
            reference: txRef,
            date: new Date().toLocaleDateString('en-UG', { dateStyle: 'full' }),
          },
        },
      });
    } catch (emailErr) {
      console.error("Email error:", emailErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Instant withdrawal processed successfully via Yo Payments",
      ref: txRef,
      amount: numAmount,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Instant withdrawal error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
