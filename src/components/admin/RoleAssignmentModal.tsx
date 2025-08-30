import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebaseEmployees } from '@/hooks/useFirebaseEmployees';
import { useRoleAssignment } from '@/hooks/useRoleAssignment';

interface RoleAssignmentModalProps {
  open: boolean;
  onClose: () => void;
}

const RoleAssignmentModal = ({ open, onClose }: RoleAssignmentModalProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [role, setRole] = useState<'approver' | 'admin_delegate'>('approver');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);

  const { employees } = useFirebaseEmployees();
  const { assignRole } = useRoleAssignment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== ROLE ASSIGNMENT FORM SUBMITTED ===');
    
    if (!selectedEmployeeId || !description) {
      console.log('Form validation failed - missing data');
      return;
    }

    const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
    if (!selectedEmployee) {
      console.log('Selected employee not found');
      return;
    }
    
    console.log('Calling assignRole with:', {
      id: selectedEmployee.id,
      name: selectedEmployee.name,
      email: selectedEmployee.email,
      role
    });

    setLoading(true);

    const success = await assignRole(
      selectedEmployee.id,
      selectedEmployee.name,
      selectedEmployee.email,
      role,
      description,
      expiresAt || undefined
    );

    if (success) {
      setSelectedEmployeeId('');
      setRole('approver');
      setDescription('');
      setExpiresAt('');
      onClose();
    }

    setLoading(false);
  };

  const availableEmployees = employees.filter(emp => 
    emp.role !== 'Administrator' && emp.status === 'Active'
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Select Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} - {employee.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role Type</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'approver' | 'admin_delegate')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approver">Approver (Can approve requests)</SelectItem>
                <SelectItem value="admin_delegate">Admin Delegate (Full admin powers)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description/Reason</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reason for assigning this role..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Expires At (Optional)</Label>
            <Input
              id="expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedEmployeeId || !description}
              className="flex-1"
            >
              {loading ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleAssignmentModal;