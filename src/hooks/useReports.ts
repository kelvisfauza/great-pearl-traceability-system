
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface Report {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  status: string;
  format: string;
  file_size?: string;
  downloads: number;
  generated_by?: string;
  created_at: string;
  updated_at: string;
}

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching reports from Firebase...');
      
      const reportsQuery = query(collection(db, 'reports'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(reportsQuery);
      
      const reportsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      
      console.log('Firebase reports:', reportsData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reports",
        variant: "destructive"
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportData: {
    name: string;
    type: string;
    category: string;
    format: string;
  }) => {
    try {
      console.log('Generating report in Firebase:', reportData);
      
      const reportDoc = {
        name: reportData.name,
        type: reportData.type,
        category: reportData.category,
        format: reportData.format,
        description: `${reportData.type} report for ${reportData.category}`,
        status: 'Ready',
        file_size: '2.5 MB',
        downloads: 0,
        generated_by: 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'reports'), reportDoc);
      console.log('Report generated with ID:', docRef.id);
      
      toast({
        title: "Success",
        description: "Report generated successfully"
      });
      
      await fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      console.log('Deleting report from Firebase:', reportId);
      
      await deleteDoc(doc(db, 'reports', reportId));
      
      toast({
        title: "Success",
        description: "Report deleted successfully"
      });
      
      await fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
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
    generateReport: {
      mutate: generateReport,
      isLoading: loading
    },
    deleteReport: {
      mutate: deleteReport,
      isLoading: loading
    },
    refetch: fetchReports
  };
};
