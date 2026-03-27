import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gosenteApiKey = Deno.env.get("GOSENTEPAY_API_KEY");
    const gosenteSecretKey = Deno.env.get("GOSENTEPAY_SECRET_KEY");

    if (!serviceKey || !gosenteApiKey || !gosenteSecretKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount } = await req.json();
    const numAmount = Number(amount);

    if (!Number.isFinite(numAmount) || numAmount < 2000 || numAmount > 100000) {
      return new Response(JSON.stringify({ error: "Amount must be between UGX 2,000 and UGX 100,000" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user email
    const userEmail = user.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "No email on account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check eligibility via RPC
    const { data: eligibility, error: eligError } = await supabase
      .rpc('get_instant_withdrawal_eligibility', { p_user_email: userEmail });

    if (eligError) {
      console.error("Eligibility check error:", eligError);
      return new Response(JSON.stringify({ error: "Failed to check eligibility" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!eligibility?.eligible) {
      return new Response(JSON.stringify({ error: eligibility?.reason || "Not eligible for instant withdrawal" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (numAmount > (eligibility.max_instant_amount || 0)) {
      return new Response(JSON.stringify({
        error: `Maximum instant withdrawal amount is UGX ${Number(eligibility.max_instant_amount).toLocaleString()}`,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const depositPhone = eligibility.deposit_phone;
    if (!depositPhone) {
      return new Response(JSON.stringify({ error: "No deposit phone number found. You must deposit first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unified user ID
    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { input_email: userEmail });
    const userId = unifiedId || user.id;

    // Verify overall wallet balance
    const { data: balanceData } = await supabase.rpc('get_user_balance_safe', { user_email: userEmail });
    const walletBalance = Number(balanceData?.[0]?.wallet_balance || 0);
    if (walletBalance < numAmount) {
      return new Response(JSON.stringify({ error: "Insufficient overall wallet balance" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone
    let cleanPhone = depositPhone.replace(/\+/g, "").replace(/\s/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = "256" + cleanPhone.slice(1);
    if (!cleanPhone.startsWith("256")) cleanPhone = "256" + cleanPhone;

    const ref = `INSTANT-WD-${Date.now()}`;

    // Create tracking record
    const { data: instantRecord, error: insertErr } = await supabase
      .from('instant_withdrawals')
      .insert({
        user_id: userId,
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

    // Trigger GosentePay payout
    console.log(`Instant withdrawal: ${cleanPhone}, UGX ${numAmount}, ref: ${ref}`);

    const payoutResponse = await fetch("https://api.gosentepay.com/v1/withdraw_collections.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": gosenteApiKey,
      },
      body: JSON.stringify({
        secret_key: gosenteSecretKey,
        currency: "UGX",
        amount: String(numAmount),
        emailAddress: userEmail,
        phone: cleanPhone,
        reason: `Instant withdrawal - ${ref}`,
      }),
    });

    const payoutData = await payoutResponse.json().catch(() => ({}));
    console.log("GosentePay response:", JSON.stringify(payoutData));

    const innerData = payoutData.data || payoutData;
    const isSuccess =
      (innerData.status === 200 || innerData.status === 202 || innerData.code === 200 || innerData.code === 202) &&
      (innerData.message?.toLowerCase().includes("accepted") || innerData.message?.toLowerCase().includes("success") || payoutData.status === "success");

    if (!isSuccess) {
      // Mark as failed
      await supabase.from('instant_withdrawals')
        .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', instantRecord.id);

      return new Response(JSON.stringify({
        error: "Payout failed",
        details: innerData.message || `HTTP ${payoutResponse.status}`,
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txRef = payoutData.txRef || ref;

    // Deduct from wallet via ledger
    const ledgerRef = `INSTANT-WD-${instantRecord.id}`;
    await supabase.from('ledger_entries').insert({
      user_id: userId,
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

    // Deduct from GosentePay balance tracking
    const { data: currentBal } = await supabase
      .from('gosentepay_balance')
      .select('balance')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentBal) {
      const newBal = currentBal.balance - numAmount;
      await supabase.from('gosentepay_balance').update({
        balance: newBal,
        last_updated_by: 'System (Instant Withdrawal)',
        updated_at: new Date().toISOString(),
      }).order('updated_at', { ascending: false }).limit(1);

      await supabase.from('gosentepay_balance_log').insert({
        previous_balance: currentBal.balance,
        new_balance: newBal,
        change_amount: -numAmount,
        reason: `Instant withdrawal by ${userEmail} - ${ref}`,
        changed_by: 'System',
      });
    }

    // Send SMS notification
    try {
      const smsApiKey = Deno.env.get("YOOLA_SMS_API_KEY");
      if (smsApiKey) {
        let smsPhone = cleanPhone;
        if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;

        // Get employee name
        const { data: emp } = await supabase
          .from('employees')
          .select('name')
          .eq('email', userEmail)
          .maybeSingle();

        const name = emp?.name || userEmail;
        const msg = `${name}, UGX ${numAmount.toLocaleString()} instant withdrawal sent to ${cleanPhone}. Ref: ${txRef}. Great Pearl Coffee`;

        await fetch("https://yoolasms.com/api/v1/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: smsPhone, message: msg, api_key: smsApiKey }),
        });
      }
    } catch (smsErr) {
      console.error("SMS error (non-blocking):", smsErr);
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Instant withdrawal sent successfully!",
      ref: txRef,
      phone: cleanPhone,
      amount: numAmount,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Instant withdrawal error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
