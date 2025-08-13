import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface CustomerBalance {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  current_balance: number;
  status: string;
  source: 'supabase' | 'firebase';
  created_at: string;
  opening_balance?: number;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  customer_name: string;
  amount_paid: number;
  previous_balance: number;
  new_balance: number;
  payment_method: string;
  notes?: string;
  date: string;
  created_by: string;
  source: 'supabase' | 'firebase';
}

export const useCombinedCustomerBalances = () => {
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSupabaseCustomers = async (): Promise<CustomerBalance[]> => {
    try {
      const { data: supabaseCustomers, error } = await supabase
        .from('milling_customers')
        .select('*')
        .gt('current_balance', 0) // Only customers with outstanding balances
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (supabaseCustomers || []).map(customer => ({
        id: customer.id,
        name: customer.full_name,
        phone: customer.phone,
        address: customer.address,
        current_balance: customer.current_balance,
        status: customer.status,
        source: 'supabase' as const,
        created_at: customer.created_at,
        opening_balance: customer.opening_balance
      }));
    } catch (error) {
      console.error('Error fetching Supabase customers:', error);
      return [];
    }
  };

  const fetchFirebaseCustomers = async (): Promise<CustomerBalance[]> => {
    try {
      // Check if there are any Firebase collections that might contain customer balances
      // For now, we'll check supplier_advances as suppliers might have outstanding balances
      const advancesQuery = query(
        collection(db, 'supplier_advances'),
        where('status', '==', 'Active')
      );
      
      const querySnapshot = await getDocs(advancesQuery);
      const firebaseCustomers: CustomerBalance[] = [];

      querySnapshot.docs.forEach(doc => {
        const advance = doc.data();
        // Convert supplier advances to customer balance format
        firebaseCustomers.push({
          id: doc.id,
          name: advance.supplier_name || 'Unknown Supplier',
          phone: advance.phone || undefined,
          address: advance.location || undefined,
          current_balance: advance.amount || 0,
          status: 'Active',
          source: 'firebase' as const,
          created_at: advance.created_at || new Date().toISOString(),
          opening_balance: advance.amount || 0
        });
      });

      return firebaseCustomers;
    } catch (error) {
      console.error('Error fetching Firebase customers:', error);
      return [];
    }
  };

  const fetchSupabasePayments = async (): Promise<CustomerPayment[]> => {
    try {
      const { data: supabasePayments, error } = await supabase
        .from('milling_cash_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent payments

      if (error) throw error;

      return (supabasePayments || []).map(payment => ({
        id: payment.id,
        customer_id: payment.customer_id,
        customer_name: payment.customer_name,
        amount_paid: payment.amount_paid,
        previous_balance: payment.previous_balance,
        new_balance: payment.new_balance,
        payment_method: payment.payment_method,
        notes: payment.notes,
        date: payment.date,
        created_by: payment.created_by,
        source: 'supabase' as const
      }));
    } catch (error) {
      console.error('Error fetching Supabase payments:', error);
      return [];
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers from both sources
      const [supabaseCustomers, firebaseCustomers, supabasePayments] = await Promise.all([
        fetchSupabaseCustomers(),
        fetchFirebaseCustomers(),
        fetchSupabasePayments()
      ]);

      // Combine and deduplicate customers
      const allCustomers = [...supabaseCustomers, ...firebaseCustomers];
      
      // Remove duplicates based on name (case insensitive)
      const uniqueCustomers = allCustomers.filter((customer, index, arr) => 
        index === arr.findIndex(c => 
          c.name.toLowerCase() === customer.name.toLowerCase()
        )
      );

      setCustomers(uniqueCustomers);
      setPayments(supabasePayments);
      
    } catch (error) {
      console.error('Error fetching customer balance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer balance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async (paymentData: {
    customer_id: string;
    customer_name: string;
    amount_paid: number;
    payment_method: string;
    notes?: string;
    date: string;
    created_by: string;
  }) => {
    const customer = customers.find(c => c.id === paymentData.customer_id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    try {
      if (customer.source === 'supabase') {
        // Handle Supabase payment
        const previousBalance = customer.current_balance;
        const newBalance = Math.max(0, previousBalance - paymentData.amount_paid);

        const { data: cashResult, error: cashError } = await supabase
          .from('milling_cash_transactions')
          .insert([{
            customer_id: paymentData.customer_id,
            customer_name: paymentData.customer_name,
            amount_paid: paymentData.amount_paid,
            previous_balance: previousBalance,
            new_balance: newBalance,
            payment_method: paymentData.payment_method,
            notes: paymentData.notes,
            date: paymentData.date,
            created_by: paymentData.created_by
          }])
          .select()
          .single();

        if (cashError) throw cashError;

        // Update customer balance
        const { error: updateError } = await supabase
          .from('milling_customers')
          .update({ current_balance: newBalance })
          .eq('id', paymentData.customer_id);

        if (updateError) throw updateError;

      } else if (customer.source === 'firebase') {
        // Handle Firebase payment (supplier advance)
        // This would involve updating the supplier_advances collection
        // For now, we'll create a payment record in a Firebase collection
        await addDoc(collection(db, 'customer_payments'), {
          customer_id: paymentData.customer_id,
          customer_name: paymentData.customer_name,
          amount_paid: paymentData.amount_paid,
          previous_balance: customer.current_balance,
          new_balance: Math.max(0, customer.current_balance - paymentData.amount_paid),
          payment_method: paymentData.payment_method,
          notes: paymentData.notes,
          date: paymentData.date,
          created_by: paymentData.created_by,
          created_at: new Date().toISOString()
        });
      }

      // Refresh data
      await fetchAllData();
      
      return { success: true };
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  };

  const getStats = () => {
    const totalCustomers = customers.length;
    const totalOutstanding = customers.reduce((sum, c) => sum + c.current_balance, 0);
    const supabaseCustomers = customers.filter(c => c.source === 'supabase').length;
    const firebaseCustomers = customers.filter(c => c.source === 'firebase').length;

    return {
      totalCustomers,
      totalOutstanding,
      supabaseCustomers,
      firebaseCustomers,
      recentPayments: payments.length
    };
  };

  useEffect(() => {
    fetchAllData();

    // Set up real-time updates for Supabase data
    const channel = supabase
      .channel('customer-balances-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milling_customers'
        },
        (payload) => {
          console.log('Customer balance changed:', payload);
          fetchAllData(); // Refresh data when changes occur
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milling_cash_transactions'
        },
        (payload) => {
          console.log('Payment transaction changed:', payload);
          fetchAllData(); // Refresh data when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    customers,
    payments,
    loading,
    addPayment,
    fetchAllData,
    getStats
  };
};