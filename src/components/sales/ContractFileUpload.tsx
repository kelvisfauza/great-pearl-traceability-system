import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, Download, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ContractFile {
  id: string;
  buyer_ref: string;
  buyer: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export const ContractFileUpload = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [contracts, setContracts] = useState<ContractFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contract files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const buyerRef = formData.get('buyer_ref') as string;
    const buyer = formData.get('buyer') as string;
    const file = formData.get('file') as File;

    if (!file || !buyerRef || !buyer) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${buyerRef}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('contract_files')
        .insert({
          buyer_ref: buyerRef,
          buyer: buyer,
          file_url: publicUrl,
          file_name: file.name
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Contract file uploaded successfully"
      });

      setIsOpen(false);
      fetchContracts();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error uploading contract:', error);
      toast({
        title: "Error",
        description: "Failed to upload contract file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contract Files</CardTitle>
            <CardDescription>Upload and manage sales contract documents</CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Contract
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Contract File</DialogTitle>
                <DialogDescription>Upload a contract document with reference details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="buyer_ref">Buyer Ref</Label>
                  <Input 
                    id="buyer_ref" 
                    name="buyer_ref" 
                    placeholder="e.g., CONT-2024-001" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="buyer">Buyer (Who Issued the Contract)</Label>
                  <Input 
                    id="buyer" 
                    name="buyer" 
                    placeholder="e.g., ABC Coffee Importers" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="file">Contract File</Label>
                  <Input 
                    id="file" 
                    name="file" 
                    type="file" 
                    accept=".pdf,.doc,.docx"
                    required 
                  />
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload Contract"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No contract files uploaded yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer Ref</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.buyer_ref}</TableCell>
                  <TableCell>{contract.buyer}</TableCell>
                  <TableCell>{contract.file_name}</TableCell>
                  <TableCell>{new Date(contract.uploaded_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newWindow = window.open(contract.file_url, '_blank');
                          if (!newWindow) {
                            toast({
                              title: "Blocked",
                              description: "Please disable your ad blocker or browser extension to view files",
                              variant: "destructive"
                            });
                          }
                        }}
                        title="View file"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            const response = await fetch(contract.file_url);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = contract.file_name;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                            toast({
                              title: "Success",
                              description: "File downloaded successfully"
                            });
                          } catch (error) {
                            console.error('Download error:', error);
                            toast({
                              title: "Download Failed",
                              description: "Please try again or disable your ad blocker",
                              variant: "destructive"
                            });
                          }
                        }}
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
