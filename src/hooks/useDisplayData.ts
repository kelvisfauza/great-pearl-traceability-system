import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DisplayData {
  // Suppliers chart
  topSuppliers: { name: string; kgs: number }[];
  // Buyers chart  
  topBuyers: { name: string; value: number }[];
  // Stats
  totalSuppliers: number;
  totalKgs: number;
  avgPerSupplier: number;
  topDistricts: string[];
  // Traceability
  tracedBatches: number;
  eudrCompliant: number;
  totalDocs: number;
  // Milling
  totalProcessed: number;
  dispatched: number;
  // Ticker
  todayPurchases: { supplier_name: string; kilograms: number; coffee_type: string }[];
  pendingCount: number;
  pendingRecords: { supplier_name: string; kilograms: number }[];
  loaded: boolean;
}

const defaultData: DisplayData = {
  topSuppliers: [],
  topBuyers: [],
  totalSuppliers: 0,
  totalKgs: 0,
  avgPerSupplier: 0,
  topDistricts: [],
  tracedBatches: 0,
  eudrCompliant: 0,
  totalDocs: 0,
  totalProcessed: 0,
  dispatched: 0,
  todayPurchases: [],
  pendingCount: 0,
  pendingRecords: [],
  loaded: false,
};

export const useDisplayData = () => {
  const [data, setData] = useState<DisplayData>(defaultData);

  const fetchAll = async () => {
    const today = new Date().toISOString().split('T')[0];

    const [
      coffeeRecords,
      suppliers,
      contracts,
      eudrBatches,
      eudrDocs,
      dispatches,
      todayRecords,
      pendingRecords,
    ] = await Promise.all([
      supabase.from('coffee_records').select('supplier_name, kilograms, coffee_type'),
      supabase.from('suppliers').select('id, origin'),
      supabase.from('buyer_contracts').select('buyer_name, total_quantity'),
      supabase.from('eudr_batches').select('id, status'),
      supabase.from('eudr_documents').select('id'),
      supabase.from('eudr_dispatch_reports').select('trucks'),
      supabase.from('coffee_records').select('supplier_name, kilograms, coffee_type, created_at').eq('date', today).order('created_at', { ascending: false }).limit(20),
      supabase.from('coffee_records').select('supplier_name, kilograms, coffee_type').eq('status', 'pending').limit(10),
    ]);

    // Top suppliers
    const supplierMap = new Map<string, number>();
    coffeeRecords.data?.forEach((r) => {
      const name = (r.supplier_name || 'Unknown').split(' ')[0];
      supplierMap.set(name, (supplierMap.get(name) || 0) + Number(r.kilograms || 0));
    });
    const topSuppliers = Array.from(supplierMap.entries())
      .map(([name, kgs]) => ({ name, kgs: Math.round(kgs) }))
      .sort((a, b) => b.kgs - a.kgs)
      .slice(0, 8);

    // Top buyers
    const buyerMap = new Map<string, number>();
    contracts.data?.forEach((c) => {
      const name = c.buyer_name || 'Unknown';
      buyerMap.set(name, (buyerMap.get(name) || 0) + Number(c.total_quantity || 0));
    });
    const topBuyers = Array.from(buyerMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Supplier stats
    const totalKgs = coffeeRecords.data?.reduce((sum, r) => sum + Number(r.kilograms || 0), 0) || 0;
    const totalSuppliers = suppliers.data?.length || 0;
    const originCount = new Map<string, number>();
    suppliers.data?.forEach((s) => {
      if (s.origin) originCount.set(s.origin, (originCount.get(s.origin) || 0) + 1);
    });
    const topDistricts = Array.from(originCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    // Milling
    const totalProcessed = coffeeRecords.data?.reduce((sum, r) => sum + Number(r.kilograms || 0), 0) || 0;
    let dispatched = 0;
    dispatches.data?.forEach((d) => {
      const trucks = d.trucks as any[];
      if (Array.isArray(trucks)) {
        trucks.forEach((t) => { dispatched += Number(t.weight || t.netWeight || 0); });
      }
    });

    setData({
      topSuppliers,
      topBuyers,
      totalSuppliers,
      totalKgs: Math.round(totalKgs),
      avgPerSupplier: totalSuppliers > 0 ? Math.round(totalKgs / totalSuppliers) : 0,
      topDistricts,
      tracedBatches: eudrBatches.data?.length || 0,
      eudrCompliant: eudrBatches.data?.filter((b) => b.status === 'traced').length || 0,
      totalDocs: eudrDocs.data?.length || 0,
      totalProcessed: Math.round(totalProcessed),
      dispatched: Math.round(dispatched),
      todayPurchases: (todayRecords.data || []).map((r) => ({
        supplier_name: r.supplier_name,
        kilograms: r.kilograms,
        coffee_type: r.coffee_type,
      })),
      pendingCount: pendingRecords.data?.length || 0,
      pendingRecords: (pendingRecords.data || []).map((r) => ({
        supplier_name: r.supplier_name,
        kilograms: r.kilograms,
      })),
      loaded: true,
    });
  };

  useEffect(() => {
    fetchAll();

    // Refresh every 60s
    const interval = setInterval(fetchAll, 60000);

    // Realtime for new purchases
    const channel = supabase
      .channel('display-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coffee_records' }, () => fetchAll())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return data;
};
