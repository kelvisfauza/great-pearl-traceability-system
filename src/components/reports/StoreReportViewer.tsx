import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Eye, Scan, Calendar, User, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { generateStoreReportPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface StoreReportViewerProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StoreReportViewer = ({ report, open, onOpenChange }: StoreReportViewerProps) => {
  const [showDocument, setShowDocument] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');

  useEffect(() => {
    const getSignedUrl = async () => {
      if (report?.attachment_url) {
        try {
          // If it's already a full URL (old format), use it directly
          if (report.attachment_url.startsWith('http')) {
            setAttachmentUrl(report.attachment_url);
            return;
          }

          // For new format (file path), create signed URL
          const { data, error } = await supabase.storage
            .from('report-documents')
            .createSignedUrl(report.attachment_url, 3600); // 1 hour expiry

          if (error) {
            console.error('Error creating signed URL:', error);
            return;
          }

          setAttachmentUrl(data.signedUrl);
        } catch (error) {
          console.error('Error getting signed URL:', error);
        }
      }
    };

    if (open && report) {
      getSignedUrl();
    }
  }, [open, report]);

  if (!report) return null;

  const handleDownloadDocument = () => {
    if (attachmentUrl) {
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.download = report.attachment_name || 'report-document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePreviewPDF = () => {
    try {
      generateStoreReportPDF(report, true);
      toast.success("PDF preview opened!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF preview");
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateStoreReportPDF(report, false);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to download PDF");
    }
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = filename?.split('.').pop()?.toLowerCase();
    return extension && imageExtensions.includes(extension);
  };

  const isPdfFile = (filename: string) => {
    return filename?.toLowerCase().endsWith('.pdf');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Store Report Details - {format(new Date(report.date), 'MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>Complete view of store report with scanned documents</span>
            <div className="flex gap-2 ml-4">
              <Button onClick={handlePreviewPDF} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview PDF
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline">
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Header Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(report.date), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Input By</p>
                    <p className="font-medium">{report.input_by}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Coffee Type</p>
                    <Badge variant="outline">{report.coffee_type}</Badge>
                  </div>
                </div>
              </div>

              {report.scanner_used && (
                <div className="mt-4 flex items-center gap-2">
                  <Scan className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scanner Used</p>
                    <p className="font-medium">{report.scanner_used}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms Bought</p>
                  <p className="text-lg font-semibold">{report.kilograms_bought} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Buying Price</p>
                  <p className="text-lg font-semibold">UGX {report.average_buying_price.toLocaleString()}/kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms Sold</p>
                  <p className="text-lg font-semibold">{report.kilograms_sold} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bags Sold</p>
                  <p className="text-lg font-semibold">{report.bags_sold}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sold To</p>
                  <p className="text-lg font-semibold">{report.sold_to || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bags Left</p>
                  <p className="text-lg font-semibold">{report.bags_left}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms Left</p>
                  <p className="text-lg font-semibold">{report.kilograms_left} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kilograms Unbought</p>
                  <p className="text-lg font-semibold">{report.kilograms_unbought} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Advances Given</p>
                  <p className="text-lg font-semibold">UGX {report.advances_given.toLocaleString()}</p>
                </div>
              </div>

              {report.comments && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Comments</p>
                  <p className="mt-1 p-3 bg-muted rounded-md">{report.comments}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attached Document */}
          {report.attachment_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Attached Document
                </CardTitle>
                <CardDescription>
                  Scanned document: {report.attachment_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDocument(!showDocument)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showDocument ? 'Hide Preview' : 'Show Preview'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadDocument}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Original
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{report.attachment_name || 'Scanned Document'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Document safely stored and available for download. Use "Generate PDF" above for a complete formatted report.
                    </p>
                    
                    {showDocument && attachmentUrl && (
                      <div className="border rounded p-2 bg-background">
                        {isImageFile(report.attachment_name) ? (
                          <img
                            src={attachmentUrl}
                            alt="Scanned document"
                            className="max-w-full h-auto rounded"
                            style={{ maxHeight: '300px' }}
                          />
                        ) : (
                          <div className="text-center py-4">
                            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {isPdfFile(report.attachment_name) ? 'PDF Document' : 'Document'} preview - Click download to view full file
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {showDocument && !attachmentUrl && (
                      <div className="text-center py-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">Loading document...</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoreReportViewer;