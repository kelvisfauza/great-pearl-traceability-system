
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
      
      // Fetch coffee records from Firebase
      const { data: coffeeData, error: coffeeError } = await firebaseClient
        .from('coffee_records')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (coffeeError) {
        console.error('Error fetching coffee records:', coffeeError);
        setInventoryItems([]);
      } else if (coffeeData) {
        console.log('Coffee data from Firebase:', coffeeData);
        
        // Filter for records that represent current inventory
        const inventoryRecords = coffeeData.filter((record: any) => 
          record.status === 'received' || record.status === 'pending' || record.status === 'in_inventory'
        );
        
        console.log('Filtered inventory records:', inventoryRecords);
        
        const transformedInventory: InventoryItem[] = inventoryRecords.map((record: any) => ({
          id: record.id,
          coffeeType: record.coffee_type || record.coffeeType || 'Arabica',
          totalBags: record.bags || record.quantity || 0,
          totalKilograms: record.kilograms || record.weight || 0,
          location: 'Store 1',
          status: record.status || 'in_stock',
          batchNumbers: [record.batch_number || record.batchNumber || ''],
          lastUpdated: record.updated_at || record.updatedAt || record.created_at || record.createdAt || new Date().toISOString()
        }));
        
        console.log('Transformed inventory:', transformedInventory);
        setInventoryItems(transformedInventory);
      } else {
        console.log('No coffee data found');
        setInventoryItems([]);
      }

      // Calculate total occupancy from inventory
      const totalKilograms = inventoryItems.reduce((sum: number, item: InventoryItem) => 
        sum + item.totalKilograms, 0
      );

      // Check if storage locations exist in Firebase
      const { data: storageData, error: storageError } = await firebaseClient
        .from('storage_locations')
        .select()
        .order('created_at', { ascending: false })
        .get();

      if (storageError || !storageData || storageData.length === 0) {
        console.log('Creating default storage locations in Firebase...');
        
        // Create Store 1
        await firebaseClient.from('storage_locations').insert({
          name: 'Store 1',
          capacity: 30000,
          current_occupancy: totalKilograms,
          occupancy_percentage: Math.round((totalKilograms / 30000) * 100)
        });

        // Create Store 2
        await firebaseClient.from('storage_locations').insert({
          name: 'Store 2', 
          capacity: 40000,
          current_occupancy: 0,
          occupancy_percentage: 0
        });
        
        // Set default storage locations
        const defaultStorageLocations: StorageLocation[] = [
          {
            id: '1',
            name: 'Store 1',
            capacity: 30000,
            currentOccupancy: totalKilograms,
            occupancyPercentage: Math.round((totalKilograms / 30000) * 100)
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
        const transformedStorage: StorageLocation[] = storageData.map((location: any) => {
          // For now, put all inventory in Store 1
          const occupancy = location.name === 'Store 1' ? totalKilograms : 0;
          const occupancyPercentage = Math.round((occupancy / location.capacity) * 100);
          
          return {
            id: location.id,
            name: location.name,
            capacity: location.capacity,
            currentOccupancy: occupancy,
            occupancyPercentage: occupancyPercentage
          };
        });
        
        setStorageLocations(transformedStorage);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setInventoryItems([]);
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
