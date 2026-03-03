import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Lightbulb, AlertTriangle, CheckCircle2, ArrowUpRight } from "lucide-react";

const RecommendationsSection = ({ data }: { data: WholeBusinessData }) => {
  const recommendations: { type: "warning" | "success" | "action"; text: string }[] = [];

  // Finance recommendations
  if (data.finance.pendingApprovals > 5) {
    recommendations.push({ type: "warning", text: `${data.finance.pendingApprovals} pending approval requests need attention — delays affect cash flow and operations.` });
  }
  if (data.finance.totalExpenseAmount > data.sales.totalRevenue && data.sales.totalRevenue > 0) {
    recommendations.push({ type: "warning", text: "Expenses exceed sales revenue. Review cost optimization strategies urgently." });
  }

  // Procurement
  if (data.procurement.bottomSuppliers.length > 0) {
    const lowest = data.procurement.bottomSuppliers[0];
    recommendations.push({ type: "action", text: `Evaluate low-volume supplier "${lowest.name}" (only ${lowest.count} payments, UGX ${lowest.total.toLocaleString()}) — consider consolidation or termination.` });
  }
  if (data.procurement.activeBookings === 0 && data.procurement.totalBookings > 0) {
    recommendations.push({ type: "warning", text: "No active coffee bookings. New bookings needed to secure supply pipeline." });
  }

  // Sales
  if (data.sales.totalTransactions === 0) {
    recommendations.push({ type: "warning", text: "No sales transactions recorded. Sales team needs activation — consider outreach campaigns." });
  }
  if (data.sales.uniqueCustomers < 3) {
    recommendations.push({ type: "action", text: "Customer base is very narrow. Diversify by targeting at least 5+ active buyers to reduce risk." });
  }

  // Inventory
  if (data.inventory.pendingRecords > 20) {
    recommendations.push({ type: "warning", text: `${data.inventory.pendingRecords} coffee records pending processing. Store department should accelerate intake procedures.` });
  }
  if (data.inventory.availableBatchKg < 5000) {
    recommendations.push({ type: "warning", text: "Available stock is critically low. Accelerate procurement and field collections." });
  }

  // Quality
  const qaRejectRate = data.quality.totalAssessments > 0 ? (data.quality.rejected / data.quality.totalAssessments) * 100 : 0;
  if (qaRejectRate > 20) {
    recommendations.push({ type: "warning", text: `Quality rejection rate is ${qaRejectRate.toFixed(0)}% — investigate supplier quality and field drying practices.` });
  }
  if (data.quality.pending > 10) {
    recommendations.push({ type: "action", text: `${data.quality.pending} quality assessments pending. Clear the backlog to avoid supply chain delays.` });
  }

  // HR
  if (data.hr.lateRate > 15) {
    recommendations.push({ type: "warning", text: `Late arrival rate is ${data.hr.lateRate.toFixed(1)}%. Enforce punctuality policy and review deduction system.` });
  }
  if (data.hr.absentRate > 10) {
    recommendations.push({ type: "warning", text: `Absence rate is ${data.hr.absentRate.toFixed(1)}%. Investigate causes and consider wellness programs.` });
  }

  // Field Ops
  if (data.fieldOps.totalFarmers < 50) {
    recommendations.push({ type: "action", text: "Farmer registration is low. Field agents should increase community engagement." });
  }

  // Positive highlights
  const topDept = data.departmentScores[0];
  if (topDept && topDept.score >= 70) {
    recommendations.push({ type: "success", text: `${topDept.department} is the top-performing department with a score of ${topDept.score}% (Grade ${topDept.grade}). Recognize and reward the team.` });
  }
  if (data.hr.presentRate > 85) {
    recommendations.push({ type: "success", text: `Excellent attendance rate of ${data.hr.presentRate.toFixed(1)}%. Continue current workforce engagement practices.` });
  }

  const iconMap = {
    warning: <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />,
    action: <ArrowUpRight className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />,
  };

  const bgMap = {
    warning: "bg-yellow-500/10 border-yellow-500/30",
    success: "bg-green-500/10 border-green-500/30",
    action: "bg-blue-500/10 border-blue-500/30",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" /> AI Recommendations & Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-muted-foreground">No specific recommendations at this time. All departments operating within normal parameters.</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${bgMap[rec.type]}`}>
                {iconMap[rec.type]}
                <p className="text-sm">{rec.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationsSection;
