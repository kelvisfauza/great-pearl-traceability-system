import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Package, Calendar, User, Weight } from "lucide-react";
import { useStoreManagement } from "@/hooks/useStoreManagement";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface StorePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const StorePreviewModal = ({ open, onOpenChange }: StorePreviewModalProps) => {
  const { coffeeRecords, loading, updateCoffeeRecord } = useStoreManagement();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    kilograms: '',
    bags: '',
    supplierName: ''
  });

  // Get 3 most recent transactions
  const recentRecords = coffeeRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setEditData({
      kilograms: record.kilograms.toString(),
      bags: record.bags.toString(),
      supplierName: record.supplierName
    });
  };

  const handleSaveEdit = async (recordId: string) => {
    try {
      await updateCoffeeRecord(recordId, {
        kilograms: Number(editData.kilograms),
        bags: Number(editData.bags),
        supplierName: editData.supplierName
      });
      setEditingId(null);
      toast.success("Record updated successfully");
    } catch (error) {
      toast.error("Failed to update record");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: 'Pending', variant: 'secondary' },
      quality_review: { label: 'Quality Review', variant: 'default' },
      batched: { label: 'Batched', variant: 'default' },
      paid: { label: 'Paid', variant: 'default' }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Store Transactions
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Store Transactions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {recentRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent transactions found
            </div>
          ) : (
            recentRecords.map((record) => (
              <Card key={record.id} className="border-border/50">
                <CardContent className="pt-6">
                  {editingId === record.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Kilograms</Label>
                          <Input
                            type="number"
                            value={editData.kilograms}
                            onChange={(e) => setEditData({ ...editData, kilograms: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Bags</Label>
                          <Input
                            type="number"
                            value={editData.bags}
                            onChange={(e) => setEditData({ ...editData, bags: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Supplier Name</Label>
                        <Input
                          value={editData.supplierName}
                          onChange={(e) => setEditData({ ...editData, supplierName: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSaveEdit(record.id)} size="sm">
                          Save
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{record.coffeeType}</h3>
                            <Badge variant={getStatusBadge(record.status).variant}>
                              {getStatusBadge(record.status).label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(record.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {record.supplierName}
                            </div>
                          </div>
                        </div>
                        {record.status !== 'sales' && record.status !== 'inventory' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Weight className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{record.kilograms.toLocaleString()} kg</div>
                            <div className="text-xs text-muted-foreground">Weight</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{record.bags} bags</div>
                            <div className="text-xs text-muted-foreground">Quantity</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StorePreviewModal;
