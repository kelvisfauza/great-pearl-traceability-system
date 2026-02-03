import { supabase } from '@/integrations/supabase/client';

export const migrateSupplierCodes = async (): Promise<{ success: boolean; updated: number; error?: string }> => {
  try {
    console.log('🔄 Starting supplier code migration...');
    
    // Fetch all suppliers ordered by creation date
    const { data: suppliers, error: fetchError } = await supabase
      .from('suppliers')
      .select('id, code, name, created_at')
      .order('created_at', { ascending: true });
    
    if (fetchError) throw fetchError;
    if (!suppliers || suppliers.length === 0) {
      return { success: true, updated: 0 };
    }
    
    let updatedCount = 0;
    
    // Update each supplier with sequential code
    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i];
      const newCode = `GPC ${(i + 1).toString().padStart(5, '0')}`;
      
      // Only update if code is different
      if (supplier.code !== newCode) {
        const { error: updateError } = await supabase
          .from('suppliers')
          .update({ code: newCode })
          .eq('id', supplier.id);
        
        if (updateError) {
          console.error(`Failed to update supplier ${supplier.name}:`, updateError);
          continue;
        }
        
        console.log(`✅ Updated ${supplier.name}: ${supplier.code} → ${newCode}`);
        updatedCount++;
      }
    }
    
    console.log(`✅ Migration complete. Updated ${updatedCount} supplier codes.`);
    return { success: true, updated: updatedCount };
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return { success: false, updated: 0, error: error.message };
  }
};
