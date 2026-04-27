import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Yo Payments helpers (inline to avoid import issues)
const YO_API_URL = "https://paymentsapi1.yo.co.ug/ybs/task.php";

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function getProviderCode(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("256") ? "0" + digits.slice(3) : digits;
  if (local.startsWith("077") || local.startsWith("078") || local.startsWith("076")) return "MTN";
  if (local.startsWith("070") || local.startsWith("075") || local.startsWith("074")) return "AIRTEL";
  return "MTN";
}

function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "256" + clean.slice(1);
  if (!clean.startsWith("256")) clean = "256" + clean;
  return clean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[instant-withdrawal] Request received");

    // Time restriction: Monday-Saturday, before 7 PM EAT (UTC+3)
    const nowEAT = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const dayOfWeek = nowEAT.getDay(); // 0=Sun, 6=Sat
    const hour = nowEAT.getHours();

    if (dayOfWeek === 0) {
      return respond(false, { error: "Instant withdrawals are not available on Sundays. Available Monday–Saturday before 7:00 PM." });
    }
    if (hour >= 19) {
      return respond(false, { error: "Instant withdrawals close at 7:00 PM daily. Please try again tomorrow morning." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const yoUsername = Deno.env.get("YO_API_USERNAME");
    const yoPassword = Deno.env.get("YO_API_PASSWORD");

    if (!serviceKey || !yoUsername || !yoPassword) {
      console.error("[instant-withdrawal] Missing server config");
      return respond(false, { error: "Server configuration missing" });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("x-supabase-authorization");
    console.log("[instant-withdrawal] Auth header present:", !!authHeader, "starts with Bearer:", authHeader?.startsWith("Bearer "));
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[instant-withdrawal] No valid auth header found. Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));
      return respond(false, { error: "Unauthorized" });
    }

    // Authenticate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[instant-withdrawal] Auth error:", userError?.message);
      return respond(false, { error: "Invalid token" });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    if (!userEmail) {
      return respond(false, { error: "Could not determine user email" });
    }

    console.log(`[instant-withdrawal] User: ${userEmail}`);

    const supabase = createClient(supabaseUrl, serviceKey);

    const { amount, depositPhone } = await req.json();
    console.log(`[instant-withdrawal] amount=${amount}, depositPhone=${depositPhone}`);

    if (!amount || !depositPhone) {
      return respond(false, { error: "Missing amount or depositPhone" });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 2000) {
      return respond(false, { error: "Minimum withdrawal is UGX 2,000" });
    }

    // Get unified user ID
    const { data: unifiedId } = await supabase.rpc('get_unified_user_id', { input_email: userEmail });
    const resolvedUserId = unifiedId || userId;

    // Verify wallet balance
    const { data: balanceData } = await supabase.rpc('get_user_balance_safe', { user_email: userEmail });
    const walletBalance = Number(balanceData?.[0]?.wallet_balance || 0);
    if (walletBalance < numAmount) {
      return respond(false, { error: `Insufficient wallet balance. Available: UGX ${walletBalance.toLocaleString()}` });
    }

    // Fetch employee name early for narrative
    const { data: empData } = await supabase
      .from('employees')
      .select('name, phone')
      .eq('email', userEmail)
      .maybeSingle();
    const employeeName = empData?.name || 'User';

    const cleanPhone = normalizePhone(depositPhone);
    const ref = `INSTANT-WD-${Date.now()}`;
    const remainingAfter = walletBalance - numAmount;

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
      console.error("[instant-withdrawal] Insert error:", insertErr);
      return respond(false, { error: "Failed to create withdrawal record: " + insertErr.message });
    }

    // Trigger Yo Payments payout - include employee name and balance in narrative
    console.log(`[instant-withdrawal] Sending UGX ${numAmount} to ${cleanPhone} via Yo Payments`);

    const narrative = `${employeeName} - Instant withdrawal ${ref} - Bal: UGX ${remainingAfter.toLocaleString()}`;

    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<AutoCreate>
  <Request>
    <APIUsername>${yoUsername}</APIUsername>
    <APIPassword>${yoPassword}</APIPassword>
    <Method>acwithdrawfunds</Method>
    <Amount>${numAmount}</Amount>
    <Account>${cleanPhone}</Account>
    <AccountProviderCode>${getProviderCode(cleanPhone)}</AccountProviderCode>
    <Narrative>${escapeXml(narrative)}</Narrative>
    <ExternalReference>${escapeXml(ref)}</ExternalReference>
  </Request>
