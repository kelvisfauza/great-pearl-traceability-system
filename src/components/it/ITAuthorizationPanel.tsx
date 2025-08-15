import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Key, 
  Database, 
  Settings, 
  Users, 
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  Crown,
  Zap,
  GitBranch
} from 'lucide-react';

export const ITAuthorizationPanel: React.FC = () => {
  const [permissions, setPermissions] = useState({
    systemAdmin: true,
    databaseAdmin: true,
    userManagement: true,
    emergencyOverride: true,
    autoFix: true,
    globalSettings: true,
    securityManagement: true,
    backupRestore: true,
    networkManagement: true,
    deploymentControl: false // This would require actual Lovable API integration
  });

  const { toast } = useToast();

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast({
      title: "Permission Updated",
      description: `${key} permission ${!permissions[key] ? 'enabled' : 'disabled'}`,
    });
  };

  const executeEmergencyOverride = () => {
    toast({
      title: "Emergency Override Activated",
      description: "IT department now has full system control",
      variant: "destructive"
    });
  };

  const triggerSystemWideUpdate = () => {
    toast({
      title: "System Update Triggered",
      description: "Applying system-wide fixes and optimizations",
    });
  };

  return (
    <div className="space-y-6">
      {/* IT Authority Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            IT Department Authority Level
          </CardTitle>
          <CardDescription>
            Current permissions and authority granted to IT department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>System Administrator</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.systemAdmin}
                    onCheckedChange={() => togglePermission('systemAdmin')}
                  />
                  <Badge variant={permissions.systemAdmin ? "default" : "secondary"}>
                    {permissions.systemAdmin ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Database Administration</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.databaseAdmin}
                    onCheckedChange={() => togglePermission('databaseAdmin')}
                  />
                  <Badge variant={permissions.databaseAdmin ? "default" : "secondary"}>
                    {permissions.databaseAdmin ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>User Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.userManagement}
                    onCheckedChange={() => togglePermission('userManagement')}
                  />
                  <Badge variant={permissions.userManagement ? "default" : "secondary"}>
                    {permissions.userManagement ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Emergency Override</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.emergencyOverride}
                    onCheckedChange={() => togglePermission('emergencyOverride')}
                  />
                  <Badge variant={permissions.emergencyOverride ? "destructive" : "secondary"}>
                    {permissions.emergencyOverride ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Auto-Fix Authority</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.autoFix}
                    onCheckedChange={() => togglePermission('autoFix')}
                  />
                  <Badge variant={permissions.autoFix ? "default" : "secondary"}>
                    {permissions.autoFix ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Global Settings</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.globalSettings}
                    onCheckedChange={() => togglePermission('globalSettings')}
                  />
                  <Badge variant={permissions.globalSettings ? "default" : "secondary"}>
                    {permissions.globalSettings ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Security Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.securityManagement}
                    onCheckedChange={() => togglePermission('securityManagement')}
                  />
                  <Badge variant={permissions.securityManagement ? "default" : "secondary"}>
                    {permissions.securityManagement ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Backup & Restore</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.backupRestore}
                    onCheckedChange={() => togglePermission('backupRestore')}
                  />
                  <Badge variant={permissions.backupRestore ? "default" : "secondary"}>
                    {permissions.backupRestore ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Network Management</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.networkManagement}
                    onCheckedChange={() => togglePermission('networkManagement')}
                  />
                  <Badge variant={permissions.networkManagement ? "default" : "secondary"}>
                    {permissions.networkManagement ? "Granted" : "Denied"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span>Deployment Control</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={permissions.deploymentControl}
                    onCheckedChange={() => togglePermission('deploymentControl')}
                    disabled
                  />
                  <Badge variant="outline">
                    Platform Limited
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Emergency IT Actions
          </CardTitle>
          <CardDescription>
            High-authority actions available to IT department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={executeEmergencyOverride}
              variant="destructive"
              disabled={!permissions.emergencyOverride}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Emergency Override
            </Button>

            <Button
              onClick={triggerSystemWideUpdate}
              disabled={!permissions.systemAdmin}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              System-Wide Update
            </Button>

            <Button
              variant="outline"
              disabled={!permissions.databaseAdmin}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Database Maintenance
            </Button>

            <Button
              variant="outline"
              disabled={!permissions.securityManagement}
              className="flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Security Audit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Platform Integration Status
          </CardTitle>
          <CardDescription>
            Integration capabilities with external systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Lovable Auto-Fix Integration</p>
                <p className="text-sm text-muted-foreground">
                  Automated error fixing and publishing
                </p>
              </div>
              <Badge variant="outline" className="text-orange-600">
                Not Available
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">GitHub Integration</p>
                <p className="text-sm text-muted-foreground">
                  Code repository management
                </p>
              </div>
              <Badge variant="outline" className="text-green-600">
                Available
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Database Administration</p>
                <p className="text-sm text-muted-foreground">
                  Direct database management and fixes
                </p>
              </div>
              <Badge variant="outline" className="text-green-600">
                Full Access
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">System Monitoring</p>
                <p className="text-sm text-muted-foreground">
                  Real-time error tracking and alerts
                </p>
              </div>
              <Badge variant="outline" className="text-green-600">
                Active
              </Badge>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Direct Lovable platform integration for auto-fix and publish 
              requires platform-level API access which is not currently available. The IT department 
              has maximum authority within the application scope and can perform all database, 
              user management, and system maintenance operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};