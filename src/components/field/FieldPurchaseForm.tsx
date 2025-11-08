import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, MapPin, Calculator } from 'lucide-react';

export const FieldPurchaseForm = () => {
  const { farmers, addPurchase } = useFieldOperationsData();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    farmer_id: '',
    farmer_name: '',
    coffee_type: 'Robusta',
    category: 'FAQ',
    kgs_purchased: '',
    unit_price: '',
    advance_deducted: '',
    quality_notes: '',
    moisture_percentage: ''
  });

  const categories = ['FAQ', 'DRUGAR', 'Parchment', 'Kiboko', 'FAQ A', 'FAQ B'];
  
  const totalValue = parseFloat(formData.kgs_purchased || '0') * parseFloat(formData.unit_price || '0');
  const netAmount = totalValue - parseFloat(formData.advance_deducted || '0');

  const handleFarmerSelect = (farmerId: string) => {
    const farmer = farmers.find(f => f.id === farmerId);
    setFormData({
      ...formData,
      farmer_id: farmerId,
      farmer_name: farmer?.full_name || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPurchase({
      ...formData,
      kgs_purchased: parseFloat(formData.kgs_purchased),
      unit_price: parseFloat(formData.unit_price),
      total_value: totalValue,
      advance_deducted: parseFloat(formData.advance_deducted || '0'),
      moisture_percentage: formData.moisture_percentage ? parseFloat(formData.moisture_percentage) : undefined,
      created_by: user?.email || 'Unknown',
      status: 'Pending Delivery'
    });
    
    // Reset form
    setFormData({
      farmer_id: '',
      farmer_name: '',
      coffee_type: 'Robusta',
      category: 'FAQ',
      kgs_purchased: '',
      unit_price: '',
      advance_deducted: '',
      quality_notes: '',
      moisture_percentage: ''
    });
  };

  const captureGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        console.log('GPS captured:', position.coords);
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Field Purchase Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="farmer">Farmer *</Label>
              <Select
                value={formData.farmer_id}
                onValueChange={handleFarmerSelect}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select farmer" />
                </SelectTrigger>
                <SelectContent>
                  {farmers.map((farmer) => (
                    <SelectItem key={farmer.id} value={farmer.id}>
                      {farmer.full_name} - {farmer.village}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="coffee_type">Coffee Type *</Label>
              <Select
                value={formData.coffee_type}
                onValueChange={(value) => setFormData({ ...formData, coffee_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arabica">Arabica</SelectItem>
                  <SelectItem value="Robusta">Robusta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kgs">Kilograms *</Label>
              <Input
                id="kgs"
                type="number"
                step="0.01"
                required
                value={formData.kgs_purchased}
                onChange={(e) => setFormData({ ...formData, kgs_purchased: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="price">Unit Price (UGX) *</Label>
              <Input
                id="price"
                type="number"
                required
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="advance">Advance Deducted</Label>
              <Input
                id="advance"
                type="number"
                value={formData.advance_deducted}
                onChange={(e) => setFormData({ ...formData, advance_deducted: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="moisture">Moisture %</Label>
              <Input
                id="moisture"
                type="number"
                step="0.1"
                value={formData.moisture_percentage}
                onChange={(e) => setFormData({ ...formData, moisture_percentage: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="quality">Quality Notes</Label>
              <Textarea
                id="quality"
                value={formData.quality_notes}
                onChange={(e) => setFormData({ ...formData, quality_notes: e.target.value })}
                placeholder="Note any defects, foreign matter, or quality observations..."
              />
            </div>
          </div>

          {/* Calculated Values */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Value:</span>
              <span className="text-lg font-bold">UGX {totalValue.toLocaleString()}</span>
            </div>
            {parseFloat(formData.advance_deducted || '0') > 0 && (
              <div className="flex justify-between items-center text-destructive">
                <span className="text-sm">Less Advance:</span>
                <span>- UGX {parseFloat(formData.advance_deducted).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-semibold">Net Payable:</span>
              <span className="text-xl font-bold text-primary">UGX {netAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={captureGPS}>
              <MapPin className="mr-2 h-4 w-4" />
              GPS
            </Button>
            <Button type="button" variant="outline">
              <Camera className="mr-2 h-4 w-4" />
              Photo
            </Button>
            <Button type="submit" className="flex-1">
              <Calculator className="mr-2 h-4 w-4" />
              Submit & Generate Slip
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
