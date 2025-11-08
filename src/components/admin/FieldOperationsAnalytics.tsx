import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, Users, MapPin, Award, Activity, Calendar } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export const FieldOperationsAnalytics = () => {
  const { 
    farmers, 
    purchases, 
    dailyReports, 
    attendanceLogs,
    loading 
  } = useFieldOperationsData();

  // Calculate purchase trends over last 30 days
  const getPurchaseTrends = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, 'yyyy-MM-dd');
    });

    return last30Days.map(date => {
      const dayPurchases = purchases.filter(p => 
        format(new Date(p.purchase_date), 'yyyy-MM-dd') === date
      );
      return {
        date: format(new Date(date), 'MMM dd'),
        kgs: dayPurchases.reduce((sum, p) => sum + p.kgs_purchased, 0),
        count: dayPurchases.length,
        value: dayPurchases.reduce((sum, p) => sum + p.total_value, 0)
      };
    });
  };

  // Agent performance metrics
  const getAgentPerformance = () => {
    const agentStats = new Map();

    purchases.forEach(purchase => {
      const agent = purchase.created_by;
      if (!agentStats.has(agent)) {
        agentStats.set(agent, {
          name: agent,
          totalKgs: 0,
          totalValue: 0,
          transactions: 0,
          avgPrice: 0
        });
      }
      const stats = agentStats.get(agent);
      stats.totalKgs += purchase.kgs_purchased;
      stats.totalValue += purchase.total_value;
      stats.transactions += 1;
    });

    return Array.from(agentStats.values()).map(stats => ({
      ...stats,
      avgPrice: stats.totalValue / stats.totalKgs
    })).sort((a, b) => b.totalKgs - a.totalKgs).slice(0, 10);
  };

  // District comparison
  const getDistrictComparison = () => {
    const districtStats = new Map();

    dailyReports.forEach(report => {
      const district = report.district;
      if (!districtStats.has(district)) {
        districtStats.set(district, {
          district,
          totalKgs: 0,
          reports: 0,
          farmers: new Set()
        });
      }
      const stats = districtStats.get(district);
      stats.totalKgs += report.total_kgs_mobilized;
      stats.reports += 1;
      report.farmers_visited?.forEach(f => stats.farmers.add(f));
    });

    return Array.from(districtStats.values()).map(stats => ({
      district: stats.district,
      totalKgs: stats.totalKgs,
      reports: stats.reports,
      uniqueFarmers: stats.farmers.size
    })).sort((a, b) => b.totalKgs - a.totalKgs);
  };

  // Coffee type distribution
  const getCoffeeTypeDistribution = () => {
    const typeStats = new Map();
    
    purchases.forEach(purchase => {
      const type = purchase.coffee_type;
      if (!typeStats.has(type)) {
        typeStats.set(type, { name: type, value: 0 });
      }
      typeStats.get(type).value += purchase.kgs_purchased;
    });

    return Array.from(typeStats.values());
  };

  // Attendance trends
  const getAttendanceTrends = () => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return format(date, 'yyyy-MM-dd');
    });

    return last14Days.map(date => {
      const dayLogs = attendanceLogs.filter(log => 
        format(new Date(log.date), 'yyyy-MM-dd') === date
      );
      const totalMinutes = dayLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
      return {
        date: format(new Date(date), 'MMM dd'),
        checkIns: dayLogs.length,
        avgHours: dayLogs.length > 0 ? (totalMinutes / dayLogs.length / 60).toFixed(1) : 0
      };
    });
  };

  // Monthly summary
  const getMonthlySummary = () => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const monthPurchases = purchases.filter(p => {
      const date = new Date(p.purchase_date);
      return date >= monthStart && date <= monthEnd;
    });

    const monthReports = dailyReports.filter(r => {
      const date = new Date(r.report_date);
      return date >= monthStart && date <= monthEnd;
    });

    return {
      totalKgsPurchased: monthPurchases.reduce((sum, p) => sum + p.kgs_purchased, 0),
      totalValue: monthPurchases.reduce((sum, p) => sum + p.total_value, 0),
      totalTransactions: monthPurchases.length,
      reportsSubmitted: monthReports.length,
      avgPricePerKg: monthPurchases.length > 0 
        ? monthPurchases.reduce((sum, p) => sum + p.unit_price, 0) / monthPurchases.length 
        : 0,
      uniqueFarmers: new Set(monthPurchases.map(p => p.farmer_name)).size
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const purchaseTrends = getPurchaseTrends();
  const agentPerformance = getAgentPerformance();
  const districtComparison = getDistrictComparison();
  const coffeeDistribution = getCoffeeTypeDistribution();
  const attendanceTrends = getAttendanceTrends();
  const monthlySummary = getMonthlySummary();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Field Operations Analytics</h2>
        <p className="text-muted-foreground">Comprehensive performance insights and trends</p>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Kgs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlySummary.totalKgsPurchased.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlySummary.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Total purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlySummary.uniqueFarmers}</div>
            <p className="text-xs text-muted-foreground">Unique this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              Avg Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlySummary.avgPricePerKg.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">UGX per kg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-500" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlySummary.reportsSubmitted}</div>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(monthlySummary.totalValue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">UGX</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Purchase Trends</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
          <TabsTrigger value="districts">District Comparison</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        {/* Purchase Trends */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Volume Trend (Last 30 Days)</CardTitle>
                <CardDescription>Daily kilograms purchased</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={purchaseTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="kgs" stroke="#0088FE" strokeWidth={2} name="Kilograms" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Count (Last 30 Days)</CardTitle>
                <CardDescription>Number of purchases per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={purchaseTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#00C49F" name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coffee Type Distribution</CardTitle>
              <CardDescription>Total kilograms by coffee type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={coffeeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(0)} kg`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {coffeeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Performance */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Agents</CardTitle>
              <CardDescription>Ranked by total kilograms purchased</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={agentPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalKgs" fill="#0088FE" name="Total Kgs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Agent Transaction Volume</CardTitle>
                <CardDescription>Number of purchases per agent</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="transactions" fill="#00C49F" name="Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Average Price</CardTitle>
                <CardDescription>Average UGX per kg by agent</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgPrice" fill="#FFBB28" name="Avg Price (UGX/kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* District Comparison */}
        <TabsContent value="districts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>District Performance Comparison</CardTitle>
              <CardDescription>Total kilograms mobilized by district</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={districtComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="district" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalKgs" fill="#8884D8" name="Total Kgs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reports by District</CardTitle>
                <CardDescription>Number of daily reports submitted</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={districtComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="district" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="reports" fill="#82CA9D" name="Reports" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unique Farmers by District</CardTitle>
                <CardDescription>Number of unique farmers visited</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={districtComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="district" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uniqueFarmers" fill="#FFC658" name="Unique Farmers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Check-ins (Last 14 Days)</CardTitle>
                <CardDescription>Number of field agents checking in</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="checkIns" stroke="#FF8042" strokeWidth={2} name="Check-ins" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Hours per Day</CardTitle>
                <CardDescription>Average field hours logged</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgHours" fill="#0088FE" name="Avg Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};