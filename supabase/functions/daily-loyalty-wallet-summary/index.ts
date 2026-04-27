import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;
const MAX_PREVIEW_RECIPIENTS = 20;

const formatAmount = (value: number) => Math.round(Math.abs(value || 0)).toLocaleString('en-US');

const getYesterdayWindow = () => {
  const kampalaNow = new Date(Date.now() + KAMPALA_OFFSET_MS);
  const todayStartUtcMs = Date.UTC(
    kampalaNow.getUTCFullYear(),
    kampalaNow.getUTCMonth(),
    kampalaNow.getUTCDate(),
  ) - KAMPALA_OFFSET_MS;

  return {
    start: new Date(todayStartUtcMs - DAY_MS),
    end: new Date(todayStartUtcMs),
  };
};

const buildSummaryMessage = (loyalty: number, bonus: number, deductions: number, wallet: number) => {
  const primary = `Great Agro: Yday UGX L${formatAmount(loyalty)} B${formatAmount(bonus)} D${formatAmount(deductions)}. Wallet ${formatAmount(wallet)}.`;
  if (primary.length <= 160) return primary;

  const fallback = `GA: Yday L${formatAmount(loyalty)} B${formatAmount(bonus)} D${formatAmount(deductions)}. Wallet ${formatAmount(wallet)}.`;
  return fallback.slice(0, 160);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);
    const limit = Math.max(1, Math.min(Number(body?.limit) || 0, MAX_PREVIEW_RECIPIENTS));
    const { start, end } = getYesterdayWindow();

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, auth_user_id, name, email, phone, disabled, is_training_account, status')
      .eq('status', 'Active')
      .not('phone', 'is', null)
      .not('email', 'is', null);

    if (employeesError) {
      throw new Error(`Failed to load employees: ${employeesError.message}`);
    }

    const recipients = (employees || [])
      .filter((employee) => !employee.disabled && !employee.is_training_account)
      .filter((employee) => employee.email !== 'operations@greatpearlcoffee.com');

    const batch = dryRun ? recipients.slice(0, limit) : recipients;

    let processed = 0;
    let sent = 0;
    let failed = 0;
    const previews: Array<Record<string, unknown>> = [];
    const errors: Array<Record<string, string>> = [];

    for (const employee of batch) {
      try {
        const { data: unifiedUserId } = await supabase.rpc('get_unified_user_id', {
          input_email: employee.email,
        });

        const resolvedUserId = unifiedUserId || employee.auth_user_id || employee.id;
        if (!resolvedUserId) {
          throw new Error('No wallet user ID found');
        }

        const { data: balanceData, error: balanceError } = await supabase.rpc('get_user_balance_safe', {
          user_email: employee.email,
        });

        if (balanceError) {
          throw new Error(`Balance lookup failed: ${balanceError.message}`);
        }

        const walletBalance = Number(balanceData?.[0]?.wallet_balance) || 0;

        const { data: ledgerEntries, error: ledgerError } = await supabase
          .from('ledger_entries')
          .select('amount, entry_type')
          .eq('user_id', resolvedUserId)
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString());

        if (ledgerError) {
          throw new Error(`Ledger lookup failed: ${ledgerError.message}`);
        }

        const entries = ledgerEntries || [];
        const loyalty = entries
          .filter((entry) => entry.entry_type === 'LOYALTY_REWARD')
          .reduce((sum, entry) => sum + Number(entry.amount), 0);
        const bonus = entries
          .filter((entry) => entry.entry_type === 'BONUS')
          .reduce((sum, entry) => sum + Number(entry.amount), 0);
        const deductions = entries
          .filter((entry) => Number(entry.amount) < 0)
          .reduce((sum, entry) => sum + Math.abs(Number(entry.amount)), 0);

        const message = buildSummaryMessage(loyalty, bonus, deductions, walletBalance);

        if (dryRun) {
          previews.push({
            employee: employee.name,
            phone: employee.phone,
            loyalty,
            bonus,
            deductions,
            walletBalance,
            message,
            length: message.length,
          });
          processed += 1;
          continue;
        }

        // Email notification (primary channel - replaces SMS to save credits)
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'daily-wallet-summary',
            recipientEmail: employee.email,
            idempotencyKey: `wallet-summary-${employee.email}-${end.toISOString().split('T')[0]}`,
            templateData: {
              employeeName: employee.name,
              loyaltyEarned: Math.round(loyalty).toLocaleString(),
              bonusEarned: Math.round(bonus).toLocaleString(),
              deductions: Math.round(deductions).toLocaleString(),
              walletBalance: Math.round(walletBalance).toLocaleString(),
              summaryDate: 'Yesterday',
            },
          },
        });

        processed += 1;
        sent += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? (error as Error).message : 'Unknown error';
        errors.push({ employee: employee.name, error: message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        yesterday_start: start.toISOString(),
        yesterday_end: end.toISOString(),
        total_recipients: recipients.length,
        processed,
        sent,
        failed,
        previews,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? (error as Error).message : 'Unknown error';
    console.error('daily-loyalty-wallet-summary error:', message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
