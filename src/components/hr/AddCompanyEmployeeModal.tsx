import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompanyEmployee } from '@/hooks/useCompanyEmployees';

interface AddCompanyEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CompanyEmployee, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  employee?: CompanyEmployee | null;
}

const departments = [
  'Human Resources',
  'Finance', 
  'Operations',
  'Marketing',
  'IT',
  'Quality Control',
  'Procurement',
  'Logistics',
  'Store',
  'Field Operations',
  'Milling',
  'Security',
  'Maintenance'
];

const AddCompanyEmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  employee
}: AddCompanyEmployeeModalProps) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    phone: '',
    address: '',
    position: '',
    department: '',
    base_salary: 0,
    allowances: 0,
    deductions: 0,
    hire_date: new Date().toISOString().split('T')[0],
    status: 'Active'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_id: employee.employee_id,
        full_name: employee.full_name,
        phone: employee.phone || '',
        address: employee.address || '',
        position: employee.position,
        department: employee.department,
        base_salary: employee.base_salary,
        allowances: employee.allowances,
        deductions: employee.deductions,
        hire_date: employee.hire_date,
        status: employee.status
      });
    } else {
      setFormData({
        employee_id: '',
        full_name: '',
        phone: '',
        address: '',
        position: '',
        department: '',
        base_salary: 0,
        allowances: 0,
        deductions: 0,
        hire_date: new Date().toISOString().split('T')[0],
        status: 'Active'
      });
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => handleInputChange('employee_id', e.target.value)}
                placeholder="EMP001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+256 700 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="Job title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange('department', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date *</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => handleInputChange('hire_date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_salary">Base Salary (UGX) *</Label>
              <Input
                id="base_salary"
                type="number"
                min="0"
                value={formData.base_salary}
                onChange={(e) => handleInputChange('base_salary', Number(e.target.value))}
                placeholder="500000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances (UGX)</Label>
              <Input
                id="allowances"
                type="number"
                min="0"
                value={formData.allowances}
                onChange={(e) => handleInputChange('allowances', Number(e.target.value))}
                placeholder="50000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions (UGX)</Label>
              <Input
                id="deductions"
                type="number"
                min="0"
                value={formData.deductions}
                onChange={(e) => handleInputChange('deductions', Number(e.target.value))}
                placeholder="25000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter employee address"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyEmployeeModal;