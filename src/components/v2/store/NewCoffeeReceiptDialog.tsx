import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { executeOrQueue } from "@/lib/offline/queue";
import { notifyTeams } from "@/lib/teamsNotify";

interface NewCoffeeReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReceiptForm {
  supplier_id: string;
  coffee_type: string;
  date: string;
  kilograms: number;
  bags: number;
}

// Import batch number generator from utils for consistent format
import { generateBatchNumber } from '@/utils/batchUtils';

const NewCoffeeReceiptDialog = ({ open, onOpenChange }: NewCoffeeReceiptDialogProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue } = useForm<ReceiptForm>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0]
    }
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const createReceipt = useMutation({
    mutationFn: async (data: ReceiptForm) => {
      const supplier = suppliers?.find(s => s.id === data.supplier_id);
      const batchNumber = await generateBatchNumber(data.date);
      const recordId = crypto.randomUUID();

      const recordPayload = {
        id: recordId,
        supplier_id: data.supplier_id,
        supplier_name: supplier?.name || '',
        coffee_type: data.coffee_type,
        date: data.date,
        kilograms: data.kilograms,
        bags: data.bags,
        batch_number: batchNumber,
        status: 'pending',
        created_by: employee?.email || '',
      };

      const financeLot = {
        coffee_record_id: recordId,
        supplier_id: data.supplier_id,
        quantity_kg: data.kilograms,
        unit_price_ugx: 0,
        total_amount_ugx: 0,
        quality_json: { bags: data.bags, coffee_type: data.coffee_type },
        assessed_by: employee?.email || 'Store Department',
        finance_status: 'READY_FOR_FINANCE',
      };

      return await executeOrQueue({
        kind: 'coffee_receipt',
        payload: { ...recordPayload, finance_lot: financeLot },
        user_label: `${supplier?.name || 'Supplier'} • ${data.kilograms}kg • Batch ${batchNumber}`,
        perform: async (client_op_id) => {
          const { error: coffeeError } = await supabase
            .from('coffee_records')
            .insert([{ ...recordPayload, client_op_id } as any]);
          if (coffeeError) throw coffeeError;

          const { error: financeError } = await supabase
            .from('finance_coffee_lots')
            .insert(financeLot as any);
          if (financeError) console.error('Finance lot creation error:', financeError);
          return recordPayload;
        }
      });
    },
    onSuccess: (result: any) => {
      const queued = result?.queued;
      toast({
        title: queued ? "Saved offline" : "Success",
        description: queued
          ? "You're offline — receipt saved on this device and will upload when you reconnect."
          : "Coffee receipt created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['v2-coffee-receipts'] });
      if (!queued) {
        const payload: any = result?.data ?? result;
        notifyTeams(
          "trade",
          `New Coffee Delivery — ${payload?.supplier_name ?? ""}`,
          `Supplier: ${payload?.supplier_name ?? ""}\nCoffee: ${payload?.coffee_type ?? ""}\nQuantity: ${payload?.kilograms ?? ""} kg (${payload?.bags ?? ""} bags)\nBatch: ${payload?.batch_number ?? ""}\nDate: ${payload?.date ?? ""}\nReceived by: ${employee?.name ?? employee?.email ?? ""}`,
        );
      }
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ReceiptForm) => {
    createReceipt.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Coffee Receipt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="supplier_id">Supplier *</Label>
            <Select onValueChange={(value) => setValue('supplier_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="coffee_type">Coffee Type *</Label>
            <Select onValueChange={(value) => setValue('coffee_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select coffee type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arabica">Arabica</SelectItem>
                <SelectItem value="Robusta">Robusta</SelectItem>
                <SelectItem value="Drugar">Drugar</SelectItem>
                <SelectItem value="Wugar">Wugar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              {...register('date', { required: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kilograms">Kilograms *</Label>
              <Input
                id="kilograms"
                type="number"
                step="0.01"
                {...register('kilograms', { required: true, valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="bags">Bags *</Label>
              <Input
                id="bags"
                type="number"
                {...register('bags', { required: true, valueAsNumber: true })}
              />
            </div>
          </div>


          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createReceipt.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createReceipt.isPending}>
              {createReceipt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Receipt
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewCoffeeReceiptDialog;
