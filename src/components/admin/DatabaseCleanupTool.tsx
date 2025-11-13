import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Loader2, AlertTriangle, Trash2, Search } from 'lucide-react';

interface DuplicateGroup {
  type: 'batch_number' | 'exact_match';
  identifier: string;
  records: DuplicateRecord[];
}

interface DuplicateRecord {
  id: string;
  source: 'firebase' | 'supabase';
  batch_number: string;
  supplier_name: string;
  kilograms: number;
  date: string;
  coffee_type: string;
  created_at: string;
}

export function DatabaseCleanupTool() {
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const scanForDuplicates = async () => {
    setScanning(true);
    try {
      console.log('🔍 Scanning for duplicates across Firebase and Supabase...');

      // Fetch all records from Firebase
      const firebaseSnapshot = await getDocs(collection(db, 'coffee_records'));
      const firebaseRecords: DuplicateRecord[] = firebaseSnapshot.docs.map(doc => ({
        id: doc.id,
        source: 'firebase' as const,
        batch_number: doc.data().batch_number,
        supplier_name: doc.data().supplier_name,
        kilograms: doc.data().kilograms,
        date: doc.data().date,
        coffee_type: doc.data().coffee_type,
        created_at: doc.data().created_at
      }));

      // Fetch all records from Supabase
      const { data: supabaseRecords, error } = await supabase
        .from('coffee_records')
        .select('*');

      if (error) throw error;

      const allSupabaseRecords: DuplicateRecord[] = (supabaseRecords || []).map(record => ({
        id: record.id,
        source: 'supabase' as const,
        batch_number: record.batch_number,
        supplier_name: record.supplier_name,
        kilograms: record.kilograms,
        date: record.date,
        coffee_type: record.coffee_type,
        created_at: record.created_at
      }));

      const allRecords = [...firebaseRecords, ...allSupabaseRecords];
      console.log(`📊 Total records found: ${allRecords.length} (Firebase: ${firebaseRecords.length}, Supabase: ${allSupabaseRecords.length})`);

      // Find duplicates by batch number
      const batchNumberGroups = new Map<string, DuplicateRecord[]>();
      allRecords.forEach(record => {
        const key = record.batch_number;
        if (!batchNumberGroups.has(key)) {
          batchNumberGroups.set(key, []);
        }
        batchNumberGroups.get(key)!.push(record);
      });

      // Find duplicates by exact match (supplier + weight + date)
      const exactMatchGroups = new Map<string, DuplicateRecord[]>();
      allRecords.forEach(record => {
        const key = `${record.supplier_name}|${record.kilograms}|${record.date}`;
        if (!exactMatchGroups.has(key)) {
          exactMatchGroups.set(key, []);
        }
        exactMatchGroups.get(key)!.push(record);
      });

      const duplicateGroups: DuplicateGroup[] = [];

      // Add batch number duplicates (only if more than 1)
      batchNumberGroups.forEach((records, batch_number) => {
        if (records.length > 1) {
          duplicateGroups.push({
            type: 'batch_number',
            identifier: batch_number,
            records: records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          });
        }
      });

      // Add exact match duplicates (only if more than 1 and not already in batch duplicates)
      exactMatchGroups.forEach((records, key) => {
        if (records.length > 1) {
          // Check if this group is already covered by batch number duplicates
          const alreadyCovered = duplicateGroups.some(group => 
            group.records.some(r => records.some(rec => rec.id === r.id && rec.source === r.source))
          );
          
          if (!alreadyCovered) {
            duplicateGroups.push({
              type: 'exact_match',
              identifier: key,
              records: records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            });
          }
        }
      });

      setDuplicates(duplicateGroups);
      console.log(`✅ Found ${duplicateGroups.length} duplicate groups`);

      toast({
        title: "Scan Complete",
        description: `Found ${duplicateGroups.length} duplicate groups across ${allRecords.length} total records`,
      });
    } catch (error) {
      console.error('Error scanning for duplicates:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to scan for duplicates. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const toggleSelection = (recordId: string, source: string) => {
    const key = `${source}:${recordId}`;
    const newSelection = new Set(selectedForDeletion);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedForDeletion(newSelection);
  };

  const selectAllInGroup = (group: DuplicateGroup, keepFirst: boolean) => {
    const newSelection = new Set(selectedForDeletion);
    group.records.forEach((record, index) => {
      const key = `${record.source}:${record.id}`;
      if (keepFirst) {
        // Keep first (oldest), delete rest
        if (index > 0) {
          newSelection.add(key);
        } else {
          newSelection.delete(key);
        }
      } else {
        // Keep last (newest), delete rest
        if (index < group.records.length - 1) {
          newSelection.add(key);
        } else {
          newSelection.delete(key);
        }
      }
    });
    setSelectedForDeletion(newSelection);
  };

  const deleteDuplicates = async () => {
    if (selectedForDeletion.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select records to delete",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      console.log(`🗑️ Deleting ${selectedForDeletion.size} duplicate records...`);
      
      let deletedCount = 0;
      const errors: string[] = [];

      for (const key of Array.from(selectedForDeletion)) {
        const [source, id] = key.split(':');
        try {
          if (source === 'firebase') {
            await deleteDoc(doc(db, 'coffee_records', id));
            console.log(`✅ Deleted Firebase record: ${id}`);
          } else if (source === 'supabase') {
            const { error } = await supabase
              .from('coffee_records')
              .delete()
              .eq('id', id);
            
            if (error) throw error;
            console.log(`✅ Deleted Supabase record: ${id}`);
          }
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete ${source} record ${id}:`, error);
          errors.push(`${source}:${id}`);
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Partial Success",
          description: `Deleted ${deletedCount} records, but ${errors.length} failed. Check console for details.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cleanup Complete",
          description: `Successfully deleted ${deletedCount} duplicate records`,
        });
      }

      // Clear selection and rescan
      setSelectedForDeletion(new Set());
      await scanForDuplicates();
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete duplicates. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Database Cleanup Tool
        </CardTitle>
        <CardDescription>
          Scan for and remove duplicate coffee records across Firebase and Supabase databases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={scanForDuplicates}
            disabled={scanning}
            variant="outline"
          >
            {scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Scan for Duplicates
              </>
            )}
          </Button>

          {duplicates.length > 0 && (
            <Button
              onClick={deleteDuplicates}
              disabled={deleting || selectedForDeletion.size === 0}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedForDeletion.size})
                </>
              )}
            </Button>
          )}
        </div>

        {duplicates.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Found {duplicates.length} duplicate groups. Select records to delete (typically keep the oldest/first record).
            </div>

            {duplicates.map((group, groupIndex) => (
              <Card key={groupIndex} className="border-orange-200 dark:border-orange-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {group.type === 'batch_number' ? (
                          <>Duplicate Batch: {group.identifier}</>
                        ) : (
                          <>Duplicate Entry: {group.identifier.replace(/\|/g, ' | ')}</>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {group.records.length} records found
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectAllInGroup(group, true)}
                      >
                        Keep First
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => selectAllInGroup(group, false)}
                      >
                        Keep Last
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.records.map((record, recordIndex) => {
                    const key = `${record.source}:${record.id}`;
                    const isSelected = selectedForDeletion.has(key);
                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isSelected ? 'bg-destructive/10 border-destructive' : 'bg-card'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(record.id, record.source)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={record.source === 'firebase' ? 'default' : 'secondary'}>
                              {record.source}
                            </Badge>
                            <Badge variant="outline">
                              {recordIndex === 0 ? 'Oldest' : recordIndex === group.records.length - 1 ? 'Newest' : 'Middle'}
                            </Badge>
                            <span className="text-sm font-medium">{record.batch_number}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {record.supplier_name} • {record.kilograms}kg • {record.coffee_type} • {record.date}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created: {new Date(record.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!scanning && duplicates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Scan for Duplicates" to check for duplicate records
          </div>
        )}
      </CardContent>
    </Card>
  );
}
