
import { useState, useEffect } from 'react';
import { firebaseClient } from '@/lib/firebaseClient';

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
      
      // Fetch inventory items from Firebase
      const { data: inventoryData, error: inventoryError } = await firebaseClient
        .from('inventory_items')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (inventoryError) {
        console.error('Error fetching inventory items:', inventoryError);
      } else if (inventoryData) {
        const transformedInventory: InventoryItem[] = inventoryData.map((item: any) => ({
          id: item.id,
          coffeeType: item.coffee_type || item.coffeeType,
          totalBags: item.total_bags || item.totalBags || 0,
          totalKilograms: item.total_kilograms || item.totalKilograms || 0,
          location: item.location || 'Store 1',
          status: item.status || 'in_stock',
          batchNumbers: item.batch_numbers || item.batchNumbers || [],
          lastUpdated: item.last_updated || item.lastUpdated || item.created_at
        }));
        setInventoryItems(transformedInventory);
      }

      // Fetch storage locations from Firebase
      const { data: storageData, error: storageError } = await firebaseClient
        .from('storage_locations')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (storageError) {
        console.error('Error fetching storage locations:', storageError);
        // Set default storage locations if none exist
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
      } else if (storageData) {
        const transformedStorage: StorageLocation[] = storageData.map((location: any) => ({
          id: location.id,
          name: location.name,
          capacity: location.capacity,
          currentOccupancy: location.current_occupancy || location.currentOccupancy || 0,
          occupancyPercentage: location.occupancy_percentage || location.occupancyPercentage || 0
        }));
        setStorageLocations(transformedStorage);
      } else {
        // Set default storage locations if none exist
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
