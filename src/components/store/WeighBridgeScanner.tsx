import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QrCode, Trash2, Check, Loader2, ImagePlus, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

export interface WeighBridgeTicket {
  id: string;
  qr_data: string;
  photo_url: string | null;
  scanned_at: string;
}

interface WeighBridgeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: WeighBridgeTicket[];
  onTicketsChange: (tickets: WeighBridgeTicket[]) => void;
}

const WeighBridgeScanner: React.FC<WeighBridgeScannerProps> = ({
  open,
  onOpenChange,
  tickets,
  onTicketsChange,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [scanUrl, setScanUrl] = useState('');
  const [showQr, setShowQr] = useState(true);
  
  // Use ref to avoid stale closure in realtime callback
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;
  const onTicketsChangeRef = useRef(onTicketsChange);
  onTicketsChangeRef.current = onTicketsChange;

  // Create a scan session when dialog opens
  useEffect(() => {
    if (!open) {
      setSessionId(null);
      setScanUrl('');
      setShowQr(true);
      return;
    }

    const createSession = async () => {
      setCreating(true);
      try {
        const { data, error } = await supabase
          .from('weighbridge_scan_sessions' as any)
          .insert({ created_by: 'dispatch-form' })
          .select('id, session_code')
          .single();

        if (error) throw error;
        const d = data as any;
        setSessionId(d.id);

        const origin = window.location.origin;
        setScanUrl(`${origin}/scan-weighbridge?session=${d.session_code}`);
      } catch (err) {
        console.error('Failed to create scan session:', err);
      } finally {
        setCreating(false);
      }
    };

    createSession();
  }, [open]);

  // Subscribe to realtime inserts — use refs to avoid stale closures
  useEffect(() => {
    if (!sessionId || !open) return;

    const channel = supabase
      .channel(`weighbridge-tickets-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weighbridge_scanned_tickets',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newTicket = payload.new as any;
          const ticket: WeighBridgeTicket = {
            id: newTicket.id,
            qr_data: newTicket.qr_data,
            photo_url: newTicket.photo_url,
            scanned_at: newTicket.scanned_at || new Date().toISOString(),
          };
          // Use ref to get current tickets array
          onTicketsChangeRef.current([...ticketsRef.current, ticket]);
          // Hide QR code once first ticket arrives
          setShowQr(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, open]);

  const removeTicket = (id: string) => {
    onTicketsChange(tickets.filter(t => t.id !== id));
    // Show QR again if all tickets removed
    if (tickets.filter(t => t.id !== id).length === 0) {
      setShowQr(true);
    }
  };

  const scanMore = () => {
    setShowQr(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Weigh Bridge Tickets
          </DialogTitle>
          <DialogDescription>
            {showQr
              ? 'Scan this QR code with your phone to start scanning weigh bridge tickets.'
              : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} received. Scan more or close when done.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code for phone scanning */}
          {creating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating QR code...</p>
            </div>
          ) : scanUrl && showQr ? (
            <div className="space-y-3">
              <div className="flex flex-col items-center p-4 rounded-lg border-2 border-dashed border-primary/30 bg-muted/30">
                <QRCodeSVG
                  value={scanUrl}
                  size={220}
                  level="M"
                  includeMargin
                  className="rounded"
                />
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  <span>Scan with your phone camera</span>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  How it works:
                </p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1 ml-1">
                  <li>Open your phone camera and scan this QR code</li>
                  <li>Point your phone at the weighbridge ticket</li>
                  <li>It auto-detects and captures the ticket photo</li>
                  <li>Tickets appear here automatically in real-time</li>
                </ol>
              </div>

              {/* Live status indicator */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                <span className="text-muted-foreground">Waiting for scanned tickets...</span>
              </div>
            </div>
          ) : scanUrl && !showQr ? (
            /* Success state - QR replaced with confirmation */
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Tickets received from phone!
              </p>
              <Button variant="outline" size="sm" onClick={scanMore}>
                <QrCode className="h-4 w-4 mr-2" /> Show QR to scan more
              </Button>
            </div>
          ) : null}

          {/* Scanned Tickets List */}
          {tickets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Scanned Tickets ({tickets.length})</p>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {tickets.map((ticket, index) => (
                    <Card key={ticket.id} className="border-dashed">
                      <CardContent className="p-3 flex items-center gap-3">
                        {ticket.photo_url && (
                          <img
                            src={ticket.photo_url}
                            alt={`Ticket ${index + 1}`}
                            className="w-12 h-12 rounded object-cover border"
                          />
                        )}
                        <Badge variant="secondary" className="shrink-0">#{index + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono truncate">
                            {ticket.qr_data?.startsWith('auto-captured') ? 'Auto-captured ticket' : ticket.qr_data}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {ticket.photo_url ? (
                              <Badge variant="outline" className="text-xs">
                                <ImagePlus className="h-3 w-3 mr-1" /> Photo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">No photo</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeTicket(ticket.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Done button */}
          {tickets.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              <Check className="h-4 w-4 mr-2" /> Done ({tickets.length} ticket{tickets.length !== 1 ? 's' : ''})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeighBridgeScanner;