</AutoCreate>`;

    const yoResponse = await fetch(YO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml", "Content-Transfer-Encoding": "text" },
      body: xmlBody,
    });
    const yoText = await yoResponse.text();
    console.log(`[instant-withdrawal] Yo response: ${yoText}`);

    const statusMatch = yoText.match(/<Status>(.*?)<\/Status>/);
    const txRefMatch = yoText.match(/<TransactionReference>(.*?)<\/TransactionReference>/);
    const statusMsgMatch = yoText.match(/<StatusMessage>(.*?)<\/StatusMessage>/);
    const txStatusMatch = yoText.match(/<TransactionStatus>(.*?)<\/TransactionStatus>/);
    const statusCodeMatch = yoText.match(/<StatusCode>(.*?)<\/StatusCode>/);
    const yoStatus = statusMatch?.[1]?.trim();
    const txStatus = txStatusMatch?.[1]?.trim();
    const statusCode = statusCodeMatch?.[1]?.trim();

    // StatusCode -22 means "extra authorization required" — treat as pending approval, not failure
    const isPendingAuthorization = statusCode === '-22';

    if (yoStatus !== "OK" && !isPendingAuthorization) {
      await supabase.from('instant_withdrawals')
        .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', instantRecord.id);

      return respond(false, {
        error: "Payout failed: " + (statusMsgMatch?.[1]?.trim() || "Yo Payments rejected the transaction"),
      });
    }

    // acwithdrawfunds can return SUCCEEDED, FAILED, or PENDING
    // StatusCode -22 always means pending authorization
    const isPending = isPendingAuthorization || txStatus === 'PENDING' || txStatus === 'INDETERMINATE';
    const isFailed = !isPendingAuthorization && txStatus === 'FAILED';

    if (isFailed) {
      await supabase.from('instant_withdrawals')
        .update({ payout_status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', instantRecord.id);
      return respond(false, { error: "Payout failed at mobile money provider" });
    }

    const txRef = txRefMatch?.[1]?.trim() || ref;
    const finalStatus = isPending ? 'pending_approval' : 'success';

    // Deduct from wallet via ledger (deduct immediately even if pending approval)
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
        yo_status: txStatus,
      },
    });

    // Update tracking record
    await supabase.from('instant_withdrawals')
      .update({
        payout_status: finalStatus,
        payout_ref: txRef,
        ledger_reference: ledgerRef,
        completed_at: isPending ? null : new Date().toISOString(),
      })
      .eq('id', instantRecord.id);

    console.log(`[instant-withdrawal] ${finalStatus}! Ref: ${txRef}`);

    // Send SMS (fire and forget)
    const yoolaSmsApiKey = Deno.env.get("YOOLA_SMS_API_KEY");
    if (yoolaSmsApiKey && empData?.phone) {
      let smsPhone = empData.phone.replace(/\D/g, "");
      if (smsPhone.startsWith("0")) smsPhone = "+256" + smsPhone.slice(1);
      else if (smsPhone.startsWith("256")) smsPhone = "+" + smsPhone;
      else if (!smsPhone.startsWith("+")) smsPhone = "+256" + smsPhone;

      try {
        await fetch("https://yoolasms.com/api/v1/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: smsPhone,
            message: `Dear ${employeeName}, UGX ${numAmount.toLocaleString()} has been sent to ${depositPhone} from your wallet. Ref: ${txRef}. Great Agro Coffee.`,
            api_key: yoolaSmsApiKey,
          }),
        });
      } catch (smsErr) {
        console.error("SMS error:", smsErr);
      }
    }

    // Calculate remaining balance for email
    let remainingBalance: number | undefined;
    try {
      const { data: balData } = await supabase
        .from('ledger_entries')
        .select('amount')
        .eq('user_id', resolvedUserId);
      if (balData) {
        remainingBalance = Math.max(0, balData.reduce((sum: number, e: any) => sum + Number(e.amount), 0));
      }
    } catch (e) {
      console.error("Balance calc error:", e);
    }

    // Send email confirmation (fire and forget)
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'instant-withdrawal-confirmation',
          recipientEmail: userEmail,
          idempotencyKey: `instant-wd-confirm-${instantRecord.id}`,
          templateData: {
            employeeName,
            amount: numAmount,
            phone: depositPhone,
            ref: txRef,
            status: finalStatus,
            remainingBalance,
          },
        },
      });
      console.log(`[instant-withdrawal] Email confirmation sent to ${userEmail}`);
    } catch (emailErr) {
      console.error("[instant-withdrawal] Email error (non-blocking):", emailErr);
    }

    // If pending authorization (-22), send emails to admins
    if (isPending) {
      const adminRecipients = [
        { name: 'Musema Wyclif', email: 'musemawyclif@greatpearlcoffee.com' },
        { name: 'Bwambale Denis', email: 'bwambaledenis@greatpearlcoffee.com' },
        { name: 'Fauza Kusa', email: 'fauzakusa@greatpearlcoffee.com' },
      ];

      for (const admin of adminRecipients) {
        try {
          // Yo Payments authorization email
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'withdrawal-auth-request',
              recipientEmail: admin.email,
              idempotencyKey: `wd-auth-${instantRecord.id}-${admin.email}`,
              templateData: {
                adminName: admin.name.split(' ')[0],
                employeeName,
                amount: numAmount,
                phone: cleanPhone,
                ref: txRef,
                walletBalance: remainingBalance ?? remainingAfter,
              },
            },
          });

          // System approval notification email
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'instant-withdrawal-approval-request',
              recipientEmail: admin.email,
              idempotencyKey: `wd-sys-approval-${instantRecord.id}-${admin.email}`,
              templateData: {
                approverName: admin.name.split(' ')[0],
                employeeName,
                amount: numAmount,
                phone: depositPhone,
                ref: txRef,
                remainingBalance,
                requestDate: new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
              },
            },
          });

          console.log(`[instant-withdrawal] Auth + system approval emails sent to ${admin.email}`);
        } catch (adminEmailErr) {
          console.error(`[instant-withdrawal] Admin email error for ${admin.email}:`, adminEmailErr);
        }
      }
    }

    return respond(true, {
      success: true,
      message: isPending 
        ? "Withdrawal request created successfully. Awaiting admin approval — you'll be notified once processed." 
        : "Instant withdrawal processed successfully",
      status: finalStatus,
      ref: txRef,
      amount: numAmount,
      phone: cleanPhone,
    });
  } catch (error) {
    console.error("[instant-withdrawal] Unhandled error:", error);
    return respond(false, {
      error: error instanceof Error ? (error as Error).message : "Unknown error",
    });
  }
});
