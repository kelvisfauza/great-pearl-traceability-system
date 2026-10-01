import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Profile photos live in a PRIVATE bucket, so emails can't use the raw
 * stored URL. Mint a long-lived signed URL (90 days) that stays valid for
 * the life of the award announcement email.
 */
async function signAvatarForEmail(
  client: any,
  storedValue: string | null | undefined,
): Promise<string> {
  const raw = (storedValue || "").trim();
  if (!raw) return "";
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    const m = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/profile_pictures\/([^?#]+)/i);
    if (!m) return "";
    path = decodeURIComponent(m[1]);
  } else {
    path = raw.replace(/^profile_pictures\//, "");
  }
  try {
    const { data } = await client.storage
      .from("profile_pictures")
      .createSignedUrl(path, 60 * 60 * 24 * 90);
    return data?.signedUrl || "";
  } catch (_e) {
    return "";
  }
}

async function pinWinners(
  supabase: any,
  winners: { employee_name: string; rank: number; department?: string }[],
  monthLabel: string,
) {
  if (!winners.length) return;
  const top = winners.sort((a, b) => a.rank - b.rank);
  const text =
    `EMPLOYEE OF THE MONTH — ${monthLabel}: ` +
    top
      .map((w) => `#${w.rank} ${w.employee_name}${w.department ? ` (${w.department})` : ""}`)
      .join("  •  ") +
    "  •  Congratulations from YEDA Coffee Company Limited!";
  // Un-pin previous EOTM banners so only the current one shows
  await supabase
    .from("marquee_announcements")
    .update({ is_active: false })
    .ilike("message", "EMPLOYEE OF THE MONTH%");
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);
  const { error: pinErr } = await supabase.from("marquee_announcements").insert({
    message: text,
    priority: "info",
    is_active: true,
    expires_at: expires.toISOString(),
    created_by_name: "System",
    created_by_email: "operations@greatpearlcoffee.com",
  });
  if (pinErr) console.error("Pin banner error:", pinErr);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const overrideMonth = Number(body?.month) || null;
    const overrideYear = Number(body?.year) || null;
    const announceOnly = body?.announceOnly === true;
    const setActive = body?.setActive !== false;

    const now = new Date();
    // We rank the PREVIOUS month's performance
    const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetMonth = overrideMonth || targetDate.getMonth() + 1; // 1-indexed
    const targetYear = overrideYear || targetDate.getFullYear();
    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const nextMonthDate = new Date(targetYear, targetMonth, 1);
    const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // Check if already processed this month
    const { data: existing } = await supabase
      .from("employee_of_the_month")
      .select("*")
      .eq("month", targetMonth)
      .eq("year", targetYear);

    // Announce-only mode: (re)send emails + pin banner for records that already exist
    if (announceOnly) {
      if (!existing || existing.length === 0) {
        return new Response(
          JSON.stringify({ error: `No records for ${monthNames[targetMonth]} ${targetYear}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      for (const rec of existing) {
        const emailAvatarUrl = await signAvatarForEmail(supabase, rec.employee_avatar_url);
        for (const to of [rec.employee_email, "operations@greatpearlcoffee.com"]) {
          if (!to) continue;
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "employee-of-the-month",
              recipientEmail: to,
              idempotencyKey: `eotm-announce-${rec.id}-${to}`,
              templateData: {
                employeeName: rec.employee_name,
                rank: String(rec.rank),
                month: monthNames[targetMonth],
                year: String(targetYear),
                reason: rec.reason || "Outstanding performance",
                bonusAmount: Number(rec.bonus_amount || 0).toLocaleString(),
                department: rec.department || "General",
                avatarUrl: emailAvatarUrl,
              },
            },
          });
        }
        await supabase
          .from("employee_of_the_month")
          .update({ email_sent: true })
          .eq("id", rec.id);
      }
      await pinWinners(
        supabase,
        existing.map((r: any) => ({ employee_name: r.employee_name, rank: r.rank, department: r.department })),
        `${monthNames[targetMonth]} ${targetYear}`,
      );
      return new Response(
        JSON.stringify({ message: `Announced & pinned ${existing.length} winner(s) for ${monthNames[targetMonth]} ${targetYear}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: `Already processed for ${monthNames[targetMonth]} ${targetYear}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deactivate previous winners
    if (setActive) {
      await supabase
        .from("employee_of_the_month")
        .update({ is_active: false })
        .eq("is_active", true);
    }

    // Attendance data is unreliable (records keyed by staff codes, only one
    // person matched by email), so ranking uses IT activity + daily reports:
    //  - login days (employee_login_tracker)
    //  - active days seen by location/presence monitor (location_tracking_logs)
    //  - daily reports + end-of-month report (employee_daily_reports)
    //  - completed daily tasks
    const lastDay = new Date(new Date(monthEnd).getTime() - 86400000).toISOString().slice(0, 10);
    // Monthly reports for the month may be filed in the first 3 days of the next month
    const reportGrace = new Date(new Date(monthEnd).getTime() + 2 * 86400000).toISOString().slice(0, 10);

    const [{ data: activeEmployees }, { data: loginData }, { data: locationData }, { data: reportData }, { data: taskData }] =
      await Promise.all([
        supabase.from("employees").select("id, name, email, avatar_url, department, position, role, status").eq("status", "Active"),
        supabase.from("employee_login_tracker").select("employee_email, login_date").gte("login_date", monthStart).lte("login_date", lastDay).limit(20000),
        supabase.from("location_tracking_logs").select("employee_email, tracking_date").gte("tracking_date", monthStart).lte("tracking_date", lastDay).limit(50000),
        supabase.from("employee_daily_reports").select("employee_email, report_date, report_data").gte("report_date", monthStart).lte("report_date", reportGrace).limit(5000),
        supabase.from("daily_tasks").select("completed_by, id").gte("date", monthStart).lt("date", monthEnd).limit(10000),
      ]);

    const EXCLUDED_ROLES = ["administrator", "super admin"];
    const empByEmail: Record<string, any> = {};
    for (const e of activeEmployees || []) {
      if (!e.email) continue;
      if (EXCLUDED_ROLES.includes(String(e.role || "").toLowerCase())) continue;
      empByEmail[String(e.email).toLowerCase()] = e;
    }

    type Score = {
      employee_id: string; employee_name: string; employee_email: string;
      loginDays: number; activeDays: number; dailyReports: number; monthlyReport: boolean;
      tasks: number; totalScore: number;
    };
    const scores: Record<string, Score> = {};
    for (const [key, e] of Object.entries(empByEmail)) {
      scores[key] = {
        employee_id: e.id, employee_name: e.name || "", employee_email: e.email,
        loginDays: 0, activeDays: 0, dailyReports: 0, monthlyReport: false, tasks: 0, totalScore: 0,
      };
    }
    const keyFor = (email?: string | null) => (email ? String(email).toLowerCase() : "");

    const distinctDays = (rows: any[] | null, dateCol: string) => {
      const m: Record<string, Set<string>> = {};
      for (const r of rows || []) {
        const k = keyFor(r.employee_email);
        if (!scores[k]) continue;
        (m[k] ||= new Set()).add(String(r[dateCol]));
      }
      return m;
    };
    for (const [k, s] of Object.entries(distinctDays(loginData, "login_date"))) scores[k].loginDays = s.size;
    for (const [k, s] of Object.entries(distinctDays(locationData, "tracking_date"))) scores[k].activeDays = s.size;

    const reportDays: Record<string, Set<string>> = {};
    for (const r of reportData || []) {
      const k = keyFor(r.employee_email);
      if (!scores[k]) continue;
      const isMonthly = r.report_data?.is_monthly_report === true || r.report_data?.is_monthly_report === "true";
      if (isMonthly) scores[k].monthlyReport = true;
      else if (String(r.report_date) <= lastDay) (reportDays[k] ||= new Set()).add(String(r.report_date));
    }
    for (const [k, s] of Object.entries(reportDays)) scores[k].dailyReports = s.size;

    for (const row of taskData || []) {
      const by = String(row.completed_by || "").toLowerCase();
      const match = Object.values(scores).find(
        (s) => s.employee_email.toLowerCase() === by || s.employee_name.toLowerCase() === by,
      );
      if (match) match.tasks++;
    }

    for (const emp of Object.values(scores)) {
      emp.totalScore =
        emp.loginDays * 5 +
        emp.activeDays * 3 +
        emp.dailyReports * 8 +
        (emp.monthlyReport ? 30 : 0) +
        emp.tasks * 2;
    }

    const ranked = Object.values(scores)
      .filter((e) => e.loginDays > 0 || e.dailyReports > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 2);

    if (ranked.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible employees found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Employee metadata already resolved via empByEmail
    const empMap: Record<string, any> = {};
    for (const r of ranked) {
      const canon = empByEmail[keyFor(r.employee_email)];
      if (canon) empMap[r.employee_id] = canon;
    }

    const bonusAmount = 50000;
    const winners = [];

    // Get auth user IDs for wallet crediting
    let authUsers: any[] | null = null;
    try {
      const res = await supabase.rpc("get_auth_users_by_emails", {
        emails: ranked.map((r) => r.employee_email),
      });
      authUsers = (res as any)?.data ?? null;
    } catch (_e) {
      authUsers = null;
    }

    // Fallback: query profiles or use employee_id mapping
    const authUserMap: Record<string, string> = {};
    if (authUsers) {
      for (const u of authUsers) {
        authUserMap[u.email] = u.id;
      }
    }

    for (let i = 0; i < ranked.length; i++) {
      const emp = ranked[i];
      const empInfo = empMap[emp.employee_id] || {};
      const rank = i + 1;

      const reason =
        rank === 1
          ? `Top performer: ${emp.presentDays} present days, ${emp.tasks} tasks, ${Math.round(emp.overtimeMinutes / 60)}hrs overtime.`
          : `Strong performance: ${emp.presentDays} present days, ${emp.tasks} tasks, reliable attendance.`;

      // Insert EOTM record
      const { error: eotmErr } = await supabase
        .from("employee_of_the_month")
        .upsert(
          {
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
            employee_email: emp.employee_email,
            employee_avatar_url: empInfo.avatar_url || null,
            department: empInfo.department || "General",
            position: empInfo.position || "Staff",
            rank,
            month: targetMonth,
            year: targetYear,
            reason,
            bonus_amount: bonusAmount,
            bonus_awarded: true,
            is_active: setActive,
            email_sent: true,
            created_by: "system-auto",
          },
          { onConflict: "employee_id,month,year" }
        );

      if (eotmErr) console.error("EOTM insert error:", eotmErr);

      // Credit wallet directly via ledger entry
      const authUserId = authUserMap[emp.employee_email];
      if (authUserId) {
        const ledgerRef = `EOTM-${monthNames[targetMonth].toUpperCase().slice(0, 3)}${targetYear}-RANK${rank}-${emp.employee_name.split(" ")[0].toUpperCase()}`;
        // Idempotency guard: skip if any EOTM ledger entry already exists for this user/month/year
        const monthTag = `EOTM-${monthNames[targetMonth].toUpperCase().slice(0, 3)}${targetYear}`;
        const { data: existing } = await supabase
          .from("ledger_entries")
          .select("id")
          .eq("user_id", authUserId)
          .ilike("reference", `${monthTag}%`)
          .limit(1);
        if (existing && existing.length > 0) {
          console.log(`Skipping duplicate EOTM credit for ${emp.employee_name} (${monthTag})`);
        } else {
          await supabase.from("ledger_entries").insert({
          user_id: authUserId,
          entry_type: "DEPOSIT",
          amount: bonusAmount,
          reference: ledgerRef,
          source_category: "SYSTEM_AWARD",
          metadata: {
            reason: `Employee of the Month Reward - ${monthNames[targetMonth]} ${targetYear} (#${rank} Rank)`,
            employee_name: emp.employee_name,
          },
        });
          console.log(`Wallet credited for ${emp.employee_name}: UGX ${bonusAmount}`);
        }
      } else {
        console.warn(`No auth user found for ${emp.employee_email}, wallet not credited`);
      }

      // Award bonus record
      await supabase.from("bonuses").insert({
        employee_id: emp.employee_id,
        employee_email: emp.employee_email,
        employee_name: emp.employee_name,
        amount: bonusAmount,
        reason: `Employee of the Month - ${monthNames[targetMonth]} ${targetYear} (#${rank} Rank)`,
        status: "allocated",
        allocated_by: "system-auto",
      });

      // Send recognition email
      const emailAvatarUrl = await signAvatarForEmail(supabase, empInfo.avatar_url);

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "employee-of-the-month",
          recipientEmail: emp.employee_email,
          idempotencyKey: `eotm-auto-${emp.employee_id}-${targetMonth}-${targetYear}`,
          templateData: {
            employeeName: emp.employee_name,
            rank: String(rank),
            month: monthNames[targetMonth],
            year: String(targetYear),
            reason,
            bonusAmount: Number(bonusAmount).toLocaleString(),
            department: empInfo.department || "General",
            avatarUrl: emailAvatarUrl,
          },
        },
      });

      // Send wallet credit confirmation email
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "allowance-credited",
          recipientEmail: emp.employee_email,
          idempotencyKey: `eotm-wallet-credit-${emp.employee_id}-${targetMonth}-${targetYear}`,
          templateData: {
            employeeName: emp.employee_name,
            allowanceType: "Employee of the Month Reward",
            amount: Number(bonusAmount).toLocaleString(),
            month: `${monthNames[targetMonth]} ${targetYear}`,
          },
        },
      });

      // Send copies to operations
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "employee-of-the-month",
          recipientEmail: "operations@greatpearlcoffee.com",
          idempotencyKey: `eotm-ops-${rank}-${targetMonth}-${targetYear}`,
          templateData: {
            employeeName: emp.employee_name,
            rank: String(rank),
            month: monthNames[targetMonth],
            year: String(targetYear),
            reason,
            bonusAmount: Number(bonusAmount).toLocaleString(),
            department: empInfo.department || "General",
            avatarUrl: emailAvatarUrl,
          },
        },
      });

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "allowance-credited",
          recipientEmail: "operations@greatpearlcoffee.com",
          idempotencyKey: `eotm-wallet-ops-${rank}-${targetMonth}-${targetYear}`,
          templateData: {
            employeeName: emp.employee_name,
            allowanceType: "Employee of the Month Reward",
            amount: Number(bonusAmount).toLocaleString(),
            month: `${monthNames[targetMonth]} ${targetYear}`,
          },
        },
      });

      winners.push({
        employee_name: emp.employee_name,
        rank,
        score: emp.totalScore,
        reason,
        department: empInfo.department || "General",
      });
    }

    await pinWinners(supabase, winners as any, `${monthNames[targetMonth]} ${targetYear}`);

    return new Response(
      JSON.stringify({
        message: `Auto-selected ${winners.length} Employee(s) of the Month for ${monthNames[targetMonth]} ${targetYear}`,
        winners,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("EOTM auto-select error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
