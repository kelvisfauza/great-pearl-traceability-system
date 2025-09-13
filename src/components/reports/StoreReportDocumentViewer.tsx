import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, X } from 'lucide-react';
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isPdf = useMemo(() => documentName?.toLowerCase().endsWith('.pdf'), [documentName]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
    } catch (error: any) {
      console.error('Error downloading document:', error);
      const msg = String(error?.message || '').includes('ERR_BLOCKED_BY_CLIENT')
        ? 'Blocked by a browser extension. Please disable ad/privacy blocker for this site or try Incognito.'
        : 'Failed to download document';
      toast.error(msg);
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

      // Create blob URL and show in in-app viewer (no external navigation)
      const fileUrl = URL.createObjectURL(data);
      setPreviewUrl(fileUrl);
      setViewerOpen(true);
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to view document');
    }
  };

  return (
    <>
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

      <Dialog
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open && previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{documentName}</DialogTitle>
          </DialogHeader>
          <div className="h-full">
            {previewUrl ? (
              isPdf ? (
                <iframe src={previewUrl} className="w-full h-full rounded" title={documentName} />
              ) : (
                <img src={previewUrl} alt={documentName} className="max-h-full w-auto mx-auto rounded" />
              )
            ) : (
              <div className="text-sm text-muted-foreground">Loading document...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StoreReportDocumentViewer;