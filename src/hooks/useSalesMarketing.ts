
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
  totalValue: number;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: string;
  roiPercentage: number;
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
          totalValue: customer.total_value || 0
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
          roiPercentage: campaign.roi_percentage || 0
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

  useEffect(() => {
    fetchSalesMarketingData();
  }, []);

  return {
    customers,
    campaigns,
    contracts,
    loading,
    fetchSalesMarketingData
  };
};
