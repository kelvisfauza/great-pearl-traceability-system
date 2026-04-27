import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { usePriceApprovals, PriceApprovalRequest } from '@/hooks/usePriceApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coffee, Send, Globe, RefreshCw, Clock, CalendarDays, Sun, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PendingPriceApproval from './PendingPriceApproval';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  arabicaOutturn: number;
  arabicaMoisture: number;
  arabicaFm: number;
  arabicaBuyingPrice: number;
  robustaOutturn: number;
  robustaMoisture: number;
  robustaFm: number;
  robustaBuyingPrice: number;
  sortedPrice: number;
}

const ReferencePriceInput: React.FC = () => {
  const { toast } = useToast();
  const { employee } = useAuth();
  const { prices: currentPrices, loading: hookLoading, savePrices } = useReferencePrices();
  const { 
    myPendingRequest, 
    myRejectedRequests, 
    submitForApproval, 
    dismissRejection,
    fetchMyRequests 
  } = usePriceApprovals();

  // Determine target date based on EAT time
  const getTargetDate = () => {
    const now = new Date();
    const eatHour = (now.getUTCHours() + 3) % 24;
    const eatDate = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    
    if (eatHour >= 19) {
      // After 7 PM EAT — set prices for tomorrow
      const tomorrow = new Date(eatDate);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      return { date: tomorrow.toISOString().split('T')[0], isNextDay: true };
    }
    // Before 7 PM — set prices for today
    return { date: eatDate.toISOString().split('T')[0], isNextDay: false };
  };

  const [targetInfo, setTargetInfo] = useState(getTargetDate);
  
const [prices, setPrices] = useState<ReferencePrices>({
    iceArabica: 0,
    robusta: 0,
    exchangeRate: 0,
    drugarLocal: 0,
    wugarLocal: 0,
    robustaFaqLocal: 0,
    arabicaOutturn: 0,
    arabicaMoisture: 0,
    arabicaFm: 0,
    arabicaBuyingPrice: 0,
    robustaOutturn: 0,
    robustaMoisture: 0,
    robustaFm: 0,
    robustaBuyingPrice: 0,
    sortedPrice: 0
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [fetchingICE, setFetchingICE] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);

  // Update target date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTargetInfo(getTargetDate());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (employee?.email) {
      fetchMyRequests(employee.email);
    }
  }, [employee?.email, fetchMyRequests]);

  // Form intentionally starts blank — analysts must enter today's prices fresh.
  // (Previous values are still visible in the Price History viewer.)

  // Render 0 as empty string so fields appear blank until typed.
  const v = (n: number) => (n === 0 ? '' : n);

  const handleInputChange = (field: keyof ReferencePrices, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPrices(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSubmitForApproval = async () => {
    if (!employee) {
      toast({
        title: "Not Authenticated",
        description: "You must be logged in to submit price updates",
        variant: "destructive"
      });
      return;
    }

    if (myPendingRequest) {
      toast({
        title: "Pending Request Exists",
        description: "You already have a price update pending approval. Please wait for admin review.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const success = await submitForApproval(
        prices,
        employee.name,
        employee.email,
        sendNotification,
        targetInfo.date
      );

      if (success) {
        // Refresh my requests
        await fetchMyRequests(employee.email);
      }
    } catch (error) {
      console.error('Error submitting for approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggestedPrices = (request: PriceApprovalRequest) => {
    if (request.suggested_arabica_price) {
      setPrices(prev => ({ ...prev, arabicaBuyingPrice: request.suggested_arabica_price! }));
    }
    if (request.suggested_robusta_price) {
      setPrices(prev => ({ ...prev, robustaBuyingPrice: request.suggested_robusta_price! }));
    }
    dismissRejection(request.id);
    toast({
      title: "Suggested Prices Applied",
      description: "The admin's suggested prices have been applied. You can now submit for approval."
    });
  };

  const handleDismissRejection = async (id: string) => {
    await dismissRejection(id);
    if (employee?.email) {
      await fetchMyRequests(employee.email);
    }
  };

const handleReset = () => {
    setPrices({
      iceArabica: 185.50,
      robusta: 2450,
      exchangeRate: 3750,
      drugarLocal: 8500,
      wugarLocal: 8200,
      robustaFaqLocal: 7800,
      arabicaOutturn: 70,
      arabicaMoisture: 12.5,
      arabicaFm: 5,
      arabicaBuyingPrice: 8500,
      robustaOutturn: 80,
      robustaMoisture: 13,
      robustaFm: 3,
      robustaBuyingPrice: 7800,
      sortedPrice: 0
    });
  };

const handleTestSMS = async (phoneNumber: string) => {
    try {
      setTestLoading(true);
      const date = new Date().toLocaleDateString('en-GB');
      const message = `Great Agro Coffee - Price Update\nDate: ${date}\n\n☕ ARABICA:\nOutturn: ${prices.arabicaOutturn}%\nMoisture: ${prices.arabicaMoisture}%\nFM: ${prices.arabicaFm}%\nPrice: UGX ${prices.arabicaBuyingPrice.toLocaleString()}/kg\n\n☕ ROBUSTA:\nOutturn: ${prices.robustaOutturn}%\nMoisture: ${prices.robustaMoisture}%\nFM: ${prices.robustaFm}%\nPrice: UGX ${prices.robustaBuyingPrice.toLocaleString()}/kg\n\n☕ SORTED: UGX ${prices.sortedPrice.toLocaleString()}/kg\n\nDeliver your coffee now!\n📞 Contact: +256 393 001 626`;

      console.log(`📱 Sending test SMS to ${phoneNumber}`);
      console.log('Message:', message);

      const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: message,
          userName: 'Test User',
          messageType: 'price_update_test',
          triggeredBy: 'Data Analyst',
          department: 'Analyst'
        })
      });

      const result = await response.json();
      if (response.ok) {
        toast({
          title: "Test SMS Sent",
          description: `SMS sent to ${phoneNumber} - check your phone!`
        });
      } else {
        throw new Error(result.error || 'Failed to send test SMS');
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Test SMS Failed",
        description: "Could not send test SMS",
        variant: "destructive"
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleFetchICEPrices = async () => {
    try {
      setFetchingICE(true);
      console.log('🌐 Fetching ICE prices from Yahoo Finance...');

      const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/fetch-ice-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      console.log('📊 ICE prices result:', result);

      if (result.success && result.data) {
        const updates: Partial<ReferencePrices> = {};
        
        if (result.data.iceArabica) {
          updates.iceArabica = result.data.iceArabica;
        }
        if (result.data.iceRobusta) {
          updates.robusta = result.data.iceRobusta;
        }

        if (Object.keys(updates).length > 0) {
          setPrices(prev => ({ ...prev, ...updates }));
          toast({
            title: "ICE Prices Fetched",
            description: `Arabica: ${result.data.iceArabica || 'N/A'} ¢/lb, Robusta: ${result.data.iceRobusta || 'N/A'} $/MT`
          });
        } else {
          toast({
            title: "No Data",
            description: "Could not retrieve ICE prices",
            variant: "destructive"
          });
        }
      } else {
        throw new Error(result.error || 'Failed to fetch ICE prices');
      }
    } catch (error) {
      console.error('Error fetching ICE prices:', error);
      toast({
        title: "Fetch Failed",
        description: "Could not fetch ICE market prices",
        variant: "destructive"
      });
    } finally {
      setFetchingICE(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Show pending and rejected requests */}
      <PendingPriceApproval
        myPendingRequest={myPendingRequest}
        myRejectedRequests={myRejectedRequests}
        onDismissRejection={handleDismissRejection}
        onUseRejectedPrices={handleUseSuggestedPrices}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Reference Price Management</CardTitle>
            <Badge variant={targetInfo.isNextDay ? "secondary" : "default"} className="text-sm px-3 py-1">
              {targetInfo.isNextDay ? (
                <><Moon className="h-4 w-4 mr-1.5" /> Setting prices for tomorrow</>
              ) : (
                <><Sun className="h-4 w-4 mr-1.5" /> Setting prices for today</>
              )}
              {' — '}
              {new Date(targetInfo.date + 'T00:00:00').toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Badge>
          </div>
          {targetInfo.isNextDay && (
            <div className="bg-accent/50 border border-border rounded-lg p-3 mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span>It's past 7 PM — prices you set now will apply <strong>tomorrow</strong>. This ensures the team has prices ready at the start of business.</span>
              </div>
            </div>
          )}
          {currentPrices.lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date(currentPrices.lastUpdated).toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Arabica Buying Parameters */}
        <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="h-5 w-5 text-amber-700" />
            <h3 className="text-lg font-semibold text-amber-700">Arabica Buying Parameters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="arabicaOutturn">Outturn (%)</Label>
              <Input
                id="arabicaOutturn"
                type="number"
                step="0.1"
                value={v(prices.arabicaOutturn)}
                placeholder="e.g. 70"
                onChange={(e) => handleInputChange('arabicaOutturn', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arabicaMoisture">Moisture (%)</Label>
              <Input
                id="arabicaMoisture"
                type="number"
                step="0.1"
                value={v(prices.arabicaMoisture)}
                placeholder="e.g. 12.5"
                onChange={(e) => handleInputChange('arabicaMoisture', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arabicaFm">FM (%)</Label>
              <Input
                id="arabicaFm"
                type="number"
                step="0.1"
                value={v(prices.arabicaFm)}
                placeholder="e.g. 5"
                onChange={(e) => handleInputChange('arabicaFm', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arabicaBuyingPrice">Buying Price (UGX/kg)</Label>
              <Input
                id="arabicaBuyingPrice"
                type="number"
                step="50"
                value={v(prices.arabicaBuyingPrice)}
                placeholder="Enter price"
                onChange={(e) => handleInputChange('arabicaBuyingPrice', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Robusta Buying Parameters */}
        <div className="p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="h-5 w-5 text-emerald-700" />
            <h3 className="text-lg font-semibold text-emerald-700">Robusta Buying Parameters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="robustaOutturn">Outturn (%)</Label>
              <Input
                id="robustaOutturn"
                type="number"
                step="0.1"
                value={v(prices.robustaOutturn)}
                placeholder="e.g. 80"
                onChange={(e) => handleInputChange('robustaOutturn', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaMoisture">Moisture (%)</Label>
              <Input
                id="robustaMoisture"
                type="number"
                step="0.1"
                value={v(prices.robustaMoisture)}
                placeholder="e.g. 13"
                onChange={(e) => handleInputChange('robustaMoisture', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaFm">FM (%)</Label>
              <Input
                id="robustaFm"
                type="number"
                step="0.1"
                value={v(prices.robustaFm)}
                placeholder="e.g. 3"
                onChange={(e) => handleInputChange('robustaFm', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaBuyingPrice">Buying Price (UGX/kg)</Label>
              <Input
                id="robustaBuyingPrice"
                type="number"
                step="50"
                value={v(prices.robustaBuyingPrice)}
                placeholder="Enter price"
                onChange={(e) => handleInputChange('robustaBuyingPrice', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Sorted Price */}
        <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="h-5 w-5 text-purple-700" />
            <h3 className="text-lg font-semibold text-purple-700">Sorted Coffee Price</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sortedPrice">Sorted Price (UGX/kg)</Label>
              <Input
                id="sortedPrice"
                type="number"
                step="50"
                value={v(prices.sortedPrice)}
                placeholder="Enter price"
                onChange={(e) => handleInputChange('sortedPrice', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* International Markets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">International Markets</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleFetchICEPrices}
              disabled={fetchingICE}
            >
              {fetchingICE ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              {fetchingICE ? 'Fetching...' : 'Fetch ICE Prices'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="iceArabica">ICE Arabica C (¢/lb)</Label>
              <Input
                id="iceArabica"
                type="number"
                step="0.01"
                value={v(prices.iceArabica)}
                placeholder="ICE Arabica"
                onChange={(e) => handleInputChange('iceArabica', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robusta">Robusta ($/MT)</Label>
              <Input
                id="robusta"
                type="number"
                step="1"
                value={v(prices.robusta)}
                placeholder="Robusta"
                onChange={(e) => handleInputChange('robusta', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exchangeRate">USD/UGX Exchange Rate</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="1"
                value={v(prices.exchangeRate)}
                placeholder="USD/UGX"
                onChange={(e) => handleInputChange('exchangeRate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Local Markets */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Local Markets (UGX/kg)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="drugarLocal">Drugar</Label>
              <Input
                id="drugarLocal"
                type="number"
                step="50"
                value={v(prices.drugarLocal)}
                placeholder="Enter price"
                onChange={(e) => handleInputChange('drugarLocal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wugarLocal">Wugar</Label>
              <Input
                id="wugarLocal"
                type="number"
                step="50"
                value={v(prices.wugarLocal)}
                placeholder="Enter price"
                onChange={(e) => handleInputChange('wugarLocal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaFaqLocal">Robusta FAQ</Label>
              <Input
                id="robustaFaqLocal"
                type="number"
                step="50"
                value={v(prices.robustaFaqLocal)}
                placeholder="Enter price"
                onChange={(e) => handleInputChange('robustaFaqLocal', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SMS Notification Option */}
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="sendNotification"
            checked={sendNotification}
            onCheckedChange={(checked) => setSendNotification(checked as boolean)}
          />
          <Label 
            htmlFor="sendNotification" 
            className="text-sm font-normal cursor-pointer"
          >
            Send SMS notifications to all suppliers with price update
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4">
          <Button 
            onClick={handleSubmitForApproval} 
            disabled={loading || hookLoading || !!myPendingRequest}
            className="bg-primary"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {myPendingRequest ? (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Awaiting Approval
              </>
            ) : loading ? 'Submitting...' : 'Submit for Approval'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleTestSMS('0393001626')} 
            disabled={testLoading}
          >
            {testLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {testLoading ? 'Sending...' : 'Test SMS (0393001626)'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleTestSMS('0707756445')} 
            disabled={testLoading}
          >
            {testLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {testLoading ? 'Sending...' : 'Test SMS (0707756445)'}
          </Button>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferencePriceInput;
