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
import { Loader2, CheckCircle, XCircle, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useActivityTracker } from "@/hooks/useActivityTracker";

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
  physical_assessment_by: string;
}

const QualityAssessmentForm = ({ lot }: QualityAssessmentFormProps) => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { trackFormSubmission, trackTaskCompletion } = useActivityTracker();
  const [isRejecting, setIsRejecting] = useState(false);
  const [generatedRef, setGeneratedRef] = useState<string | null>(null);
  
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
      outturn_percentage: 62,
      physical_assessment_by: ''
    }
  });

  // Watch values for auto-rejection logic
  const robustaPercentage = watch('robusta_in_arabica_percentage');
  const g1Percentage = watch('group1_percentage');
  
  // Auto-reject conditions: Robusta in Arabica > 3% OR G1 defects > 12%
  const isArabica = lot.coffee_type?.toLowerCase().includes('arabica');
  const shouldAutoReject = isArabica && (robustaPercentage > 3 || g1Percentage > 12);

  const submitForPricing = useMutation({
    mutationFn: async (data: AssessmentForm) => {
      // 1. Create quality assessment with status 'pending_admin_pricing'
      const { data: assessment, error: assessError } = await supabase
        .from('quality_assessments')
        .insert({
          store_record_id: lot.id,
          batch_number: lot.batch_number,
          assessed_by: employee?.email || '',
          physical_assessment_by: data.physical_assessment_by,
          system_assessment_by: employee?.name || employee?.email || '',
          date_assessed: new Date().toISOString().split('T')[0],
          moisture: data.moisture_content,
          group1_defects: data.group1_percentage,
          group2_defects: data.group2_percentage,
          pods: data.pods_percentage,
          husks: data.husks_percentage,
          fm: data.fm_percentage,
          outturn: data.outturn_percentage,
          suggested_price: data.unit_price_ugx,
          final_price: null,
          comments: data.comments,
          status: 'pending_admin_pricing'
        } as any)
        .select()
        .single();

      if (assessError) throw assessError;

      // 2. Update coffee_records status to awaiting pricing
      const { error: updateError } = await supabase
        .from('coffee_records')
        .update({ status: 'AWAITING_PRICING' })
        .eq('id', lot.id);

      if (updateError) throw updateError;
      return assessment;
    },
    onSuccess: (assessment: any) => {
      trackFormSubmission('quality_assessment');
      trackTaskCompletion('quality assessment');
      const ref = assessment?.assessment_ref;
      if (ref) setGeneratedRef(ref);
      toast({
        title: "Assessment Submitted",
        description: ref
          ? `Reference: ${ref} — write this on the physical form.`
          : "Quality assessment saved and sent to admin for final pricing."
      });
      queryClient.invalidateQueries({ queryKey: ['v2-pending-quality'] });
      // Delay navigation so user can copy the ref
      if (!ref) navigate('/v2/quality');
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
    mutationFn: async (data: AssessmentForm) => {
      // Update coffee_records status
      const { error } = await supabase
        .from('coffee_records')
        .update({ status: 'QUALITY_REJECTED' })
        .eq('id', lot.id);

      if (error) throw error;

      // Create a quality assessment record with rejection — include all quality data and suggested price
      // Status is 'pending_admin_pricing' so admin can review the price, but reject_final stays true
      const { data: assessment } = await supabase
        .from('quality_assessments')
        .insert({
          store_record_id: lot.id,
          batch_number: lot.batch_number,
          assessed_by: employee?.email || '',
          physical_assessment_by: data.physical_assessment_by,
          system_assessment_by: employee?.name || employee?.email || '',
          date_assessed: new Date().toISOString().split('T')[0],
          moisture: data.moisture_content,
          group1_defects: data.group1_percentage,
          group2_defects: data.group2_percentage,
          pods: data.pods_percentage,
          husks: data.husks_percentage,
          fm: data.fm_percentage,
          outturn: data.outturn_percentage,
          suggested_price: data.unit_price_ugx,
          comments: data.comments,
          status: 'pending_admin_pricing',
          reject_final: true
        } as any)
        .select()
        .single();
      return assessment;
    },
    onSuccess: (assessment: any) => {
      trackTaskCompletion('quality rejection');
      const ref = assessment?.assessment_ref;
      if (ref) setGeneratedRef(ref);
      toast({
        title: "Lot Rejected — Sent to Admin",
        description: ref
          ? `Reference: ${ref} — write this on the physical form.`
          : "Lot rejected with quality data and suggested price sent to admin for review"
      });
      queryClient.invalidateQueries({ queryKey: ['v2-pending-quality'] });
      if (!ref) navigate('/v2/quality');
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
    if (!data.physical_assessment_by?.trim()) {
      toast({
        title: "Physical Assessor Required",
        description: "Please enter the name of the person who did the physical assessment.",
        variant: "destructive"
      });
      return;
    }
    submitForPricing.mutate(data);
  };

  const handleReject = handleSubmit((data: AssessmentForm) => {
    if (!data.physical_assessment_by?.trim()) {
      toast({
        title: "Physical Assessor Required",
        description: "Please enter the name of the person who did the physical assessment.",
        variant: "destructive"
      });
      return;
    }
    if (!data.comments) {
      toast({
        title: "Comments Required",
        description: "Please provide rejection comments",
        variant: "destructive"
      });
      return;
    }
    rejectLot.mutate(data);
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Alert>
        <AlertDescription>
          Fill in the quality parameters below. All percentages should total to 100%.
        </AlertDescription>
      </Alert>

      {/* Reference shown after successful submission */}
      {generatedRef && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <strong>Assessment Reference:</strong>{' '}
                <span className="font-mono text-lg text-green-700 dark:text-green-400">{generatedRef}</span>
                <p className="text-xs mt-1">Copy this and write it on the physical assessment form.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedRef);
                    toast({ title: "Copied", description: `${generatedRef} copied to clipboard` });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate('/v2/quality')}
                >
                  Done
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Assessor identification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
        <div>
          <Label htmlFor="physical_assessment_by">Physical Assessment By *</Label>
          <Input
            id="physical_assessment_by"
            type="text"
            placeholder="Name of person who did physical analysis"
            {...register('physical_assessment_by', { required: true })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Person who performed the lab/physical analysis
          </p>
        </div>
        <div>
          <Label>System Assessment By</Label>
          <Input
            type="text"
            value={employee?.name || employee?.email || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Auto-filled with your account (you are entering the results)
          </p>
        </div>
      </div>

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
          disabled={submitForPricing.isPending || rejectLot.isPending}
        >
          {rejectLot.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <XCircle className="mr-2 h-4 w-4" />
          Reject & Send to Admin
        </Button>
        <Button
          type="submit"
          disabled={submitForPricing.isPending || rejectLot.isPending || shouldAutoReject}
          title={shouldAutoReject ? 'Cannot approve - quality thresholds exceeded' : ''}
        >
          {submitForPricing.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <CheckCircle className="mr-2 h-4 w-4" />
          Submit for Admin Pricing
        </Button>
      </div>
    </form>
  );
};

export default QualityAssessmentForm;
