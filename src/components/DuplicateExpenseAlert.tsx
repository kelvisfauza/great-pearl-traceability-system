import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DuplicateExpenseAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confidence: number;
  reason: string;
  matchedRequest?: string;
}

export const DuplicateExpenseAlert: React.FC<DuplicateExpenseAlertProps> = ({
  open,
  onOpenChange,
  onConfirm,
  confidence,
  reason,
  matchedRequest
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Possible Duplicate Expense Request
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div className="text-foreground">
              <p className="font-medium">AI detected a similar request:</p>
              <p className="text-sm mt-2">{reason}</p>
              {matchedRequest && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Similar Request:
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {matchedRequest}
                  </p>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{confidence}% similar</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Do you want to proceed with this request anyway?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel Request</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Submit Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
