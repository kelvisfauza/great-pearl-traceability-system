import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditDispatchReportModalProps {
  open: boolean;
  onClose: () => void;
  report: {
    id: string;
    remarks: string;
    attachment_url: string | null;
    attachment_name: string | null;
  };
  onUpdated: () => void;
}

const EditDispatchReportModal = ({ open, onClose, report, onUpdated }: EditDispatchReportModalProps) => {
  const [remarks, setRemarks] = useState(report.remarks || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(report.attachment_url);
  const [attachmentName, setAttachmentName] = useState(report.attachment_name);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${report.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dispatch-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('dispatch-attachments')
        .getPublicUrl(filePath);

      setAttachmentUrl(urlData.publicUrl);
      setAttachmentName(file.name);

      toast({ title: "File uploaded successfully" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: "Could not upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('eudr_dispatch_reports')
        .update({
          remarks,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          updated_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (error) throw error;

      toast({ title: "Report updated successfully" });
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "Save failed", description: "Could not update report", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Dispatch Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Remarks / Observations</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks..."
              rows={3}
            />
          </div>

          <div>
            <Label>Attachment</Label>
            {attachmentUrl ? (
              <div className="flex items-center gap-2 mt-1 p-2 border rounded-md bg-muted/30">
                <span className="text-sm truncate flex-1">{attachmentName || 'Attached file'}</span>
                <Button variant="ghost" size="sm" onClick={() => { setAttachmentUrl(null); setAttachmentName(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-1">
                <Label
                  htmlFor="attachment-upload"
                  className="flex items-center gap-2 cursor-pointer border border-dashed rounded-md p-4 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? 'Uploading...' : 'Click to upload attachment'}
                </Label>
                <Input
                  id="attachment-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDispatchReportModal;
