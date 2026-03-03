import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface WholeBusinessData {
  generatedAt: string;
  finance: {
    totalPayments: number;
    totalPaymentAmount: number;
    totalCashTransactions: number;
    totalExpenses: number;
    totalExpenseAmount: number;
    totalSalaryPayments: number;
    totalSalaryAmount: number;
    pendingApprovals: number;
    approvedRequests: number;
    rejectedRequests: number;
  };
  procurement: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalContracts: number;
    activeContracts: number;
    totalPaymentRecords: number;
    totalPaidAmount: number;
    topSuppliers: { name: string; total: number; count: number }[];
    bottomSuppliers: { name: string; total: number; count: number }[];
    totalBookings: number;
    activeBookings: number;
  };
  sales: {
    totalTransactions: number;
    totalRevenue: number;
    totalWeightKg: number;
    uniqueCustomers: number;
    totalBuyerContracts: number;
    activeBuyerContracts: number;
    totalContractValue: number;
    totalEudrSales: number;
  };
  inventory: {
    totalCoffeeRecords: number;
    totalKilograms: number;
    totalBags: number;
    pendingRecords: number;
    inventoryRecords: number;
    totalBatches: number;
    totalBatchKg: number;
    availableBatchKg: number;
    storageLocations: { name: string; capacity: number; occupancy: number }[];
  };
  quality: {
    totalAssessments: number;
    approved: number;
    pending: number;
    rejected: number;
    avgMoisture: number;
    totalRejectedCoffee: number;
  };
  hr: {
    totalEmployees: number;
    activeEmployees: number;
    departments: { name: string; count: number }[];
    totalAttendanceRecords: number;
    presentRate: number;
    absentRate: number;
    lateRate: number;
    totalBonuses: number;
    totalBonusAmount: number;
    totalAdvances: number;
    activeAdvances: number;
    totalLoginToday: number;
  };
  fieldOps: {
    totalAgents: number;
    activeAgents: number;
    totalCollections: number;
    totalCollectionKg: number;
    totalDailyReports: number;
    totalFarmers: number;
    totalFieldPurchases: number;
    totalFieldPurchaseAmount: number;
  };
  departmentScores: { department: string; score: number; grade: string; highlights: string[] }[];
}

const calculateGrade = (score: number): string => {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  return "F";
};

