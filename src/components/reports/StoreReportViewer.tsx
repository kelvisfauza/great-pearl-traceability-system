import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Eye, Scan, Calendar, User, FileDown, Truck, Receipt } from 'lucide-react';
import { format } from 'date-fns';

import { generateStoreReportPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';
import StoreReportDocumentViewer from './StoreReportDocumentViewer';

interface StoreReportViewerProps {
  report: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StoreReportViewer = ({ report, open, onOpenChange }: StoreReportViewerProps) => {

  if (!report) return null;


  const handlePreviewPDF = () => {
    try {
      console.log('Starting PDF preview generation for report:', report.id);
      generateStoreReportPDF(report, true);
      toast.success("PDF preview opened!");
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      toast.error("Failed to generate PDF preview: " + (error as Error).message);
    }
  };

  const handleDownloadPDF = () => {
    try {
      console.log('Starting PDF download for report:', report.id);
      generateStoreReportPDF(report, false);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("Failed to download PDF: " + (error as Error).message);
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

          {/* Attached Documents */}
          {(report.attachment_url || report.delivery_note_url || report.dispatch_report_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Attached Documents
                </CardTitle>
                <CardDescription>
                  Scanned documents related to this store report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* General Document */}
                  {report.attachment_url && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-success-foreground" />
                          General Document
                        </h4>
                      </div>
                      <StoreReportDocumentViewer
                        documentUrl={report.attachment_url}
                        documentName={report.attachment_name || 'General Document'}
                        documentType="general"
                      />
                    </div>
                  )}

                  {/* Delivery Note */}
                  {report.delivery_note_url && (
                    <div className="p-4 border rounded-lg bg-blue-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Truck className="h-4 w-4 text-primary" />
                          Delivery Note
                        </h4>
                      </div>
                      <StoreReportDocumentViewer
                        documentUrl={report.delivery_note_url}
                        documentName={report.delivery_note_name || 'Delivery Note'}
                        documentType="delivery_note"
                      />
                    </div>
                  )}

                  {/* Dispatch Report */}
                  {report.dispatch_report_url && (
                    <div className="p-4 border rounded-lg bg-purple-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-accent-foreground" />
                          Dispatch Report
                        </h4>
                      </div>
                      <StoreReportDocumentViewer
                        documentUrl={report.dispatch_report_url}
                        documentName={report.dispatch_report_name || 'Dispatch Report'}
                        documentType="dispatch_report"
                      />
                    </div>
                  )}
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