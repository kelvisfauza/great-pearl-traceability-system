import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, ExternalLink, Loader2 } from 'lucide-react';

interface ContractFileUploadProps {
  contractId?: string;
  contractRef: string;
  buyerName: string;
  contractType: 'buyer' | 'supplier';
  files: { id: string; file_name: string; file_url: string; uploaded_at: string | null }[];
  onFilesChange: () => void;
}

export const ContractFileUpload = ({
  contractId,
  contractRef,
  buyerName,
  contractType,
  files,
  onFilesChange
}: ContractFileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB allowed", variant: "destructive" });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only PDF, JPEG, PNG, WEBP allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${contractType}/${contractRef.replace(/\s+/g, '-')}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-documents')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contract-documents')
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from('contract_files')
        .insert({
          buyer: buyerName,
          buyer_ref: contractRef,
          file_name: file.name,
          file_url: publicUrl,
          status: 'uploaded',
          uploaded_at: new Date().toISOString(),
          buyer_contract_id: contractType === 'buyer' ? contractId : null,
          contract_type: contractType,
        });

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Contract document uploaded" });
      onFilesChange();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('contract_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      toast({ title: "Deleted", description: "File record removed" });
      onFilesChange();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Contract Documents (PDF)
      </Label>

      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleUpload}
          disabled={uploading}
          className="flex-1"
        />
        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <Card key={file.id} className="bg-muted/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-sm truncate">{file.file_name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(file.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
