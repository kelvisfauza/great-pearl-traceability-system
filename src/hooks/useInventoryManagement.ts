
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
      
      // Fetch inventory items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (inventoryError) {
        console.error('Error fetching inventory items:', inventoryError);
      } else {
        const transformedInventory: InventoryItem[] = inventoryData.map(item => ({
          id: item.id,
          coffeeType: item.coffee_type,
          totalBags: item.total_bags,
          totalKilograms: item.total_kilograms,
          location: item.location,
          status: item.status,
          batchNumbers: item.batch_numbers || [],
          lastUpdated: item.last_updated
        }));
        setInventoryItems(transformedInventory);
      }

      // Fetch storage locations
      const { data: storageData, error: storageError } = await supabase
        .from('storage_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (storageError) {
        console.error('Error fetching storage locations:', storageError);
      } else {
        const transformedStorage: StorageLocation[] = storageData.map(location => ({
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
    } finally {
      setLoading(false);
    }
  };

  const getSummary = () => ({
    totalItems: inventoryItems.length,
    totalBags: inventoryItems.reduce((sum, item) => sum + item.totalBags, 0),
    totalKilograms: inventoryItems.reduce((sum, item) => sum + item.totalKilograms, 0),
    lowStockItems: inventoryItems.filter(item => item.totalBags < 10).length,
    storageLocations: storageLocations.length,
    totalCapacity: storageLocations.reduce((sum, loc) => sum + loc.capacity, 0),
    currentOccupancy: storageLocations.reduce((sum, loc) => sum + loc.currentOccupancy, 0)
  });

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
