import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UssdService {
  id: string;
  service_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

export const UssdServicesManager = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<UssdService[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UssdService | null>(null);
  const [form, setForm] = useState({ service_key: "", name: "", description: "", display_order: 0, is_active: true });

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("ussd_services")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) {
      toast({ title: "Error loading services", description: error.message, variant: "destructive" });
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({ service_key: "", name: "", description: "", display_order: services.length + 1, is_active: true });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (s: UssdService) => {
    setEditing(s);
    setForm({
      service_key: s.service_key,
      name: s.name,
      description: s.description || "",
      display_order: s.display_order,
      is_active: s.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.service_key.trim() || !form.name.trim()) {
      toast({ title: "Missing fields", description: "Service key and name are required.", variant: "destructive" });
      return;
    }
    const payload = {
      service_key: form.service_key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
    };
    let error;
    if (editing) {
      ({ error } = await (supabase as any).from("ussd_services").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await (supabase as any).from("ussd_services").insert(payload));
    }
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Service updated" : "Service created" });
    setOpen(false);
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("ussd_services").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Service deleted" });
    fetchServices();
  };

  const toggleActive = async (s: UssdService) => {
    const { error } = await (supabase as any)
      .from("ussd_services")
      .update({ is_active: !s.is_active })
      .eq("id", s.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    fetchServices();
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold">USSD Services Menu</h3>
          <p className="text-sm text-muted-foreground">
            Services shown to customers under "Other Services" when they dial *217*XXX#.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Service" : "New USSD Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Menu Key (digit shown in USSD menu)</Label>
                <Input
                  value={form.service_key}
                  onChange={(e) => setForm({ ...form, service_key: e.target.value })}
                  placeholder="e.g. 1"
                  maxLength={2}
                />
              </div>
              <div>
                <Label>Service Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Transport Recovery"
                />
              </div>
              <div>
                <Label>Description (internal)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Active (visible in USSD menu)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Save changes" : "Create service"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground">No services yet. Click "Add Service" to create one.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.display_order}</TableCell>
                <TableCell className="font-mono">{s.service_key}</TableCell>
                <TableCell className="font-semibold">{s.name}</TableCell>
                <TableCell className="text-muted-foreground">{s.description || "—"}</TableCell>
                <TableCell>
                  <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{s.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Customers will no longer see this option in the USSD menu. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(s.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};
