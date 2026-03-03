import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { createPrintVerification, getVerificationHtml, getVerificationStyles } from "@/utils/printVerification";
import { format } from "date-fns";

const fmtNum = (n: number) => n.toLocaleString();
const fmtMoney = (n: number) => `UGX ${n.toLocaleString()}`;

const metricCard = (label: string, value: string, sub?: string) =>
  `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div>${sub ? `<div class="metric-sub">${sub}</div>` : ''}</div>`;

const sectionTitle = (icon: string, title: string) =>
  `<div class="section-title">${icon} ${title}</div>`;

const gradeColor = (grade: string) => {
  if (grade.startsWith("A")) return "#16a34a";
  if (grade.startsWith("B")) return "#2563eb";
  if (grade.startsWith("C")) return "#ca8a04";
  if (grade.startsWith("D")) return "#ea580c";
  return "#dc2626";
};

const progressBar = (score: number) => {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : score >= 40 ? "#eab308" : "#ef4444";
  return `<div class="progress-bar"><div class="progress-fill" style="width:${score}%;background:${color}"></div></div>`;
};

export const printWholeBusinessReport = async (data: WholeBusinessData, periodLabel: string) => {
  const totalRevenue = data.sales.totalRevenue + data.fieldOps.totalFieldPurchaseAmount;
  const totalExpenditure = data.finance.totalPaymentAmount + data.finance.totalExpenseAmount + data.finance.totalSalaryAmount;
  const overallScore = Math.round(data.departmentScores.reduce((s, d) => s + d.score, 0) / data.departmentScores.length);

  const { code, qrUrl } = await createPrintVerification({
    type: 'report',
    subtype: 'Whole Business Report',
    reference_no: `BIZ-${format(new Date(), 'yyyyMMdd')}`,
    meta: { periodLabel, totalRevenue, totalExpenditure }
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `<!DOCTYPE html>
<html><head><title>Business Report - ${periodLabel}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 25px; font-size: 12px; color: #333; line-height: 1.4; }
  @page { margin: 0.5in; size: A4; }

  .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 15px; margin-bottom: 20px; }
  .header-logo { background: #0d3d1f; display: inline-block; padding: 8px 16px; border-radius: 6px; margin-bottom: 8px; }
  .header-logo img { height: 40px; }
  .header h1 { font-size: 22px; color: #1a365d; margin: 5px 0 2px; }
  .header h2 { font-size: 14px; font-weight: normal; color: #666; }
  .header .period { font-size: 12px; color: #444; margin-top: 4px; }

  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
  .metrics-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0; }
  .metric { border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; }
  .metric-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
  .metric-value { font-size: 18px; font-weight: bold; color: #1a365d; }
  .metric-sub { font-size: 10px; color: #888; margin-top: 2px; }
  .metric.green { border-left: 3px solid #22c55e; }
  .metric.red { border-left: 3px solid #ef4444; }
  .metric.blue { border-left: 3px solid #3b82f6; }
  .metric.purple { border-left: 3px solid #8b5cf6; }

  .section { margin: 20px 0; page-break-inside: avoid; }
  .section-title { font-size: 15px; font-weight: bold; padding: 8px 10px; background: #f1f5f9; border-left: 4px solid #1a365d; margin-bottom: 10px; }

  .dept-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .dept-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .dept-card .label { font-size: 10px; color: #666; }
  .dept-card .value { font-size: 16px; font-weight: bold; }
  .dept-card .sub { font-size: 10px; color: #888; }

  .ranking-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 6px; }
  .rank-num { font-size: 18px; font-weight: bold; color: #999; min-width: 30px; text-align: center; }
  .rank-content { flex: 1; }
  .rank-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .rank-name { font-weight: bold; }
  .rank-grade { font-size: 14px; font-weight: bold; }
  .rank-highlights { font-size: 10px; color: #666; }
  .progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin: 4px 0; }
  .progress-fill { height: 100%; border-radius: 3px; }

  .supplier-row { display: flex; justify-content: space-between; padding: 4px 8px; font-size: 11px; background: #f8fafc; border-radius: 3px; margin-bottom: 3px; }
  .storage-row { margin-bottom: 6px; font-size: 11px; }
  .storage-header { display: flex; justify-content: space-between; margin-bottom: 2px; }

  .dept-staff-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
  .dept-staff-item { display: flex; justify-content: space-between; padding: 3px 8px; font-size: 11px; background: #f8fafc; border-radius: 3px; }

  .rec-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px; border-radius: 6px; margin-bottom: 6px; font-size: 11px; }
  .rec-warning { background: #fef9c3; border: 1px solid #fde047; }
  .rec-success { background: #dcfce7; border: 1px solid #86efac; }
  .rec-action { background: #dbeafe; border: 1px solid #93c5fd; }
  .rec-icon { font-size: 14px; }

  .footer { text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 30px; }
  ${getVerificationStyles()}
  @media print { .section { page-break-inside: avoid; } }
</style></head>
<body>
  <div class="header">
    <div class="header-logo"><img src="/lovable-uploads/great-pearl-coffee-logo.png" alt="Logo" /></div>
    <h1>Great Pearl Coffee Factory</h1>
    <h2>Comprehensive Business Report</h2>
    <div class="period">Period: <strong>${periodLabel}</strong> &nbsp;|&nbsp; Generated: ${format(new Date(), "PPpp")}</div>
  </div>

  <!-- Overview -->
  <div class="metrics-grid">
    <div class="metric green"><div class="metric-label">Total Revenue</div><div class="metric-value">${fmtMoney(totalRevenue)}</div></div>
    <div class="metric red"><div class="metric-label">Total Expenditure</div><div class="metric-value">${fmtMoney(totalExpenditure)}</div></div>
    <div class="metric blue"><div class="metric-label">Total Stock (kg)</div><div class="metric-value">${fmtNum(data.inventory.availableBatchKg)}</div></div>
    <div class="metric purple"><div class="metric-label">Overall Score</div><div class="metric-value">${overallScore}%</div></div>
  </div>
  <div class="metrics-grid-3">
    <div class="metric"><div class="metric-label">Active Employees</div><div class="metric-value">${data.hr.activeEmployees}</div></div>
    <div class="metric"><div class="metric-label">Active Suppliers</div><div class="metric-value">${data.procurement.activeSuppliers}</div></div>
    <div class="metric"><div class="metric-label">Coffee Lots Received</div><div class="metric-value">${data.inventory.totalCoffeeRecords}</div></div>
  </div>

  <!-- Department Rankings -->
  <div class="section">
    ${sectionTitle('🏆', 'Department Rankings')}
    ${data.departmentScores.map((dept, i) => `
      <div class="ranking-item">
        <div class="rank-num">#${i + 1}</div>
        <div class="rank-content">
          <div class="rank-header">
            <span class="rank-name">${dept.department}</span>
            <span class="rank-grade" style="color:${gradeColor(dept.grade)}">${dept.grade} (${dept.score}%)</span>
          </div>
          ${progressBar(dept.score)}
          <div class="rank-highlights">${dept.highlights.map(h => `• ${h}`).join(' ')}</div>
        </div>
      </div>
    `).join('')}
  </div>

  <!-- Finance -->
  <div class="section">
    ${sectionTitle('💰', 'Finance Department')}
    <div class="dept-grid">
      ${metricCard('Total Payments', fmtNum(data.finance.totalPayments), fmtMoney(data.finance.totalPaymentAmount))}
      ${metricCard('Cash Transactions', fmtNum(data.finance.totalCashTransactions))}
      ${metricCard('Expenses', fmtNum(data.finance.totalExpenses), fmtMoney(data.finance.totalExpenseAmount))}
      ${metricCard('Salary Payments', fmtNum(data.finance.totalSalaryPayments), fmtMoney(data.finance.totalSalaryAmount))}
      ${metricCard('Approved Requests', fmtNum(data.finance.approvedRequests))}
      ${metricCard('Pending Approvals', fmtNum(data.finance.pendingApprovals))}
    </div>
  </div>

  <!-- Procurement -->
  <div class="section">
    ${sectionTitle('🚚', 'Procurement Department')}
    <div class="dept-grid">
      ${metricCard('Suppliers', fmtNum(data.procurement.totalSuppliers))}
      ${metricCard('Active Contracts', `${data.procurement.activeContracts} / ${data.procurement.totalContracts}`)}
      ${metricCard('Total Paid', fmtMoney(data.procurement.totalPaidAmount))}
      ${metricCard('Total Bookings', fmtNum(data.procurement.totalBookings))}
      ${metricCard('Active Bookings', fmtNum(data.procurement.activeBookings))}
      ${metricCard('Payment Records', fmtNum(data.procurement.totalPaymentRecords))}
    </div>
    ${data.procurement.topSuppliers.length > 0 ? `
      <h4 style="font-size:12px;font-weight:bold;margin:10px 0 5px;">Top Suppliers</h4>
      ${data.procurement.topSuppliers.map((s, i) => `<div class="supplier-row"><span>#${i+1} ${s.name}</span><span>${fmtMoney(s.total)} (${s.count} payments)</span></div>`).join('')}
    ` : ''}
  </div>

  <!-- Sales -->
  <div class="section">
    ${sectionTitle('🛒', 'Sales & Marketing')}
    <div class="dept-grid">
      ${metricCard('Transactions', fmtNum(data.sales.totalTransactions))}
      ${metricCard('Revenue', fmtMoney(data.sales.totalRevenue))}
      ${metricCard('Weight Sold (kg)', fmtNum(data.sales.totalWeightKg))}
      ${metricCard('Unique Customers', fmtNum(data.sales.uniqueCustomers))}
      ${metricCard('Buyer Contracts', `${data.sales.activeBuyerContracts} / ${data.sales.totalBuyerContracts}`)}
      ${metricCard('Contract Value', fmtMoney(data.sales.totalContractValue))}
    </div>
  </div>

  <!-- Inventory -->
  <div class="section">
    ${sectionTitle('📦', 'Inventory & Store')}
    <div class="dept-grid">
      ${metricCard('Coffee Records', fmtNum(data.inventory.totalCoffeeRecords))}
      ${metricCard('Total Kilograms', fmtNum(data.inventory.totalKilograms))}
      ${metricCard('Total Bags', fmtNum(data.inventory.totalBags))}
      ${metricCard('Pending Records', fmtNum(data.inventory.pendingRecords))}
      ${metricCard('Inventory Batches', fmtNum(data.inventory.totalBatches))}
      ${metricCard('Available Stock (kg)', fmtNum(data.inventory.availableBatchKg))}
    </div>
    ${data.inventory.storageLocations.length > 0 ? `
      <h4 style="font-size:12px;font-weight:bold;margin:10px 0 5px;">Storage Utilization</h4>
      ${data.inventory.storageLocations.map(loc => {
        const pct = loc.capacity > 0 ? ((loc.occupancy / loc.capacity) * 100) : 0;
        const color = pct > 85 ? "#ef4444" : pct > 60 ? "#eab308" : "#22c55e";
        return `<div class="storage-row">
          <div class="storage-header"><span>${loc.name}</span><span>${fmtNum(loc.occupancy)} / ${fmtNum(loc.capacity)} kg (${pct.toFixed(0)}%)</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(pct,100)}%;background:${color}"></div></div>
        </div>`;
      }).join('')}
    ` : ''}
  </div>

  <!-- Quality -->
  <div class="section">
    ${sectionTitle('✅', 'Quality Control')}
    <div class="dept-grid">
      ${metricCard('Total Assessments', fmtNum(data.quality.totalAssessments))}
      ${metricCard('Approved', fmtNum(data.quality.approved))}
      ${metricCard('Pending', fmtNum(data.quality.pending))}
      ${metricCard('Rejected', fmtNum(data.quality.rejected))}
      ${metricCard('Avg Moisture', `${data.quality.avgMoisture.toFixed(1)}%`)}
      ${metricCard('Rejected Coffee Lots', fmtNum(data.quality.totalRejectedCoffee))}
    </div>
  </div>

  <!-- HR -->
  <div class="section">
    ${sectionTitle('👥', 'Human Resources')}
    <div class="dept-grid">
      ${metricCard('Active Employees', `${data.hr.activeEmployees} / ${data.hr.totalEmployees}`)}
      ${metricCard('Present Rate (30d)', `${data.hr.presentRate.toFixed(1)}%`)}
      ${metricCard('Late Rate (30d)', `${data.hr.lateRate.toFixed(1)}%`)}
      ${metricCard('Logins Today', fmtNum(data.hr.totalLoginToday))}
      ${metricCard('Bonuses Issued', fmtNum(data.hr.totalBonuses), fmtMoney(data.hr.totalBonusAmount))}
      ${metricCard('Active Advances', `${data.hr.activeAdvances} / ${data.hr.totalAdvances}`)}
    </div>
    ${data.hr.departments.length > 0 ? `
      <h4 style="font-size:12px;font-weight:bold;margin:10px 0 5px;">Staff Distribution</h4>
      <div class="dept-staff-grid">
        ${data.hr.departments.map(d => `<div class="dept-staff-item"><span>${d.name}</span><span>${d.count} staff</span></div>`).join('')}
      </div>
    ` : ''}
  </div>

  <!-- Field Operations -->
  <div class="section">
    ${sectionTitle('📍', 'Field Operations')}
    <div class="dept-grid">
      ${metricCard('Field Agents', `${data.fieldOps.activeAgents} / ${data.fieldOps.totalAgents}`)}
      ${metricCard('Collections', fmtNum(data.fieldOps.totalCollections), `${fmtNum(data.fieldOps.totalCollectionKg)} kg`)}
      ${metricCard('Registered Farmers', fmtNum(data.fieldOps.totalFarmers))}
      ${metricCard('Field Purchases', fmtNum(data.fieldOps.totalFieldPurchases), fmtMoney(data.fieldOps.totalFieldPurchaseAmount))}
      ${metricCard('Daily Reports', fmtNum(data.fieldOps.totalDailyReports))}
    </div>
  </div>

  <!-- Recommendations -->
  <div class="section">
    ${sectionTitle('💡', 'Recommendations & Insights')}
    ${buildRecommendationsHtml(data)}
  </div>

  ${getVerificationHtml(code, qrUrl)}

  <div class="footer">
    <p>Great Pearl Coffee Factory Ltd.</p>
    <p>+256781121639 / +256778536681 | www.greatpearlcoffee.com</p>
    <p style="margin-top:4px;font-size:8px;color:#999;">© ${new Date().getFullYear()} Great Pearl Coffee Factory. All rights reserved.</p>
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
};

function buildRecommendationsHtml(data: WholeBusinessData): string {
  const recs: { type: string; text: string }[] = [];

  if (data.finance.pendingApprovals > 5) recs.push({ type: "warning", text: `${data.finance.pendingApprovals} pending approval requests need attention.` });
  if (data.finance.totalExpenseAmount > data.sales.totalRevenue && data.sales.totalRevenue > 0) recs.push({ type: "warning", text: "Expenses exceed sales revenue. Review cost optimization." });
  if (data.procurement.activeBookings === 0 && data.procurement.totalBookings > 0) recs.push({ type: "warning", text: "No active coffee bookings. New bookings needed." });
  if (data.sales.totalTransactions === 0) recs.push({ type: "warning", text: "No sales transactions recorded." });
  if (data.sales.uniqueCustomers < 3) recs.push({ type: "action", text: "Customer base is very narrow. Diversify buyers." });
  if (data.inventory.pendingRecords > 20) recs.push({ type: "warning", text: `${data.inventory.pendingRecords} coffee records pending processing.` });
  if (data.inventory.availableBatchKg < 5000) recs.push({ type: "warning", text: "Available stock is critically low." });
  const qaRejectRate = data.quality.totalAssessments > 0 ? (data.quality.rejected / data.quality.totalAssessments) * 100 : 0;
  if (qaRejectRate > 20) recs.push({ type: "warning", text: `Quality rejection rate is ${qaRejectRate.toFixed(0)}%.` });
  if (data.hr.lateRate > 15) recs.push({ type: "warning", text: `Late arrival rate is ${data.hr.lateRate.toFixed(1)}%.` });
  if (data.hr.absentRate > 10) recs.push({ type: "warning", text: `Absence rate is ${data.hr.absentRate.toFixed(1)}%.` });
  if (data.fieldOps.totalFarmers < 50) recs.push({ type: "action", text: "Farmer registration is low." });
  const topDept = data.departmentScores[0];
  if (topDept && topDept.score >= 70) recs.push({ type: "success", text: `${topDept.department} is top-performing (${topDept.grade}, ${topDept.score}%).` });
  if (data.hr.presentRate > 85) recs.push({ type: "success", text: `Excellent attendance rate of ${data.hr.presentRate.toFixed(1)}%.` });

  if (recs.length === 0) return '<p style="color:#666;">All departments operating within normal parameters.</p>';

  const classMap: Record<string, string> = { warning: 'rec-warning', success: 'rec-success', action: 'rec-action' };
  const iconMap: Record<string, string> = { warning: '⚠️', success: '✅', action: '🔵' };
  return recs.map(r => `<div class="rec-item ${classMap[r.type]}"><span class="rec-icon">${iconMap[r.type]}</span><span>${r.text}</span></div>`).join('');
}
