
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Package, Award, Users } from 'lucide-react';
import { useMetrics } from '@/hooks/useMetrics';
import { Skeleton } from '@/components/ui/skeleton';

const KeyMetrics = () => {
  const { data: metrics = [], isLoading, error } = useMetrics();

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Package,
      Award,
      DollarSign,
      Users,
      TrendingUp,
    };
    return icons[iconName] || Package;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Failed to load metrics. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => {
        const IconComponent = getIconComponent(metric.icon || 'Package');
        const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className={`h-5 w-5 ${metric.color || 'text-blue-600'}`} />
                    <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  </div>
                  <p className="text-2xl font-bold mb-1">{metric.value}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-4 w-4 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <p className={`text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change_percentage || 'N/A'}
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
