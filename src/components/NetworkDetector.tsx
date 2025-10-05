import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const NetworkDetector = () => {
  const [ipAddress, setIpAddress] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    detectIP();
  }, []);

  const detectIP = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('detect-ip');
      
      if (error) throw error;
      
      setIpAddress(data.ip);
      console.log('Detected network IP:', data);
    } catch (error) {
      console.error('Error detecting IP:', error);
      toast.error("Failed to detect network IP");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ipAddress);
    setCopied(true);
    toast.success("IP address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-3 mb-4">
        <Wifi className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Network Detection</h3>
      </div>
      
      {loading ? (
        <p className="text-muted-foreground">Detecting your network IP...</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Your current IP address:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-secondary rounded text-sm font-mono">
                {ipAddress}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copy IP address"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <Button onClick={detectIP} variant="secondary" size="sm">
            Refresh IP
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            This is the IP address that will be checked when you log in. 
            Admin accounts can access from any network.
          </p>
        </div>
      )}
    </Card>
  );
};
