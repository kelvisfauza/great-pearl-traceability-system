import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOvertimeAwards } from '@/hooks/useOvertimeAwards';
import { useUnifiedEmployees } from '@/hooks/useUnifiedEmployees';
import { Clock, DollarSign } from 'lucide-react';

interface OvertimeAwardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OvertimeAwardModal = ({ open, onOpenChange }: OvertimeAwardModalProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { createOvertimeAward } = useOvertimeAwards();
  const { employees } = useUnifiedEmployees();

  const activeEmployees = employees.filter(emp => emp.status === 'Active');
  const selectedEmployee = activeEmployees.find(emp => emp.id === selectedEmployeeId);

  // Calculate total amount (4000 UGX per hour)
  const totalMinutes = (hours * 60) + minutes;
  const totalAmount = (totalMinutes / 60) * 4000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) return;

    setSubmitting(true);

    const success = await createOvertimeAward(
      selectedEmployee.id,
      selectedEmployee.name,
      selectedEmployee.email,
      selectedEmployee.department,
      hours,
      minutes,
      notes
    );

    setSubmitting(false);

    if (success) {
      // Reset form
      setSelectedEmployeeId('');
      setHours(0);
      setMinutes(0);
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Award Overtime
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hours</Label>
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Minutes</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Amount:</span>
              <span className="text-lg font-bold flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {totalAmount.toLocaleString()} UGX
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Rate: 4,000 UGX per hour
            </div>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this overtime..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedEmployeeId || (hours === 0 && minutes === 0) || submitting}
              className="flex-1"
            >
              {submitting ? 'Awarding...' : 'Award Overtime'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