export const useWholeBusinessReport = (dateRange?: { start: string; end: string }) => {
  const [data, setData] = useState<WholeBusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = dateRange?.start || "";
      const endDate = dateRange?.end || "";

      // Helper to apply date range filter
      const withDateRange = (query: any, dateCol: string = "created_at") => {
        let q = query;
        if (startDate) q = q.gte(dateCol, startDate);
        if (endDate) q = q.lte(dateCol, endDate);
        return q;
      };

      // Parallel fetch all data
      const [
        paymentRecords, cashTx, expenses, salaryPayments, approvalRequests,
        suppliers, contracts, supplierPayments, bookings,
        salesTx, buyerContracts, eudrSales,
        coffeeRecords, batches, storageLocations,
        qualityAssessments, rejectedCoffee,
        employees, attendance, bonuses, advances, loginTracker,
        fieldAgents, fieldCollections, dailyReports, farmers, fieldPurchases,
        moneyRequests
      ] = await Promise.all([
        withDateRange(supabase.from("payment_records").select("amount, supplier", { count: "exact" })),
        withDateRange(supabase.from("finance_cash_transactions").select("amount", { count: "exact" })),
        withDateRange(supabase.from("finance_expenses").select("amount, status", { count: "exact" })),
        withDateRange(supabase.from("employee_salary_payments").select("net_salary, status", { count: "exact" })),
        withDateRange(supabase.from("approval_requests").select("status, amount", { count: "exact" })),
        supabase.from("suppliers").select("id, name", { count: "exact" }),
        withDateRange(supabase.from("supplier_contracts").select("id, status", { count: "exact" })),
        withDateRange(supabase.from("payment_records").select("amount, supplier")),
        withDateRange(supabase.from("coffee_bookings").select("id, status", { count: "exact" })),
        withDateRange(supabase.from("sales_transactions").select("total_amount, weight, customer", { count: "exact" })),
        withDateRange(supabase.from("buyer_contracts").select("id, status, total_quantity, price_per_kg", { count: "exact" })),
        withDateRange(supabase.from("eudr_sales").select("id", { count: "exact" })),
        withDateRange(supabase.from("coffee_records").select("kilograms, bags, status", { count: "exact" })),
        supabase.from("inventory_batches").select("total_kilograms, remaining_kilograms", { count: "exact" }),
        supabase.from("storage_locations").select("name, capacity, current_occupancy"),
        withDateRange(supabase.from("quality_assessments").select("status, moisture", { count: "exact" })),
        withDateRange(supabase.from("rejected_coffee").select("id", { count: "exact" })),
        supabase.from("employees").select("department, status", { count: "exact" }),
        startDate
          ? supabase.from("attendance").select("status, date").gte("date", startDate).lte("date", endDate || new Date().toISOString().split("T")[0])
          : supabase.from("attendance").select("status, date"),
        withDateRange(supabase.from("bonuses").select("amount, status", { count: "exact" })),
        supabase.from("employee_salary_advances").select("original_amount, status", { count: "exact" }),
        supabase.from("employee_login_tracker").select("id").eq("login_date", new Date().toISOString().split("T")[0]),
        supabase.from("field_agents").select("id, status", { count: "exact" }),
        withDateRange(supabase.from("field_collections").select("bags", { count: "exact" })),
        withDateRange(supabase.from("daily_reports").select("id", { count: "exact" })),
        supabase.from("farmer_profiles").select("id", { count: "exact" }),
        withDateRange(supabase.from("field_purchases").select("total_value", { count: "exact" })),
        withDateRange(supabase.from("money_requests").select("status, amount", { count: "exact" })),
      ]);

      // Process Finance
      const payments = paymentRecords.data || [];
      const expData = expenses.data || [];
      const salData = salaryPayments.data || [];
      const apprData = approvalRequests.data || [];
      const finance = {
        totalPayments: paymentRecords.count || 0,
        totalPaymentAmount: payments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        totalCashTransactions: cashTx.count || 0,
        totalExpenses: expenses.count || 0,
        totalExpenseAmount: expData.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        totalSalaryPayments: salaryPayments.count || 0,
        totalSalaryAmount: salData.reduce((s, p) => s + (Number(p.net_salary) || 0), 0),
        pendingApprovals: apprData.filter(a => a.status === "Pending").length,
        approvedRequests: apprData.filter(a => a.status === "Approved").length,
        rejectedRequests: apprData.filter(a => a.status === "Rejected").length,
      };

      // Process Procurement
      const suppData = suppliers.data || [];
      const contData = contracts.data || [];
      const spData = supplierPayments.data || [];
      const bookData = bookings.data || [];
      const supplierTotals: Record<string, { name: string; total: number; count: number }> = {};
      spData.forEach((p: any) => {
        const name = p.supplier || "Unknown";
        if (!supplierTotals[name]) supplierTotals[name] = { name, total: 0, count: 0 };
        supplierTotals[name].total += Number(p.amount) || 0;
        supplierTotals[name].count++;
      });
      const sortedSuppliers = Object.values(supplierTotals).sort((a, b) => b.total - a.total);

      const procurement = {
        totalSuppliers: suppliers.count || 0,
        activeSuppliers: suppData.length,
        totalContracts: contracts.count || 0,
        activeContracts: contData.filter(c => c.status === "Active").length,
        totalPaymentRecords: spData.length,
        totalPaidAmount: spData.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        topSuppliers: sortedSuppliers.slice(0, 10),
        bottomSuppliers: sortedSuppliers.slice(-5).reverse(),
        totalBookings: bookings.count || 0,
        activeBookings: bookData.filter(b => b.status === "active").length,
      };

      // Process Sales
      const stData = salesTx.data || [];
      const bcData = buyerContracts.data || [];
      const sales = {
        totalTransactions: salesTx.count || 0,
        totalRevenue: stData.reduce((s, t) => s + (Number(t.total_amount) || 0), 0),
        totalWeightKg: stData.reduce((s, t) => s + (Number(t.weight) || 0), 0),
        uniqueCustomers: new Set(stData.map(t => t.customer).filter(Boolean)).size,
        totalBuyerContracts: buyerContracts.count || 0,
        activeBuyerContracts: bcData.filter(c => c.status === "active").length,
        totalContractValue: bcData.reduce((s, c) => s + ((Number(c.total_quantity) || 0) * (Number(c.price_per_kg) || 0)), 0),
        totalEudrSales: eudrSales.count || 0,
      };

      // Process Inventory
      const crData = coffeeRecords.data || [];
      const batchData = batches.data || [];
      const inventory = {
        totalCoffeeRecords: coffeeRecords.count || 0,
        totalKilograms: crData.reduce((s, r) => s + (Number(r.kilograms) || 0), 0),
        totalBags: crData.reduce((s, r) => s + (Number(r.bags) || 0), 0),
        pendingRecords: crData.filter(r => r.status === "pending").length,
        inventoryRecords: crData.filter(r => r.status === "inventory").length,
        totalBatches: batches.count || 0,
        totalBatchKg: batchData.reduce((s, b) => s + (Number(b.total_kilograms) || 0), 0),
        availableBatchKg: batchData.reduce((s, b) => s + (Number(b.remaining_kilograms) || 0), 0),
        storageLocations: (storageLocations.data || []).map(l => ({
          name: l.name,
          capacity: Number(l.capacity) || 0,
          occupancy: Number(l.current_occupancy) || 0,
        })),
      };

      // Process Quality
      const qaData = qualityAssessments.data || [];
      const moistureValues = qaData.filter(a => a.moisture).map(a => Number(a.moisture));
      const quality = {
        totalAssessments: qualityAssessments.count || 0,
        approved: qaData.filter(a => a.status === "approved").length,
        pending: qaData.filter(a => a.status === "pending" || a.status === "pending_admin_pricing").length,
        rejected: qaData.filter(a => a.status === "rejected").length,
        avgMoisture: moistureValues.length > 0 ? moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length : 0,
        totalRejectedCoffee: rejectedCoffee.count || 0,
      };

      // Process HR
      const empData = employees.data || [];
      const attData = attendance.data || [];
      const deptMap: Record<string, number> = {};
      empData.forEach(e => {
        deptMap[e.department] = (deptMap[e.department] || 0) + 1;
      });
      const totalAtt = attData.length;
      const presentCount = attData.filter(a => a.status === "present").length;
      const absentCount = attData.filter(a => a.status === "absent").length;
      const lateCount = attData.filter(a => a.status === "late").length;
      const bonData = bonuses.data || [];
      const advData = advances.data || [];

      const hr = {
        totalEmployees: employees.count || 0,
        activeEmployees: empData.filter(e => e.status === "Active").length,
        departments: Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        totalAttendanceRecords: totalAtt,
        presentRate: totalAtt > 0 ? (presentCount / totalAtt) * 100 : 0,
        absentRate: totalAtt > 0 ? (absentCount / totalAtt) * 100 : 0,
        lateRate: totalAtt > 0 ? (lateCount / totalAtt) * 100 : 0,
        totalBonuses: bonuses.count || 0,
        totalBonusAmount: bonData.reduce((s, b) => s + (Number(b.amount) || 0), 0),
        totalAdvances: advances.count || 0,
        activeAdvances: advData.filter(a => a.status === "active").length,
        totalLoginToday: loginTracker.data?.length || 0,
      };

      // Process Field Ops
      const faData = fieldAgents.data || [];
      const fcData = fieldCollections.data || [];
      const fpData = fieldPurchases.data || [];
      const fieldOps = {
        totalAgents: fieldAgents.count || 0,
        activeAgents: faData.filter(a => a.status === "active").length,
        totalCollections: fieldCollections.count || 0,
        totalCollectionKg: fcData.reduce((s: number, c: any) => s + (Number(c.bags) || 0) * 60, 0),
        totalDailyReports: dailyReports.count || 0,
        totalFarmers: farmers.count || 0,
        totalFieldPurchases: fieldPurchases.count || 0,
        totalFieldPurchaseAmount: fpData.reduce((s: number, p: any) => s + (Number(p.total_value) || 0), 0),
      };

      // Calculate department scores
      const departmentScores = calculateDepartmentScores(finance, procurement, sales, inventory, quality, hr, fieldOps);

      setData({
        generatedAt: new Date().toISOString(),
        finance,
        procurement,
        sales,
        inventory,
        quality,
        hr,
        fieldOps,
        departmentScores,
      });
    } catch (err: any) {
      console.error("Error fetching business report:", err);
      toast({ title: "Error", description: "Failed to load business report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
};

function calculateDepartmentScores(
  finance: WholeBusinessData["finance"],
  procurement: WholeBusinessData["procurement"],
  sales: WholeBusinessData["sales"],
  inventory: WholeBusinessData["inventory"],
  quality: WholeBusinessData["quality"],
  hr: WholeBusinessData["hr"],
  fieldOps: WholeBusinessData["fieldOps"]
): WholeBusinessData["departmentScores"] {
  const scores: WholeBusinessData["departmentScores"] = [];

  // Finance score
  const finApprovalRate = finance.approvedRequests + finance.rejectedRequests > 0
    ? (finance.approvedRequests / (finance.approvedRequests + finance.rejectedRequests + finance.pendingApprovals)) * 100 : 50;
  const finScore = Math.min(100, Math.round(
    (finance.totalPayments > 0 ? 30 : 0) +
    (finApprovalRate * 0.4) +
    (finance.totalSalaryPayments > 0 ? 20 : 0) +
    (finance.pendingApprovals === 0 ? 10 : Math.max(0, 10 - finance.pendingApprovals))
  ));
  scores.push({
    department: "Finance",
    score: finScore,
    grade: calculateGrade(finScore),
    highlights: [
      `${finance.totalPayments} payments processed (UGX ${finance.totalPaymentAmount.toLocaleString()})`,
      `${finance.pendingApprovals} pending approvals`,
      `${finance.totalSalaryPayments} salary payments disbursed`,
    ],
  });

  // Procurement score
  const procActiveRate = procurement.totalSuppliers > 0 ? (procurement.activeSuppliers / procurement.totalSuppliers) * 100 : 0;
  const procScore = Math.min(100, Math.round(
    (procActiveRate * 0.3) +
    (procurement.activeContracts > 0 ? 25 : 0) +
    (procurement.totalPaidAmount > 0 ? 25 : 0) +
    (procurement.activeBookings > 0 ? 20 : 0)
  ));
  scores.push({
    department: "Procurement",
    score: procScore,
    grade: calculateGrade(procScore),
    highlights: [
      `${procurement.activeSuppliers}/${procurement.totalSuppliers} active suppliers`,
      `${procurement.activeContracts} active contracts`,
      `UGX ${procurement.totalPaidAmount.toLocaleString()} paid out`,
    ],
  });

  // Sales score
  const salesScore = Math.min(100, Math.round(
    (sales.totalTransactions > 0 ? 30 : 0) +
    (sales.totalRevenue > 0 ? 25 : 0) +
    (sales.uniqueCustomers > 0 ? Math.min(25, sales.uniqueCustomers * 5) : 0) +
    (sales.activeBuyerContracts > 0 ? 20 : 0)
  ));
  scores.push({
    department: "Sales & Marketing",
    score: salesScore,
    grade: calculateGrade(salesScore),
    highlights: [
      `${sales.totalTransactions} transactions, UGX ${sales.totalRevenue.toLocaleString()} revenue`,
      `${sales.uniqueCustomers} unique customers`,
      `${sales.activeBuyerContracts} active buyer contracts`,
    ],
  });

  // Inventory score
  const invUtilization = inventory.totalBatchKg > 0 ? (inventory.availableBatchKg / inventory.totalBatchKg) * 100 : 0;
  const invScore = Math.min(100, Math.round(
    (inventory.totalCoffeeRecords > 0 ? 25 : 0) +
    (inventory.totalBatches > 0 ? 25 : 0) +
    (invUtilization > 20 ? 25 : invUtilization) +
    (inventory.pendingRecords < 10 ? 25 : Math.max(0, 25 - inventory.pendingRecords))
  ));
  scores.push({
    department: "Inventory / Store",
    score: invScore,
    grade: calculateGrade(invScore),
    highlights: [
      `${inventory.totalCoffeeRecords} coffee records (${inventory.totalKilograms.toLocaleString()} kg)`,
      `${inventory.availableBatchKg.toLocaleString()} kg available in batches`,
      `${inventory.pendingRecords} pending records`,
    ],
  });

  // Quality score
  const qaApprovalRate = quality.totalAssessments > 0 ? (quality.approved / quality.totalAssessments) * 100 : 0;
  const qaScore = Math.min(100, Math.round(
    (quality.totalAssessments > 0 ? 25 : 0) +
    (qaApprovalRate * 0.4) +
    (quality.avgMoisture > 0 && quality.avgMoisture < 14 ? 20 : 10) +
    (quality.pending < 5 ? 15 : Math.max(0, 15 - quality.pending))
  ));
  scores.push({
    department: "Quality Control",
    score: qaScore,
    grade: calculateGrade(qaScore),
    highlights: [
      `${quality.totalAssessments} assessments (${quality.approved} approved)`,
      `Average moisture: ${quality.avgMoisture.toFixed(1)}%`,
      `${quality.rejected} rejected, ${quality.pending} pending`,
    ],
  });

  // HR score
  const hrScore = Math.min(100, Math.round(
    (hr.presentRate * 0.4) +
    (hr.activeEmployees > 0 ? 20 : 0) +
    (hr.lateRate < 10 ? 20 : Math.max(0, 20 - hr.lateRate)) +
    (hr.totalLoginToday > 0 ? 20 : 0)
  ));
  scores.push({
    department: "Human Resources",
    score: hrScore,
    grade: calculateGrade(hrScore),
    highlights: [
      `${hr.activeEmployees}/${hr.totalEmployees} active employees`,
      `Attendance: ${hr.presentRate.toFixed(1)}% present, ${hr.lateRate.toFixed(1)}% late`,
      `${hr.totalLoginToday} logins today`,
    ],
  });

  // Field Ops score
  const fieldScore = Math.min(100, Math.round(
    (fieldOps.totalAgents > 0 ? 20 : 0) +
    (fieldOps.totalCollections > 0 ? 25 : 0) +
    (fieldOps.totalFarmers > 0 ? Math.min(25, fieldOps.totalFarmers / 10) : 0) +
    (fieldOps.totalDailyReports > 0 ? 20 : 0) +
    (fieldOps.totalFieldPurchases > 0 ? 10 : 0)
  ));
  scores.push({
    department: "Field Operations",
    score: fieldScore,
    grade: calculateGrade(fieldScore),
    highlights: [
      `${fieldOps.activeAgents}/${fieldOps.totalAgents} active agents`,
      `${fieldOps.totalCollections} collections (${fieldOps.totalCollectionKg.toLocaleString()} kg)`,
      `${fieldOps.totalFarmers} registered farmers`,
    ],
  });

  return scores.sort((a, b) => b.score - a.score);
}
