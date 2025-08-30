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
    kilograms_sold: 0,
    bags_sold: 0,
    sold_to: '',
    bags_left: 0,
    kilograms_left: 0,
    kilograms_unbought: 0,
    advances_given: 0,
    comments: '',
    input_by: employee?.name || '',
    scanner_used: '',
    attachment_url: '',
    attachment_name: ''
  });

  const scannerOptions = [
    'HP LaserJet Pro M404n',
    'Canon PIXMA TS3520',
    'Epson WorkForce ES-50',
    'Brother DCP-L2550DW',
    'Samsung Xpress M2020W',
    'Xerox WorkCentre 3215',
    'Ricoh SP 213w',
    'Kyocera ECOSYS P2040dn'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.attachment_url) {
      toast.error("Please attach a scanned document before submitting");
      return;
    }
    
    if (!formData.scanner_used) {
      toast.error("Please select the scanner used");
      return;
    }
    
    setLoading(true);
    
    try {
      await addStoreReport(formData);
      
      toast.success("Manual store report submitted successfully");
      
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
        scanner_used: '',
        attachment_url: '',
        attachment_name: ''
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      setFormData(prev => ({
        ...prev,
        attachment_url: filePath, // Store file path instead of public URL
        attachment_name: file.name
      }));

      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Failed to upload document");
    } finally {
      setUploadingFile(false);
    }
  };

  const triggerScan = () => {
    // Simulate scanner trigger - in real implementation this would interface with scanner API
    toast.info("Scanner activated. Please place document on scanner bed and press scan.");
    document.getElementById('file-upload')?.click();
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
          {/* Scanner Selection */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scanner Setup
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scanner_used">Select Scanner</Label>
                <Select 
                  value={formData.scanner_used} 
                  onValueChange={(value) => handleInputChange('scanner_used', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose scanner/printer" />
                  </SelectTrigger>
                  <SelectContent>
                    {scannerOptions.map((scanner) => (
                      <SelectItem key={scanner} value={scanner}>
                        {scanner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Document Attachment</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerScan}
                    disabled={!formData.scanner_used || uploadingFile}
                    className="flex-1"
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    {uploadingFile ? 'Scanning...' : 'Scan Document'}
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploadingFile}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {formData.attachment_name && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">{formData.attachment_name}</span>
                  </div>
                )}
              </div>
            </div>
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
                  <SelectItem value="Mixed">Mixed</SelectItem>
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

          <Button 
            type="submit" 
            disabled={loading || !formData.attachment_url || !formData.scanner_used} 
            className="w-full"
          >
            {loading ? 'Saving...' : 'Save Manual Report with Attachment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ManualStoreReportForm;