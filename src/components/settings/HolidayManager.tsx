import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, PartyPopper, Calendar } from "lucide-react";

interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  greeting_title: string;
  greeting_message: string;
  emoji: string;
  gradient_from: string;
  gradient_to: string;
  bg_gradient_from: string;
  bg_gradient_to: string;
  is_active: boolean;
  is_recurring: boolean;
}

const DEFAULT_FORM = {
  name: "",
  holiday_date: "",
  greeting_title: "",
  greeting_message: "",
  emoji: "🎉",
  gradient_from: "blue-500",
  gradient_to: "indigo-500",
  bg_gradient_from: "blue-50",
  bg_gradient_to: "indigo-50",
  is_active: true,
  is_recurring: true,
};

const HolidayManager = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["admin-holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_holidays")
        .select("*")
        .order("holiday_date", { ascending: true });
      if (error) throw error;
      return data as Holiday[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof DEFAULT_FORM & { id?: string }) => {
      if (values.id) {
        const { error } = await supabase
          .from("public_holidays")
          .update(values)
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("public_holidays").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holiday-theme"] });
      toast.success(editingId ? "Holiday updated!" : "Holiday added!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("public_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holiday-theme"] });
      toast.success("Holiday deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("public_holidays")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-holidays"] });
      queryClient.invalidateQueries({ queryKey: ["holiday-theme"] });
    },
  });

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
  };

  const openEdit = (h: Holiday) => {
    setEditingId(h.id);
    setForm({
      name: h.name,
      holiday_date: h.holiday_date,
      greeting_title: h.greeting_title,
      greeting_message: h.greeting_message,
      emoji: h.emoji,
      gradient_from: h.gradient_from,
      gradient_to: h.gradient_to,
      bg_gradient_from: h.bg_gradient_from,
      bg_gradient_to: h.bg_gradient_to,
      is_active: h.is_active,
      is_recurring: h.is_recurring,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5" />
              Holiday Themes
            </CardTitle>
            <CardDescription>
              Manage public holidays that auto-theme the login page and dashboard
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Add"} Holiday</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Holiday Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Independence Day" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Emoji</Label>
                    <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🎉" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Greeting Title</Label>
                  <Input value={form.greeting_title} onChange={(e) => setForm({ ...form, greeting_title: e.target.value })} required placeholder="🎉 Happy Holiday! 🎉" />
                </div>
                <div className="space-y-2">
                  <Label>Greeting Message</Label>
                  <Input value={form.greeting_message} onChange={(e) => setForm({ ...form, greeting_message: e.target.value })} required placeholder="Wishing you a wonderful day!" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Banner Color From</Label>
                    <Input value={form.gradient_from} onChange={(e) => setForm({ ...form, gradient_from: e.target.value })} placeholder="rose-500" />
                  </div>
                  <div className="space-y-2">
                    <Label>Banner Color To</Label>
                    <Input value={form.gradient_to} onChange={(e) => setForm({ ...form, gradient_to: e.target.value })} placeholder="pink-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Background From</Label>
                    <Input value={form.bg_gradient_from} onChange={(e) => setForm({ ...form, bg_gradient_from: e.target.value })} placeholder="rose-50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Background To</Label>
                    <Input value={form.bg_gradient_to} onChange={(e) => setForm({ ...form, bg_gradient_to: e.target.value })} placeholder="pink-50" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_recurring} onCheckedChange={(v) => setForm({ ...form, is_recurring: v })} />
                    <Label>Recurring yearly</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingId ? "Update Holiday" : "Add Holiday"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Emoji</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Recurring</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays?.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.holiday_date}</TableCell>
                    <TableCell className="text-xl">{h.emoji}</TableCell>
                    <TableCell>
                      <Switch
                        checked={h.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: h.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell>{h.is_recurring ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(h.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HolidayManager;
