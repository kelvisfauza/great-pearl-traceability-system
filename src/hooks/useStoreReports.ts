import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
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
  comments: string;
  input_by: string;
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
      console.log('Fetching store reports from Firebase...');
      
      const reportsQuery = query(collection(db, 'store_reports'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(reportsQuery);
      
      const reportsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StoreReport[];
      
      console.log('Firebase store reports:', reportsData);
      setReports(reportsData);
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
      console.log('Adding store report to Firebase:', reportData);
      
      const reportDoc = {
        ...reportData,
        input_by: employee?.name || reportData.input_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'store_reports'), reportDoc);
      console.log('Store report added with ID:', docRef.id);
      
      toast({
        title: "Success",
        description: "Store report saved successfully"
      });
      
      await fetchReports();
      return docRef.id;
    } catch (error) {
      console.error('Error adding store report:', error);
      toast({
        title: "Error",
        description: "Failed to save store report",
        variant: "destructive"
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    loading,
    addStoreReport,
    refetch: fetchReports
  };
};