
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users } from "lucide-react";

const Finance = () => {
  const payments = [
    { id: 1, supplier: "Bushenyi Cooperative", amount: "UGX 2,450,000", status: "Paid", date: "Today", method: "Bank Transfer" },
    { id: 2, supplier: "Masaka Traders", amount: "UGX 1,800,000", status: "Pending", date: "Yesterday", method: "Cash" },
    { id: 3, supplier: "Ntungamo Union", amount: "UGX 950,000", status: "Processing", date: "2 days ago", method: "Bank Transfer" },
  ];

  return (
    <Layout 
      title="Finance Management" 
      subtitle="Track payments, budgets, and financial performance"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold">UGX 847M</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold">UGX 45M</p>
                </div>
                <CreditCard className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Operating Costs</p>
                  <p className="text-2xl font-bold">UGX 234M</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Suppliers Paid</p>
                  <p className="text-2xl font-bold">89</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Latest supplier payments</CardDescription>
                </div>
                <Button>
                  <DollarSign className="h-4 w-4 mr-2" />
                  New Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{payment.supplier}</p>
                      <p className="text-sm text-gray-500">{payment.method} • {payment.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{payment.amount}</p>
                      <Badge variant={
                        payment.status === "Paid" ? "default" : 
                        payment.status === "Pending" ? "destructive" : "secondary"
                      }>
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>Financial overview for this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-xl font-bold text-green-600">UGX 847M</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="font-medium">Total Expenses</span>
                  <span className="text-xl font-bold text-red-600">UGX 623M</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="font-medium">Net Profit</span>
                  <span className="text-xl font-bold text-blue-600">UGX 224M</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">Profit Margin</span>
                  <span className="text-xl font-bold text-gray-600">26.4%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Finance;
