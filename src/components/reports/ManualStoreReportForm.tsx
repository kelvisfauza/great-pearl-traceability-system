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
import { Save, Scan, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

const ManualStoreReportForm = () => {
  const { addStoreReport } = useStoreReports();
  const { employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    coffee_type: '',
    kilograms_bought: 0,
    average_buying_price: 0,
    kilograms_unbought: 0,
    kilograms_sold: 0,
    bags_sold: 0,
    sold_to: '',
    bags_left: 0,
    kilograms_left: 0,
    advances_given: 0,
    input_by: employee?.name || '',
    attachment_url: '',
    attachment_name: '',
    delivery_note_url: '',
    delivery_note_name: ''
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      console.log('📋 Submitting store report with data:', {
        date: formData.date,
        coffee_type: formData.coffee_type,
        attachment_url: formData.attachment_url,
        attachment_name: formData.attachment_name,
        delivery_note_url: formData.delivery_note_url,
        delivery_note_name: formData.delivery_note_name
      });

      await addStoreReport(formData);
      
      toast.success("Manual store report submitted successfully");
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        coffee_type: '',
        kilograms_bought: 0,
        average_buying_price: 0,
        kilograms_unbought: 0,
        kilograms_sold: 0,
        bags_sold: 0,
        sold_to: '',
        bags_left: 0,
        kilograms_left: 0,
        advances_given: 0,
        input_by: employee?.name || '',
        attachment_url: '',
        attachment_name: '',
        delivery_note_url: '',
        delivery_note_name: ''
      });
    } catch (error) {
      console.error('Error submitting manual store report:', error);
      toast.error("Failed to submit report");
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldPrefix: 'attachment' | 'delivery_note') => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log(`📤 Uploading ${fieldPrefix}:`, file.name);

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

      console.log(`📁 Uploading to storage path: ${filePath}`);

      const { error: uploadError } = await supabase.storage
        .from('report-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error(`❌ Upload error for ${fieldPrefix}:`, uploadError);
        throw uploadError;
      }

      console.log(`✅ ${fieldPrefix} uploaded successfully:`, filePath);

      // Update form data with both URL and name
      const urlField = `${fieldPrefix}_url`;
      const nameField = `${fieldPrefix}_name`;
      
      setFormData(prev => {
        const updated = {
          ...prev,
          [urlField]: filePath,
          [nameField]: file.name
        };
        console.log(`📝 Form data updated for ${fieldPrefix}:`, {
          [urlField]: updated[urlField],
          [nameField]: updated[nameField]
        });
        return updated;
      });

      toast.success(`Document ${fieldPrefix === 'attachment' ? '1' : '2'} uploaded successfully`);
    } catch (error) {
      console.error(`❌ Error uploading ${fieldPrefix}:`, error);
      toast.error(`Failed to upload document ${fieldPrefix === 'attachment' ? '1' : '2'}: ${(error as Error).message}`);
    } finally {
      setUploadingFile(false);
    }
  };


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="h-5 w-5" />
          Manual Store Report with Document Scan
        </CardTitle>
        <CardDescription>
          Record store operations and attach scanned documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Upload Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Document Uploads (Optional - Upload up to 2 documents)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Attachment */}
              <div className="space-y-2">
                <Label htmlFor="file-upload-1">Document 1 (PDF, JPG, PNG)</Label>
                <input
                  id="file-upload-1"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'attachment')}
                  disabled={uploadingFile}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {formData.attachment_name && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground font-medium">{formData.attachment_name}</span>
                  </div>
                )}
              </div>

              {/* Second Attachment */}
              <div className="space-y-2">
                <Label htmlFor="file-upload-2">Document 2 (PDF, JPG, PNG)</Label>
                <input
                  id="file-upload-2"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'delivery_note')}
                  disabled={uploadingFile}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {formData.delivery_note_name && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground font-medium">{formData.delivery_note_name}</span>
                  </div>
                )}
              </div>
            </div>
            
            {uploadingFile && (
              <p className="text-sm text-muted-foreground">Uploading document...</p>
            )}
          </div>

          {/* Regular Form Fields */}
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
              <Label htmlFor="kilograms_bought">Coffee Bought (kg)</Label>
              <Input
                id="kilograms_bought"
                type="number"
                step="0.01"
                value={formData.kilograms_bought}
                onChange={(e) => handleInputChange('kilograms_bought', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_unbought">Coffee Unbought (kg)</Label>
              <Input
                id="kilograms_unbought"
                type="number"
                step="0.01"
                value={formData.kilograms_unbought}
                onChange={(e) => handleInputChange('kilograms_unbought', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_sold">Coffee Sold (kg)</Label>
              <Input
                id="kilograms_sold"
                type="number"
                step="0.01"
                value={formData.kilograms_sold}
                onChange={(e) => handleInputChange('kilograms_sold', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sold_to">Sold To (Buyer)</Label>
              <Input
                id="sold_to"
                type="text"
                value={formData.sold_to}
                onChange={(e) => handleInputChange('sold_to', e.target.value)}
                placeholder="Customer/buyer name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kilograms_left">Coffee Left in Store (kg)</Label>
              <Input
                id="kilograms_left"
                type="number"
                step="0.01"
                value={formData.kilograms_left}
                onChange={(e) => handleInputChange('kilograms_left', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advances_given">Total Advances (UGX)</Label>
              <Input
                id="advances_given"
                type="number"
                step="0.01"
                value={formData.advances_given}
                onChange={(e) => handleInputChange('advances_given', parseFloat(e.target.value) || 0)}
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

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ManualStoreReportForm;