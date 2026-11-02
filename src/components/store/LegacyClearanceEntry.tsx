import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileClock } from "lucide-react";

type Line = { lot_ref: string; coffee_type: string; bags: string; weight_kg: string };
const emptyLine: Line = { lot_ref: "", coffee_type: "", bags: "", weight_kg: "" };
const today = () => new Date().toISOString().split("T")[0];
const emptyForm = {
  form_number: "", clearance_date: today(), warehouse: "", destination_buyer: "",
  vehicle_registration: "", driver_name: "", driver_phone: "", remarks: "",
  released_by: "", received_by_driver: "", approved_by: "",
};

const fields: { key: keyof typeof emptyForm; label: string; type?: string }[] = [
  { key: "form_number", label: "Paper form number *" },
  { key: "clearance_date", label: "Clearance date *", type: "date" },
  { key: "warehouse", label: "Warehouse" },
  { key: "destination_buyer", label: "Destination / buyer" },
  { key: "vehicle_registration", label: "Vehicle / truck number" },
  { key: "driver_name", label: "Driver name" },
  { key: "driver_phone", label: "Driver phone" },
  { key: "released_by", label: "Released by" },
  { key: "received_by_driver", label: "Received by (driver)" },
  { key: "approved_by", label: "Approved by" },
];

const LegacyClearanceEntry = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const totalKg = lines.reduce((s, l) => s + (Number(l.weight_kg) || 0), 0);
  const totalBags = lines.reduce((s, l) => s + (Number(l.bags) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.form_number.trim()) throw new Error("Enter the number written on the paper form");
      const items = lines.filter(l => l.coffee_type || l.weight_kg || l.bags || l.lot_ref);
      if (!items.length) throw new Error("Add at least one coffee line");
      const { data, error } = await (supabase as any).rpc("submit_legacy_store_clearance", { p: { ...form, items } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Old clearance form recorded", description: "Stock was not changed." });
      qc.invalidateQueries({ queryKey: ["store-clearance-forms"] });
      setForm({ ...emptyForm }); setLines([{ ...emptyLine }]); setOpen(false);
    },
    onError: (e: any) => toast({ title: "Could not record form", description: e.message, variant: "destructive" }),
  });

  const setLine = (i: number, k: keyof Line, v: string) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FileClock className="h-4 w-4" /> Record old paper clearance form</CardTitle>
            <CardDescription>For forms filled before the new system. Uses the paper form number and date, does not take coffee out of stock, and skips Procurement confirmation.</CardDescription>
          </div>
          <Button variant={open ? "outline" : "default"} onClick={() => setOpen(o => !o)}>{open ? "Close" : "Enter old form"}</Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`legacy-${f.key}`}>{f.label}</Label>
                <Input id={`legacy-${f.key}`} type={f.type || "text"} max={f.type === "date" ? today() : undefined}
                  value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Coffee lines</Label>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_90px_110px_auto] gap-2 items-center">
                <Input placeholder="Lot / batch ref" value={l.lot_ref} onChange={e => setLine(i, "lot_ref", e.target.value)} />
                <Input placeholder="Coffee type *" value={l.coffee_type} onChange={e => setLine(i, "coffee_type", e.target.value)} />
                <Input placeholder="Bags" type="number" min="0" value={l.bags} onChange={e => setLine(i, "bags", e.target.value)} />
                <Input placeholder="Weight kg *" type="number" min="0" value={l.weight_kg} onChange={e => setLine(i, "weight_kg", e.target.value)} />
                <Button variant="ghost" size="icon" aria-label="Remove line" disabled={lines.length === 1}
                  onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <Button variant="outline" size="sm" onClick={() => setLines(prev => [...prev, { ...emptyLine }])}><Plus className="h-4 w-4 mr-1" /> Add line</Button>
              <span className="text-muted-foreground">{totalBags.toLocaleString()} bags · {totalKg.toLocaleString()} kg</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="legacy-remarks">Remarks</Label>
            <Textarea id="legacy-remarks" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save old form"}</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default LegacyClearanceEntry;
