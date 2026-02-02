import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Upload, FileText, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TruckData {
  truck_number: string;
  total_bags_loaded: number;
  total_weight_store: number;
  traceability_confirmed: boolean;
  lot_batch_references: string;
  quality_report_attached: boolean;
}

interface BuyerVerification {
  truck_number: number;
  buyer_bags_count: number;
  buyer_weight: number;
  store_weight: number;
  difference: number;
}

interface DispatchFormData {
  dispatch_date: string;
  dispatch_location: string;
  coffee_type: string;
  other_coffee_type: string;
  destination_buyer: string;
  dispatch_supervisor: string;
  vehicle_registrations: string;
  trucks: TruckData[];
  buyer_verification: BuyerVerification[];
  quality_checked_by_buyer: boolean;
  buyer_quality_remarks: string;
  bags_deducted: number;
  deduction_reasons: string[];
  other_deduction_reason: string;
  total_deducted_weight: number;
  remarks: string;
}

const initialTruck: TruckData = {
  truck_number: '',
  total_bags_loaded: 0,
  total_weight_store: 0,
  traceability_confirmed: false,
  lot_batch_references: '',
  quality_report_attached: false
};

const initialVerification: BuyerVerification = {
  truck_number: 1,
  buyer_bags_count: 0,
  buyer_weight: 0,
  store_weight: 0,
  difference: 0
};

const deductionOptions = [
  'Torn Bags',
  'Quality Issue',
  'Moisture',
  'Weight Discrepancy',
  'Other'
];

const EUDRDispatchComparisonForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { employee } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<DispatchFormData>({
    dispatch_date: new Date().toISOString().split('T')[0],
    dispatch_location: '',
    coffee_type: '',
    other_coffee_type: '',
    destination_buyer: '',
    dispatch_supervisor: '',
    vehicle_registrations: '',
    trucks: [{ ...initialTruck }],
    buyer_verification: [{ ...initialVerification }],
    quality_checked_by_buyer: false,
    buyer_quality_remarks: '',
    bags_deducted: 0,
    deduction_reasons: [],
    other_deduction_reason: '',
    total_deducted_weight: 0,
    remarks: ''
  });

  const addTruck = () => {
    if (formData.trucks.length < 3) {
      setFormData({
        ...formData,
        trucks: [...formData.trucks, { ...initialTruck }],
        buyer_verification: [...formData.buyer_verification, { ...initialVerification, truck_number: formData.trucks.length + 1 }]
      });
    }
  };

  const removeTruck = (index: number) => {
    if (formData.trucks.length > 1) {
      const newTrucks = formData.trucks.filter((_, i) => i !== index);
      const newVerification = formData.buyer_verification.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        trucks: newTrucks,
        buyer_verification: newVerification.map((v, i) => ({ ...v, truck_number: i + 1 }))
      });
    }
  };

  const updateTruck = (index: number, field: keyof TruckData, value: any) => {
    const newTrucks = [...formData.trucks];
    newTrucks[index] = { ...newTrucks[index], [field]: value };
    
    // Update buyer verification store weight if truck weight changes
    if (field === 'total_weight_store') {
      const newVerification = [...formData.buyer_verification];
      if (newVerification[index]) {
        newVerification[index].store_weight = value;
        newVerification[index].difference = newVerification[index].buyer_weight - value;
      }
      setFormData({ ...formData, trucks: newTrucks, buyer_verification: newVerification });
    } else {
      setFormData({ ...formData, trucks: newTrucks });
    }
  };

  const updateVerification = (index: number, field: keyof BuyerVerification, value: number) => {
    const newVerification = [...formData.buyer_verification];
    newVerification[index] = { ...newVerification[index], [field]: value };
    
    // Auto-calculate difference
    if (field === 'buyer_weight' || field === 'store_weight') {
      newVerification[index].difference = newVerification[index].buyer_weight - newVerification[index].store_weight;
    }
    
    setFormData({ ...formData, buyer_verification: newVerification });
  };

  const toggleDeductionReason = (reason: string) => {
    const newReasons = formData.deduction_reasons.includes(reason)
      ? formData.deduction_reasons.filter(r => r !== reason)
      : [...formData.deduction_reasons, reason];
    setFormData({ ...formData, deduction_reasons: newReasons });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setAttachmentFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.dispatch_date || !formData.dispatch_location || !formData.destination_buyer) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.coffee_type) {
      toast.error('Please select a coffee type');
      return;
    }

    setSubmitting(true);
    try {
      let attachmentUrl = null;
      let attachmentName = null;

      // Upload attachment if present
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `dispatch-reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('dispatch-attachments')
          .upload(filePath, attachmentFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dispatch-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = attachmentFile.name;
      }

      const coffeeType = formData.coffee_type === 'other' ? formData.other_coffee_type : formData.coffee_type;
      const deductionReasons = formData.deduction_reasons.includes('Other') && formData.other_deduction_reason
        ? [...formData.deduction_reasons.filter(r => r !== 'Other'), formData.other_deduction_reason]
        : formData.deduction_reasons;

      const { error } = await supabase.from('eudr_dispatch_reports').insert([{
        created_by: employee?.email || 'unknown',
        created_by_name: employee?.name || 'Unknown User',
        dispatch_date: formData.dispatch_date,
        dispatch_location: formData.dispatch_location,
        coffee_type: coffeeType,
        destination_buyer: formData.destination_buyer,
        dispatch_supervisor: formData.dispatch_supervisor,
        vehicle_registrations: formData.vehicle_registrations,
        trucks: formData.trucks as unknown as any,
        buyer_verification: formData.buyer_verification as unknown as any,
        quality_checked_by_buyer: formData.quality_checked_by_buyer,
        buyer_quality_remarks: formData.buyer_quality_remarks,
        bags_deducted: formData.bags_deducted,
        deduction_reasons: deductionReasons,
        total_deducted_weight: formData.total_deducted_weight,
        remarks: formData.remarks,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        status: 'submitted'
      }]);

      if (error) throw error;

      toast.success('Dispatch comparison report submitted successfully');
      
      // Reset form
      setFormData({
        dispatch_date: new Date().toISOString().split('T')[0],
        dispatch_location: '',
        coffee_type: '',
        other_coffee_type: '',
        destination_buyer: '',
        dispatch_supervisor: '',
        vehicle_registrations: '',
        trucks: [{ ...initialTruck }],
        buyer_verification: [{ ...initialVerification }],
        quality_checked_by_buyer: false,
        buyer_quality_remarks: '',
        bags_deducted: 0,
        deduction_reasons: [],
        other_deduction_reason: '',
        total_deducted_weight: 0,
        remarks: ''
      });
      setAttachmentFile(null);
      
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting dispatch report:', error);
      toast.error('Failed to submit dispatch report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section A: Dispatch Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            A. Dispatch Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dispatch-date">Date *</Label>
              <Input
                id="dispatch-date"
                type="date"
                value={formData.dispatch_date}
                onChange={(e) => setFormData({ ...formData, dispatch_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="dispatch-location">Dispatch Location (Store) *</Label>
              <Input
                id="dispatch-location"
                value={formData.dispatch_location}
                onChange={(e) => setFormData({ ...formData, dispatch_location: e.target.value })}
                placeholder="Enter store location"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Coffee Type *</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.coffee_type === 'Robusta'}
                    onCheckedChange={(checked) => checked && setFormData({ ...formData, coffee_type: 'Robusta' })}
                  />
                  <Label className="font-normal">Robusta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.coffee_type === 'Drugar'}
                    onCheckedChange={(checked) => checked && setFormData({ ...formData, coffee_type: 'Drugar' })}
                  />
                  <Label className="font-normal">Drugar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.coffee_type === 'other'}
                    onCheckedChange={(checked) => checked && setFormData({ ...formData, coffee_type: 'other' })}
                  />
                  <Label className="font-normal">Other:</Label>
                  {formData.coffee_type === 'other' && (
                    <Input
                      className="w-32"
                      value={formData.other_coffee_type}
                      onChange={(e) => setFormData({ ...formData, other_coffee_type: e.target.value })}
                      placeholder="Specify"
                    />
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="destination-buyer">Destination / Buyer *</Label>
              <Input
                id="destination-buyer"
                value={formData.destination_buyer}
                onChange={(e) => setFormData({ ...formData, destination_buyer: e.target.value })}
                placeholder="Enter buyer name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dispatch-supervisor">Dispatch Supervisor / Monitor</Label>
              <Input
                id="dispatch-supervisor"
                value={formData.dispatch_supervisor}
                onChange={(e) => setFormData({ ...formData, dispatch_supervisor: e.target.value })}
                placeholder="Enter supervisor name"
              />
            </div>
            <div>
              <Label htmlFor="vehicle-registrations">Vehicle Registration(s)</Label>
              <Input
                id="vehicle-registrations"
                value={formData.vehicle_registrations}
                onChange={(e) => setFormData({ ...formData, vehicle_registrations: e.target.value })}
                placeholder="Enter vehicle registrations"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Dispatch Summary Per Truck */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            B. Dispatch Summary (Per Truck)
          </CardTitle>
          <CardDescription>Add up to 3 trucks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formData.trucks.map((truck, index) => (
            <Card key={index} className="border-dashed">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {index === 0 ? 'FIRST TRUCK' : index === 1 ? 'SECOND TRUCK' : 'THIRD TRUCK'}
                  </CardTitle>
                  {formData.trucks.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeTruck(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Truck Number / Plate</Label>
                    <Input
                      value={truck.truck_number}
                      onChange={(e) => updateTruck(index, 'truck_number', e.target.value)}
                      placeholder="Enter truck number"
                    />
                  </div>
                  <div>
                    <Label>Total Bags Loaded</Label>
                    <Input
                      type="number"
                      value={truck.total_bags_loaded || ''}
                      onChange={(e) => updateTruck(index, 'total_bags_loaded', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Total Weight (Store Scale – Kgs)</Label>
                    <Input
                      type="number"
                      value={truck.total_weight_store || ''}
                      onChange={(e) => updateTruck(index, 'total_weight_store', Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Lot / Batch Reference(s)</Label>
                    <Input
                      value={truck.lot_batch_references}
                      onChange={(e) => updateTruck(index, 'lot_batch_references', e.target.value)}
                      placeholder="Enter batch references"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={truck.traceability_confirmed}
                      onCheckedChange={(checked) => updateTruck(index, 'traceability_confirmed', !!checked)}
                    />
                    <Label className="font-normal">Traceability Confirmed</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={truck.quality_report_attached}
                      onCheckedChange={(checked) => updateTruck(index, 'quality_report_attached', !!checked)}
                    />
                    <Label className="font-normal">Quality Report Attached</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {formData.trucks.length < 3 && (
            <Button variant="outline" onClick={addTruck} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Truck
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section C: Buyer Weighing & Verification */}
      <Card>
        <CardHeader>
          <CardTitle>C. Buyer Weighing & Verification</CardTitle>
          <CardDescription>To be completed after buyer weighing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Buyer Bags Count</TableHead>
                <TableHead>Buyer Weight (Kgs)</TableHead>
                <TableHead>Store Weight (Kgs)</TableHead>
                <TableHead>Difference (± Kgs)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.buyer_verification.map((verification, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{verification.truck_number}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      value={verification.buyer_bags_count || ''}
                      onChange={(e) => updateVerification(index, 'buyer_bags_count', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      value={verification.buyer_weight || ''}
                      onChange={(e) => updateVerification(index, 'buyer_weight', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      value={verification.store_weight || ''}
                      onChange={(e) => updateVerification(index, 'store_weight', Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className={verification.difference !== 0 ? (verification.difference > 0 ? 'text-green-600' : 'text-destructive') : ''}>
                    {verification.difference > 0 ? '+' : ''}{verification.difference.toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section D: Buyer Quality Checks */}
      <Card>
        <CardHeader>
          <CardTitle>D. Buyer Quality Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.quality_checked_by_buyer}
              onCheckedChange={(checked) => setFormData({ ...formData, quality_checked_by_buyer: !!checked })}
            />
            <Label className="font-normal">Quality Checked by Buyer</Label>
          </div>
          <div>
            <Label htmlFor="buyer-quality-remarks">Buyer Quality Remarks</Label>
            <Textarea
              id="buyer-quality-remarks"
              value={formData.buyer_quality_remarks}
              onChange={(e) => setFormData({ ...formData, buyer_quality_remarks: e.target.value })}
              placeholder="Enter buyer's quality remarks..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Section E: Bag & Weight Deductions */}
      <Card>
        <CardHeader>
          <CardTitle>E. Bag & Weight Deductions (If Any)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bags-deducted">Bags Deducted</Label>
              <Input
                id="bags-deducted"
                type="number"
                value={formData.bags_deducted || ''}
                onChange={(e) => setFormData({ ...formData, bags_deducted: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="total-deducted-weight">Total Deducted Weight (Kgs)</Label>
              <Input
                id="total-deducted-weight"
                type="number"
                value={formData.total_deducted_weight || ''}
                onChange={(e) => setFormData({ ...formData, total_deducted_weight: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label>Reason for Deduction</Label>
            <div className="flex flex-wrap gap-4 mt-2">
              {deductionOptions.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.deduction_reasons.includes(reason)}
                    onCheckedChange={() => toggleDeductionReason(reason)}
                  />
                  <Label className="font-normal">{reason}</Label>
                </div>
              ))}
            </div>
            {formData.deduction_reasons.includes('Other') && (
              <Input
                className="mt-2 w-full md:w-1/2"
                value={formData.other_deduction_reason}
                onChange={(e) => setFormData({ ...formData, other_deduction_reason: e.target.value })}
                placeholder="Specify other reason"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section F: Remarks & Observations */}
      <Card>
        <CardHeader>
          <CardTitle>F. Remarks & Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="Enter any additional remarks or observations..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* File Attachment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Attach Physical Document
          </CardTitle>
          <CardDescription>Upload scanned copy of the physical dispatch form (Max 10MB)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="flex-1"
            />
            {attachmentFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {attachmentFile.name}
                <Button variant="ghost" size="sm" onClick={() => setAttachmentFile(null)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button onClick={handleSubmit} disabled={submitting} size="lg">
          {submitting ? 'Submitting...' : 'Submit Dispatch Report'}
        </Button>
      </div>
    </div>
  );
};

export default EUDRDispatchComparisonForm;
