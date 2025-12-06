import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users } from "lucide-react";
import { BuyerContractsList } from './BuyerContractsList';
import { BuyerContractDetail } from './BuyerContractDetail';
import { useBuyerContracts, BuyerContract } from '@/hooks/useBuyerContracts';

export const BuyerContractsManager = () => {
  const { contracts, loading, createContract, updateContract, fetchContracts, getRemainingQuantity } = useBuyerContracts();
  const [selectedContract, setSelectedContract] = useState<BuyerContract | null>(null);

  const handleContractSelect = (contract: BuyerContract) => {
    setSelectedContract(contract);
  };

  const handleBack = () => {
    setSelectedContract(null);
    fetchContracts(); // Refresh to get updated allocated quantities
  };

  if (selectedContract) {
    return (
      <BuyerContractDetail 
        contract={selectedContract} 
        onBack={handleBack}
        remainingQuantity={getRemainingQuantity(selectedContract)}
      />
    );
  }

  return (
    <BuyerContractsList 
      contracts={contracts}
      loading={loading}
      onCreateContract={createContract}
      onUpdateContract={updateContract}
      onSelectContract={handleContractSelect}
      getRemainingQuantity={getRemainingQuantity}
    />
  );
};
