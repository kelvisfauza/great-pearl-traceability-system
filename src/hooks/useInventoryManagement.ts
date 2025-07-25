
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
      
      // Fetch coffee records that are in inventory (received status)
      const { data: coffeeData, error: coffeeError } = await supabase
        .from('coffee_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (coffeeError) {
        console.error('Error fetching coffee records:', coffeeError);
      } else if (coffeeData) {
        // Include all coffee records that would be considered inventory
        // This includes pending, received, or any status that indicates coffee is in store
        const inventoryRecords = coffeeData.filter((record: any) => 
          record.status !== 'cancelled' && record.status !== 'rejected'
        );
        
        const transformedInventory: InventoryItem[] = inventoryRecords.map((record: any) => ({
          id: record.id,
          coffeeType: record.coffee_type || 'Arabica',
          totalBags: record.bags || 0,
          totalKilograms: record.kilograms || 0,
          location: 'Store 1',
          status: record.status || 'in_stock',
          batchNumbers: [record.batch_number || ''],
          lastUpdated: record.updated_at || record.created_at || new Date().toISOString()
        }));
        setInventoryItems(transformedInventory);
      }

      // Check if storage locations exist, if not create them
      const { data: storageData, error: storageError } = await supabase
        .from('storage_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (storageError || !storageData || storageData.length === 0) {
        console.log('Creating default storage locations...');
        
        // Create default storage locations
        const { error: insertError1 } = await supabase
          .from('storage_locations')
          .insert({
            name: 'Store 1',
            capacity: 30000,
            current_occupancy: 0,
            occupancy_percentage: 0
          });

        const { error: insertError2 } = await supabase
          .from('storage_locations')
          .insert({
            name: 'Store 2', 
            capacity: 40000,
            current_occupancy: 0,
            occupancy_percentage: 0
          });

        if (insertError1) console.error('Error creating Store 1:', insertError1);
        if (insertError2) console.error('Error creating Store 2:', insertError2);
        
        // Set default storage locations
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
      } else {
        const transformedStorage: StorageLocation[] = storageData.map((location: any) => ({
          id: location.id,
          name: location.name,
          capacity: location.capacity,
          currentOccupancy: location.current_occupancy || 0,
          occupancyPercentage: location.occupancy_percentage || 0
        }));
        setStorageLocations(transformedStorage);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      // Set default storage locations on error
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
  }, []);

  return {
    inventoryItems,
    storageLocations,
    loading,
    fetchInventoryData,
    summary: getSummary()
  };
};
