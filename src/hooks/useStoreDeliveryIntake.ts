import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateBatchNumber } from '@/utils/batchUtils';
import { availableDeliveryOrders, DeliverySamplingOrder, validateDeliverySample } from '@/lib/storeDeliveryRules';

export function useStoreDeliveryIntake(open: boolean, date: string, supplier: string) {
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [orderId, setOrderId] = useState('');
  const [batch, setBatch] = useState<{ date: string; number: string } | null>(null);
  const [batchError, setBatchError] = useState('');
  const [generation, setGeneration] = useState(0);
  useEffect(() => { setSampleAnswer(''); setOrderId(''); }, [open, supplier]);
  useEffect(() => {
    setBatch(null);
    setBatchError('');
    if (!open || !date) return;
    let active = true;
    generateBatchNumber(date).then(number => { if (active) setBatch({ date, number }); })
      .catch(() => { if (active) setBatchError('Unable to assign a batch. Reopen the form to retry.'); });
    return () => { active = false; };
  }, [open, date, generation]);
  const ordersQuery = useQuery({
    queryKey: ['store-delivery-sampling-orders', supplier],
    enabled: open && !!supplier && sampleAnswer === 'yes',
    staleTime: 0,
    queryFn: async () => {
      const rows: DeliverySamplingOrder[] = [];
      const escaped = supplier.trim().replace(/[\\%_]/g, '\\$&');
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('quality_sampling_orders')
          .select('id,supplier_name,order_number,delivery_time,sample_type,linked_store_record_id,linked_batch_number')
          .ilike('supplier_name', escaped).is('linked_store_record_id', null).is('linked_batch_number', null)
          .order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) break;
      }
      return availableDeliveryOrders(rows, supplier);
    },
  });
  const batchNumber = batch?.date === date ? batch.number : '';
  const validate = () => {
    if (!batchNumber) throw new Error('Wait for the batch number before saving');
    if (sampleAnswer === 'yes' && (ordersQuery.isFetching || ordersQuery.isError)) throw new Error('Wait for sampling orders to load');
    return validateDeliverySample(sampleAnswer, orderId, supplier, ordersQuery.data || []);
  };
  return { sampleAnswer, setSampleAnswer: (answer: string) => { setSampleAnswer(answer); setOrderId(''); },
    orderId, setOrderId, batchNumber, batchError, orders: ordersQuery.data || [],
    ordersLoading: ordersQuery.isFetching, ordersError: ordersQuery.isError, validate,
    reset: () => { setSampleAnswer(''); setOrderId(''); setBatch(null); setGeneration(value => value + 1); } };
}