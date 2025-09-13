import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentViewerProps {
  documentUrl: string;
  documentName: string;
  documentType: 'general' | 'delivery_note' | 'dispatch_report';
}

const StoreReportDocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  documentName,
  documentType
}) => {
  const getTypeLabel = () => {
    switch (documentType) {
      case 'delivery_note': return 'Delivery Note';
      case 'dispatch_report': return 'Dispatch Report';
      default: return 'Document';
    }
  };

  const getTypeColor = () => {
    switch (documentType) {
      case 'delivery_note': return 'text-primary';
      case 'dispatch_report': return 'text-accent-foreground';
      default: return 'text-success-foreground';
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('report-documents')
        .download(documentUrl);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Document downloaded successfully');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const handleView = async () => {
    try {
      // Download the file directly from storage to avoid browser blocking
      const { data, error } = await supabase.storage
        .from('report-documents')
        .download(documentUrl);

      if (error) {
        throw error;
      }

      // Create blob URL to bypass browser blocking of external domains
      const fileUrl = URL.createObjectURL(data);
      
      // Open in new tab using blob URL
      const newWindow = window.open(fileUrl, '_blank');
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
      }, 10000); // 10 seconds should be enough for the document to load

      if (!newWindow) {
        toast.error('Please allow popups to view documents');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to view document');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <FileText className={`h-4 w-4 ${getTypeColor()}`} />
      <span className="text-sm font-medium">{getTypeLabel()}</span>
      <div className="flex gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleView}
          title="View Document"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          title="Download Document"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default StoreReportDocumentViewer;