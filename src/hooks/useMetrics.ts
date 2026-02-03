
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useMetrics = () => {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        
        // Fetch real-time data from source tables
        const [coffeeResult, suppliersResult, inventoryResult, salesResult] = await Promise.all([
          supabase.from('coffee_records').select('bags, kilograms, status'),
          supabase.from('suppliers').select('id', { count: 'exact', head: true }),
          supabase.from('inventory_batches').select('remaining_kilograms, status').neq('status', 'sold_out'),
          supabase.from('sales_transactions').select('total_amount, weight')
        ]);

        // Calculate totals
        const coffeeRecords = coffeeResult.data || [];
        const totalBags = coffeeRecords.reduce((sum, r) => sum + (r.bags || 0), 0);
        const activeSuppliers = suppliersResult.count || 0;
        
        // Current stock from inventory batches
        const inventoryBatches = inventoryResult.data || [];
        const currentStock = inventoryBatches.reduce((sum, b) => sum + (b.remaining_kilograms || 0), 0);
        
        // Revenue from sales
        const salesRecords = salesResult.data || [];
        const totalRevenue = salesRecords.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const totalSoldKg = salesRecords.reduce((sum, s) => sum + (s.weight || 0), 0);
        const revenueInMillions = (totalRevenue / 1_000_000).toFixed(1);

        // Quality score - percentage of records that passed quality review
        const assessedRecords = coffeeRecords.filter(r => 
          ['inventory', 'quality_review', 'pricing', 'batched'].includes(r.status)
        ).length;
        const qualityScore = coffeeRecords.length > 0 
          ? ((assessedRecords / coffeeRecords.length) * 100).toFixed(1)
          : '0.0';

        const formattedData = [
          {
            id: 'production',
            label: 'Total Production',
            value: `${totalBags.toLocaleString()} bags`,
            change_percentage: 0,
            trend: 'stable',
            icon: 'Package',
            color: 'text-blue-600',
            category: 'production'
          },
          {
            id: 'stock',
            label: 'Current Stock',
            value: `${(currentStock / 1000).toFixed(1)} tons`,
            change_percentage: 0,
            trend: 'stable',
            icon: 'TrendingUp',
            color: 'text-green-600',
            category: 'stock'
          },
          {
            id: 'finance',
            label: 'Total Revenue',
            value: `UGX ${revenueInMillions}M`,
            change_percentage: 0,
            trend: 'up',
            icon: 'DollarSign',
            color: 'text-yellow-600',
            category: 'finance'
          },
          {
            id: 'sales',
            label: 'Total Sold',
            value: `${(totalSoldKg / 1000).toFixed(1)} tons`,
            change_percentage: 0,
            trend: 'up',
            icon: 'TrendingUp',
            color: 'text-cyan-600',
            category: 'sales'
          },
          {
            id: 'suppliers',
            label: 'Active Suppliers',
            value: `${activeSuppliers}`,
            change_percentage: 0,
            trend: 'stable',
            icon: 'Users',
            color: 'text-purple-600',
            category: 'suppliers'
          },
          {
            id: 'quality',
            label: 'Quality Score',
            value: `${qualityScore}%`,
            change_percentage: 0,
            trend: 'stable',
            icon: 'Award',
            color: 'text-emerald-600',
            category: 'quality'
          }
        ];

        setData(formattedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return {
    data,
    error,
    isLoading
  };
};
