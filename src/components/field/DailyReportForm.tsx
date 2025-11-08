import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

export const DailyReportForm = () => {
  const { submitDailyReport } = useFieldOperationsData();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    district: '',
    villages_visited: '',
    farmers_visited: '',
    total_kgs_mobilized: '',
    challenges: '',
    actions_needed: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const farmersArray = formData.farmers_visited.split(',').map(f => f.trim()).filter(Boolean);
    
    await submitDailyReport({
      ...formData,
      farmers_visited: farmersArray,
      total_kgs_mobilized: parseFloat(formData.total_kgs_mobilized || '0'),
      submitted_by: user?.email || 'Unknown'
    });
    
    // Reset form
    setFormData({
      district: '',
      villages_visited: '',
      farmers_visited: '',
      total_kgs_mobilized: '',
      challenges: '',
      actions_needed: ''
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Field Report - {format(new Date(), 'MMMM dd, yyyy')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="district">District Worked In *</Label>
              <Input
                id="district"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="kgs">Total Kgs Mobilized *</Label>
              <Input
                id="kgs"
                type="number"
                step="0.01"
                required
                value={formData.total_kgs_mobilized}
                onChange={(e) => setFormData({ ...formData, total_kgs_mobilized: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="villages">Villages Visited *</Label>
              <Input
                id="villages"
                required
                placeholder="e.g., Kyambogo, Banda, Ntinda"
                value={formData.villages_visited}
                onChange={(e) => setFormData({ ...formData, villages_visited: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="farmers">Farmers Visited (comma separated)</Label>
              <Input
                id="farmers"
                placeholder="e.g., John Doe, Jane Smith, Peter Okello"
                value={formData.farmers_visited}
                onChange={(e) => setFormData({ ...formData, farmers_visited: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="challenges">Challenges Faced</Label>
              <Textarea
                id="challenges"
                rows={3}
                value={formData.challenges}
                onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                placeholder="Describe any challenges encountered today..."
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="actions">Actions Needed from Office</Label>
              <Textarea
                id="actions"
                rows={3}
                value={formData.actions_needed}
                onChange={(e) => setFormData({ ...formData, actions_needed: e.target.value })}
                placeholder="What support or actions do you need from management?"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Submit Daily Report
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
