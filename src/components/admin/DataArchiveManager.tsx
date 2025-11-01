import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Archive, History, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

export const DataArchiveManager = () => {
  const [archivePeriod, setArchivePeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [clearAfterArchive, setClearAfterArchive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [archiveHistory, setArchiveHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleArchive = async () => {
    if (!archivePeriod.trim()) {
      toast({
        title: "Error",
        description: "Please enter an archive period name (e.g., Q1-2025, Jan-2025)",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('archive-data', {
        body: {
          archivePeriod: archivePeriod.trim(),
          archivedBy: user?.email || 'Admin',
          notes: notes.trim(),
          clearAfterArchive
        }
      });

      if (error) throw error;

      toast({
        title: "Archive Complete",
        description: `Successfully archived ${JSON.stringify(data.recordsArchived)} records${clearAfterArchive ? ' and cleared operational tables' : ''}`,
      });

      setArchivePeriod('');
      setNotes('');
      setClearAfterArchive(false);
      
      if (showHistory) {
        fetchArchiveHistory();
      }
    } catch (error) {
      console.error('Archive error:', error);
      toast({
        title: "Archive Failed",
        description: error instanceof Error ? error.message : 'Failed to archive data',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchArchiveHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('archive_history')
        .select('*')
        .order('archive_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setArchiveHistory(data || []);
    } catch (error) {
      console.error('Error fetching archive history:', error);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchArchiveHistory();
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Data Archive & Clear System
          </CardTitle>
          <CardDescription>
            Archive completed transactions to historical records and optionally clear operational tables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This system archives approved expenses, completed transactions, and payment records. 
              Archived data remains accessible in reports. Use "Clear After Archive" to reset operational tables.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="archivePeriod">Archive Period Name</Label>
              <Input
                id="archivePeriod"
                placeholder="e.g., Q1-2025, January-2025, 2025-Annual"
                value={archivePeriod}
                onChange={(e) => setArchivePeriod(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground mt-1">
                This name will be used to identify this archive in reports
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this archive..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isProcessing}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div className="space-y-0.5">
                <Label htmlFor="clearAfterArchive" className="font-semibold">
                  Clear After Archive
                </Label>
                <p className="text-sm text-muted-foreground">
                  Remove archived records from operational tables (sets values to zero)
                </p>
              </div>
              <Switch
                id="clearAfterArchive"
                checked={clearAfterArchive}
                onCheckedChange={setClearAfterArchive}
                disabled={isProcessing}
              />
            </div>

            <Button
              onClick={handleArchive}
              disabled={isProcessing || !archivePeriod.trim()}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Archiving...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Archive Data {clearAfterArchive && '& Clear Tables'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Archive History
            </CardTitle>
            <Button variant="outline" size="sm" onClick={toggleHistory}>
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
          <CardDescription>Recent archival operations</CardDescription>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {archiveHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No archive history found
              </p>
            ) : (
              <div className="space-y-3">
                {archiveHistory.map((archive) => (
                  <div key={archive.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{archive.archive_period}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(archive.archive_date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                        <p className="font-semibold">{archive.records_archived?.approvalRequests || 0}</p>
                        <p className="text-xs text-muted-foreground">Approvals</p>
                      </div>
                      <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <p className="font-semibold">{archive.records_archived?.cashTransactions || 0}</p>
                        <p className="text-xs text-muted-foreground">Cash Txns</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                        <p className="font-semibold">{archive.records_archived?.paymentRecords || 0}</p>
                        <p className="text-xs text-muted-foreground">Payments</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <p className="font-semibold">{archive.records_archived?.moneyRequests || 0}</p>
                        <p className="text-xs text-muted-foreground">Requests</p>
                      </div>
                    </div>
                    {archive.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        Note: {archive.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Archived by: {archive.archived_by}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};