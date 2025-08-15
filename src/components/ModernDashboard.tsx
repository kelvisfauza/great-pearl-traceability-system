import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, Target, BarChart3, Activity } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

const ModernDashboard = () => {
  const barData = [
    { name: '1st Week', value1: 40, value2: 30 },
    { name: '2nd Week', value1: 35, value2: 25 },
    { name: '3rd Week', value1: 45, value2: 35 },
    { name: '4th Week', value1: 50, value2: 40 },
  ];

  const lineData = [
    { name: 'Jan', value: 63500 },
    { name: 'Feb', value: 66000 },
    { name: 'Mar', value: 65000 },
    { name: 'Apr', value: 68000 },
    { name: 'May', value: 70000 },
    { name: 'Jun', value: 72000 },
  ];

  const areaData = [
    { name: 'Jan', value1: 4000, value2: 2400 },
    { name: 'Feb', value1: 3000, value2: 1398 },
    { name: 'Mar', value1: 2000, value2: 9800 },
    { name: 'Apr', value1: 2780, value2: 3908 },
    { name: 'May', value1: 1890, value2: 4800 },
    { name: 'Jun', value1: 2390, value2: 3800 },
  ];

  const pieData = [
    { name: 'Product A', value: 35, color: '#0ea5e9' },
    { name: 'Product B', value: 25, color: '#06b6d4' },
    { name: 'Product C', value: 40, color: '#0891b2' },
  ];

  const metricCards = [
    { title: 'Total Revenue', value: '$ 63,500', change: '+2.5%', trend: 'up' },
    { title: 'Total Users', value: '$ 66,000', change: '+1.8%', trend: 'up' },
    { title: 'Daily Sales', value: '$ 65,000', change: '-0.5%', trend: 'down' },
  ];

  const progressCards = [
    { title: 'Project Progress', value: 80, color: 'bg-blue-500' },
    { title: 'Task Completion', value: 40, color: 'bg-cyan-500' },
    { title: 'Team Performance', value: 70, color: 'bg-teal-500' },
  ];

  const StatCard = ({ title, value, change, trend }: any) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            <div className="flex items-center gap-1 mt-2">
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
        </div>
      </CardContent>
    </Card>
  );

  const ProgressCard = ({ title, value, color }: any) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">{title}</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{value}%</span>
            </div>
            <Progress value={value} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-blue-500 text-white px-4 py-2 rounded-t-lg inline-block">
          <h1 className="font-bold">UPDATE V.1</h1>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Large Chart Section */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">
          
          {/* Top Section with Bar Chart and Metrics */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Bar Chart */}
                <div>
                  <h3 className="font-semibold mb-4">Weekly Performance</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Bar dataKey="value1" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="value2" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Metrics Cards */}
                <div className="space-y-4">
                  {metricCards.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.title}</p>
                        <p className="text-lg font-bold">{metric.value}</p>
                      </div>
                      <div className={`text-sm ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Cards Section */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {progressCards.map((progress, index) => (
                  <div key={index} className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="2"
                        />
                        <path
                          d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                          fill="none"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth="2"
                          strokeDasharray={`${progress.value}, 100`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">{progress.value}%</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{progress.title}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Line Chart */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Area Chart */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Performance Analysis</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={areaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Area 
                      type="monotone" 
                      dataKey="value1" 
                      stackId="1"
                      stroke="hsl(var(--chart-1))" 
                      fill="hsl(var(--chart-1))"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value2" 
                      stackId="1"
                      stroke="hsl(var(--chart-2))" 
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          
          {/* Statistics Cards */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Statistics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Users</span>
                  <span className="font-bold">7.2M</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Sales</span>
                  <span className="font-bold">6.5M</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Market Share</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-blue-500 text-white border-0">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">35</div>
                <div className="text-sm opacity-90">Active</div>
              </CardContent>
            </Card>
            <Card className="bg-cyan-500 text-white border-0">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">515</div>
                <div className="text-sm opacity-90">Tasks</div>
              </CardContent>
            </Card>
            <Card className="bg-teal-500 text-white border-0">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">478</div>
                <div className="text-sm opacity-90">Projects</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-500 text-white border-0">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">152</div>
                <div className="text-sm opacity-90">Reports</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Chart */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Monthly Trend</h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={barData.slice(0, 3)}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <Bar dataKey="value1" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;