
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

  // Initialize with some sample data since we don't have database tables yet
  useEffect(() => {
    const initializeData = () => {
      setCustomers([
        { id: 1, name: "Global Coffee Imports Ltd", country: "Germany", status: "Active", orders: 24, value: "€450,000", email: "contact@globalcoffee.de", phone: "+49 123 456789" },
        { id: 2, name: "American Bean Co.", country: "USA", status: "Active", orders: 18, value: "$320,000", email: "orders@americanbean.com", phone: "+1 555 123456" },
        { id: 3, name: "Tokyo Coffee House", country: "Japan", status: "Pending", orders: 8, value: "¥2,800,000", email: "info@tokyocoffee.jp", phone: "+81 3 1234 5678" },
        { id: 4, name: "London Roasters", country: "UK", status: "Active", orders: 15, value: "£180,000", email: "hello@londonroasters.co.uk", phone: "+44 20 1234 5678" },
      ]);

      setCampaigns([
        { id: 1, name: "European Market Expansion", status: "Active", budget: "$25,000", roi: "+18%", startDate: "2024-01-15", endDate: "2024-06-15" },
        { id: 2, name: "Premium Coffee Launch", status: "Planning", budget: "$40,000", roi: "Projected +25%", startDate: "2024-03-01", endDate: "2024-08-01" },
        { id: 3, name: "Trade Show Participation", status: "Completed", budget: "$15,000", roi: "+12%", startDate: "2023-11-01", endDate: "2023-11-30" },
      ]);

      setContracts([
        { id: 1, customerId: 1, customerName: "Global Coffee Imports Ltd", quantity: "500 bags", price: "€180/bag", deliveryDate: "2024-02-15", status: "Signed" },
        { id: 2, customerId: 2, customerName: "American Bean Co.", quantity: "300 bags", price: "$175/bag", deliveryDate: "2024-02-20", status: "Pending" },
        { id: 3, customerId: 4, customerName: "London Roasters", quantity: "200 bags", price: "£120/bag", deliveryDate: "2024-02-25", status: "Draft" },
      ]);

      setLoading(false);
    };

    initializeData();
  }, []);

  const addCustomer = (customerData: Omit<Customer, 'id' | 'orders' | 'value' | 'status'>) => {
    const newCustomer: Customer = {
      id: customers.length + 1,
      ...customerData,
      status: "Active",
      orders: 0,
      value: "$0"
    };
    setCustomers(prev => [...prev, newCustomer]);
    toast({
      title: "Customer Added",
      description: "New customer has been successfully added to the system.",
    });
  };

  const addCampaign = (campaignData: Omit<Campaign, 'id' | 'status' | 'roi'>) => {
    const newCampaign: Campaign = {
      id: campaigns.length + 1,
      ...campaignData,
      status: "Planning",
      roi: "Projected +0%"
    };
    setCampaigns(prev => [...prev, newCampaign]);
    toast({
      title: "Campaign Created",
      description: "New marketing campaign has been created.",
    });
  };

  const addContract = (contractData: Omit<Contract, 'id' | 'status' | 'customerName'>) => {
    const customer = customers.find(c => c.id === contractData.customerId);
    const newContract: Contract = {
      id: contracts.length + 1,
      ...contractData,
      customerName: customer?.name || "",
      status: "Draft"
    };
    setContracts(prev => [...prev, newContract]);
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
      monthlySales: "$847K",
      activeCustomers,
      exportRevenue: "$623K",
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
