import Layout from "@/components/Layout";
import InventoryBatchView from "@/components/inventory/InventoryBatchView";

const Inventory = () => {
  return (
    <Layout 
      title="Inventory Management" 
      subtitle="Track 20,000kg batches with FIFO sales tracking"
    >
      <InventoryBatchView />
    </Layout>
  );
};

export default Inventory;
