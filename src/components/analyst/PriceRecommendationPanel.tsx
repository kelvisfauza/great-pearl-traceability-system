import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { usePriceRecommendations } from '@/hooks/usePriceRecommendations';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const PriceRecommendationPanel = () => {
  const { user } = useAuth();
  const { recommendations, loading, createRecommendation, approveRecommendation, rejectRecommendation } = usePriceRecommendations();
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    coffee_type: '',
    recommended_price: '',
    current_market_price: '',
    price_justification: '',
    quality_score: '',
    market_trend: '',
    confidence_level: [85],
    effective_date: '',
    expires_at: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    const recommendation = {
      coffee_type: formData.coffee_type,
      recommended_price: parseFloat(formData.recommended_price),
      current_market_price: formData.current_market_price ? parseFloat(formData.current_market_price) : undefined,
      price_justification: formData.price_justification,
      quality_score: formData.quality_score ? parseFloat(formData.quality_score) : undefined,
      market_trend: formData.market_trend,
      confidence_level: formData.confidence_level[0],
      analyst_id: user.id,
      analyst_name: user.email || 'Unknown User',
      status: 'pending' as const,
      effective_date: formData.effective_date || undefined,
      expires_at: formData.expires_at || undefined
    };

    const result = await createRecommendation(recommendation);
    if (result) {
      setShowForm(false);
      setFormData({
        coffee_type: '',
        recommended_price: '',
        current_market_price: '',
        price_justification: '',
        quality_score: '',
        market_trend: '',
        confidence_level: [85],
        effective_date: '',
        expires_at: ''
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'approved': 'default',
      'rejected': 'destructive',
      'expired': 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Price Recommendations
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'New Recommendation'}
            </Button>
          </div>
        </CardHeader>
        
        {showForm && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="market_trend">Market Trend</Label>
                  <Select value={formData.market_trend} onValueChange={(value) => setFormData({...formData, market_trend: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trend" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bullish">Bullish</SelectItem>
                      <SelectItem value="Bearish">Bearish</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Volatile">Volatile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recommended_price">Recommended Price (UGX/kg)</Label>
                  <Input
                    id="recommended_price"
                    type="number"
                    value={formData.recommended_price}
                    onChange={(e) => setFormData({...formData, recommended_price: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="current_market_price">Current Market Price (UGX/kg)</Label>
                  <Input
                    id="current_market_price"
                    type="number"
                    value={formData.current_market_price}
                    onChange={(e) => setFormData({...formData, current_market_price: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="quality_score">Quality Score (0-100)</Label>
                  <Input
                    id="quality_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.quality_score}
                    onChange={(e) => setFormData({...formData, quality_score: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Confidence Level: {formData.confidence_level[0]}%</Label>
                  <Slider
                    value={formData.confidence_level}
                    onValueChange={(value) => setFormData({...formData, confidence_level: value})}
                    max={100}
                    min={0}
                    step={5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="expires_at">Expires At</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price_justification">Price Justification</Label>
                <Textarea
                  id="price_justification"
                  value={formData.price_justification}
                  onChange={(e) => setFormData({...formData, price_justification: e.target.value})}
                  required
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">
                Submit Recommendation
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading recommendations...</div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No price recommendations yet. Create your first recommendation above.
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {rec.coffee_type} - UGX {rec.recommended_price.toLocaleString()}/kg
                        {getStatusIcon(rec.status)}
                      </h4>
                      <p className="text-sm text-muted-foreground">by {rec.analyst_name}</p>
                    </div>
                    {getStatusBadge(rec.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Market Trend:</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {rec.market_trend}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span>
                      <div>{rec.confidence_level}%</div>
                    </div>
                    {rec.quality_score && (
                      <div>
                        <span className="font-medium">Quality Score:</span>
                        <div>{rec.quality_score}/100</div>
                      </div>
                    )}
                    {rec.effective_date && (
                      <div>
                        <span className="font-medium">Effective:</span>
                        <div>{new Date(rec.effective_date).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm">{rec.price_justification}</p>

                  {rec.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveRecommendation(rec.id!, user.email || 'Admin')}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const reason = prompt('Rejection reason:');
                          if (reason) rejectRecommendation(rec.id!, reason);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {rec.status === 'rejected' && rec.rejection_reason && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      <strong>Rejected:</strong> {rec.rejection_reason}
                    </div>
                  )}

                  {rec.status === 'approved' && rec.approved_by && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                      <strong>Approved by:</strong> {rec.approved_by} on {new Date(rec.approved_at!).toLocaleDateString()}
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

export default PriceRecommendationPanel;