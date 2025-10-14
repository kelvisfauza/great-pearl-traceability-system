import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TopSuppliersChart = () => {
  const [supplierData, setSupplierData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplierData = async () => {
      try {
        const coffeeSnapshot = await getDocs(collection(db, 'coffee_records'));
        const supplierMap = new Map();

        coffeeSnapshot.forEach((doc) => {
          const data = doc.data();
          const supplierName = data.supplier_name || data.supplierName || 'Unknown';
          const kgs = Number(data.kilograms || data.weight || 0);
          
          if (supplierMap.has(supplierName)) {
            supplierMap.set(supplierName, supplierMap.get(supplierName) + kgs);
          } else {
            supplierMap.set(supplierName, kgs);
          }
        });

        const sortedSuppliers = Array.from(supplierMap.entries())
          .map(([name, kgs]) => ({ name, kgs: Math.round(kgs) }))
          .sort((a, b) => b.kgs - a.kgs)
          .slice(0, 10);

        setSupplierData(sortedSuppliers);
      } catch (error) {
        console.error('Error fetching supplier data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();
  }, []);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Top Suppliers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading supplier data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Top 10 Suppliers by Volume
        </CardTitle>
        <p className="text-sm text-muted-foreground">Coffee supplied (kilograms)</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={supplierData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume']}
            />
            <Bar dataKey="kgs" radius={[8, 8, 0, 0]}>
              {supplierData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TopSuppliersChart;
