import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Package, Coffee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const InventoryOverviewChart = () => {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [totalKgs, setTotalKgs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        // Fetch from Supabase coffee_records for coffee type distribution
        const { data: coffeeRecords, error } = await supabase
          .from('coffee_records')
          .select('coffee_type, kilograms');

        if (error) {
          console.error('Error fetching coffee records:', error);
          setLoading(false);
          return;
        }

        // Aggregate by coffee type
        const typeMap = new Map<string, number>();
        let total = 0;

        coffeeRecords?.forEach((record) => {
          const coffeeType = record.coffee_type || 'Unknown';
          const kgs = Number(record.kilograms || 0);
          
          total += kgs;
          if (typeMap.has(coffeeType)) {
            typeMap.set(coffeeType, typeMap.get(coffeeType)! + kgs);
          } else {
            typeMap.set(coffeeType, kgs);
          }
        });

        const chartData = Array.from(typeMap.entries())
          .map(([name, value]) => ({ 
            name, 
            value: Math.round(value),
            percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          }))
          .sort((a, b) => b.value - a.value);

        setInventoryData(chartData);
        setTotalKgs(Math.round(total));
      } catch (error) {
        console.error('Error fetching inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))'
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Inventory Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading inventory data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inventoryData.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Inventory Distribution by Coffee Type
          </CardTitle>
          <p className="text-sm text-muted-foreground">Total: 0 kg</p>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No inventory data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Inventory Distribution by Coffee Type
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {totalKgs.toLocaleString()} kg
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={inventoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {inventoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry: any) => `${value} (${entry.payload.percentage}%)`}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InventoryOverviewChart;
