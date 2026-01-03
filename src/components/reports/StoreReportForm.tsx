import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStoreReports } from '@/hooks/useStoreReports';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Save, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const StoreReportForm = () => {
  const { addStoreReport } = useStoreReports();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    coffee_type: '',
    kilograms_bought: 0,
    average_buying_price: 0,
    kilograms_sold: 0,
    bags_sold: 0,
    sold_to: '',
    bags_left: 0,
    kilograms_left: 0,
    kilograms_unbought: 0,
    advances_given: 0,
    comments: '',
    input_by: employee?.name || '',
    attachment_url: '',
    attachment_name: '',
    delivery_note_url: '',
    delivery_note_name: '',
    dispatch_report_url: '',
    dispatch_report_name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addStoreReport(formData);
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        coffee_type: '',
        kilograms_bought: 0,
        average_buying_price: 0,
        kilograms_sold: 0,
        bags_sold: 0,
        sold_to: '',
        bags_left: 0,
        kilograms_left: 0,
        kilograms_unbought: 0,
        advances_given: 0,
        comments: '',
        input_by: employee?.name || '',
        attachment_url: '',
        attachment_name: '',
        delivery_note_url: '',
        delivery_note_name: '',
        dispatch_report_url: '',
        dispatch_report_name: ''
      });
    } catch (error) {
      console.error('Error submitting store report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBulkFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    if (files.length > 2) {
      toast.error("Please select only 2 documents");
      return;
    }

    setUploadingFile(true);
    
    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File ${index + 1}: Please upload a valid image (JPEG, PNG) or PDF file`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${index + 1}: File size must be less than 10MB`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('report-documents')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        return {
          filePath,
          fileName: file.name,
          index
        };
      });

      const results = await Promise.all(uploadPromises);
      
      // Update form data with uploaded files
      const updateFields: any = {};
      results.forEach((result) => {
        if (result.index === 0) {
          updateFields.attachment_url = result.filePath;
          updateFields.attachment_name = result.fileName;
        } else if (result.index === 1) {
          updateFields.delivery_note_url = result.filePath;
          updateFields.delivery_note_name = result.fileName;
        }
      });

      setFormData(prev => ({
        ...prev,
        ...updateFields
      }));

      toast.success(`${results.length} document(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error instanceof Error ? error.message : "Failed to upload documents");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'general' | 'delivery_note' | 'dispatch_report') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image (JPEG, PNG) or PDF file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadingFile(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Update the appropriate fields based on file type
      const updateFields: any = {};
      switch (fileType) {
        case 'general':
          updateFields.attachment_url = filePath;
          updateFields.attachment_name = file.name;
          break;
        case 'delivery_note':
          updateFields.delivery_note_url = filePath;
          updateFields.delivery_note_name = file.name;
          break;
        case 'dispatch_report':
          updateFields.dispatch_report_url = filePath;
          updateFields.dispatch_report_name = file.name;
          break;
      }

      setFormData(prev => ({
        ...prev,
        ...updateFields
      }));

      toast.success(`${fileType.replace('_', ' ').toUpperCase()} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Daily Store Report
        </CardTitle>
        <CardDescription>
          Record daily store operations and coffee transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coffee_type">Coffee Type</Label>
              <Select value={formData.coffee_type} onValueChange={(value) => handleInputChange('coffee_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coffee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arabica">Arabica</SelectItem>
                  <SelectItem value="Robusta">Robusta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_bought">Kilograms Bought</Label>
              <Input
                id="kilograms_bought"
                type="number"
                step="0.01"
                value={formData.kilograms_bought}
                onChange={(e) => handleInputChange('kilograms_bought', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="average_buying_price">Average Buying Price (UGX/kg)</Label>
              <Input
                id="average_buying_price"
                type="number"
                step="0.01"
                value={formData.average_buying_price}
                onChange={(e) => handleInputChange('average_buying_price', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_sold">Kilograms Sold</Label>
              <Input
                id="kilograms_sold"
                type="number"
                step="0.01"
                value={formData.kilograms_sold}
                onChange={(e) => handleInputChange('kilograms_sold', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bags_sold">Number of Bags Sold</Label>
              <Input
                id="bags_sold"
                type="number"
                value={formData.bags_sold}
                onChange={(e) => handleInputChange('bags_sold', parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sold_to">Sold To</Label>
              <Input
                id="sold_to"
                type="text"
                value={formData.sold_to}
                onChange={(e) => handleInputChange('sold_to', e.target.value)}
                placeholder="Customer/buyer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bags_left">Bags Left in Store</Label>
              <Input
                id="bags_left"
                type="number"
                value={formData.bags_left}
                onChange={(e) => handleInputChange('bags_left', parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_left">Kilograms Left in Store</Label>
              <Input
                id="kilograms_left"
                type="number"
                step="0.01"
                value={formData.kilograms_left}
                onChange={(e) => handleInputChange('kilograms_left', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_unbought">Kilograms Unbought in Store</Label>
              <Input
                id="kilograms_unbought"
                type="number"
                step="0.01"
                value={formData.kilograms_unbought}
                onChange={(e) => handleInputChange('kilograms_unbought', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advances_given">Advances Given (UGX)</Label>
              <Input
                id="advances_given"
                type="number"
                step="0.01"
                value={formData.advances_given}
                onChange={(e) => handleInputChange('advances_given', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="input_by">Input By</Label>
              <Input
                id="input_by"
                type="text"
                value={formData.input_by}
                onChange={(e) => handleInputChange('input_by', e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
          </div>

          {/* Document Attachment Section - Upload 2 Documents */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Attachments - Upload 2 Documents
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Document 1 */}
              <div className="space-y-2">
                <Label>Document 1</Label>
                <div className="flex gap-2">
                  <input
                    id="document-1-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileUpload(e, 'general')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('document-1-upload')?.click()}
                    disabled={uploadingFile}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Upload Document 1'}
                  </Button>
                </div>
                {formData.attachment_name && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{formData.attachment_name}</span>
                  </div>
                )}
              </div>

              {/* Document 2 */}
              <div className="space-y-2">
                <Label>Document 2</Label>
                <div className="flex gap-2">
                  <input
                    id="document-2-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileUpload(e, 'delivery_note')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('document-2-upload')?.click()}
                    disabled={uploadingFile}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingFile ? 'Uploading...' : 'Upload Document 2'}
                  </Button>
                </div>
                {formData.delivery_note_name && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">{formData.delivery_note_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk Upload Option */}
            <div className="pt-2 border-t">
              <Label>Or upload both documents at once:</Label>
              <div className="mt-2">
                <input
                  id="bulk-upload"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleBulkFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('bulk-upload')?.click()}
                  disabled={uploadingFile}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFile ? 'Uploading...' : 'Upload 2 Documents Together'}
                </Button>
              </div>
            </div>

            {/* Upload Progress */}
            {(formData.attachment_name && formData.delivery_note_name) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Both documents uploaded successfully!</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => handleInputChange('comments', e.target.value)}
              placeholder="Additional notes or observations"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Store Report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default StoreReportForm;