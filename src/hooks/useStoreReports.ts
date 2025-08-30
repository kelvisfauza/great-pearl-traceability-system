import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface StoreReport {
  id: string;
  date: string;
  coffee_type: string;
  kilograms_bought: number;
  average_buying_price: number;
  kilograms_sold: number;
  bags_sold: number;
  sold_to: string;
  bags_left: number;
  kilograms_left: number;
  kilograms_unbought: number;
  advances_given: number;
  comments?: string;
  input_by: string;
  attachment_url?: string;
  attachment_name?: string;
  scanner_used?: string;
  created_at: string;
  updated_at: string;
}

export const useStoreReports = () => {
  const [reports, setReports] = useState<StoreReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { employee } = useAuth();

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching store reports from both Supabase and Firebase...');
      
      // Fetch from Supabase first
      const { data: supabaseData, error } = await supabase
        .from('store_reports')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
      }
      
      console.log('Supabase store reports:', supabaseData);
      
      // Also fetch from Firebase to get existing data
      let firebaseData: StoreReport[] = [];
      try {
        const reportsQuery = query(collection(db, 'store_reports'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(reportsQuery);
        
        firebaseData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StoreReport[];
        
        console.log('Firebase store reports:', firebaseData);
      } catch (firebaseError) {
        console.error('Firebase error:', firebaseError);
      }
      
      // Combine both sources, prioritizing Supabase but including Firebase data
      const combinedReports = [...(supabaseData || []), ...firebaseData];
      
      // Remove duplicates based on ID (in case same report exists in both)
      const uniqueReports = combinedReports.filter((report, index, self) => 
        index === self.findIndex(r => r.id === report.id)
      );
      
      // Sort by date
      uniqueReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log('Combined store reports:', uniqueReports);
      setReports(uniqueReports);
    } catch (error) {
      console.error('Error fetching store reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch store reports",
        variant: "destructive"
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const addStoreReport = async (reportData: Omit<StoreReport, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Adding store report to Supabase:', reportData);
      
      const { error } = await supabase
        .from('store_reports')
        .insert([reportData]);

      if (error) throw error;
      
      console.log('Store report added successfully');
      
      toast({
        title: "Success",
        description: "Store report added successfully"
      });
      
      await fetchReports();
    } catch (error) {
      console.error('Error adding store report:', error);
      toast({
        title: "Error",
        description: "Failed to add store report",
        variant: "destructive"
      });
      throw error;
    }
  };

  const directDeleteReport = async (reportId: string, reason: string) => {
    try {
      console.log('Deleting store report from Supabase:', reportId);
      
      // Get the report data before deletion for audit log
      const { data: reportData } = await supabase
        .from('store_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      const { error } = await supabase
        .from('store_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      // Log the deletion
      const auditData = {
        action: 'delete',
        table_name: 'store_reports',
        record_id: reportId,
        reason: reason,
        performed_by: reportData?.input_by || 'Unknown',
        department: 'Store',
        record_data: reportData
      };

      await supabase.from('audit_logs').insert([auditData]);
      
      toast({
        title: "Success",
        description: "Store report deleted successfully"
      });
      
      await fetchReports();
    } catch (error) {
      console.error('Error deleting store report:', error);
      toast({
        title: "Error",
        description: "Failed to delete store report",
        variant: "destructive"
      });
      throw error;
    }
  };

  const directEditReport = async (reportId: string, updatedData: Omit<StoreReport, 'id' | 'created_at' | 'updated_at'>, reason?: string) => {
    try {
      console.log('=== STORE REPORT UPDATE DEBUG ===');
      console.log('Report ID:', reportId);
      console.log('Raw updatedData:', updatedData);
      
      // Clean and validate the data before sending to Supabase
      const cleanedData = {
        date: updatedData.date,
        coffee_type: updatedData.coffee_type || '',
        kilograms_bought: Number(updatedData.kilograms_bought) || 0,
        average_buying_price: Number(updatedData.average_buying_price) || 0,
        kilograms_sold: Number(updatedData.kilograms_sold) || 0,
        bags_sold: Number(updatedData.bags_sold) || 0,
        sold_to: updatedData.sold_to || null,
        bags_left: Number(updatedData.bags_left) || 0,
        kilograms_left: Number(updatedData.kilograms_left) || 0,
        kilograms_unbought: Number(updatedData.kilograms_unbought) || 0,
        advances_given: Number(updatedData.advances_given) || 0,
        comments: updatedData.comments || null,
        input_by: updatedData.input_by || 'Unknown',
        attachment_url: updatedData.attachment_url || null,
        attachment_name: updatedData.attachment_name || null,
        scanner_used: updatedData.scanner_used || null,
        updated_at: new Date().toISOString()
      };
      
      console.log('Cleaned data for Supabase:', cleanedData);
      
      const { error } = await supabase
        .from('store_reports')
        .update(cleanedData)
        .eq('id', reportId);

      console.log('Supabase update error:', error);

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      // Log the action
      const auditData = {
        action: 'edit',
        table_name: 'store_reports',
        record_id: reportId,
        reason: reason || 'Report updated',
        performed_by: cleanedData.input_by,
        department: 'Store',
        record_data: cleanedData
      };

      await supabase.from('audit_logs').insert([auditData]);
      
      console.log('Store report updated successfully');
      
      toast({
        title: "Success",
        description: "Store report updated successfully"
      });
      
      await fetchReports();
      return true;
    } catch (error) {
      console.error('Error updating store report:', error);
      toast({
        title: "Error",
        description: "Failed to update store report. Check console for details.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteStoreReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('store_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      console.log('Store report deleted:', reportId);
      
      toast({
        title: "Success",
        description: "Store report deleted successfully"
      });
      
      await fetchReports();
      return true;
    } catch (error) {
      console.error('Error deleting store report:', error);
      toast({
        title: "Error",
        description: "Failed to delete store report",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const migrateFirebaseToSupabase = async () => {
    try {
      console.log('Starting migration from Firebase to Supabase...');
      
      // Fetch all Firebase data
      const reportsQuery = query(collection(db, 'store_reports'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(reportsQuery);
      
      const firebaseReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoreReport[];
      
      console.log(`Found ${firebaseReports.length} reports in Firebase to migrate`);
      
      if (firebaseReports.length === 0) {
        toast({
          title: "Migration Complete",
          description: "No reports found in Firebase to migrate"
        });
        return;
      }
      
      // Insert into Supabase (exclude the id field as Supabase will generate new ones)
      const reportsToInsert = firebaseReports.map(report => {
        const { id, ...reportData } = report;
        return reportData;
      });
      
      const { error } = await supabase
        .from('store_reports')
        .insert(reportsToInsert);
      
      if (error) throw error;
      
      toast({
        title: "Migration Successful",
        description: `Successfully migrated ${firebaseReports.length} store reports to Supabase`
      });
      
      // Refresh the reports
      await fetchReports();
      
    } catch (error) {
      console.error('Error migrating data:', error);
      toast({
        title: "Migration Failed",
        description: "Failed to migrate reports from Firebase to Supabase",
        variant: "destructive"
      });
    }
  };

  return {
    reports,
    loading,
    addStoreReport,
    directEditReport,
    directDeleteReport,
    deleteStoreReport,
    migrateFirebaseToSupabase,
    refetch: fetchReports
  };
};