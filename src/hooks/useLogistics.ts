import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone?: string;
  route: string;
  status: string;
  current_load?: string;
  load_capacity_bags?: number;
  eta?: string;
  last_location?: string;
}

export interface Shipment {
  id: string;
  destination: string;
  customer_name: string;
  bags: number;
  status: string;
  vessel_name?: string;
  eta?: string;
  departure_date?: string;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  locations: string[];
  distance_km: number;
  frequency: string;
  active_vehicles: number;
  estimated_hours?: number;
}

export interface Warehouse {
  id: string;
  location: string;
  capacity_bags: number;
  current_bags: number;
  utilization_percentage: number;
  status: string;
}

export const useLogistics = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (vehiclesError) throw vehiclesError;

      // Fetch shipments
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Fetch routes
      const { data: routesData, error: routesError } = await supabase
        .from('delivery_routes')
        .select('*')
        .order('name');

      if (routesError) throw routesError;

      // Fetch warehouses
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('*')
        .order('location');

      if (warehousesError) throw warehousesError;

      setVehicles(vehiclesData || []);
      setShipments(shipmentsData || []);
      setRoutes(routesData || []);
      setWarehouses(warehousesData || []);
    } catch (error) {
      console.error('Error fetching logistics data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load logistics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions
    const vehiclesChannel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchData)
      .subscribe();

    const shipmentsChannel = supabase
      .channel('shipments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, fetchData)
      .subscribe();

    const routesChannel = supabase
      .channel('routes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_routes' }, fetchData)
      .subscribe();

    const warehousesChannel = supabase
      .channel('warehouses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(shipmentsChannel);
      supabase.removeChannel(routesChannel);
      supabase.removeChannel(warehousesChannel);
    };
  }, []);

  return {
    vehicles,
    shipments,
    routes,
    warehouses,
    loading,
    refetch: fetchData
  };
};
