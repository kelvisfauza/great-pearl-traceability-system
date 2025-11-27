import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  id: string;
  coffeeType: string;
  totalBags: number;
  totalKilograms: number;
  location: string;
  status: string;
  batchNumbers: string[];
  lastUpdated: string;
}

export interface StorageLocation {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
}

export const useInventoryManagement = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      // Fetch coffee_records from Supabase (original deliveries)
      const { data: coffeeRecords, error: coffeeError } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (coffeeError) {
        console.error('Error fetching coffee records from Supabase:', coffeeError);
        setInventoryItems([]);
      } else if (coffeeRecords && coffeeRecords.length > 0) {
        console.log('📦 Coffee records from Supabase (original deliveries):', coffeeRecords.length);
        
        // Get all sales tracking to calculate what's been sold
        const { data: salesTracking } = await supabase
          .from('sales_inventory_tracking')
          .select('coffee_record_id, quantity_kg');
        
        console.log('🛒 Sales tracking records:', salesTracking?.length || 0);
        
        // Calculate sold quantities per record
        const soldByRecord: Record<string, number> = {};
        salesTracking?.forEach(sale => {
          soldByRecord[sale.coffee_record_id] = (soldByRecord[sale.coffee_record_id] || 0) + Number(sale.quantity_kg);
        });
        
        // Transform coffee_records into inventory items with AVAILABLE quantities
        // Filter out rejected batches from inventory
        const transformedInventory: InventoryItem[] = coffeeRecords
          .filter((record: any) => record.status !== 'rejected') // Exclude rejected batches
          .map((record: any) => {
            const originalKg = Number(record.kilograms || 0);
            const soldKg = soldByRecord[record.id] || 0;
            const availableKg = originalKg - soldKg;
            
            console.log(`📊 Batch ${record.batch_number}: Status=${record.status}, Original=${originalKg}kg, Sold=${soldKg}kg, Available=${availableKg}kg`);
            
            return {
              id: record.id,
              coffeeType: record.coffee_type || 'Arabica',
              totalBags: record.bags || 0,
              totalKilograms: Math.max(0, availableKg), // Available = Original - Sold
              location: 'Store 1',
              status: availableKg <= 0 ? 'out_of_stock' : availableKg < 100 ? 'low_stock' : 'available',
              batchNumbers: [record.batch_number || 'N/A'],
              lastUpdated: record.updated_at || record.created_at || new Date().toISOString()
            };
          })
          .filter(item => item.totalKilograms > 0); // Only show items with available stock
        
        console.log('✅ Available inventory (after sales):', transformedInventory.length, 'items');
        setInventoryItems(transformedInventory);
      } else {
        console.log('No coffee records found in Supabase');
        setInventoryItems([]);
      }

      // Calculate total occupancy from AVAILABLE quantities only
      const totalAvailableKg = inventoryItems.reduce((sum, item) => sum + item.totalKilograms, 0);

      console.log('📊 Total available kilograms (original - sold):', totalAvailableKg);

      // Create or update storage locations
      const defaultStorageLocations: StorageLocation[] = [
        {
          id: '1',
          name: 'Store 1',
          capacity: 30000,
          currentOccupancy: totalAvailableKg,
          occupancyPercentage: Math.round((totalAvailableKg / 30000) * 100)
        },
        {
          id: '2',
          name: 'Store 2',
          capacity: 40000,
          currentOccupancy: 0,
          occupancyPercentage: 0
        }
      ];
      
      setStorageLocations(defaultStorageLocations);
      
    } catch (error) {
      console.error('Error fetching inventory data from Supabase:', error);
      setInventoryItems([]);
      
      // Set default empty storage locations on error
      const defaultStorageLocations: StorageLocation[] = [
        {
          id: '1',
          name: 'Store 1',
          capacity: 30000,
          currentOccupancy: 0,
          occupancyPercentage: 0
        },
        {
          id: '2',
          name: 'Store 2',
          capacity: 40000,
          currentOccupancy: 0,
          occupancyPercentage: 0
        }
      ];
      setStorageLocations(defaultStorageLocations);
    } finally {
      setLoading(false);
    }
  };

  const getSummary = () => {
    const totalBags = inventoryItems.reduce((sum, item) => sum + item.totalBags, 0);
    const totalKilograms = inventoryItems.reduce((sum, item) => sum + item.totalKilograms, 0);
    const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock').length;
    const totalCapacity = storageLocations.reduce((sum, loc) => sum + loc.capacity, 0);
    const currentOccupancy = storageLocations.reduce((sum, loc) => sum + loc.currentOccupancy, 0);
    const availableSpacePercentage = totalCapacity > 0 ? Math.round(((totalCapacity - currentOccupancy) / totalCapacity) * 100) : 0;

    return {
      totalItems: inventoryItems.length,
      totalBags,
      totalKilograms,
      lowStockItems,
      storageLocations: storageLocations.length,
      totalCapacity,
      currentOccupancy,
      // Add backward compatibility properties
      totalStock: totalBags,
      availableSpacePercentage,
      monthlyTurnover: 2.3
    };
  };

  useEffect(() => {
    fetchInventoryData();

    // Set up real-time subscription for coffee_records changes
    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'coffee_records' 
        }, 
        () => {
          console.log('📊 Inventory updated - coffee records changed');
          fetchInventoryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    inventoryItems,
    storageLocations,
    loading,
    fetchInventoryData,
    summary: getSummary()
  };
};
