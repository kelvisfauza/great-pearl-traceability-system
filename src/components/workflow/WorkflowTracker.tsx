
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, CheckCircle, XCircle, ArrowRight, Edit, User, MessageSquare } from 'lucide-react';
import { useWorkflowTracking } from '@/hooks/useWorkflowTracking';

interface WorkflowTrackerProps {
  paymentId: string;
  className?: string;
}

export const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({ paymentId, className }) => {
  const { getPaymentWorkflow, loading } = useWorkflowTracking();
  const workflowSteps = getPaymentWorkflow(paymentId);

  const getStepIcon = (action: string) => {
    switch (action) {
      case 'submitted':
        return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'modification_requested':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'modified':
        return <Edit className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStepColor = (action: string) => {
    switch (action) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'modification_requested':
        return 'bg-orange-100 text-orange-800';
      case 'modified':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Workflow History</CardTitle>
          <CardDescription>Loading workflow steps...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Workflow History</CardTitle>
        <CardDescription>
          Track the journey of this payment through departments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {workflowSteps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No workflow history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step.action)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStepColor(step.action)}>
                        {step.action.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {step.from_department} → {step.to_department}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      <User className="h-3 w-3 inline mr-1" />
                      {step.processed_by}
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {new Date(step.timestamp).toLocaleString()}
                    </div>
                    {step.reason && (
                      <div className="text-sm font-medium mb-1">
                        Reason: {step.reason.replace('_', ' ').toLowerCase()}
                      </div>
                    )}
                    {step.comments && (
                      <div className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {step.comments}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
