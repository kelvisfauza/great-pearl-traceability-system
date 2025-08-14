import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, DollarSign, Package2, Plus, Receipt, CreditCard, FileText } from 'lucide-react';
import Layout from '@/components/Layout';
import { useMillingData } from '@/hooks/useMillingData';
import MillingCustomerForm from '@/components/milling/MillingCustomerForm';
import MillingTransactionForm from '@/components/milling/MillingTransactionForm';
import MillingCashTransactionForm from '@/components/milling/MillingCashTransactionForm';
import MillingReports from '@/components/milling/MillingReports';
import MillingTransactionsList from '@/components/milling/MillingTransactionsList';
import MillingCustomersList from '@/components/milling/MillingCustomersList';
import MillingPrintReportModal from '@/components/milling/MillingPrintReportModal';

const Milling = () => {
  const { stats, loading, customers, transactions, getReportData } = useMillingData();
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCashTransactionForm, setShowCashTransactionForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);

  const statsCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      description: `${stats.activeCustomers} active`,
      color: "text-blue-600"
    },
    {
      title: "Total Debts",
      value: `UGX ${stats.totalDebts.toLocaleString()}`,
      icon: CreditCard,
      description: "Outstanding balances",
      color: "text-red-600"
    },
    {
      title: "Cash Received",
      value: `UGX ${stats.cashReceived.toLocaleString()}`,
      icon: DollarSign,
      description: "This month",
      color: "text-green-600"
    },
    {
      title: "KGs Hulled",
      value: `${stats.totalKgsHulled.toLocaleString()} kg`,
      icon: Package2,
      description: "This month",
      color: "text-purple-600"
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading milling data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Milling Department</h1>
            <p className="text-muted-foreground">Manage customers, transactions, and operations</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCustomerForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transactions" className="font-bold">Transactions</TabsTrigger>
            <TabsTrigger value="customers" className="font-bold">Customers</TabsTrigger>
            <TabsTrigger value="payments" className="font-bold">Payments</TabsTrigger>
            <TabsTrigger value="reports" className="font-bold">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Hulling Transactions</h2>
              <Button onClick={() => setShowTransactionForm(true)} className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                New Transaction
              </Button>
            </div>
            <MillingTransactionsList />
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Customer Management</h2>
              <Button onClick={() => setShowCustomerForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Customer
              </Button>
            </div>
            <MillingCustomersList />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Cash Transactions</h2>
              <Button onClick={() => setShowCashTransactionForm(true)} className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Record Payment
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Cash transaction history will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Reports & Analytics</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowReports(true)} className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Generate Report
                </Button>
                <Button 
                  onClick={() => setShowPrintReport(true)}
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Print Report
                </Button>
              </div>
            </div>
            <MillingReports />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showCustomerForm && (
          <MillingCustomerForm
            open={showCustomerForm}
            onClose={() => setShowCustomerForm(false)}
          />
        )}

        {showTransactionForm && (
          <MillingTransactionForm
            open={showTransactionForm}
            onClose={() => setShowTransactionForm(false)}
          />
        )}

        {showCashTransactionForm && (
          <MillingCashTransactionForm
            open={showCashTransactionForm}
            onClose={() => setShowCashTransactionForm(false)}
          />
        )}

        {showPrintReport && (
          <MillingPrintReportModal
            open={showPrintReport}
            onClose={() => setShowPrintReport(false)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Milling;