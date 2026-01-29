import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Printer } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import GRNPrintModal from "@/components/quality/GRNPrintModal";

interface QualityAssessmentFormProps {
  lot: any;
}

interface AssessmentForm {
  moisture_content: number;
  robusta_in_arabica_percentage: number;
  group1_percentage: number;
  group2_percentage: number;
  pods_percentage: number;
  husks_percentage: number;
  fm_percentage: number;
  outturn_percentage: number;
  unit_price_ugx: number;
  quantity_kg: number;
  comments: string;
}

const QualityAssessmentForm = ({ lot }: QualityAssessmentFormProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRejecting, setIsRejecting] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnData, setGrnData] = useState<any>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AssessmentForm>({
    defaultValues: {
      quantity_kg: lot.kilograms,
      moisture_content: 12,
      robusta_in_arabica_percentage: 0,
      group1_percentage: 0,
      group2_percentage: 0,
      pods_percentage: 0,
      husks_percentage: 0,
      fm_percentage: 0,
      outturn_percentage: 62
    }
  });

  // Watch values for auto-rejection logic
  const robustaPercentage = watch('robusta_in_arabica_percentage');
  const g1Percentage = watch('group1_percentage');
  
  // Auto-reject conditions: Robusta in Arabica > 3% OR G1 defects > 12%
  const isArabica = lot.coffee_type?.toLowerCase().includes('arabica');
  const shouldAutoReject = isArabica && (robustaPercentage > 3 || g1Percentage > 12);

  const approveAssessment = useMutation({
    mutationFn: async (data: AssessmentForm) => {
      // 1. Create quality assessment using existing table structure
      const { data: assessment, error: assessError } = await supabase
        .from('quality_assessments')
        .insert({
          store_record_id: lot.id,  // Use store_record_id as it exists in the table
          batch_number: lot.batch_number,
          assessed_by: employee?.email || '',
          date_assessed: new Date().toISOString().split('T')[0],
          moisture: data.moisture_content,
          group1_defects: data.group1_percentage,
          group2_defects: data.group2_percentage,
          pods: data.pods_percentage,
          husks: data.husks_percentage,
          fm: data.fm_percentage,
          outturn: data.outturn_percentage,
          suggested_price: data.unit_price_ugx,
          final_price: data.unit_price_ugx,
          comments: data.comments,
          status: 'approved'
        })
        .select()
        .single();

      if (assessError) throw assessError;

      // 2. Update coffee_records status - go directly to inventory (Finance removed from V2)
      const { error: updateError } = await supabase
        .from('coffee_records')
        .update({ status: 'inventory' })
        .eq('id', lot.id);

      if (updateError) throw updateError;

      // 3. Create finance_coffee_lots entry
      const qualityJson = {
        moisture_content: data.moisture_content,
        group1_percentage: data.group1_percentage,
        group2_percentage: data.group2_percentage,
        pods_percentage: data.pods_percentage,
        husks_percentage: data.husks_percentage,
        fm_percentage: data.fm_percentage,
        outturn_percentage: data.outturn_percentage,
        comments: data.comments
      };

      const { error: financeError } = await supabase
        .from('finance_coffee_lots')
        .insert({
          quality_assessment_id: assessment.id,
          coffee_record_id: lot.id,
          supplier_id: lot.supplier_id,
          assessed_by: employee?.email || '',
          assessed_at: new Date().toISOString(),
          quality_json: qualityJson,
          unit_price_ugx: data.unit_price_ugx,
          quantity_kg: data.quantity_kg,
          finance_status: 'READY_FOR_FINANCE'
        });

      if (financeError) throw financeError;
    },
    onSuccess: (_, variables) => {
      // Prepare GRN data for printing
      const grnInfo = {
        grnNumber: `GRN-${lot.batch_number}`,
        supplierName: lot.supplier_name,
        coffeeType: lot.coffee_type,
        qualityAssessment: 'Approved',
        numberOfBags: lot.bags,
        totalKgs: variables.quantity_kg,
        unitPrice: variables.unit_price_ugx,
        assessedBy: employee?.email || 'Quality Controller',
        createdAt: new Date().toISOString(),
        moisture: variables.moisture_content,
        group1_defects: variables.group1_percentage,
        group2_defects: variables.group2_percentage,
        pods: variables.pods_percentage,
        husks: variables.husks_percentage,
        stones: variables.fm_percentage
      };
      
      setGrnData(grnInfo);
      setShowGRNModal(true);
      
      toast({
        title: "Success",
        description: "Lot approved and added to inventory. Print GRN now."
      });
      queryClient.invalidateQueries({ queryKey: ['v2-pending-quality'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const rejectLot = useMutation({
    mutationFn: async (comments: string) => {
      // Update coffee_records status
      const { error } = await supabase
        .from('coffee_records')
        .update({ status: 'QUALITY_REJECTED' })
        .eq('id', lot.id);

      if (error) throw error;

      // Create a quality assessment record with rejection
      await supabase
        .from('quality_assessments')
        .insert({
          store_record_id: lot.id,
          batch_number: lot.batch_number,
          assessed_by: employee?.email || '',
          date_assessed: new Date().toISOString().split('T')[0],
          moisture: 0,
          suggested_price: 0,
          comments: comments,
          status: 'rejected',
          reject_final: true
        });
    },
    onSuccess: () => {
      toast({
        title: "Lot Rejected",
        description: "Lot has been rejected and will not proceed to finance"
      });
      queryClient.invalidateQueries({ queryKey: ['v2-pending-quality'] });
      navigate('/v2/quality');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: AssessmentForm) => {
    approveAssessment.mutate(data);
  };

  const handleReject = () => {
    const comments = watch('comments');
    if (!comments) {
      toast({
        title: "Comments Required",
        description: "Please provide rejection comments",
        variant: "destructive"
      });
      return;
    }
    rejectLot.mutate(comments);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Alert>
        <AlertDescription>
          Fill in the quality parameters below. All percentages should total to 100%.
        </AlertDescription>
      </Alert>

      {/* Auto-rejection warning for Arabica */}
      {isArabica && shouldAutoReject && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Auto-Rejection:</strong> This lot will be rejected because{' '}
            {robustaPercentage > 3 && `Robusta in Arabica exceeds 3% (${robustaPercentage}%)`}
            {robustaPercentage > 3 && g1Percentage > 12 && ' and '}
            {g1Percentage > 12 && `G1 defects exceed 12% (${g1Percentage}%)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Quality Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="moisture_content">Moisture Content (%) *</Label>
          <Input
            id="moisture_content"
            type="number"
            step="0.1"
            {...register('moisture_content', { required: true, min: 0, max: 100 })}
          />
        </div>

        <div>
          <Label htmlFor="outturn_percentage">Outturn (%) *</Label>
          <Input
            id="outturn_percentage"
            type="number"
            step="0.1"
            {...register('outturn_percentage', { required: true, min: 0, max: 100 })}
          />
        </div>

        {/* Robusta in Arabica field - only for Arabica coffee */}
        {isArabica && (
          <div>
            <Label htmlFor="robusta_in_arabica_percentage">
              Robusta in Arabica (%) *
              <span className="text-xs text-muted-foreground ml-1">(max 3%)</span>
            </Label>
            <Input
              id="robusta_in_arabica_percentage"
              type="number"
              step="0.1"
              className={robustaPercentage > 3 ? 'border-destructive' : ''}
              {...register('robusta_in_arabica_percentage', { required: isArabica, min: 0, max: 100 })}
            />
            {robustaPercentage > 3 && (
              <p className="text-xs text-destructive mt-1">Exceeds 3% limit - coffee will be rejected</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="group1_percentage">
            Group 1 (%) *
            {isArabica && <span className="text-xs text-muted-foreground ml-1">(max 12%)</span>}
          </Label>
          <Input
            id="group1_percentage"
            type="number"
            step="0.1"
            className={isArabica && g1Percentage > 12 ? 'border-destructive' : ''}
            {...register('group1_percentage', { required: true, min: 0, max: 100 })}
          />
          {isArabica && g1Percentage > 12 && (
            <p className="text-xs text-destructive mt-1">Exceeds 12% limit - coffee will be rejected</p>
          )}
        </div>

        <div>
          <Label htmlFor="group2_percentage">Group 2 (%) *</Label>
          <Input
            id="group2_percentage"
            type="number"
            step="0.1"
            {...register('group2_percentage', { required: true, min: 0, max: 100 })}
          />
        </div>

        <div>
          <Label htmlFor="pods_percentage">Pods (%) *</Label>
          <Input
            id="pods_percentage"
            type="number"
            step="0.1"
            {...register('pods_percentage', { required: true, min: 0, max: 100 })}
          />
        </div>

        <div>
          <Label htmlFor="husks_percentage">Husks (%) *</Label>
          <Input
            id="husks_percentage"
            type="number"
            step="0.1"
            {...register('husks_percentage', { required: true, min: 0, max: 100 })}
          />
        </div>

        <div>
          <Label htmlFor="fm_percentage">Foreign Matter (%) *</Label>
          <Input
            id="fm_percentage"
            type="number"
            step="0.1"
            {...register('fm_percentage', { required: true, min: 0, max: 100 })}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <Label htmlFor="quantity_kg">Quantity (kg) *</Label>
          <Input
            id="quantity_kg"
            type="number"
            step="0.01"
            {...register('quantity_kg', { required: true, min: 0 })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Adjust if rejecting some quantity
          </p>
        </div>

        <div>
          <Label htmlFor="unit_price_ugx">Unit Price (UGX/kg) *</Label>
          <Input
            id="unit_price_ugx"
            type="number"
            step="1"
            {...register('unit_price_ugx', { required: true, min: 0 })}
          />
        </div>
      </div>

      {/* Comments */}
      <div>
        <Label htmlFor="comments">Comments / Remarks</Label>
        <Textarea
          id="comments"
          {...register('comments')}
          rows={4}
          placeholder="Add any quality notes or observations..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="destructive"
          onClick={handleReject}
          disabled={approveAssessment.isPending || rejectLot.isPending}
        >
          {rejectLot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <XCircle className="mr-2 h-4 w-4" />
          Reject Lot
        </Button>
        <Button
          type="submit"
          disabled={approveAssessment.isPending || rejectLot.isPending || shouldAutoReject}
          title={shouldAutoReject ? 'Cannot approve - quality thresholds exceeded' : ''}
        >
          {approveAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve & Send to Finance
        </Button>
      </div>

      {/* GRN Print Modal */}
      <GRNPrintModal
        open={showGRNModal}
        onClose={() => {
          setShowGRNModal(false);
          navigate('/v2/quality');
        }}
        grnData={grnData}
      />
    </form>
  );
};

export default QualityAssessmentForm;
