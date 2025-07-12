
import { useState, useEffect } from 'react';
import { useStoreManagement } from '@/hooks/useStoreManagement';

export interface InventoryItem {
  id: string;
  coffeeType: string;
  totalBags: number;
  totalKilograms: number;
  location: string;
  lastUpdated: string;
  status: 'available' | 'low_stock' | 'out_of_stock';
  batchNumbers: string[];
}

export interface StorageLocation {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  occupancyPercentage: number;
}

export const useInventoryManagement = () => {
  const { coffeeRecords } = useStoreManagement();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process coffee records to create inventory items
    const processInventory = () => {
      const inventoryMap = new Map<string, InventoryItem>();

      // Group coffee records by type and status (only inventory status)
      coffeeRecords
        .filter(record => record.status === 'inventory')
        .forEach(record => {
          const key = record.coffeeType;
          
          if (inventoryMap.has(key)) {
            const existing = inventoryMap.get(key)!;
            existing.totalBags += record.bags;
            existing.totalKilograms += record.kilograms;
            existing.batchNumbers.push(record.batchNumber || '');
          } else {
            inventoryMap.set(key, {
              id: `inv-${key.toLowerCase()}`,
              coffeeType: key,
              totalBags: record.bags,
              totalKilograms: record.kilograms,
              location: 'Main Warehouse',
              lastUpdated: record.date,
              status: record.bags < 10 ? 'low_stock' : 'available',
              batchNumbers: [record.batchNumber || '']
            });
          }
        });

      setInventoryItems(Array.from(inventoryMap.values()));
    };

    // Initialize storage locations
    const initializeStorageLocations = () => {
      const totalBags = inventoryItems.reduce((sum, item) => sum + item.totalBags, 0);
      const warehouseCapacity = 10000; // Total capacity in bags

      setStorageLocations([
        {
          id: 'warehouse-1',
          name: 'Main Warehouse',
          capacity: warehouseCapacity,
          currentOccupancy: totalBags,
          occupancyPercentage: Math.round((totalBags / warehouseCapacity) * 100)
        },
        {
          id: 'warehouse-2',
          name: 'Secondary Storage',
          capacity: 5000,
          currentOccupancy: Math.floor(totalBags * 0.2),
          occupancyPercentage: Math.round((totalBags * 0.2 / 5000) * 100)
        }
      ]);
    };

    processInventory();
    initializeStorageLocations();
    setLoading(false);
  }, [coffeeRecords]);

  // Calculate summary statistics
  const totalStock = inventoryItems.reduce((sum, item) => sum + item.totalBags, 0);
  const lowStockItems = inventoryItems.filter(item => item.status === 'low_stock').length;
  const availableSpace = storageLocations.reduce((sum, location) => {
    return sum + (location.capacity - location.currentOccupancy);
  }, 0);
  const totalCapacity = storageLocations.reduce((sum, location) => sum + location.capacity, 0);
  const availableSpacePercentage = totalCapacity > 0 ? Math.round((availableSpace / totalCapacity) * 100) : 100;

  // Calculate monthly turnover (simplified calculation)
  const monthlyTurnover = coffeeRecords.length > 0 ? 
    Math.round((coffeeRecords.filter(r => r.status === 'sales').length / Math.max(totalStock, 1)) * 100) / 100 : 0;

  return {
    inventoryItems,
    storageLocations,
    loading,
    summary: {
      totalStock,
      availableSpacePercentage,
      lowStockItems,
      monthlyTurnover
    }
  };
};
