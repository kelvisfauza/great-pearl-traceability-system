import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    // We rank the PREVIOUS month's performance
    const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetMonth = targetDate.getMonth() + 1; // 1-indexed
    const targetYear = targetDate.getFullYear();
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
      .select("id")
      .eq("month", targetMonth)
      .eq("year", targetYear)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: `Already processed for ${monthNames[targetMonth]} ${targetYear}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deactivate previous winners
    await supabase
      .from("employee_of_the_month")
      .update({ is_active: false })
      .eq("is_active", true);

    // 1. Get attendance scores: present days count
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("employee_id, employee_name, employee_email, status")
      .gte("date", monthStart)
      .lt("date", monthEnd);

    // 2. Get task counts
    const { data: taskData } = await supabase
      .from("daily_tasks")
      .select("completed_by, id")
      .gte("date", monthStart)
      .lt("date", monthEnd);

    // 3. Get overtime/late data
    const { data: timeData } = await supabase
      .from("attendance_time_records")
      .select("employee_id, employee_email, overtime_minutes, late_minutes")
      .gte("record_date", monthStart)
      .lt("record_date", monthEnd);

    // Build scores per employee
    const scores: Record<string, {
      employee_id: string;
      employee_name: string;
      employee_email: string;
      presentDays: number;
      tasks: number;
      overtimeMinutes: number;
      lateMinutes: number;
      totalScore: number;
    }> = {};

    // Process attendance
    for (const row of attendanceData || []) {
      if (!scores[row.employee_id]) {
        scores[row.employee_id] = {
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          employee_email: row.employee_email,
          presentDays: 0,
          tasks: 0,
          overtimeMinutes: 0,
          lateMinutes: 0,
          totalScore: 0,
        };
      }
      if (row.status === "Present") {
        scores[row.employee_id].presentDays++;
      }
    }

    // Process tasks (matched by email in completed_by)
    for (const row of taskData || []) {
      const match = Object.values(scores).find(
        (s) => s.employee_email === row.completed_by || s.employee_name === row.completed_by
      );
      if (match) {
        match.tasks++;
      }
    }

    // Process time records
    for (const row of timeData || []) {
      if (scores[row.employee_id]) {
        scores[row.employee_id].overtimeMinutes += Number(row.overtime_minutes || 0);
        scores[row.employee_id].lateMinutes += Number(row.late_minutes || 0);
      }
    }

    // Calculate total score: attendance weight + tasks + overtime - lateness
    for (const emp of Object.values(scores)) {
      emp.totalScore =
        emp.presentDays * 10 +
        emp.tasks * 2 +
        Math.floor(emp.overtimeMinutes / 60) * 5 -
        Math.floor(emp.lateMinutes / 60) * 3;
    }

    // Rank and pick top 2
    const ranked = Object.values(scores)
      .filter((e) => e.presentDays > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 2);

    if (ranked.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible employees found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get employee avatars
    const employeeIds = ranked.map((r) => r.employee_id);
    const { data: employees } = await supabase
      .from("employees")
      .select("id, avatar_url, department, position")
      .in("id", employeeIds);

    const empMap: Record<string, any> = {};
    for (const e of employees || []) {
      empMap[e.id] = e;
    }

    const bonusAmount = 50000;
    const winners = [];

    // Get auth user IDs for wallet crediting
    const { data: authUsers } = await supabase.rpc("get_auth_users_by_emails", {
      emails: ranked.map((r) => r.employee_email),
    }).catch(() => ({ data: null }));

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
            is_active: true,
            created_by: "system-auto",
          },
          { onConflict: "employee_id,month,year" }
        );

      if (eotmErr) console.error("EOTM insert error:", eotmErr);

      // Credit wallet directly via ledger entry
      const authUserId = authUserMap[emp.employee_email];
      if (authUserId) {
        const ledgerRef = `EOTM-${monthNames[targetMonth].toUpperCase().slice(0, 3)}${targetYear}-RANK${rank}-${emp.employee_name.split(" ")[0].toUpperCase()}`;
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
            avatarUrl: empInfo.avatar_url || "",
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
            avatarUrl: empInfo.avatar_url || "",
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
      });
    }

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
