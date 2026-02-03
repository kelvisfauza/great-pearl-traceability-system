import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  origin: string;
  opening_balance: number;
  date_registered: string;
  created_at: string;
  updated_at: string;
}

// Normalize name for comparison (lowercase, remove extra spaces, common variations)
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // normalize multiple spaces to single
    .replace(/[^a-z0-9\s]/g, ''); // remove special characters
};

// Calculate similarity between two strings (Levenshtein distance based)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  // Check if one contains the other
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.9;
  }
  
  // Simple word overlap check
  const words1 = s1.split(' ').filter(w => w.length > 2);
  const words2 = s2.split(' ').filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  if (commonWords.length > 0 && (commonWords.length >= words1.length * 0.5 || commonWords.length >= words2.length * 0.5)) {
    return 0.85;
  }
  
  return 0;
};

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingSupplier?: Supplier;
  similarity?: number;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      console.log('Fetching suppliers from Supabase only (excluding old Firebase data)...');
      
      // Fetch ONLY from Supabase - no Firebase
      const { data: supabaseData, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) console.error('Supabase error:', error);
      
      const supabaseSuppliers = (supabaseData || []).map(supplier => ({
        ...supplier,
        date_registered: supplier.date_registered || new Date().toISOString().split('T')[0]
      })) as Supplier[];
      
      console.log('✅ Supabase suppliers only:', supabaseSuppliers.length);
      
      setSuppliers(supabaseSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if a supplier with similar name already exists
  const checkDuplicateSupplier = (name: string): DuplicateCheckResult => {
    const normalizedNewName = normalizeName(name);
    
    for (const supplier of suppliers) {
      const similarity = calculateSimilarity(name, supplier.name);
      
      // Exact match (after normalization)
      if (normalizeName(supplier.name) === normalizedNewName) {
        return { isDuplicate: true, existingSupplier: supplier, similarity: 1 };
      }
      
      // Similar name (85%+ similarity)
      if (similarity >= 0.85) {
        return { isDuplicate: true, existingSupplier: supplier, similarity };
      }
    }
    
    return { isDuplicate: false };
  };

  const addSupplier = async (supplierData: {
    name: string;
    phone: string;
    origin: string;
    opening_balance: number;
  }, skipDuplicateCheck = false): Promise<{ success: boolean; duplicateDetected?: boolean; existingSupplier?: Supplier }> => {
    // Check for duplicates first (unless explicitly skipped)
    if (!skipDuplicateCheck) {
      const duplicateCheck = checkDuplicateSupplier(supplierData.name);
      
      if (duplicateCheck.isDuplicate && duplicateCheck.existingSupplier) {
        const isExactMatch = duplicateCheck.similarity === 1;
        
        if (isExactMatch) {
          // Exact match - don't allow at all
          toast({
            title: "Duplicate Supplier",
            description: `Supplier "${duplicateCheck.existingSupplier.name}" already exists in the system.`,
            variant: "destructive"
          });
          return { success: false, duplicateDetected: true, existingSupplier: duplicateCheck.existingSupplier };
        }
        
        // Similar name - return info so UI can prompt for confirmation
        return { 
          success: false, 
          duplicateDetected: true, 
          existingSupplier: duplicateCheck.existingSupplier 
        };
      }
    }
    
    try {
      console.log('Adding supplier to Supabase (new suppliers go to Supabase only):', supplierData);
      
      // Generate sequential supplier code like GPC 00001
      const existingCodes = suppliers
        .map(s => s.code)
        .filter(c => c.startsWith('GPC '))
        .map(c => parseInt(c.replace('GPC ', ''), 10))
        .filter(n => !isNaN(n));
      
      const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
      const newCode = `GPC ${nextNumber.toString().padStart(5, '0')}`;
      
      const supplierToAdd = {
        name: supplierData.name.trim(),
        origin: supplierData.origin,
        phone: supplierData.phone || null,
        code: newCode,
        opening_balance: supplierData.opening_balance || 0,
        date_registered: new Date().toISOString().split('T')[0]
      };

      console.log('Supplier object to add:', supplierToAdd);

      const { error } = await supabase
        .from('suppliers')
        .insert(supplierToAdd);

      if (error) throw error;
      
      console.log('Supplier added successfully');
      toast({
        title: "Success",
        description: "Supplier added successfully"
      });
      
      await fetchSuppliers(); // Refresh the list
      return { success: true };
    } catch (error: any) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive"
      });
      return { success: false };
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const updateSupplier = async (supplierId: string, updates: {
    name: string;
    phone: string;
    origin: string;
  }) => {
    try {
      console.log('🔄 Updating supplier info only (not affecting transactions):', supplierId, updates);
      
      // Only update the main supplier record - transactions stay linked via supplier_id
      const { error: supplierError } = await supabase
        .from('suppliers')
        .update({
          name: updates.name,
          phone: updates.phone || null,
          origin: updates.origin,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (supplierError) throw supplierError;
      
      console.log('✅ Supplier record updated (transactions remain unchanged)');
      toast({
        title: "Success",
        description: "Supplier information updated"
      });
      
      await fetchSuppliers();
      
      return true;
    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      toast({
        title: "Error",
        description: "Failed to update supplier information",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    suppliers,
    loading,
    fetchSuppliers,
    addSupplier,
    updateSupplier,
    checkDuplicateSupplier,
    refetchSuppliers: fetchSuppliers
  };
};
