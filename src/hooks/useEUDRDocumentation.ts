import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EUDRDocument {
  id: string;
  coffee_type: string;
  total_kilograms: number;
  available_kilograms: number;
  total_receipts: number;
  batch_number: string;
  date: string;
  status: 'documented' | 'partially_sold' | 'sold_out';
  created_at: string;
  updated_at: string;
  documentation_notes?: string;
}

interface EUDRBatch {
  id: string;
  document_id: string;
  batch_sequence: number;
  batch_identifier: string;
  kilograms: number;
  available_kilograms: number;
  receipts: string[];
  status: 'available' | 'partially_sold' | 'sold_out';
  created_at: string;
  updated_at: string;
}

interface EUDRSale {
  id: string;
  document_id: string;
  batch_id: string;
  kilograms: number;
  sold_to: string;
  sale_date: string;
  sale_price: number;
  remaining_batch_kilograms: number;
  batch_identifier: string;
  coffee_type: string;
  created_at: string;
}

export const useEUDRDocumentation = () => {
  const [eudrDocuments, setEudrDocuments] = useState<EUDRDocument[]>([]);
  const [eudrBatches, setEudrBatches] = useState<EUDRBatch[]>([]);
  const [eudrSales, setEudrSales] = useState<EUDRSale[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchEUDRDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eudr_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEudrDocuments((data || []).map(doc => ({
        ...doc,
        status: doc.status as 'documented' | 'partially_sold' | 'sold_out'
      })));
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

  const fetchEUDRBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('eudr_batches')
        .select('*')
        .order('batch_sequence', { ascending: true });

      if (error) throw error;
      setEudrBatches((data || []).map(batch => ({
        ...batch,
        status: batch.status as 'available' | 'partially_sold' | 'sold_out'
      })));
    } catch (error) {
      console.error('Error fetching EUDR batches:', error);
    }
  };

  const fetchEUDRSales = async () => {
    try {
      const { data, error } = await supabase
        .from('eudr_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEudrSales(data || []);
    } catch (error) {
      console.error('Error fetching EUDR sales:', error);
    }
  };

  useEffect(() => {
    fetchEUDRDocuments();
    fetchEUDRBatches();
    fetchEUDRSales();
  }, []);

  const addEUDRDocument = async (documentData: {
    coffee_type: string;
    total_kilograms: number;
    total_receipts: number;
    batch_number?: string;
    documentation_notes?: string;
  }) => {
    try {
      const newDoc = {
        ...documentData,
        available_kilograms: documentData.total_kilograms,
        status: 'documented' as const,
        batch_number: documentData.batch_number || `EUDR${Date.now()}`,
        date: new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase
        .from('eudr_documents')
        .insert(newDoc)
        .select()
        .single();

      if (error) throw error;

      await fetchEUDRDocuments();
      await fetchEUDRBatches();
      toast({
        title: "Success",
        description: "EUDR documentation added successfully with batches"
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

  const updateBatchReceipts = async (batchId: string, receipts: string[]) => {
    try {
      const { error } = await supabase
        .from('eudr_batches')
        .update({ receipts })
        .eq('id', batchId);

      if (error) throw error;
      
      await fetchEUDRBatches();
      toast({
        title: "Success",
        description: "Batch receipts updated successfully"
      });
    } catch (error) {
      console.error('Error updating batch receipts:', error);
      toast({
        title: "Error",
        description: "Failed to update batch receipts",
        variant: "destructive"
      });
      throw error;
    }
  };

  const createEUDRSale = async (saleData: {
    kilograms: number;
    sold_to: string;
    sale_date: string;
    sale_price: number;
    coffee_type?: string;
  }) => {
    try {
      // Get available batches sorted by creation date (FIFO)
      let availableBatches = eudrBatches
        .filter(batch => batch.available_kilograms > 0)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Filter by coffee type if specified
      if (saleData.coffee_type) {
        const matchingDocs = eudrDocuments.filter(doc => doc.coffee_type === saleData.coffee_type);
        availableBatches = availableBatches.filter(batch => 
          matchingDocs.some(doc => doc.id === batch.document_id)
        );
      }

      if (availableBatches.length === 0) {
        throw new Error('No available batches found');
      }

      // Check if sufficient total kilograms available
      const totalAvailable = availableBatches.reduce((total, batch) => total + batch.available_kilograms, 0);
      if (saleData.kilograms > totalAvailable) {
        throw new Error(`Insufficient kilograms available. Available: ${totalAvailable}kg, Requested: ${saleData.kilograms}kg`);
      }

      // Allocate from batches in order
      let remainingToSell = saleData.kilograms;
      const allocations = [];

      for (const batch of availableBatches) {
        if (remainingToSell <= 0) break;

        const document = eudrDocuments.find(doc => doc.id === batch.document_id);
        if (!document) continue;

        const amountFromThisBatch = Math.min(remainingToSell, batch.available_kilograms);
        const remainingBatchKilograms = batch.available_kilograms - amountFromThisBatch;

        allocations.push({
          batch,
          document,
          amountFromThisBatch,
          remainingBatchKilograms
        });

        remainingToSell -= amountFromThisBatch;
      }

      // Create sales for each allocation
      for (const allocation of allocations) {
        const newSale = {
          batch_id: allocation.batch.id,
          document_id: allocation.batch.document_id,
          kilograms: allocation.amountFromThisBatch,
          sold_to: saleData.sold_to,
          sale_date: saleData.sale_date,
          sale_price: saleData.sale_price,
          remaining_batch_kilograms: allocation.remainingBatchKilograms,
          batch_identifier: allocation.batch.batch_identifier,
          coffee_type: allocation.document.coffee_type
        };

        const { error: saleError } = await supabase
          .from('eudr_sales')
          .insert(newSale);

        if (saleError) throw saleError;

        // Update the batch available kilograms and status
        const newBatchStatus = allocation.remainingBatchKilograms === 0 ? 'sold_out' : 'partially_sold';
        
        const { error: batchError } = await supabase
          .from('eudr_batches')
          .update({ 
            available_kilograms: allocation.remainingBatchKilograms,
            status: newBatchStatus
          })
          .eq('id', allocation.batch.id);

        if (batchError) throw batchError;
      }

      await fetchEUDRDocuments();
      await fetchEUDRBatches();
      await fetchEUDRSales();

      const batchesUsed = allocations.map(a => a.batch.batch_identifier).join(', ');
      toast({
        title: "Success",
        description: `Sale of ${saleData.kilograms}kg recorded successfully across batches: ${batchesUsed}`
      });

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
    return (eudrDocuments || []).reduce((total, doc) => total + (doc.available_kilograms || 0), 0);
  };

  const getTotalDocumentedKilograms = () => {
    return (eudrDocuments || []).reduce((total, doc) => total + (doc.total_kilograms || 0), 0);
  };

  const getTotalSoldKilograms = () => {
    return (eudrSales || []).reduce((total, sale) => total + (sale.kilograms || 0), 0);
  };

  const getDocumentsByStatus = (status: EUDRDocument['status']) => {
    return (eudrDocuments || []).filter(doc => doc.status === status);
  };

  const getBatchesForDocument = (documentId: string) => {
    return eudrBatches.filter(batch => batch.document_id === documentId) || [];
  };

  const getSalesForBatch = (batchId: string) => {
    return eudrSales.filter(sale => sale.batch_id === batchId) || [];
  };

  const getAvailableBatches = () => {
    return eudrBatches.filter(batch => batch.available_kilograms > 0) || [];
  };

  return {
    eudrDocuments,
    eudrBatches,
    eudrSales,
    loading,
    addEUDRDocument,
    updateBatchReceipts,
    createEUDRSale,
    fetchEUDRDocuments,
    fetchEUDRBatches,
    fetchEUDRSales,
    getTotalAvailableKilograms,
    getTotalDocumentedKilograms,
    getTotalSoldKilograms,
    getDocumentsByStatus,
    getBatchesForDocument,
    getSalesForBatch,
    getAvailableBatches
  };
};