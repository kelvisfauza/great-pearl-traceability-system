
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Award, Users } from 'lucide-react';

const KeyMetrics = () => {
  const metrics = [
    { 
      label: "Total Production", 
      value: "2,847 bags", 
      change: "+12.5%", 
      trend: "up",
      icon: Package,
      color: "text-blue-600"
    },
    { 
      label: "Quality Score", 
      value: "94.2%", 
      change: "+2.1%", 
      trend: "up",
      icon: Award,
      color: "text-green-600"
    },
    { 
      label: "Revenue", 
      value: "UGX 847M", 
      change: "+8.7%", 
      trend: "up",
      icon: DollarSign,
      color: "text-yellow-600"
    },
    { 
      label: "Active Suppliers", 
      value: "156", 
      change: "+3.2%", 
      trend: "up",
      icon: Users,
      color: "text-purple-600"
    },
    { 
      label: "Processing Efficiency", 
      value: "87.3%", 
      change: "-1.2%", 
      trend: "down",
      icon: TrendingUp,
      color: "text-red-600"
    },
    { 
      label: "Export Volume", 
      value: "1,234 bags", 
      change: "+15.8%", 
      trend: "up",
      icon: Package,
      color: "text-indigo-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className={`h-5 w-5 ${metric.color}`} />
                    <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  </div>
                  <p className="text-2xl font-bold mb-1">{metric.value}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-4 w-4 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <p className={`text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change}
                    </p>
                    <span className="text-sm text-muted-foreground">vs last period</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default KeyMetrics;
