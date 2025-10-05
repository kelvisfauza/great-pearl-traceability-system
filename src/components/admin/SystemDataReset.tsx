import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertTriangle, Shield, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import JSZip from 'jszip';

const SystemDataReset = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const requiredConfirmText = 'DELETE ALL DATA';

  const downloadAllData = async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().split('T')[0];
      
      toast({
        title: "Starting Backup",
        description: "Collecting data from Firebase and Supabase..."
      });

      // Firebase Collections to backup
      const firebaseCollections = [
        'coffee_records',
        'suppliers',
        'supplier_advances',
        'payment_records',
        'quality_assessments'
      ];

      // Backup Firebase data
      const firebaseFolder = zip.folder('firebase');
      for (const collectionName of firebaseCollections) {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        firebaseFolder?.file(`${collectionName}.json`, JSON.stringify(data, null, 2));
        console.log(`✅ Backed up ${data.length} documents from Firebase ${collectionName}`);
      }

      // Supabase Tables to backup
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
        'audit_logs',
        'employees',
        'company_employees'
      ];

      // Backup Supabase data
      const supabaseFolder = zip.folder('supabase');
      for (const tableName of supabaseTables) {
        try {
          const { data, error } = await supabase
            .from(tableName as any)
            .select('*');
          
          if (!error && data) {
            supabaseFolder?.file(`${tableName}.json`, JSON.stringify(data, null, 2));
            console.log(`✅ Backed up ${data.length} records from Supabase ${tableName}`);
          }
        } catch (err) {
          console.error(`Failed to backup ${tableName}:`, err);
        }
      }

      // Create backup info file
      const backupInfo = {
        backup_date: new Date().toISOString(),
        backup_type: 'complete_system_backup',
        firebase_collections: firebaseCollections,
        supabase_tables: supabaseTables,
        note: 'Complete system backup before data reset'
      };
      zip.file('backup_info.json', JSON.stringify(backupInfo, null, 2));

      // Generate and download zip file
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `farmflow_backup_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Backup Complete",
        description: `All data has been downloaded as farmflow_backup_${timestamp}.zip`,
      });

    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: "Backup Failed",
        description: "Failed to create backup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

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
        console.log(`🗑️ Deleting Firebase collection: ${collectionName}...`);
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        console.log(`📊 Found ${snapshot.size} documents in ${collectionName}`);
        
        for (const docSnapshot of snapshot.docs) {
          await deleteDoc(doc(db, collectionName, docSnapshot.id));
          totalDeleted++;
        }
        
        console.log(`✅ Deleted ${snapshot.size} documents from Firebase ${collectionName}`);
      }

      // Supabase Tables to delete - ordered by foreign key dependencies (children first)
      // EXCLUDING: milling_transactions, milling_customers, milling_cash_transactions, eudr_documents, eudr_batches, store_reports
      const supabaseTables = [
        // Delete child tables first (tables with foreign keys)
        'supplier_payments',
        'supplier_advances',
        'finance_coffee_lots',
        'finance_cash_transactions', // Day book data
        'money_requests', // Salary advances/overtime
        'contract_approvals',
        'supplier_contracts',
        'payment_records',
        'sales_transactions',
        'purchase_orders',
        'inventory_items',
        'daily_tasks',
        'audit_logs',
        'edit_requests',
        'workflow_steps',
        'reports', // Clear reports (but NOT store_reports)
        'metrics', // Clear analytics/metrics data
        'cash_sessions', // Clear finance cash sessions
        
        // Delete parent tables last
        'suppliers',
        'marketing_campaigns',
        'sales_contracts'
      ];

      // Delete from Supabase
      for (const tableName of supabaseTables) {
        try {
          console.log(`🗑️ Attempting to delete from ${tableName}...`);
          
          // First check if table has data
          const { count, error: countError } = await supabase
            .from(tableName as any)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.warn(`⚠️ Could not access ${tableName}:`, countError.message);
            continue;
          }

          if (!count || count === 0) {
            console.log(`ℹ️ ${tableName} is empty, skipping`);
            continue;
          }

          // Delete all records from the table
          const { error } = await supabase
            .from(tableName as any)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
            
          if (error) {
            console.error(`❌ Error deleting from ${tableName}:`, error);
            toast({
              title: "Partial Deletion Error",
              description: `Could not delete from ${tableName}: ${error.message}`,
              variant: "destructive"
            });
          } else {
            console.log(`✅ Deleted all records from Supabase ${tableName}`);
            totalDeleted += count;
          }
        } catch (err: any) {
          console.error(`❌ Failed to delete from ${tableName}:`, err);
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
              <li>All daily tasks and audit logs</li>
              <li>All reports and analytics data</li>
              <li>All finance cash sessions (day book data)</li>
            </ul>
            <p className="mt-2 font-bold text-green-700">PRESERVED (NOT deleted):</p>
            <ul className="list-disc ml-6 mt-1 space-y-1">
              <li>All milling transactions and customers</li>
              <li>All EUDR documentation and batches</li>
              <li>All store reports</li>
            </ul>
            <p className="mt-2 font-bold">This action CANNOT be undone!</p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={downloadAllData}
            disabled={downloading}
            className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
          >
            <Download className="h-5 w-5" />
            {downloading ? 'Downloading Backup...' : 'Download Complete Backup'}
          </Button>
          
          <Button
            variant="destructive"
            size="lg"
            onClick={() => setShowConfirmDialog(true)}
            disabled={downloading}
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