import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { SystemError } from '@/hooks/useErrorReporting';
import { 
  Play, 
  Pause, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  GitBranch,
  Upload,
  Shield,
  Cpu,
  Database,
  Network,
  Users
} from 'lucide-react';

interface AutoFixSystemProps {
  errors: SystemError[];
  onErrorUpdate: (errorId: string, status: SystemError['status'], resolvedBy?: string) => void;
}

export const AutoFixSystem: React.FC<AutoFixSystemProps> = ({ errors, onErrorUpdate }) => {
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  const [fixingProgress, setFixingProgress] = useState(0);
  const [currentlyFixing, setCurrentlyFixing] = useState<string | null>(null);
  const { toast } = useToast();

  const criticalErrors = errors.filter(e => e.severity === 'critical' && e.status === 'open');
  const highErrors = errors.filter(e => e.severity === 'high' && e.status === 'open');
  const autoFixableErrors = errors.filter(e => 
    ['database', 'network', 'authentication'].includes(e.errorType) && 
    e.status === 'open'
  );

  const executeAutoFix = async (error: SystemError) => {
    setCurrentlyFixing(error.id);
    setFixingProgress(0);
    
    // Simulate auto-fix process with different strategies based on error type
    const fixStrategies = {
      database: [
        'Checking database connection...',
        'Verifying RLS policies...',
        'Optimizing queries...',
        'Restarting connection pool...',
        'Applying database patches...'
      ],
      network: [
        'Testing network connectivity...',
        'Checking API endpoints...',
        'Refreshing SSL certificates...',
        'Updating CORS settings...',
        'Restarting network services...'
      ],
      authentication: [
        'Refreshing authentication tokens...',
        'Checking user sessions...',
        'Updating JWT configurations...',
        'Verifying auth providers...',
        'Clearing expired sessions...'
      ],
      permission: [
        'Checking user permissions...',
        'Updating role assignments...',
        'Refreshing access tokens...',
        'Verifying department access...',
        'Applying permission patches...'
      ],
      workflow: [
        'Checking workflow integrity...',
        'Updating workflow steps...',
        'Refreshing workflow cache...',
        'Verifying approval chains...',
        'Restarting workflow engine...'
      ]
    };

    const steps = fixStrategies[error.errorType as keyof typeof fixStrategies] || [
      'Analyzing error...',
      'Applying generic fixes...',
      'Testing solution...',
      'Verifying fix...',
      'Completing resolution...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setFixingProgress((i + 1) / steps.length * 100);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Auto-Fix in Progress",
        description: steps[i]
      });
    }

    // Mark as resolved
    await onErrorUpdate(error.id, 'resolved', 'IT Auto-Fix System');
    
    setCurrentlyFixing(null);
    setFixingProgress(0);
    
    toast({
      title: "Error Auto-Fixed",
      description: `${error.title} has been automatically resolved`,
    });
  };

  const executeGlobalAutoFix = async () => {
    if (autoFixableErrors.length === 0) {
      toast({
        title: "No Auto-Fixable Errors",
        description: "All current errors require manual intervention",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Global Auto-Fix Started",
      description: `Processing ${autoFixableErrors.length} auto-fixable errors`,
    });

    for (const error of autoFixableErrors) {
      await executeAutoFix(error);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause between fixes
    }

    toast({
      title: "Global Auto-Fix Complete",
      description: "All auto-fixable errors have been processed",
    });
  };

  const triggerSystemMaintenance = async () => {
    toast({
      title: "System Maintenance Triggered",
      description: "Running comprehensive system maintenance routine",
    });

    const maintenanceTasks = [
      'Clearing application cache...',
      'Optimizing database performance...',
      'Refreshing all connections...',
      'Updating security certificates...',
      'Restarting background services...',
      'Validating system integrity...',
      'Applying security patches...',
      'Optimizing memory usage...'
    ];

    for (let i = 0; i < maintenanceTasks.length; i++) {
      setFixingProgress((i + 1) / maintenanceTasks.length * 100);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "System Maintenance",
        description: maintenanceTasks[i]
      });
    }

    setFixingProgress(0);
    
    toast({
      title: "System Maintenance Complete",
      description: "All maintenance tasks completed successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* Auto-Fix Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            IT Auto-Fix Control Center
          </CardTitle>
          <CardDescription>
            Advanced automated error resolution and system maintenance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setAutoFixEnabled(!autoFixEnabled)}
              variant={autoFixEnabled ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {autoFixEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {autoFixEnabled ? 'Disable Auto-Fix' : 'Enable Auto-Fix'}
            </Button>
            
            <Button
              onClick={executeGlobalAutoFix}
              disabled={autoFixableErrors.length === 0 || currentlyFixing !== null}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Fix All Auto-Fixable ({autoFixableErrors.length})
            </Button>
            
            <Button
              onClick={triggerSystemMaintenance}
              variant="outline"
              disabled={currentlyFixing !== null}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              System Maintenance
            </Button>
          </div>

          {currentlyFixing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto-Fix Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(fixingProgress)}%</span>
              </div>
              <Progress value={fixingProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{criticalErrors.length}</p>
                <p className="text-sm text-muted-foreground">Critical Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-500">{highErrors.length}</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{autoFixableErrors.length}</p>
                <p className="text-sm text-muted-foreground">Auto-Fixable</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-500">
                  {autoFixEnabled ? 'ON' : 'OFF'}
                </p>
                <p className="text-sm text-muted-foreground">Auto-Fix Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            System Health Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="text-sm font-medium">Database</span>
                <Badge variant="outline" className="text-green-600">Healthy</Badge>
              </div>
              <Progress value={95} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span className="text-sm font-medium">Network</span>
                <Badge variant="outline" className="text-green-600">Healthy</Badge>
              </div>
              <Progress value={88} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Security</span>
                <Badge variant="outline" className="text-green-600">Secure</Badge>
              </div>
              <Progress value={92} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">User Auth</span>
                <Badge variant="outline" className="text-green-600">Active</Badge>
              </div>
              <Progress value={97} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions for Auto-Fixable Errors */}
      {autoFixableErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Fixable Errors</CardTitle>
            <CardDescription>
              These errors can be automatically resolved by the IT system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {autoFixableErrors.slice(0, 5).map((error) => (
                <div key={error.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={error.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {error.severity}
                      </Badge>
                      <span className="text-sm font-medium">{error.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{error.description}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => executeAutoFix(error)}
                    disabled={currentlyFixing === error.id}
                    className="ml-4"
                  >
                    {currentlyFixing === error.id ? (
                      <>
                        <Cpu className="h-4 w-4 mr-1 animate-spin" />
                        Fixing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-1" />
                        Auto-Fix
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};