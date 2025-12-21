import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Coffee, Send, Globe, RefreshCw } from 'lucide-react';

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
}

const ReferencePriceInput: React.FC = () => {
  const { toast } = useToast();
  const { prices: currentPrices, loading: hookLoading, savePrices } = useReferencePrices();
  
  const [prices, setPrices] = useState<ReferencePrices>({
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
    robustaBuyingPrice: 7800
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [fetchingICE, setFetchingICE] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);

  useEffect(() => {
    setPrices({
      iceArabica: currentPrices.iceArabica,
      robusta: currentPrices.robusta,
      exchangeRate: currentPrices.exchangeRate,
      drugarLocal: currentPrices.drugarLocal,
      wugarLocal: currentPrices.wugarLocal,
      robustaFaqLocal: currentPrices.robustaFaqLocal,
      arabicaOutturn: currentPrices.arabicaOutturn,
      arabicaMoisture: currentPrices.arabicaMoisture,
      arabicaFm: currentPrices.arabicaFm,
      arabicaBuyingPrice: currentPrices.arabicaBuyingPrice,
      robustaOutturn: currentPrices.robustaOutturn,
      robustaMoisture: currentPrices.robustaMoisture,
      robustaFm: currentPrices.robustaFm,
      robustaBuyingPrice: currentPrices.robustaBuyingPrice
    });
  }, [currentPrices]);

  const handleInputChange = (field: keyof ReferencePrices, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPrices(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await savePrices(prices);

      // Helper function to send SMS with delay (throttled)
      const sendSmsWithDelay = async (
        recipient: { phone: string; name: string },
        message: string,
        messageType: string,
        delayMs: number
      ) => {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        try {
          const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
            },
            body: JSON.stringify({
              phone: recipient.phone,
              message: message,
              userName: recipient.name,
              messageType: messageType,
              triggeredBy: 'Data Analyst',
              department: 'Analyst'
            })
          });
          const result = await response.json();
          if (!response.ok) {
            console.error(`❌ Failed to send SMS to ${recipient.name}:`, result);
            return { success: false, name: recipient.name };
          }
          console.log(`✅ SMS sent to ${recipient.name}`);
          return { success: true, name: recipient.name };
        } catch (error) {
          console.error(`❌ Error sending SMS to ${recipient.name}:`, error);
          return { success: false, name: recipient.name };
        }
      };

      // Always send price update to all staff (throttled - 500ms between each)
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, phone, email')
        .eq('status', 'Active')
        .not('phone', 'is', null);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
      }

      const staffList = employees?.filter(e => e.phone) || [];
      const date = new Date().toLocaleDateString('en-GB');
      
      // Staff message (shorter, internal)
      const staffMessage = `GPC Price Update - ${date}\n\nArabica: UGX ${prices.arabicaBuyingPrice.toLocaleString()}/kg (${prices.arabicaOutturn}% outturn)\nRobusta: UGX ${prices.robustaBuyingPrice.toLocaleString()}/kg (${prices.robustaOutturn}% outturn)\n\nUse these prices for today's purchases.`;

      console.log(`📱 Sending price update SMS to ${staffList.length} staff members (throttled)`);
      
      // Send staff SMS with 500ms delay between each to avoid overwhelming YoolaSMS
      const staffResults = [];
      for (let i = 0; i < staffList.length; i++) {
        const employee = staffList[i];
        const result = await sendSmsWithDelay(
          { phone: employee.phone!, name: employee.name },
          staffMessage,
          'staff_price_update',
          i === 0 ? 0 : 500 // No delay for first, 500ms for rest
        );
        staffResults.push(result);
      }
      
      const staffSuccessCount = staffResults.filter(r => r.success).length;

      // Optionally also send to suppliers if checkbox is enabled
      if (sendNotification) {
        const { data: suppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('id, name, phone')
          .not('phone', 'is', null);

        if (suppliersError) {
          console.error('Error fetching suppliers:', suppliersError);
        }

        const suppliersList = suppliers?.filter(s => s.phone) || [];
        
        // Supplier message (more detailed, external)
        const supplierMessage = `Great Pearl Coffee - Price Update\nDate: ${date}\n\n☕ ARABICA:\nOutturn: ${prices.arabicaOutturn}%\nMoisture: ${prices.arabicaMoisture}%\nFM: ${prices.arabicaFm}%\nPrice: UGX ${prices.arabicaBuyingPrice.toLocaleString()}/kg\n\n☕ ROBUSTA:\nOutturn: ${prices.robustaOutturn}%\nMoisture: ${prices.robustaMoisture}%\nFM: ${prices.robustaFm}%\nPrice: UGX ${prices.robustaBuyingPrice.toLocaleString()}/kg\n\nDeliver your coffee now!\n📞 Contact: +256778536681`;

        console.log(`📱 Sending SMS to ${suppliersList.length} suppliers (throttled)`);
        
        // Send supplier SMS with 500ms delay between each
        const supplierResults = [];
        for (let i = 0; i < suppliersList.length; i++) {
          const supplier = suppliersList[i];
          const result = await sendSmsWithDelay(
            { phone: supplier.phone!, name: supplier.name },
            supplierMessage,
            'price_update',
            500 // Always delay after staff messages
          );
          supplierResults.push(result);
        }
        
        const supplierSuccessCount = supplierResults.filter(r => r.success).length;
        
        toast({
          title: "Reference Prices Updated",
          description: `Prices saved, SMS sent to ${staffSuccessCount}/${staffList.length} staff and ${supplierSuccessCount}/${suppliersList.length} suppliers`
        });
      } else {
        toast({
          title: "Reference Prices Updated",
          description: `Prices saved and SMS sent to ${staffSuccessCount}/${staffList.length} staff members`
        });
      }
    } catch (error) {
      console.error('Error saving prices:', error);
      toast({
        title: "Error",
        description: "Failed to save reference prices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      robustaBuyingPrice: 7800
    });
  };

  const handleTestSMS = async (phoneNumber: string) => {
    try {
      setTestLoading(true);
      const date = new Date().toLocaleDateString('en-GB');
      const message = `Great Pearl Coffee - Price Update\nDate: ${date}\n\n☕ ARABICA:\nOutturn: ${prices.arabicaOutturn}%\nMoisture: ${prices.arabicaMoisture}%\nFM: ${prices.arabicaFm}%\nPrice: UGX ${prices.arabicaBuyingPrice.toLocaleString()}/kg\n\n☕ ROBUSTA:\nOutturn: ${prices.robustaOutturn}%\nMoisture: ${prices.robustaMoisture}%\nFM: ${prices.robustaFm}%\nPrice: UGX ${prices.robustaBuyingPrice.toLocaleString()}/kg\n\nDeliver your coffee now!\n📞 Contact: +256778536681`;

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
    <Card>
      <CardHeader>
        <CardTitle>Reference Price Management</CardTitle>
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
                value={prices.arabicaOutturn}
                onChange={(e) => handleInputChange('arabicaOutturn', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arabicaMoisture">Moisture (%)</Label>
              <Input
                id="arabicaMoisture"
                type="number"
                step="0.1"
                value={prices.arabicaMoisture}
                onChange={(e) => handleInputChange('arabicaMoisture', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arabicaFm">FM (%)</Label>
              <Input
                id="arabicaFm"
                type="number"
                step="0.1"
                value={prices.arabicaFm}
                onChange={(e) => handleInputChange('arabicaFm', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="arabicaBuyingPrice">Buying Price (UGX/kg)</Label>
              <Input
                id="arabicaBuyingPrice"
                type="number"
                step="50"
                value={prices.arabicaBuyingPrice}
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
                value={prices.robustaOutturn}
                onChange={(e) => handleInputChange('robustaOutturn', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaMoisture">Moisture (%)</Label>
              <Input
                id="robustaMoisture"
                type="number"
                step="0.1"
                value={prices.robustaMoisture}
                onChange={(e) => handleInputChange('robustaMoisture', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaFm">FM (%)</Label>
              <Input
                id="robustaFm"
                type="number"
                step="0.1"
                value={prices.robustaFm}
                onChange={(e) => handleInputChange('robustaFm', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaBuyingPrice">Buying Price (UGX/kg)</Label>
              <Input
                id="robustaBuyingPrice"
                type="number"
                step="50"
                value={prices.robustaBuyingPrice}
                onChange={(e) => handleInputChange('robustaBuyingPrice', e.target.value)}
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
                value={prices.iceArabica}
                onChange={(e) => handleInputChange('iceArabica', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robusta">Robusta ($/MT)</Label>
              <Input
                id="robusta"
                type="number"
                step="1"
                value={prices.robusta}
                onChange={(e) => handleInputChange('robusta', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exchangeRate">USD/UGX Exchange Rate</Label>
              <Input
                id="exchangeRate"
                type="number"
                step="1"
                value={prices.exchangeRate}
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
                value={prices.drugarLocal}
                onChange={(e) => handleInputChange('drugarLocal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="wugarLocal">Wugar</Label>
              <Input
                id="wugarLocal"
                type="number"
                step="50"
                value={prices.wugarLocal}
                onChange={(e) => handleInputChange('wugarLocal', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="robustaFaqLocal">Robusta FAQ</Label>
              <Input
                id="robustaFaqLocal"
                type="number"
                step="50"
                value={prices.robustaFaqLocal}
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
          <Button onClick={handleSave} disabled={loading || hookLoading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Saving...' : 'Save Reference Prices'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleTestSMS('0781121639')} 
            disabled={testLoading}
          >
            {testLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {testLoading ? 'Sending...' : 'Test SMS (0781121639)'}
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
  );
};

export default ReferencePriceInput;
