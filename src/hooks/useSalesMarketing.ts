
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: number;
  name: string;
  country: string;
  status: string;
  orders: number;
  value: string;
  email: string;
  phone: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: string;
  budget: string;
  roi: string;
  startDate: string;
  endDate: string;
}

export interface Contract {
  id: number;
  customerId: number;
  customerName: string;
  quantity: string;
  price: string;
  deliveryDate: string;
  status: string;
}

export const useSalesMarketing = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      console.log('Initializing Sales & Marketing data...');
      
      // Since we don't have dedicated tables yet, we'll start with empty arrays
      // This shows the real structure without dummy data
      setCustomers([]);
      setCampaigns([]);
      setContracts([]);
      
      setLoading(false);
      console.log('Sales & Marketing data initialized with empty arrays');
    };

    initializeData();
  }, []);

  const addCustomer = (customerData: Omit<Customer, 'id' | 'orders' | 'value' | 'status'>) => {
    const newCustomer: Customer = {
      id: Date.now(), // Use timestamp as temporary ID
      ...customerData,
      status: "Active",
      orders: 0,
      value: "$0"
    };
    setCustomers(prev => [...prev, newCustomer]);
    console.log('Added new customer:', newCustomer);
    toast({
      title: "Customer Added",
      description: "New customer has been successfully added to the system.",
    });
  };

  const addCampaign = (campaignData: Omit<Campaign, 'id' | 'status' | 'roi'>) => {
    const newCampaign: Campaign = {
      id: Date.now(), // Use timestamp as temporary ID
      ...campaignData,
      status: "Planning",
      roi: "Projected +0%"
    };
    setCampaigns(prev => [...prev, newCampaign]);
    console.log('Added new campaign:', newCampaign);
    toast({
      title: "Campaign Created",
      description: "New marketing campaign has been created.",
    });
  };

  const addContract = (contractData: Omit<Contract, 'id' | 'status' | 'customerName'>) => {
    const customer = customers.find(c => c.id === contractData.customerId);
    const newContract: Contract = {
      id: Date.now(), // Use timestamp as temporary ID
      ...contractData,
      customerName: customer?.name || "",
      status: "Draft"
    };
    setContracts(prev => [...prev, newContract]);
    console.log('Added new contract:', newContract);
    toast({
      title: "Contract Created",
      description: "New sales contract has been created.",
    });
  };

  const updateContractStatus = (contractId: number, status: string) => {
    setContracts(prev => prev.map(contract => 
      contract.id === contractId 
        ? { ...contract, status }
        : contract
    ));
    console.log(`Updated contract ${contractId} status to ${status}`);
    toast({
      title: "Contract Updated",
      description: `Contract status has been changed to ${status}.`,
    });
  };

  const getStats = () => {
    const activeCustomers = customers.filter(c => c.status === "Active").length;
    const activeCampaigns = campaigns.filter(c => c.status === "Active").length;
    const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);
    
    return {
      monthlySales: activeCustomers > 0 ? `$${Math.round(activeCustomers * 50)}K` : "$0",
      activeCustomers,
      exportRevenue: activeCustomers > 0 ? `$${Math.round(activeCustomers * 35)}K` : "$0",
      activeCampaigns,
      totalOrders
    };
  };

  return {
    customers,
    campaigns,
    contracts,
    loading,
    addCustomer,
    addCampaign,
    addContract,
    updateContractStatus,
    getStats
  };
};
