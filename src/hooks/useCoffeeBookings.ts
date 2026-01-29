import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CoffeeBooking {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  coffee_type: 'Arabica' | 'Robusta';
  booked_quantity_kg: number;
  delivered_quantity_kg: number;
  remaining_quantity_kg: number;
  booked_price_per_kg: number;
  booking_date: string;
  expected_delivery_date: string | null;
  expiry_date: string;
  notes: string | null;
  status: 'active' | 'partially_fulfilled' | 'fulfilled' | 'expired' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BookingDelivery {
  id: string;
  booking_id: string;
  coffee_record_id: string | null;
  delivered_kg: number;
  delivery_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface CreateBookingData {
  supplier_id: string | null;
  supplier_name: string;
  coffee_type: 'Arabica' | 'Robusta';
  booked_quantity_kg: number;
  booked_price_per_kg: number;
  expected_delivery_date?: string;
  expiry_date: string;
  notes?: string;
  created_by: string;
}

export const useCoffeeBookings = () => {
  const [bookings, setBookings] = useState<CoffeeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      // First expire any old bookings
      await supabase.rpc('expire_old_bookings');
      
      const { data, error } = await supabase
        .from('coffee_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data as CoffeeBooking[]);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch coffee bookings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createBooking = async (data: CreateBookingData) => {
    try {
      const { error } = await supabase
        .from('coffee_bookings')
        .insert({
          supplier_id: data.supplier_id,
          supplier_name: data.supplier_name,
          coffee_type: data.coffee_type,
          booked_quantity_kg: data.booked_quantity_kg,
          booked_price_per_kg: data.booked_price_per_kg,
          expected_delivery_date: data.expected_delivery_date || null,
          expiry_date: data.expiry_date,
          notes: data.notes || null,
          created_by: data.created_by
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Coffee booking created successfully"
      });

      await fetchBookings();
      return true;
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create coffee booking",
        variant: "destructive"
      });
      return false;
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('coffee_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking cancelled successfully"
      });

      await fetchBookings();
      return true;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      });
      return false;
    }
  };

  const recordDelivery = async (
    bookingId: string,
    deliveredKg: number,
    createdBy: string,
    coffeeRecordId?: string,
    notes?: string
  ) => {
    try {
      const { error } = await supabase
        .from('coffee_booking_deliveries')
        .insert({
          booking_id: bookingId,
          delivered_kg: deliveredKg,
          created_by: createdBy,
          coffee_record_id: coffeeRecordId || null,
          notes: notes || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Recorded ${deliveredKg.toLocaleString()} kg delivery`
      });

      await fetchBookings();
      return true;
    } catch (error) {
      console.error('Error recording delivery:', error);
      toast({
        title: "Error",
        description: "Failed to record delivery",
        variant: "destructive"
      });
      return false;
    }
  };

  const getBookingDeliveries = async (bookingId: string): Promise<BookingDelivery[]> => {
    try {
      const { data, error } = await supabase
        .from('coffee_booking_deliveries')
        .select('*')
        .eq('booking_id', bookingId)
        .order('delivery_date', { ascending: false });

      if (error) throw error;
      return data as BookingDelivery[];
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      return [];
    }
  };

  // Get active bookings for a specific supplier
  const getSupplierActiveBookings = useCallback((supplierName: string, coffeeType?: string) => {
    return bookings.filter(b => 
      b.supplier_name.toLowerCase() === supplierName.toLowerCase() &&
      (b.status === 'active' || b.status === 'partially_fulfilled') &&
      (!coffeeType || b.coffee_type === coffeeType)
    );
  }, [bookings]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    fetchBookings,
    createBooking,
    cancelBooking,
    recordDelivery,
    getBookingDeliveries,
    getSupplierActiveBookings
  };
};
