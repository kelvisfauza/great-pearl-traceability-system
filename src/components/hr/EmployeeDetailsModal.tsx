import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, Settings, Clock } from "lucide-react";

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
}

const EmployeeDetailsModal = ({ isOpen, onClose, employee }: EmployeeDetailsModalProps) => {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", position: "", department: "", salary: "",
    address: "", emergency_contact: "", role: "", permissions: [] as string[],
    status: "Active"
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const departments = ["Operations", "Quality Control", "Production", "Administration", "Finance", "Sales & Marketing", "HR", "Milling"];
  const roles = ["Administrator", "Manager", "Supervisor", "User", "Guest"];
  const systemPermissions = [
    "Procurement Access", "Quality Control", "Processing", "Inventory Management",
    "Store Management", "Sales & Marketing", "Finance", "Field Operations",
    "Human Resources", "Reports", "Settings", "Data Analytics", "Logistics", "Milling"
  ];

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        position: employee.position || "",
        department: employee.department || "",
        salary: employee.salary?.toString() || "",
        address: employee.address || "",
        emergency_contact: employee.emergency_contact || "",
        role: employee.role || "User",
        permissions: employee.permissions || [],
        status: employee.status || "Active"
      });
    }
  }, [employee]);

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.position.trim() || !formData.department.trim()) {
      toast({
        title: "Validation Error",
        description: "Name, email, position, and department are required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { updateEmployeePermissions } = await import('@/utils/updateEmployeePermissions');
      
      await updateEmployeePermissions(formData.email, {
        role: formData.role,
        permissions: formData.permissions,
        position: formData.position,
        department: formData.department
      });

      // Update local state
      Object.assign(employee, {
        ...formData,
        salary: parseInt(formData.salary) || 0
      });

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Employee details updated successfully"
      });
      
      // Close modal to refresh data
      onClose();
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee details",
        variant: "destructive"
      });
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Employee Details</DialogTitle>
              <DialogDescription>View and manage employee information</DialogDescription>
            </div>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">
              <User className="h-4 w-4 mr-2" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="employment">
              <Briefcase className="h-4 w-4 mr-2" />
              Employment
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Settings className="h-4 w-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">{employee.name}</p>
                )}
              </div>
              <div>
                <Label>Employee ID</Label>
                <p className="p-2 bg-gray-50 rounded">{employee.employee_id || "Not Set"}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">{employee.email || "Not provided"}</p>
                )}
              </div>
              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">{employee.phone || "Not provided"}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Address</Label>
              {isEditing ? (
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded min-h-[60px]">{employee.address || "Not provided"}</p>
              )}
            </div>

            <div>
              <Label>Emergency Contact</Label>
              {isEditing ? (
                <Input
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                />
              ) : (
                <p className="p-2 bg-gray-50 rounded">{employee.emergency_contact || "Not provided"}</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="employment" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                {isEditing ? (
                  <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="p-2 bg-gray-50 rounded">{employee.department}</p>
                )}
              </div>
              <div>
                <Label>Position</Label>
                {isEditing ? (
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">{employee.position}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Salary (UGX)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                  />
                ) : (
                  <p className="p-2 bg-gray-50 rounded">UGX {employee.salary?.toLocaleString()}</p>
                )}
              </div>
              <div>
                <Label>Status</Label>
                {isEditing ? (
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                    {employee.status}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <Label>Join Date</Label>
              <p className="p-2 bg-gray-50 rounded">{new Date(employee.join_date).toLocaleDateString()}</p>
            </div>
          </TabsContent>
          
          <TabsContent value="permissions" className="space-y-4">
            <div>
              <Label>System Role</Label>
              {isEditing ? (
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{employee.role || "User"}</Badge>
              )}
            </div>

            <div>
              <Label>System Permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
                {systemPermissions.map(permission => (
                  <label key={permission} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission)}
                      onChange={(e) => isEditing && handlePermissionChange(permission, e.target.checked)}
                      disabled={!isEditing}
                    />
                    <span>{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 border rounded">
                <p className="font-medium">Employee Added</p>
                <p className="text-sm text-gray-500">Joined on {new Date(employee.join_date).toLocaleDateString()}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="font-medium">Last Updated</p>
                <p className="text-sm text-gray-500">{new Date(employee.updated_at).toLocaleDateString()}</p>
              </div>
              <div className="p-3 border rounded">
                <p className="font-medium">Performance Reviews</p>
                <p className="text-sm text-gray-500">No reviews recorded yet</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDetailsModal;
