import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, X, Truck, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Document {
  url: string;
  name: string;
  type: 'general' | 'delivery_note' | 'dispatch_report';
  label: string;
}

interface UnifiedDocumentPreviewProps {
  documents: Document[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDate: string;
}

const UnifiedDocumentPreview: React.FC<UnifiedDocumentPreviewProps> = ({
  documents,
  open,
  onOpenChange,
  reportDate
}) => {
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [documentBlobs, setDocumentBlobs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && documents.length > 0) {
      loadDocuments();
    }
    return () => {
      // Clean up blob URLs
      Object.values(documentBlobs).forEach(url => URL.revokeObjectURL(url));
    };
  }, [open, documents]);

  const loadDocuments = async () => {
    setLoading(true);
    const blobs: { [key: string]: string } = {};
    
    try {
      for (const doc of documents) {
        const blobUrl = await fetchDocumentBlob(doc.url);
        if (blobUrl) {
          blobs[doc.url] = blobUrl;
        }
      }
      setDocumentBlobs(blobs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load some documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentBlob = async (documentUrl: string): Promise<string | null> => {
    try {
      let signed: string | null = null;

      if (documentUrl.startsWith('http')) {
        signed = documentUrl;
      } else {
        const { data, error } = await supabase.storage
          .from('report-documents')
          .createSignedUrl(documentUrl, 3600);
        if (error || !data?.signedUrl) throw error || new Error('Failed to create signed URL');
        signed = data.signedUrl;
      }

      const res = await fetch(signed);
      if (!res.ok) throw new Error('Failed to fetch document');
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  };

  const handleDownloadCurrent = async () => {
    const currentDoc = documents[currentDocIndex];
    if (!currentDoc) return;

    try {
      let signed: string | null = null;

      if (currentDoc.url.startsWith('http')) {
        signed = currentDoc.url;
      } else {
        const { data, error } = await supabase.storage
          .from('report-documents')
          .createSignedUrl(currentDoc.url, 3600);
        if (error || !data?.signedUrl) throw error || new Error('Failed to create signed URL');
        signed = data.signedUrl;
      }

      const res = await fetch(signed);
      if (!res.ok) throw new Error('Failed to fetch document');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = currentDoc.name || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Document download started');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const nextDocument = () => {
    setCurrentDocIndex((prev) => (prev + 1) % documents.length);
  };

  const previousDocument = () => {
    setCurrentDocIndex((prev) => (prev - 1 + documents.length) % documents.length);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'delivery_note': return <Truck className="h-4 w-4" />;
      case 'dispatch_report': return <Receipt className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'delivery_note': return 'bg-blue-100 text-blue-800';
      case 'dispatch_report': return 'bg-purple-100 text-purple-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (!documents.length) return null;

  const currentDoc = documents[currentDocIndex];
  const currentBlobUrl = documentBlobs[currentDoc?.url];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Store Report Documents - {reportDate}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCurrent}
                disabled={!currentBlobUrl}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Document Navigation */}
          {documents.length > 1 && (
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={previousDocument}
                disabled={documents.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <Badge className={getTypeColor(currentDoc.type)}>
                  {getTypeIcon(currentDoc.type)}
                  <span className="ml-1">{currentDoc.label}</span>
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {currentDocIndex + 1} of {documents.length}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={nextDocument}
                disabled={documents.length <= 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Document Viewer */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-muted/10">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading documents...</p>
                </div>
              </div>
            ) : currentBlobUrl ? (
              currentDoc.name?.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={currentBlobUrl} 
                  className="w-full h-full" 
                  title={currentDoc.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <img 
                    src={currentBlobUrl} 
                    alt={currentDoc.name} 
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Failed to load document</p>
                </div>
              </div>
            )}
          </div>

          {/* Document Tabs */}
          {documents.length > 1 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              {documents.map((doc, index) => (
                <Button
                  key={doc.url}
                  variant={index === currentDocIndex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentDocIndex(index)}
                  className="flex items-center gap-2"
                >
                  {getTypeIcon(doc.type)}
                  <span>{doc.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedDocumentPreview;