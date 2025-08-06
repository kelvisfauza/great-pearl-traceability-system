import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';
import { useToast } from '@/hooks/use-toast';

interface EUDRDocument {
  id: string;
  coffeeType: string;
  totalKilograms: number;
  availableKilograms: number;
  receipts: string[];
  batchNumber: string;
  supplierName: string;
  date: string;
  status: 'documented' | 'partially_sold' | 'sold_out';
  created_at: string;
  updated_at: string;
  documentationNotes?: string;
}

interface EUDRSale {
  id: string;
  eudrDocumentId: string;
  kilograms: number;
  soldTo: string;
  saleDate: string;
  salePrice: number;
  remainingKilograms: number;
  created_at: string;
  batchNumber: string;
  coffeeType: string;
}

export const useEUDRDocumentation = () => {
  const [eudrDocuments, setEudrDocuments] = useState<EUDRDocument[]>([]);
  const [eudrSales, setEudrSales] = useState<EUDRSale[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEUDRDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await firebaseClient
        .from('eudr_documents')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (error) throw error;
      setEudrDocuments(data || []);
    } catch (error) {
      console.error('Error fetching EUDR documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch EUDR documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEUDRSales = async () => {
    try {
      const { data, error } = await firebaseClient
        .from('eudr_sales')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (error) throw error;
      setEudrSales(data || []);
    } catch (error) {
      console.error('Error fetching EUDR sales:', error);
    }
  };

  useEffect(() => {
    fetchEUDRDocuments();
    fetchEUDRSales();
  }, []);

  const addEUDRDocument = async (documentData: Omit<EUDRDocument, 'id' | 'created_at' | 'updated_at' | 'availableKilograms' | 'status'>) => {
    try {
      const newDoc = {
        ...documentData,
        availableKilograms: documentData.totalKilograms,
        status: 'documented' as const,
        batchNumber: documentData.batchNumber || `EUDR${Date.now()}`
      };

      const { data, error } = await firebaseClient
        .from('eudr_documents')
        .insert(newDoc);

      if (error) throw error;

      await fetchEUDRDocuments();
      toast({
        title: "Success",
        description: "EUDR documentation added successfully"
      });

      return data;
    } catch (error) {
      console.error('Error adding EUDR document:', error);
      toast({
        title: "Error",
        description: "Failed to add EUDR documentation",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createEUDRSale = async (saleData: Omit<EUDRSale, 'id' | 'created_at' | 'remainingKilograms'>) => {
    try {
      // Find the EUDR document
      const eudrDoc = eudrDocuments.find(doc => doc.id === saleData.eudrDocumentId);
      if (!eudrDoc) {
        throw new Error('EUDR document not found');
      }

      // Check if sufficient kilograms available
      if (saleData.kilograms > eudrDoc.availableKilograms) {
        throw new Error('Insufficient kilograms available for sale');
      }

      // Calculate remaining kilograms
      const remainingKilograms = eudrDoc.availableKilograms - saleData.kilograms;

      // Create the sale record
      const newSale = {
        ...saleData,
        remainingKilograms,
        coffeeType: eudrDoc.coffeeType,
        batchNumber: eudrDoc.batchNumber
      };

      const { data: saleData_result, error: saleError } = await firebaseClient
        .from('eudr_sales')
        .insert(newSale);

      if (saleError) throw saleError;

      // Update the EUDR document with new available kilograms and status
      const newStatus = remainingKilograms === 0 ? 'sold_out' : 'partially_sold';
      
      // Update the document in the eudrDocuments array locally for immediate UI update
      setEudrDocuments(prev => prev.map(doc => 
        doc.id === saleData.eudrDocumentId 
          ? { ...doc, availableKilograms: remainingKilograms, status: newStatus, updated_at: new Date().toISOString() }
          : doc
      ));

      await fetchEUDRDocuments();
      await fetchEUDRSales();

      toast({
        title: "Success",
        description: `Sale recorded successfully. ${remainingKilograms}kg remaining.`
      });

      return saleData_result;
    } catch (error) {
      console.error('Error creating EUDR sale:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create EUDR sale",
        variant: "destructive"
      });
      throw error;
    }
  };

  const getTotalAvailableKilograms = () => {
    return eudrDocuments.reduce((total, doc) => total + doc.availableKilograms, 0);
  };

  const getTotalDocumentedKilograms = () => {
    return eudrDocuments.reduce((total, doc) => total + doc.totalKilograms, 0);
  };

  const getTotalSoldKilograms = () => {
    return eudrSales.reduce((total, sale) => total + sale.kilograms, 0);
  };

  const getDocumentsByStatus = (status: EUDRDocument['status']) => {
    return eudrDocuments.filter(doc => doc.status === status);
  };

  const getSalesForDocument = (documentId: string) => {
    return eudrSales.filter(sale => sale.eudrDocumentId === documentId);
  };

  return {
    eudrDocuments,
    eudrSales,
    loading,
    addEUDRDocument,
    createEUDRSale,
    fetchEUDRDocuments,
    fetchEUDRSales,
    getTotalAvailableKilograms,
    getTotalDocumentedKilograms,
    getTotalSoldKilograms,
    getDocumentsByStatus,
    getSalesForDocument
  };
};