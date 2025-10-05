import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Shield, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WhitelistEntry {
  id: string;
  ip_address: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export const NetworkWhitelistManager = () => {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const { employee } = useAuth();

  useEffect(() => {
    fetchWhitelist();
  }, []);

  const fetchWhitelist = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('network_whitelist')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching whitelist:', error);
      toast.error("Failed to load network whitelist");
    } finally {
      setLoading(false);
    }
  };

  const addIpAddress = async () => {
    if (!newIp.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    // Basic IP validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(newIp)) {
      toast.error("Please enter a valid IP address (e.g., 192.168.1.1)");
      return;
    }

    try {
      setAdding(true);
      const { error } = await supabase
        .from('network_whitelist')
        .insert({
          ip_address: newIp.trim(),
          description: newDescription.trim() || null,
          created_by: employee?.email || 'Unknown'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("This IP address is already in the whitelist");
        } else {
          throw error;
        }
        return;
      }

      toast.success("IP address added to whitelist");
      setNewIp("");
      setNewDescription("");
      fetchWhitelist();
    } catch (error) {
      console.error('Error adding IP:', error);
      toast.error("Failed to add IP address");
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('network_whitelist')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(currentStatus ? "IP deactivated" : "IP activated");
      fetchWhitelist();
    } catch (error) {
      console.error('Error toggling IP status:', error);
      toast.error("Failed to update IP status");
    }
  };

  const deleteIp = async (id: string) => {
    if (!confirm("Are you sure you want to remove this IP from the whitelist?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('network_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("IP address removed from whitelist");
      fetchWhitelist();
    } catch (error) {
      console.error('Error deleting IP:', error);
      toast.error("Failed to remove IP address");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Network Access Control</CardTitle>
        </div>
        <CardDescription>
          Manage whitelisted IP addresses for factory network access. Admin accounts can login from any network.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New IP */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium">Add New IP Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ip">IP Address *</Label>
              <Input
                id="ip"
                placeholder="e.g., 102.86.1.226"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                disabled={adding}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Main Office"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={adding}
              />
            </div>
          </div>
          <Button onClick={addIpAddress} disabled={adding}>
            <Plus className="h-4 w-4 mr-2" />
            {adding ? "Adding..." : "Add IP Address"}
          </Button>
        </div>

        {/* Whitelist Table */}
        <div>
          <h4 className="font-medium mb-3">Whitelisted IP Addresses</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No IP addresses in whitelist</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono">{entry.ip_address}</TableCell>
                      <TableCell>{entry.description || "-"}</TableCell>
                      <TableCell>
                        {entry.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{entry.created_by}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(entry.id, entry.is_active)}
                          >
                            {entry.is_active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteIp(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
