import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FinancialDashboard = () => {
  // Mock data for the financial dashboard
  const balanceData = [
    { month: 'Jan', value: 2100 },
    { month: 'Feb', value: 1950 },
    { month: 'Mar', value: 2200 },
    { month: 'Apr', value: 2190 },
    { month: 'May', value: 2400 },
    { month: 'Jun', value: 2190 },
  ];

  const expensesData = [
    { name: 'Operations', value: 35, color: 'hsl(var(--chart-1))' },
    { name: 'Marketing', value: 25, color: 'hsl(var(--chart-2))' },
    { name: 'Salaries', value: 20, color: 'hsl(var(--chart-3))' },
    { name: 'Equipment', value: 15, color: 'hsl(var(--chart-4))' },
    { name: 'Other', value: 5, color: 'hsl(var(--chart-5))' },
  ];

  const transactions = [
    { id: 1, name: 'Cameron Williamson', type: 'Payment', date: '12/07/22', time: '12:12:07 AM', amount: '$17.64', status: 'Pending' },
    { id: 2, name: 'Courtney Henry', type: 'Netflix', date: '11/07/22', time: '12:22:12 AM', amount: '$19.21', status: 'Completed' },
    { id: 3, name: 'Eleanor Pena', type: 'Spotify', date: '10/07/22', time: '10:11:33 AM', amount: '$12.18', status: 'Completed' },
  ];

  const StatCard = ({ title, amount, change, icon: Icon, trend, color }: any) => (
    <Card className="bg-card/40 backdrop-blur-sm border-border/20 hover:bg-card/60 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{amount}</p>
            <div className="flex items-center gap-1 mt-1">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {change}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to your financial overview</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full"></div>
            <span className="font-medium">Admin User</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Balance"
          amount="$2190.19"
          change="+2.5%"
          icon={DollarSign}
          trend="up"
          color="bg-blue-500"
        />
        <StatCard
          title="Income"
          amount="$21.30"
          change="+1.2%"
          icon={TrendingUp}
          trend="up"
          color="bg-green-500"
        />
        <StatCard
          title="Outcome"
          amount="$1875.10"
          change="-0.8%"
          icon={TrendingDown}
          trend="down"
          color="bg-red-500"
        />
        <StatCard
          title="Expenses"
          amount="$19,112"
          change="+3.1%"
          icon={CreditCard}
          trend="up"
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Finances Chart */}
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-sm border-border/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Finances
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Outcome
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Income
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses Pie Chart */}
        <Card className="bg-card/40 backdrop-blur-sm border-border/20">
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={expensesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expensesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {expensesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-card/40 backdrop-blur-sm border-border/20">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{transaction.name}</p>
                    <p className="text-sm text-muted-foreground">{transaction.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{transaction.amount}</p>
                  <p className="text-sm text-muted-foreground">{transaction.date} {transaction.time}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  transaction.status === 'Completed' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {transaction.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;