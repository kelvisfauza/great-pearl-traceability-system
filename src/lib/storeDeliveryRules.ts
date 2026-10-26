export type DeliverySamplingOrder = {
  id: string;
  supplier_name: string;
  order_number: string | null;
  delivery_time: string;
  sample_type: string;
  linked_store_record_id: string | null;
  linked_batch_number: string | null;
};

export function availableDeliveryOrders(orders: DeliverySamplingOrder[], supplier: string) {
  return orders.filter(order => order.supplier_name.trim().toLowerCase() === supplier.trim().toLowerCase()
    && !order.linked_store_record_id && !order.linked_batch_number);
}

export function validateDeliverySample(answer: string, orderId: string, supplier: string, orders: DeliverySamplingOrder[]) {
  if (answer !== 'yes' && answer !== 'no') throw new Error('Choose whether a sample was taken');
  if (answer === 'no') return { sample_taken: false, sampling_order_id: null };
  if (!availableDeliveryOrders(orders, supplier).some(order => order.id === orderId)) {
    throw new Error('Attach an available sampling order for this supplier');
  }
  return { sample_taken: true, sampling_order_id: orderId };
}