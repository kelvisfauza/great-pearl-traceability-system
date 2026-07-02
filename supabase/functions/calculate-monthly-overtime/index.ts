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

    // Allow explicit month override: { month: "YYYY-MM" }
    let bodyJson: any = {};
    try { bodyJson = await req.json(); } catch { /* no body */ }
    const now = new Date();
    let targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (bodyJson?.month && /^\d{4}-\d{2}$/.test(bodyJson.month)) {
      const [y, m] = bodyJson.month.split("-").map(Number);
      targetDate = new Date(y, m - 1, 1);
    }
    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();
    const recalc = bodyJson?.recalc !== false; // default true so re-runs refresh pending rows
    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const nextMonthDate = new Date(targetYear, targetMonth, 1);
    const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // Fetch already-existing reviews. Keep employees whose rows are already
    // approved/paid (we never overwrite those). Pending rows are cleared and
    // recomputed when recalc=true so admins get fresh figures.
    const { data: existingReviews } = await supabase
      .from("monthly_overtime_reviews")
      .select("employee_id, status")
      .eq("month", targetMonth)
      .eq("year", targetYear);
    const lockedEmployeeIds = new Set(
      (existingReviews || [])
        .filter((r: any) => String(r.status).toLowerCase() !== "pending")
        .map((r: any) => r.employee_id)
    );
    if (recalc) {
      await supabase
        .from("monthly_overtime_reviews")
        .delete()
        .eq("month", targetMonth)
        .eq("year", targetYear)
        .eq("status", "pending");
    }

    // Aggregate overtime and late minutes per employee
    // IMPORTANT: only count rows where the employee actually attended that day.
    // A row qualifies for overtime ONLY if BOTH arrival_time and departure_time
    // are recorded AND the row's status is 'present'. This prevents bogus overtime
    // when someone only fills the departure time but no arrival (employee was absent).
    const { data: timeRecords, error: timeErr } = await supabase
      .from("attendance_time_records")
      .select(
        "employee_id, employee_name, employee_email, record_date, arrival_time, departure_time, status, overtime_minutes, late_minutes"
      )
      .gte("record_date", monthStart)
      .lt("record_date", monthEnd);

    if (timeErr) throw timeErr;

    // MONTHLY AGGREGATE MODEL
    // We sum the actual worked minutes across every attended day in the month
    // (departure − arrival), and sum total late minutes across the whole month.
    // Overtime = TOTAL WORKED − EXPECTED (qualifying_days × 8h) − TOTAL LATE.
    // This is the "total arrival for the month minus total late" approach —
    // per-day overtime_minutes is ignored.
    const STANDARD_DAY_MINUTES = 8 * 60; // 8 hour standard workday

    const toMinutes = (t: string | null): number | null => {
      if (!t) return null;
      const [h, m] = String(t).split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    const empMap: Record<string, {
      employee_id: string;
      employee_name: string;
      employee_email: string;
      total_worked: number;
      total_late: number;
      qualifying_days: number;
    }> = {};

    for (const r of timeRecords || []) {
      const status = String(r.status || "").toLowerCase();
      const arr = toMinutes(r.arrival_time);
      const dep = toMinutes(r.departure_time);
      const attended = arr !== null && dep !== null && dep > arr && status === "present";
      if (!attended) continue;

      // Normalize employee_id: attendance sometimes stores the same employee
      // under both the raw UUID and a "company_<UUID>" variant. Merge them.
      const normalizedId = String(r.employee_id || "").replace(/^company_/, "");
      if (!empMap[normalizedId]) {
        empMap[normalizedId] = {
          employee_id: normalizedId,
          employee_name: r.employee_name,
          employee_email: r.employee_email,
          total_worked: 0,
          total_late: 0,
          qualifying_days: 0,
        };
      }
      // Prefer a real email over an employee-code placeholder if we see one later
      const existingEmail = empMap[normalizedId].employee_email || "";
      if (
        (!existingEmail.includes("@") || /^GAC-|^EMP/i.test(existingEmail)) &&
        r.employee_email &&
        String(r.employee_email).includes("@")
      ) {
        empMap[normalizedId].employee_email = r.employee_email;
      }
      empMap[normalizedId].total_worked += (dep! - arr!);
      empMap[normalizedId].total_late += Number(r.late_minutes || 0);
      empMap[normalizedId].qualifying_days += 1;
    }

    const RATE_PER_HOUR = 1500; // UGX per hour
    const MAX_MONTHLY_PAY = 100000; // UGX cap per employee per month
    const records = Object.values(empMap)
      .filter((emp) => emp.qualifying_days > 0)
      .filter((emp) => !lockedEmployeeIds.has(emp.employee_id))
      .map((emp) => {
        const expected = emp.qualifying_days * STANDARD_DAY_MINUTES;
        const grossOT = emp.total_worked - expected;
        const netOT = Math.max(0, grossOT - emp.total_late);
        const hours = Math.floor(netOT / 60);
        const rawPay = hours * RATE_PER_HOUR;
        const cappedPay = Math.min(rawPay, MAX_MONTHLY_PAY);
        return {
          employee_id: emp.employee_id,
          employee_name: emp.employee_name,
          employee_email: emp.employee_email,
          month: targetMonth,
          year: targetYear,
          total_overtime_minutes: Math.max(0, grossOT),
          total_late_minutes: emp.total_late,
          net_overtime_minutes: netOT,
          overtime_rate_per_hour: RATE_PER_HOUR,
          calculated_pay: cappedPay,
          admin_notes: `Worked ${(emp.total_worked/60).toFixed(1)}h across ${emp.qualifying_days} days (expected ${(expected/60).toFixed(0)}h), late ${emp.total_late}min → net OT ${(netOT/60).toFixed(1)}h${rawPay > MAX_MONTHLY_PAY ? ` (auto-capped from UGX ${rawPay.toLocaleString()})` : ""}`,
          status: "pending",
        };
      })
      .filter((r) => r.net_overtime_minutes > 0);

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ message: "No time records found for the period" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert all review records
    const { error: insertErr } = await supabase
      .from("monthly_overtime_reviews")
      .insert(records);

    if (insertErr) throw insertErr;

    // Notify admin via email
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "general-notification",
        recipientEmail: "fauzakusa@greatpearlcoffee.com",
        idempotencyKey: `overtime-review-notify-${targetMonth}-${targetYear}`,
        templateData: {
          title: `Monthly Overtime Review Ready — ${monthNames[targetMonth]} ${targetYear}`,
          message: `The system has calculated overtime for ${records.length} employees for ${monthNames[targetMonth]} ${targetYear}. Please review, edit if needed, and approve the records in the Overtime Reviews section.`,
          actionLabel: "Review Now",
        },
      },
    });

    // Also notify operations
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "general-notification",
        recipientEmail: "operations@greatpearlcoffee.com",
        idempotencyKey: `overtime-review-ops-${targetMonth}-${targetYear}`,
        templateData: {
          title: `Monthly Overtime Review Ready — ${monthNames[targetMonth]} ${targetYear}`,
          message: `Overtime calculated for ${records.length} employees. Sent to admin for review and approval.`,
        },
      },
    });

    return new Response(
      JSON.stringify({
        message: `Calculated overtime for ${records.length} employees for ${monthNames[targetMonth]} ${targetYear}`,
        count: records.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Overtime calculation error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
