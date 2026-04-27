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
    // Calculate for the previous month
    const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();
    const monthStart = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const nextMonthDate = new Date(targetYear, targetMonth, 1);
    const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // Check if already calculated
    const { data: existing } = await supabase
      .from("monthly_overtime_reviews")
      .select("id")
      .eq("month", targetMonth)
      .eq("year", targetYear)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: `Overtime already calculated for ${monthNames[targetMonth]} ${targetYear}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate overtime and late minutes per employee
    const { data: timeRecords, error: timeErr } = await supabase
      .from("attendance_time_records")
      .select("employee_id, employee_name, employee_email, overtime_minutes, late_minutes")
      .gte("record_date", monthStart)
      .lt("record_date", monthEnd);

    if (timeErr) throw timeErr;

    // Build per-employee summary
    const empMap: Record<string, {
      employee_id: string;
      employee_name: string;
      employee_email: string;
      total_overtime: number;
      total_late: number;
    }> = {};

    for (const r of timeRecords || []) {
      if (!empMap[r.employee_id]) {
        empMap[r.employee_id] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          employee_email: r.employee_email,
          total_overtime: 0,
          total_late: 0,
        };
      }
      empMap[r.employee_id].total_overtime += Number(r.overtime_minutes || 0);
      empMap[r.employee_id].total_late += Number(r.late_minutes || 0);
    }

    const RATE_PER_HOUR = 3000; // UGX per hour
    const records = Object.values(empMap).map((emp) => {
      const netOT = Math.max(0, emp.total_overtime - emp.total_late);
      const hours = Math.ceil(netOT / 60);
      return {
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        employee_email: emp.employee_email,
        month: targetMonth,
        year: targetYear,
        total_overtime_minutes: emp.total_overtime,
        total_late_minutes: emp.total_late,
        net_overtime_minutes: netOT,
        overtime_rate_per_hour: RATE_PER_HOUR,
        calculated_pay: hours * RATE_PER_HOUR,
        status: "pending",
      };
    });

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
