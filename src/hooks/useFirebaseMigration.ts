import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MigrationProgress {
  collection: string;
  total: number;
  migrated: number;
  skipped: number;
  errors: string[];
  status: 'idle' | 'running' | 'completed' | 'error';
}

export const useFirebaseMigration = () => {
  const [progress, setProgress] = useState<Record<string, MigrationProgress>>({});
  const [isMigrating, setIsMigrating] = useState(false);
  const { toast } = useToast();

  const migrateCollection = async (collectionName: string) => {
    setProgress(prev => ({
      ...prev,
      [collectionName]: {
        collection: collectionName,
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: [],
        status: 'running'
      }
    }));

    try {
      console.log(`Fetching ${collectionName} from Firebase...`);
      
      // Fetch all documents from Firebase collection
      const querySnapshot = await getDocs(collection(db, collectionName));
      const firebaseData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Found ${firebaseData.length} documents in ${collectionName}`);

      setProgress(prev => ({
        ...prev,
        [collectionName]: {
          ...prev[collectionName],
          total: firebaseData.length
        }
      }));

      if (firebaseData.length === 0) {
        setProgress(prev => ({
          ...prev,
          [collectionName]: {
            ...prev[collectionName],
            status: 'completed'
          }
        }));
        return { success: true, count: 0 };
      }

      // Call edge function to migrate
      const { data, error } = await supabase.functions.invoke('migrate-firebase-data', {
        body: {
          collection: collectionName,
          firebaseData
        }
      });

      if (error) throw error;

      const result = data.result;
      
      setProgress(prev => ({
        ...prev,
        [collectionName]: {
          collection: collectionName,
          total: result.total,
          migrated: result.migrated,
          skipped: result.skipped,
          errors: result.errors,
          status: 'completed'
        }
      }));

      return { success: true, result };

    } catch (error) {
      console.error(`Error migrating ${collectionName}:`, error);
      
      setProgress(prev => ({
        ...prev,
        [collectionName]: {
          ...prev[collectionName],
          status: 'error',
          errors: [...prev[collectionName].errors, error instanceof Error ? error.message : String(error)]
        }
      }));

      return { success: false, error };
    }
  };

  const migrateAllData = async () => {
    setIsMigrating(true);
    
    const collections = [
      'store_reports',
      'coffee_records',
      'payment_records',
      'supplier_advances',
      'daily_tasks'
    ];

    toast({
      title: "Migration Started",
      description: `Migrating ${collections.length} collections from Firebase to Supabase...`
    });

    const results = [];

    for (const collectionName of collections) {
      const result = await migrateCollection(collectionName);
      results.push({ collection: collectionName, ...result });
    }

    setIsMigrating(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    toast({
      title: failCount === 0 ? "Migration Completed" : "Migration Completed with Errors",
      description: `${successCount} collections migrated successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      variant: failCount > 0 ? "destructive" : "default"
    });

    return results;
  };

  const clearProgress = () => {
    setProgress({});
  };

  return {
    progress,
    isMigrating,
    migrateCollection,
    migrateAllData,
    clearProgress
  };
};