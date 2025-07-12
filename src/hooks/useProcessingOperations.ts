
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingBatch {
  id: string;
  batchNumber: string;
  coffeeType: string;
  inputWeight: number;
  outputWeight: number;
  processingStage: string;
  startTime: string;
  endTime?: string;
  efficiency: number;
  status: string;
  operatorName: string;
  notes?: string;
}

export interface MachineStatus {
  id: string;
  machineName: string;
  type: string;
  status: string;
  efficiency: number;
  lastMaintenance: string;
  nextMaintenance: string;
  currentBatch?: string;
}

export const useProcessingOperations = () => {
  const [processingBatches, setProcessingBatches] = useState<ProcessingBatch[]>([]);
  const [machines, setMachines] = useState<MachineStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProcessingData = async () => {
    try {
      setLoading(true);
      // For now, we'll return empty arrays since processing tables don't exist yet
      // This prevents errors while maintaining the interface
      setProcessingBatches([]);
      setMachines([]);
    } catch (error) {
      console.error('Error fetching processing data:', error);
      setProcessingBatches([]);
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessingData();
  }, []);

  // Calculate today's metrics from real data
  const todayMetrics = {
    processedBags: processingBatches.filter(batch => 
      batch.status === 'Completed' && 
      new Date(batch.endTime || '').toDateString() === new Date().toDateString()
    ).reduce((sum, batch) => sum + batch.outputWeight, 0),
    
    averageEfficiency: machines.length > 0 
      ? Math.round(machines.reduce((sum, machine) => sum + machine.efficiency, 0) / machines.length)
      : 0,
    
    outputRate: processingBatches.length > 0
      ? Math.round(processingBatches.reduce((sum, batch) => sum + (batch.outputWeight / batch.inputWeight * 100), 0) / processingBatches.length)
      : 0,
    
    averageProcessingTime: processingBatches.filter(batch => batch.endTime).length > 0
      ? processingBatches.filter(batch => batch.endTime)
          .reduce((sum, batch) => {
            const start = new Date(batch.startTime);
            const end = new Date(batch.endTime!);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return sum + hours;
          }, 0) / processingBatches.filter(batch => batch.endTime).length
      : 0
  };

  return {
    processingBatches,
    machines,
    loading,
    fetchProcessingData,
    todayMetrics
  };
};
