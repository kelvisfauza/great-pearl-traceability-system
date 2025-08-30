import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useTrendAnalysis } from '@/hooks/useTrendAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, TrendingDown, Minus, Zap, BarChart3 } from 'lucide-react';

const TrendAnalysisPanel = () => {
  const { user } = useAuth();
  const { trends, loading, createTrendAnalysis } = useTrendAnalysis();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    analysis_type: '',
    coffee_type: '',
    time_period: '',
    trend_direction: '',
    trend_strength: [50],
    key_factors: '',
    predicted_outcome: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const trend = {
      analysis_type: formData.analysis_type as any,
      coffee_type: formData.coffee_type,
      time_period: formData.time_period,
      trend_direction: formData.trend_direction as any,
      trend_strength: formData.trend_strength[0],
      key_factors: formData.key_factors.split(',').map(f => f.trim()).filter(f => f),
      predicted_outcome: formData.predicted_outcome,
      analyst_id: user.id,
      analyst_name: user.email || 'Unknown Analyst'
    };

    const result = await createTrendAnalysis(trend);
    if (result) {
      setShowForm(false);
      setFormData({
        analysis_type: '',
        coffee_type: '',
        time_period: '',
        trend_direction: '',
        trend_strength: [50],
        key_factors: '',
        predicted_outcome: ''
      });
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'volatile':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return 'text-green-600 bg-green-50';
      case 'decreasing':
        return 'text-red-600 bg-red-50';
      case 'volatile':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trend Analysis
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'New Analysis'}
            </Button>
          </div>
        </CardHeader>
        
        {showForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="analysis_type">Analysis Type</Label>
                  <Select value={formData.analysis_type} onValueChange={(value) => setFormData({...formData, analysis_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select analysis type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">Price Analysis</SelectItem>
                      <SelectItem value="quality">Quality Analysis</SelectItem>
                      <SelectItem value="supply">Supply Analysis</SelectItem>
                      <SelectItem value="demand">Demand Analysis</SelectItem>
                      <SelectItem value="seasonal">Seasonal Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="coffee_type">Coffee Type</Label>
                  <Select value={formData.coffee_type} onValueChange={(value) => setFormData({...formData, coffee_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coffee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drugar">Drugar</SelectItem>
                      <SelectItem value="Wugar">Wugar</SelectItem>
                      <SelectItem value="Robusta">Robusta</SelectItem>
                      <SelectItem value="Bugisu AA">Bugisu AA</SelectItem>
                      <SelectItem value="All Types">All Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="time_period">Time Period</Label>
                  <Select value={formData.time_period} onValueChange={(value) => setFormData({...formData, time_period: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 Week">1 Week</SelectItem>
                      <SelectItem value="1 Month">1 Month</SelectItem>
                      <SelectItem value="3 Months">3 Months</SelectItem>
                      <SelectItem value="6 Months">6 Months</SelectItem>
                      <SelectItem value="1 Year">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="trend_direction">Trend Direction</Label>
                  <Select value={formData.trend_direction} onValueChange={(value) => setFormData({...formData, trend_direction: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trend direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increasing">Increasing</SelectItem>
                      <SelectItem value="decreasing">Decreasing</SelectItem>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="volatile">Volatile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Trend Strength: {formData.trend_strength[0]}%</Label>
                <Slider
                  value={formData.trend_strength}
                  onValueChange={(value) => setFormData({...formData, trend_strength: value})}
                  max={100}
                  min={0}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="key_factors">Key Factors (comma-separated)</Label>
                <Input
                  id="key_factors"
                  value={formData.key_factors}
                  onChange={(e) => setFormData({...formData, key_factors: e.target.value})}
                  placeholder="e.g., Weather conditions, Market demand, Exchange rates"
                  required
                />
              </div>

              <div>
                <Label htmlFor="predicted_outcome">Predicted Outcome</Label>
                <Textarea
                  id="predicted_outcome"
                  value={formData.predicted_outcome}
                  onChange={(e) => setFormData({...formData, predicted_outcome: e.target.value})}
                  rows={3}
                  placeholder="Describe the expected outcome of this trend..."
                />
              </div>

              <Button type="submit" className="w-full">
                Save Analysis
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Trend Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading trend analysis...</div>
          ) : trends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trend analysis yet. Create your first analysis above.
            </div>
          ) : (
            <div className="space-y-4">
              {trends.map((trend) => (
                <div key={trend.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {trend.analysis_type.charAt(0).toUpperCase() + trend.analysis_type.slice(1)} Analysis - {trend.coffee_type}
                        {getTrendIcon(trend.trend_direction)}
                      </h4>
                      <p className="text-sm text-muted-foreground">by {trend.analyst_name}</p>
                    </div>
                    <Badge className={getTrendColor(trend.trend_direction)}>
                      {trend.trend_direction.charAt(0).toUpperCase() + trend.trend_direction.slice(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Time Period:</span>
                      <div>{trend.time_period}</div>
                    </div>
                    <div>
                      <span className="font-medium">Trend Strength:</span>
                      <div>{trend.trend_strength}%</div>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <div>{new Date(trend.created_at!).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-sm">Key Factors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {trend.key_factors.map((factor, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {trend.predicted_outcome && (
                    <div>
                      <span className="font-medium text-sm">Predicted Outcome:</span>
                      <p className="text-sm mt-1">{trend.predicted_outcome}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrendAnalysisPanel;