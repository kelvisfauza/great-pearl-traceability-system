
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import { usePerformanceData } from '@/hooks/usePerformanceData';
import { Skeleton } from '@/components/ui/skeleton';

const PerformanceDashboard = () => {
  const { data: performanceData = [], isLoading, error } = usePerformanceData();

  const chartConfig = {
    production: { label: "Production", color: "hsl(var(--chart-1))" },
    quality: { label: "Quality", color: "hsl(var(--chart-2))" },
    sales: { label: "Sales", color: "hsl(var(--chart-3))" },
    efficiency: { label: "Efficiency", color: "hsl(var(--chart-4))" },
  };

  // Mock monthly trends data (you can extend this to be database-driven)
  const monthlyTrends = [
    { month: 'Jan', production: 2650, quality: 92.1, sales: 780, efficiency: 89.5 },
    { month: 'Feb', production: 2720, quality: 93.2, sales: 820, efficiency: 88.7 },
    { month: 'Mar', production: 2800, quality: 94.2, sales: 847, efficiency: 87.3 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-4" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Failed to load performance data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceData.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm">{item.category}</h3>
                {item.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{Number(item.value).toLocaleString()}</span>
                  <span className={`text-sm ${item.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change_percentage || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span>Target: {Number(item.target).toLocaleString()}</span>
                </div>
                <Progress value={Number(item.percentage)} className="h-2" />
                <div className="flex justify-between text-xs">
                  <span>{Number(item.percentage).toFixed(1)}% of target</span>
                  <Badge variant={
                    Number(item.percentage) >= 95 ? "default" :
                    Number(item.percentage) >= 80 ? "secondary" : "destructive"
                  }>
                    {Number(item.percentage) >= 95 ? "Excellent" :
                     Number(item.percentage) >= 80 ? "Good" : "Attention"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={performanceData.map(item => ({ 
                category: item.category, 
                percentage: Number(item.percentage) 
              }))} height={300}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="percentage" fill="var(--color-production)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Trend Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>3-Month Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={monthlyTrends} height={300}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="production" stroke="var(--color-production)" strokeWidth={2} />
                <Line type="monotone" dataKey="quality" stroke="var(--color-quality)" strokeWidth={2} />
                <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} />
                <Line type="monotone" dataKey="efficiency" stroke="var(--color-efficiency)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
