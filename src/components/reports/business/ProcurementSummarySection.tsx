import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WholeBusinessData } from "@/hooks/useWholeBusinessReport";
import { Truck } from "lucide-react";

const ProcurementSummarySection = ({ data }: { data: WholeBusinessData["procurement"] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-purple-600" /> Procurement Department
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Suppliers</p>
          <p className="text-xl font-bold">{data.totalSuppliers}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Active Contracts</p>
          <p className="text-xl font-bold">{data.activeContracts} / {data.totalContracts}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Paid</p>
          <p className="text-xl font-bold">UGX {data.totalPaidAmount.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Total Bookings</p>
          <p className="text-xl font-bold">{data.totalBookings}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Active Bookings</p>
          <p className="text-xl font-bold">{data.activeBookings}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground">Payment Records</p>
          <p className="text-xl font-bold">{data.totalPaymentRecords}</p>
        </div>
      </div>

      {data.topSuppliers.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Top 10 Suppliers by Payment Volume</h4>
          <div className="space-y-2">
            {data.topSuppliers.map((s, i) => (
              <div key={s.name} className="flex justify-between items-center text-sm p-2 rounded bg-muted/30">
                <span>#{i + 1} {s.name}</span>
                <span className="font-medium">UGX {s.total.toLocaleString()} ({s.count} payments)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default ProcurementSummarySection;
