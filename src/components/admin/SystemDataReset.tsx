import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const SystemDataReset = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const requiredConfirmText = 'DELETE ALL DATA';

  const deleteAllData = async () => {
    if (confirmText !== requiredConfirmText) {
      toast({
        title: "Confirmation Failed",
        description: `Please type "${requiredConfirmText}" exactly to confirm`,
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);
    try {
      let totalDeleted = 0;

      // Firebase Collections to delete
      const firebaseCollections = [
        'coffee_records',
        'suppliers',
        'supplier_advances',
        'payment_records',
        'quality_assessments'
      ];

      toast({
        title: "Starting Data Deletion",
        description: "This may take a few moments..."
      });

      // Delete from Firebase
      for (const collectionName of firebaseCollections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(doc(db, collectionName, docSnapshot.id));
          totalDeleted++;
        }
        
        console.log(`✅ Deleted ${snapshot.size} documents from Firebase ${collectionName}`);
      }

      // Supabase Tables to delete
      const supabaseTables = [
        'sales_transactions',
        'inventory_items',
        'purchase_orders',
        'supplier_contracts',
        'payment_records',
        'suppliers',
        'marketing_campaigns',
        'customers',
        'sales_contracts',
        'milling_transactions',
        'milling_customers',
        'finance_coffee_lots',
        'cash_transactions',
        'daily_tasks',
        'audit_logs'
      ];

      // Delete from Supabase
      for (const tableName of supabaseTables) {
        try {
          // Use a more specific delete query
          const { data: existingData } = await supabase
            .from(tableName as any)
            .select('id')
            .limit(1000);

          if (existingData && existingData.length > 0) {
            const { error } = await supabase
              .from(tableName as any)
              .delete()
              .in('id', existingData.map((item: any) => item.id));
            
            if (error) {
              console.error(`Error deleting from ${tableName}:`, error);
            } else {
              console.log(`✅ Deleted ${existingData.length} records from Supabase ${tableName}`);
              totalDeleted += existingData.length;
            }
          }
        } catch (err) {
          console.error(`Failed to delete from ${tableName}:`, err);
        }
      }

      // Reset storage locations to default
      await supabase
        .from('storage_locations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      await supabase.from('storage_locations').insert([
        {
          name: 'Store 1',
          capacity: 30000,
          current_occupancy: 0,
          occupancy_percentage: 0
        },
        {
          name: 'Store 2',
          capacity: 40000,
          current_occupancy: 0,
          occupancy_percentage: 0
        }
      ]);

      toast({
        title: "System Reset Complete",
        description: `Successfully deleted all operational data. Total items: ${totalDeleted}. The system is now ready for fresh data.`,
      });

      setShowFinalConfirm(false);
      setConfirmText('');
      
      // Reload page to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error deleting data:', error);
      toast({
        title: "Error",
        description: "Failed to delete all data. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Shield className="h-5 w-5" />
          System Data Reset (Admin Only)
        </CardTitle>
        <CardDescription className="text-red-600">
          Permanently delete all operational data from the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-300 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>DANGER ZONE:</strong> This action will permanently delete ALL data including:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>All coffee records and inventory</li>
              <li>All suppliers and supplier advances</li>
              <li>All payment records and transactions</li>
              <li>All quality assessments</li>
              <li>All sales transactions</li>
              <li>All purchase orders and contracts</li>
              <li>All milling transactions</li>
              <li>All daily tasks and audit logs</li>
            </ul>
            <p className="mt-2 font-bold">This action CANNOT be undone!</p>
          </AlertDescription>
        </Alert>

        <div className="flex justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowConfirmDialog(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            Delete All System Data
          </Button>
        </div>

        {/* First Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will permanently delete ALL operational data from the system.</p>
                <p className="font-semibold">User accounts and employee records will NOT be deleted.</p>
                <p className="text-red-600 font-bold">This action cannot be undone!</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowConfirmDialog(false);
                  setShowFinalConfirm(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Final Confirmation Dialog with Text Input */}
        <AlertDialog open={showFinalConfirm} onOpenChange={setShowFinalConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Final Confirmation Required
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>To confirm this action, please type the following text exactly:</p>
                <p className="font-mono font-bold text-center text-lg bg-gray-100 p-2 rounded">
                  {requiredConfirmText}
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmText">Confirmation Text</Label>
                  <Input
                    id="confirmText"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={`Type "${requiredConfirmText}" to confirm`}
                    className="font-mono"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setConfirmText('');
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteAllData}
                disabled={confirmText !== requiredConfirmText || deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default SystemDataReset;