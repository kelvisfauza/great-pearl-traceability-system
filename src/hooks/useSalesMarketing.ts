
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Customer {
  id: string;
  name: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  totalOrders: number;
  orders: number; // Alias for backward compatibility
  totalValue: number;
  value: number; // Alias for backward compatibility
}

export interface MarketingCampaign {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: string;
  roiPercentage: number;
  roi: number; // Alias for backward compatibility
}

export interface SalesContract {
  id: string;
  customerName: string;
  quantity: string;
  price: number;
  deliveryDate: string;
  status: string;
  contractDate: string;
}

export const useSalesMarketing = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [contracts, setContracts] = useState<SalesContract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesMarketingData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (customersError) {
        console.error('Error fetching customers:', customersError);
      } else {
        const transformedCustomers: Customer[] = customersData.map(customer => ({
          id: customer.id,
          name: customer.name,
          country: customer.country,
          email: customer.email,
          phone: customer.phone || 'N/A',
          status: customer.status,
          totalOrders: customer.total_orders || 0,
          orders: customer.total_orders || 0, // Alias
          totalValue: customer.total_value || 0,
          value: customer.total_value || 0 // Alias
        }));
        setCustomers(transformedCustomers);
      }

      // Fetch marketing campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Error fetching marketing campaigns:', campaignsError);
      } else {
        const transformedCampaigns: MarketingCampaign[] = campaignsData.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          budget: campaign.budget,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          status: campaign.status,
          roiPercentage: campaign.roi_percentage || 0,
          roi: campaign.roi_percentage || 0 // Alias
        }));
        setCampaigns(transformedCampaigns);
      }

      // Fetch sales contracts
      const { data: contractsData, error: contractsError } = await supabase
        .from('sales_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contractsError) {
        console.error('Error fetching sales contracts:', contractsError);
      } else {
        const transformedContracts: SalesContract[] = contractsData.map(contract => ({
          id: contract.id,
          customerName: contract.customer_name,
          quantity: contract.quantity,
          price: contract.price,
          deliveryDate: contract.delivery_date,
          status: contract.status,
          contractDate: contract.contract_date
        }));
        setContracts(transformedContracts);
      }
    } catch (error) {
      console.error('Error fetching sales & marketing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'totalOrders' | 'orders' | 'totalValue' | 'value'>) => {
    try {
      const { error } = await supabase
        .from('customers')
        .insert([{
          name: customerData.name,
          country: customerData.country,
          email: customerData.email,
          phone: customerData.phone,
          status: customerData.status
        }]);

      if (error) throw error;
      await fetchSalesMarketingData();
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const addCampaign = async (campaignData: Omit<MarketingCampaign, 'id' | 'roiPercentage' | 'roi'>) => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert([{
          name: campaignData.name,
          budget: campaignData.budget,
          start_date: campaignData.startDate,
          end_date: campaignData.endDate,
          status: campaignData.status
        }]);

      if (error) throw error;
      await fetchSalesMarketingData();
    } catch (error) {
      console.error('Error adding campaign:', error);
      throw error;
    }
  };

  const addContract = async (contractData: Omit<SalesContract, 'id' | 'contractDate'>) => {
    try {
      const { error } = await supabase
        .from('sales_contracts')
        .insert([{
          customer_name: contractData.customerName,
          quantity: contractData.quantity,
          price: contractData.price,
          delivery_date: contractData.deliveryDate,
          status: contractData.status
        }]);

      if (error) throw error;
      await fetchSalesMarketingData();
    } catch (error) {
      console.error('Error adding contract:', error);
      throw error;
    }
  };

  const updateContractStatus = async (contractId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sales_contracts')
        .update({ status })
        .eq('id', contractId);

      if (error) throw error;
      await fetchSalesMarketingData();
    } catch (error) {
      console.error('Error updating contract status:', error);
      throw error;
    }
  };

  const getStats = () => ({
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.status === 'Active').length,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'Active').length,
    totalContracts: contracts.length,
    totalValue: contracts.reduce((sum, c) => sum + c.price, 0),
    // Add backward compatibility properties
    monthlySales: 285000,
    exportRevenue: 1250000
  });

  useEffect(() => {
    fetchSalesMarketingData();
  }, []);

  return {
    customers,
    campaigns,
    contracts,
    loading,
    fetchSalesMarketingData,
    addCustomer,
    addCampaign,
    addContract,
    updateContractStatus,
    getStats
  };
};
