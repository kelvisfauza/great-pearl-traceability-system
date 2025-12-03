import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useReferencePrices } from '@/hooks/useReferencePrices';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ReferencePrices {
  iceArabica: number;
  robusta: number;
  exchangeRate: number;
  drugarLocal: number;
  wugarLocal: number;
  robustaFaqLocal: number;
  outturn: number;
  moisture: number;
  fm: number;
  buyingPrice: number;
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
    outturn: 70,
    moisture: 12.5,
    fm: 5,
    buyingPrice: 8500
  });
  const [loading, setLoading] = useState(false);
  const [sendNotification, setSendNotification] = useState(false);

  // Update local state when Supabase data changes
  useEffect(() => {
    setPrices({
      iceArabica: currentPrices.iceArabica,
      robusta: currentPrices.robusta,
      exchangeRate: currentPrices.exchangeRate,
      drugarLocal: currentPrices.drugarLocal,
      wugarLocal: currentPrices.wugarLocal,
      robustaFaqLocal: currentPrices.robustaFaqLocal,
      outturn: currentPrices.outturn,
      moisture: currentPrices.moisture,
      fm: currentPrices.fm,
      buyingPrice: currentPrices.buyingPrice
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

      // Send SMS notifications if checked
      if (sendNotification) {
        const { data: suppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('id, name, phone')
          .not('phone', 'is', null);

        if (suppliersError) {
          console.error('Error fetching suppliers:', suppliersError);
        }

        const suppliersList = suppliers?.filter(s => s.phone) || [];

        const date = new Date().toLocaleDateString('en-GB');
        const message = `Great Pearl Coffee updates\nToday: ${date}\n\nArabica Price Update:\nOutturn:     ${prices.outturn}%\nMoisture:    ${prices.moisture}%\nFM:          ${prices.fm}%\nPrice:  UGX ${prices.buyingPrice.toLocaleString()}/kg\n\nDeliver now to get served best.`;

        // Send SMS to each supplier
        console.log(`📱 Sending SMS to ${suppliersList.length} suppliers`);
        const smsPromises = suppliersList.map(async (supplier) => {
          try {
            console.log(`Sending to ${supplier.name} at ${supplier.phone}`);
            const response = await fetch('https://pudfybkyfedeggmokhco.supabase.co/functions/v1/send-sms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGZ5Ymt5ZmVkZWdnbW9raGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzNDAxNjEsImV4cCI6MjA2NzkxNjE2MX0.RSK-BwEjyRMn9YM998_93-W9g8obmjnLXgOgTrIAZJk'
              },
              body: JSON.stringify({
                phone: supplier.phone,
                message: message,
                userName: supplier.name,
                messageType: 'price_update',
                triggeredBy: 'Data Analyst',
                department: 'Analyst'
              })
            });

            const result = await response.json();
            if (!response.ok) {
              console.error(`❌ Failed to send SMS to ${supplier.name}:`, result);
            } else {
              console.log(`✅ SMS sent to ${supplier.name}`);
            }
          } catch (error) {
            console.error(`❌ Error sending SMS to ${supplier.name}:`, error);
          }
        });

        await Promise.allSettled(smsPromises);
        
        toast({
          title: "Reference Prices Updated",
          description: `Prices saved and SMS sent to ${suppliersList.length} suppliers`
        });
      } else {
        toast({
          title: "Reference Prices Updated",
          description: "New reference prices have been saved successfully"
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
      outturn: 70,
      moisture: 12.5,
      fm: 5,
      buyingPrice: 8500
    });
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
        {/* Buying Parameters */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-primary">Daily Buying Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="outturn">Outturn (%)</Label>
              <Input
                id="outturn"
                type="number"
                step="0.1"
                value={prices.outturn}
                onChange={(e) => handleInputChange('outturn', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="moisture">Moisture (%)</Label>
              <Input
                id="moisture"
                type="number"
                step="0.1"
                value={prices.moisture}
                onChange={(e) => handleInputChange('moisture', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fm">FM (%)</Label>
              <Input
                id="fm"
                type="number"
                step="0.1"
                value={prices.fm}
                onChange={(e) => handleInputChange('fm', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="buyingPrice">Buying Price (UGX/kg)</Label>
              <Input
                id="buyingPrice"
                type="number"
                step="50"
                value={prices.buyingPrice}
                onChange={(e) => handleInputChange('buyingPrice', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* International Markets */}
        <div>
          <h3 className="text-lg font-semibold mb-3">International Markets</h3>
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
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={loading || hookLoading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Saving...' : 'Save Reference Prices'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferencePriceInput;
