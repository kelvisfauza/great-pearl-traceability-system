import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  PERMISSIONS,
  PERMISSION_DETAILS,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSION_PRESETS,
  type PermissionType,
  type RoleType
} from '@/types/permissions';
import { Shield, Save, RotateCcw, User } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  department: string;
  position: string;
}

interface PermissionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onPermissionsUpdated: () => void;
}

const PermissionManagementModal: React.FC<PermissionManagementModalProps> = ({
  isOpen,
  onClose,
  employee,
  onPermissionsUpdated
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (employee) {
      setSelectedPermissions(employee.permissions || []);
      setSelectedRole(employee.role || 'User');
    }
  }, [employee]);

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    // Auto-assign permissions based on role preset
    if (role in ROLE_PERMISSION_PRESETS) {
      const rolePermissions = ROLE_PERMISSION_PRESETS[role as RoleType];
      setSelectedPermissions([...rolePermissions]);
    }
  };

  const handleSavePermissions = async () => {
    if (!employee) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          permissions: selectedPermissions,
          role: selectedRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: "Permissions Updated",
        description: `Successfully updated permissions for ${employee.name}`,
      });

      onPermissionsUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update permissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetToRoleDefaults = () => {
    if (selectedRole in ROLE_PERMISSION_PRESETS) {
      const rolePermissions = ROLE_PERMISSION_PRESETS[selectedRole as RoleType];
      setSelectedPermissions([...rolePermissions]);
    }
  };

  const getPermissionsByCategory = () => {
    const categorized: Record<string, PermissionType[]> = {};
    
    Object.values(PERMISSIONS).forEach(permission => {
      const details = PERMISSION_DETAILS[permission];
      if (details) {
        if (!categorized[details.category]) {
          categorized[details.category] = [];
        }
        categorized[details.category].push(permission);
      }
    });

    return categorized;
  };

  const permissionsByCategory = getPermissionsByCategory();

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions - {employee.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{employee.name}</span>
              <Badge variant="outline">{employee.department}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.position} • {employee.email}
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(ROLE_PERMISSION_PRESETS).map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToRoleDefaults}
                className="shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset to Role Defaults
              </Button>
            </div>
          </div>

          {/* Permissions by Category */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Permissions</h3>
            
            {Object.entries(permissionsByCategory).map(([category, permissions]) => (
              <div key={category} className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 text-primary">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map(permission => {
                    const details = PERMISSION_DETAILS[permission];
                    const isSelected = selectedPermissions.includes(permission);
                    
                    return (
                      <div
                        key={permission}
                        className={`flex items-start space-x-3 p-3 rounded-md border transition-colors ${
                          isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          id={permission}
                          checked={isSelected}
                          onCheckedChange={() => handlePermissionToggle(permission)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={permission}
                            className="text-sm font-medium cursor-pointer block"
                          >
                            {details.name}
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {details.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Current Permissions Summary */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Selected Permissions ({selectedPermissions.length})
            </label>
            <div className="flex flex-wrap gap-1">
              {selectedPermissions.length > 0 ? (
                selectedPermissions.map(permission => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {PERMISSION_DETAILS[permission as PermissionType]?.name || permission}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No permissions selected</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionManagementModal;