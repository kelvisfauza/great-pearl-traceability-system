import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Check, X, Coffee, User, Clock, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { PriceApprovalRequest, usePriceApprovals } from '@/hooks/usePriceApprovals';
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const PriceApprovalPanel: React.FC = () => {
  const { employee } = useAuth();
  const { pendingRequests, approveRequest, rejectRequest, fetchPendingRequests } = usePriceApprovals();
  const { prices: currentPrices, savePrices } = useReferencePrices();
  const { toast } = useToast();
  
  const [selectedRequest, setSelectedRequest] = useState<PriceApprovalRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [suggestedArabicaPrice, setSuggestedArabicaPrice] = useState<number | ''>('');
  const [suggestedRobustaPrice, setSuggestedRobustaPrice] = useState<number | ''>('');
  const [processing, setProcessing] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResendCurrentPriceNotifications = async () => {
    if (!employee) return;
    setResending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast({ title: "Error", description: "No active session", variant: "destructive" });
        return;
      }

      const { data: employees } = await supabase
        .from('employees')
        .select('phone, name')
        .eq('status', 'Active')
        .not('phone', 'is', null);

      const staffList = employees?.filter(e => e.phone) || [];
      const additionalRecipients = [
        '0772272455', '0777510755', '0791052941', '0779637836', '0791832118', '0778970844', '0777676992'
      ];
      const allPhones = [...staffList.map(e => e.phone!), ...additionalRecipients];

      const date = new Date().toLocaleDateString('en-GB');
      const message = `Great Pearl Coffee Price Update - ${date}\n\nArabica: UGX ${currentPrices.arabicaBuyingPrice.toLocaleString()}/kg (${currentPrices.arabicaOutturn}% outturn)\nRobusta: UGX ${currentPrices.robustaBuyingPrice.toLocaleString()}/kg (${currentPrices.robustaOutturn}% outturn)\nSorted: UGX ${(currentPrices.sortedPrice || 0).toLocaleString()}/kg\n\nUse these prices for today's purchases.`;

      let sent = 0;
      for (let i = 0; i < allPhones.length; i++) {
        await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 500));
        try {
          const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ phone: allPhones[i], message, messageType: 'price_update' })
          });
          if (response.ok) sent++;
        } catch { /* continue */ }
      }

      toast({
        title: "Price Notifications Sent",
        description: `SMS sent to ${sent}/${allPhones.length} recipients`
      });
    } catch (error) {
      console.error('Error resending notifications:', error);
      toast({ title: "Error", description: "Failed to send notifications", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };
  const handleApprove = async (request: PriceApprovalRequest) => {
    if (!employee) return;

    // Check if admin is the same as submitter
    if (request.submitted_by_email === employee.email) {
      toast({
        title: "Cannot Approve",
        description: "You cannot approve your own price update request",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      const result = await approveRequest(request.id, employee.name, employee.email);
      
      if (result) {
        // Now update the actual prices
await savePrices({
          iceArabica: request.ice_arabica || currentPrices.iceArabica,
          robusta: request.robusta || currentPrices.robusta,
          exchangeRate: request.exchange_rate || currentPrices.exchangeRate,
          drugarLocal: request.drugar_local || currentPrices.drugarLocal,
          wugarLocal: request.wugar_local || currentPrices.wugarLocal,
          robustaFaqLocal: request.robusta_faq_local || currentPrices.robustaFaqLocal,
          arabicaOutturn: request.arabica_outturn || currentPrices.arabicaOutturn,
          arabicaMoisture: request.arabica_moisture || currentPrices.arabicaMoisture,
          arabicaFm: request.arabica_fm || currentPrices.arabicaFm,
          arabicaBuyingPrice: request.arabica_buying_price,
          robustaOutturn: request.robusta_outturn || currentPrices.robustaOutturn,
          robustaMoisture: request.robusta_moisture || currentPrices.robustaMoisture,
          robustaFm: request.robusta_fm || currentPrices.robustaFm,
          robustaBuyingPrice: request.robusta_buying_price,
          sortedPrice: request.sorted_price || currentPrices.sortedPrice
        });

        // Send SMS notifications (same logic as before)
        await sendPriceNotifications(request);

        toast({
          title: request.is_correction ? "Price Correction Approved" : "Prices Updated & Notifications Sent",
          description: request.is_correction 
            ? "The corrected prices are now active and CORRECTION SMS has been sent."
            : "The new prices are now active and SMS has been sent to staff."
        });

        fetchPendingRequests();
      }
    } catch (error) {
      console.error('Error in approval flow:', error);
    } finally {
      setProcessing(false);
    }
  };

  const sendPriceNotifications = async (request: PriceApprovalRequest) => {
    try {
      // Get user's actual session token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        console.error('No active session for sending SMS');
        return;
      }

      // Helper function to send SMS with delay
      const sendSmsWithDelay = async (
        phone: string,
        message: string,
        delayMs: number
      ) => {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        try {
          const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              phone,
              message,
              messageType: request.is_correction ? 'price_correction' : 'price_update'
            })
          });
          return response.ok;
        } catch {
          return false;
        }
      };

      // Fetch all recipients
      const { data: employees } = await supabase
        .from('employees')
        .select('phone, name')
        .eq('status', 'Active')
        .not('phone', 'is', null);

      const staffList = employees?.filter(e => e.phone) || [];
      
      // External contacts
      const additionalRecipients = [
        '0772272455', '0777510755', '0791052941', '0779637836', '0791832118', '0778970844', '0777676992'
      ];
      
      const allPhones = [
        ...staffList.map(e => e.phone!),
        ...additionalRecipients
      ];

      const date = new Date().toLocaleDateString('en-GB');
      
      // Format message with CORRECTION: prefix if it's a correction
      const correctionPrefix = request.is_correction ? 'CORRECTION: ' : '';
      const message = `${correctionPrefix}Great Pearl Coffee Price Update - ${date}\n\nArabica: UGX ${request.arabica_buying_price.toLocaleString()}/kg (${request.arabica_outturn}% outturn)\nRobusta: UGX ${request.robusta_buying_price.toLocaleString()}/kg (${request.robusta_outturn}% outturn)\nSorted: UGX ${(request.sorted_price || 0).toLocaleString()}/kg\n\n${request.is_correction ? 'Please disregard previous prices. ' : ''}Use these prices for today's purchases.`;

      // Send to all recipients
      for (let i = 0; i < allPhones.length; i++) {
        await sendSmsWithDelay(allPhones[i], message, i === 0 ? 0 : 500);
      }

      // If notify suppliers is checked, send to suppliers too
      if (request.notify_suppliers) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('phone')
          .not('phone', 'is', null);

        const supplierPhones = suppliers?.filter(s => s.phone).map(s => s.phone!) || [];
        const supplierMessage = `${correctionPrefix}Great Pearl Coffee - Price Update\nDate: ${date}\n\n☕ ARABICA:\nOutturn: ${request.arabica_outturn}%\nPrice: UGX ${request.arabica_buying_price.toLocaleString()}/kg\n\n☕ ROBUSTA:\nOutturn: ${request.robusta_outturn}%\nPrice: UGX ${request.robusta_buying_price.toLocaleString()}/kg\n\n☕ SORTED: UGX ${(request.sorted_price || 0).toLocaleString()}/kg\n\n${request.is_correction ? 'Please disregard previous prices. ' : ''}Deliver your coffee now!`;

        for (let i = 0; i < supplierPhones.length; i++) {
          await sendSmsWithDelay(supplierPhones[i], supplierMessage, 500);
        }
      }
    } catch (error) {
      console.error('Error sending price notifications:', error);
    }
  };

  const openRejectDialog = (request: PriceApprovalRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setSuggestedArabicaPrice('');
    setSuggestedRobustaPrice('');
    setShowRejectDialog(true);
  };

  const handleReject = async () => {
    if (!employee || !selectedRequest || !rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this price update",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      const success = await rejectRequest(
        selectedRequest.id,
        employee.name,
        employee.email,
        rejectionReason,
        suggestedArabicaPrice || undefined,
        suggestedRobustaPrice || undefined
      );

      if (success) {
        setShowRejectDialog(false);
        fetchPendingRequests();
      }
    } finally {
      setProcessing(false);
    }
  };

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Price Approval Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No pending price approval requests
          </p>
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendCurrentPriceNotifications}
              disabled={resending}
            >
              {resending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Resend Today's Price SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Price Approval Requests
            <Badge variant="secondary" className="ml-2">
              {pendingRequests.length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.map((request) => {
            const isSelfSubmitted = request.submitted_by_email === employee?.email;
            
            return (
              <div
                key={request.id}
                className={`p-4 border rounded-lg ${
                  isSelfSubmitted 
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' 
                    : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.submitted_by}</span>
                    {request.is_correction && (
                      <Badge variant="destructive" className="bg-orange-500">
                        CORRECTION
                      </Badge>
                    )}
                    {isSelfSubmitted && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Your Request
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                  </div>
                </div>

{/* Prices */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Coffee className="h-4 w-4 text-amber-700" />
                      <span className="text-sm font-medium">Arabica</span>
                    </div>
                    <p className="text-xl font-bold">
                      UGX {request.arabica_buying_price.toLocaleString()}/kg
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Outturn: {request.arabica_outturn}% | 
                      Moisture: {request.arabica_moisture}% | 
                      FM: {request.arabica_fm}%
                    </div>
                    {currentPrices.arabicaBuyingPrice !== request.arabica_buying_price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: UGX {currentPrices.arabicaBuyingPrice.toLocaleString()}/kg
                        <span className={request.arabica_buying_price > currentPrices.arabicaBuyingPrice ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          ({request.arabica_buying_price > currentPrices.arabicaBuyingPrice ? '+' : ''}
                          {((request.arabica_buying_price - currentPrices.arabicaBuyingPrice) / currentPrices.arabicaBuyingPrice * 100).toFixed(1)}%)
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Coffee className="h-4 w-4 text-emerald-700" />
                      <span className="text-sm font-medium">Robusta</span>
                    </div>
                    <p className="text-xl font-bold">
                      UGX {request.robusta_buying_price.toLocaleString()}/kg
                    </p>
                    <div className="text-xs text-muted-foreground mt-1">
                      Outturn: {request.robusta_outturn}% | 
                      Moisture: {request.robusta_moisture}% | 
                      FM: {request.robusta_fm}%
                    </div>
                    {currentPrices.robustaBuyingPrice !== request.robusta_buying_price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: UGX {currentPrices.robustaBuyingPrice.toLocaleString()}/kg
                        <span className={request.robusta_buying_price > currentPrices.robustaBuyingPrice ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          ({request.robusta_buying_price > currentPrices.robustaBuyingPrice ? '+' : ''}
                          {((request.robusta_buying_price - currentPrices.robustaBuyingPrice) / currentPrices.robustaBuyingPrice * 100).toFixed(1)}%)
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Coffee className="h-4 w-4 text-purple-700" />
                      <span className="text-sm font-medium">Sorted</span>
                    </div>
                    <p className="text-xl font-bold">
                      UGX {(request.sorted_price || 0).toLocaleString()}/kg
                    </p>
                    {currentPrices.sortedPrice !== (request.sorted_price || 0) && currentPrices.sortedPrice > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: UGX {currentPrices.sortedPrice.toLocaleString()}/kg
                        <span className={(request.sorted_price || 0) > currentPrices.sortedPrice ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                          ({(request.sorted_price || 0) > currentPrices.sortedPrice ? '+' : ''}
                          {(((request.sorted_price || 0) - currentPrices.sortedPrice) / currentPrices.sortedPrice * 100).toFixed(1)}%)
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Notify Suppliers Badge */}
                {request.notify_suppliers && (
                  <Badge variant="outline" className="mb-3">
                    Will notify suppliers on approval
                  </Badge>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openRejectDialog(request)}
                    disabled={processing}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={processing || isSelfSubmitted}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {isSelfSubmitted ? "Can't Approve Own Request" : "Approve & Update"}
                  </Button>
                </div>

                {isSelfSubmitted && (
                  <p className="text-xs text-amber-600 mt-2 text-right">
                    Another admin must approve your price updates
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Price Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectionReason">Reason for Rejection *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why these prices are being rejected..."
                className="mt-1"
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Suggest Alternative Prices (Optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="suggestedArabica">Arabica (UGX/kg)</Label>
                  <Input
                    id="suggestedArabica"
                    type="number"
                    value={suggestedArabicaPrice}
                    onChange={(e) => setSuggestedArabicaPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder={selectedRequest?.arabica_buying_price.toString()}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="suggestedRobusta">Robusta (UGX/kg)</Label>
                  <Input
                    id="suggestedRobusta"
                    type="number"
                    value={suggestedRobustaPrice}
                    onChange={(e) => setSuggestedRobustaPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder={selectedRequest?.robusta_buying_price.toString()}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={processing || !rejectionReason.trim()}
              variant="destructive"
            >
              {processing ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PriceApprovalPanel;
