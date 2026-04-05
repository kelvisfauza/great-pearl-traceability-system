import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, X, Clock, Edit2, Save } from 'lucide-react';

const MonthlyOvertimeReview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ minutes: string; pay: string; notes: string }>({ minutes: '', pay: '', notes: '' });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['monthly-overtime-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_overtime_reviews')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('net_overtime_minutes', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from('monthly_overtime_reviews')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-overtime-reviews'] });
      setEditingId(null);
      toast.success('Record updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleApprove = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { status: 'approved', reviewed_by: user?.email, reviewed_at: new Date().toISOString() },
    });
  };

  const handleReject = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { status: 'rejected', reviewed_by: user?.email, reviewed_at: new Date().toISOString() },
    });
  };

  const handleApproveAll = (month: number, year: number) => {
    const pending = reviews.filter((r: any) => r.month === month && r.year === year && r.status === 'pending');
    Promise.all(
      pending.map((r: any) =>
        supabase.from('monthly_overtime_reviews').update({
          status: 'approved',
          reviewed_by: user?.email,
          reviewed_at: new Date().toISOString(),
        }).eq('id', r.id)
      )
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ['monthly-overtime-reviews'] });
      toast.success(`Approved ${pending.length} records`);
    });
  };

  const startEdit = (record: any) => {
    setEditingId(record.id);
    setEditValues({
      minutes: String(record.adjusted_overtime_minutes ?? record.net_overtime_minutes),
      pay: String(record.adjusted_pay ?? record.calculated_pay),
      notes: record.admin_notes || '',
    });
  };

  const saveEdit = (id: string) => {
    updateMutation.mutate({
      id,
      updates: {
        adjusted_overtime_minutes: Number(editValues.minutes),
        adjusted_pay: Number(editValues.pay),
        admin_notes: editValues.notes,
      },
    });
  };

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  // Group by month/year
  const grouped: Record<string, any[]> = {};
  reviews.forEach((r: any) => {
    const key = `${r.year}-${r.month}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  if (isLoading) return <div className="text-muted-foreground text-sm p-4">Loading...</div>;
  if (Object.keys(grouped).length === 0) return <div className="text-muted-foreground text-sm p-4">No overtime reviews yet. System calculates on the 2nd of every month.</div>;

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([key, records]) => {
        const first = records[0];
        const pendingCount = records.filter((r: any) => r.status === 'pending').length;
        const totalPay = records.reduce((s: number, r: any) => s + Number(r.adjusted_pay ?? r.calculated_pay), 0);

        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{monthNames[first.month]} {first.year} — Overtime Review</CardTitle>
                  <CardDescription>{records.length} employees • Total: UGX {totalPay.toLocaleString()}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {pendingCount > 0 && (
                    <Button size="sm" onClick={() => handleApproveAll(first.month, first.year)}>
                      <Check className="h-4 w-4 mr-1" /> Approve All ({pendingCount})
                    </Button>
                  )}
                  <Badge variant={pendingCount > 0 ? 'default' : 'secondary'}>
                    {pendingCount > 0 ? `${pendingCount} Pending` : 'All Reviewed'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Late</TableHead>
                      <TableHead>Net OT</TableHead>
                      <TableHead>Pay (UGX)</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.employee_name}</TableCell>
                        <TableCell className="text-sm text-green-600">{formatMinutes(r.total_overtime_minutes)}</TableCell>
                        <TableCell className="text-sm text-red-500">{formatMinutes(r.total_late_minutes)}</TableCell>
                        <TableCell className="text-sm font-semibold">
                          {editingId === r.id ? (
                            <Input
                              value={editValues.minutes}
                              onChange={(e) => setEditValues({ ...editValues, minutes: e.target.value })}
                              className="w-20 h-7 text-xs"
                              type="number"
                            />
                          ) : (
                            formatMinutes(r.adjusted_overtime_minutes ?? r.net_overtime_minutes)
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {editingId === r.id ? (
                            <Input
                              value={editValues.pay}
                              onChange={(e) => setEditValues({ ...editValues, pay: e.target.value })}
                              className="w-24 h-7 text-xs"
                              type="number"
                            />
                          ) : (
                            Number(r.adjusted_pay ?? r.calculated_pay).toLocaleString()
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px]">
                          {editingId === r.id ? (
                            <Textarea
                              value={editValues.notes}
                              onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                              className="h-7 text-xs min-h-[28px]"
                              placeholder="Admin notes..."
                            />
                          ) : (
                            r.admin_notes || '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {r.status === 'pending' && <Clock className="h-3 w-3 mr-0.5" />}
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {editingId === r.id ? (
                              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => saveEdit(r.id)}>
                                <Save className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(r)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            {r.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => handleApprove(r.id)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => handleReject(r.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MonthlyOvertimeReview;
