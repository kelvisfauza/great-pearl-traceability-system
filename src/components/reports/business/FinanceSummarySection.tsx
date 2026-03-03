import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Wallet } from "lucide-react";

const FinanceSummarySection = ({ data }: { data: WholeBusinessData["finance"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-blue-600" /> Finance Department
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Payments</p>
          <p className="text-xl font-bold">{data.totalPayments}</p>
          <p className="text-sm text-muted-foreground">UGX {data.totalPaymentAmount.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Cash Transactions</p>
          <p className="text-xl font-bold">{data.totalCashTransactions}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="text-xl font-bold">{data.totalExpenses}</p>
          <p className="text-sm text-muted-foreground">UGX {data.totalExpenseAmount.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Salary Payments</p>
          <p className="text-xl font-bold">{data.totalSalaryPayments}</p>
          <p className="text-sm text-muted-foreground">UGX {data.totalSalaryAmount.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10">
          <p className="text-sm text-muted-foreground">Approved Requests</p>
          <p className="text-xl font-bold text-green-600">{data.approvedRequests}</p>
        </div>
        <div className="p-3 rounded-lg bg-yellow-500/10">
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
          <p className="text-xl font-bold text-yellow-600">{data.pendingApprovals}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default FinanceSummarySection;
