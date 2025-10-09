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
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  MODULE_ACTIONS,
  ACTION_DESCRIPTIONS,
  GRANULAR_ROLE_PRESETS,
  createPermission,
  type PermissionModule,
  type PermissionAction,
} from '@/types/granularPermissions';
import { Shield, Save, RotateCcw, User, Check, X } from 'lucide-react';

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
    if (role in GRANULAR_ROLE_PRESETS) {
      setSelectedPermissions([...GRANULAR_ROLE_PRESETS[role]]);
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
    if (selectedRole in GRANULAR_ROLE_PRESETS) {
      setSelectedPermissions([...GRANULAR_ROLE_PRESETS[selectedRole]]);
    }
  };

  const toggleModuleAction = (module: PermissionModule, action: PermissionAction) => {
    const permission = createPermission(module, action);
    handlePermissionToggle(permission);
  };

  const isActionSelected = (module: PermissionModule, action: PermissionAction): boolean => {
    if (selectedPermissions.includes('*')) return true;
    const permission = createPermission(module, action);
    return selectedPermissions.includes(permission);
  };

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
                  {Object.keys(GRANULAR_ROLE_PRESETS).map(role => (
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

          {/* Granular Permissions Matrix */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Module Permissions</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left font-medium">Module</th>
                    {Object.values(PERMISSION_ACTIONS).map(action => (
                      <th key={action} className="border p-2 text-center text-xs font-medium capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PERMISSION_MODULES).map(([key, module]) => {
                    const availableActions = MODULE_ACTIONS[module] || [];
                    
                    return (
                      <tr key={key} className="hover:bg-muted/30">
                        <td className="border p-2 font-medium">{module}</td>
                        {Object.values(PERMISSION_ACTIONS).map(action => {
                          const isAvailable = availableActions.includes(action);
                          const isSelected = isActionSelected(module, action);
                          
                          return (
                            <td key={action} className="border p-2 text-center">
                              {isAvailable ? (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleModuleAction(module, action)}
                                  className="mx-auto"
                                />
                              ) : (
                                <X className="h-4 w-4 mx-auto text-muted-foreground/30" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-muted/50 rounded p-3 text-xs">
              <p className="font-medium mb-2">Action Descriptions:</p>
              <ul className="grid grid-cols-2 gap-2">
                {Object.entries(ACTION_DESCRIPTIONS).map(([action, description]) => (
                  <li key={action}>
                    <span className="font-medium capitalize">{action}:</span> {description}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Current Permissions Summary */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Selected Permissions ({selectedPermissions.length})
            </label>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {selectedPermissions.length > 0 ? (
                selectedPermissions.includes('*') ? (
                  <Badge variant="default" className="text-xs">All Permissions (Administrator)</Badge>
                ) : (
                  selectedPermissions.map(permission => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))
                )
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