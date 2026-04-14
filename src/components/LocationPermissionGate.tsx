import { useState, useEffect } from 'react';
import { MapPin, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPermissionGateProps {
  children: React.ReactNode;
}

const LocationPermissionGate = ({ children }: LocationPermissionGateProps) => {
  const [status, setStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    // Directly attempt geolocation — this is the most reliable check across browsers
    if (!('geolocation' in navigator)) {
      // No geolocation API at all — let them through
      setStatus('granted');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        // Successfully got position — permission is granted
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          // Only block if explicitly denied
          setStatus('denied');
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT — not a permission issue, let them through
          setStatus('granted');
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking location permissions...</p>
        </div>
      </div>
    );
  }

  if (status === 'granted') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Location Access Blocked</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You have blocked location access. To use this system, please enable location permissions in your browser settings, then refresh this page.
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-destructive/10 text-destructive text-xs rounded-lg p-3 text-left space-y-1">
            <p className="font-semibold">How to enable location:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click the lock/info icon in your browser address bar</li>
              <li>Find "Location" and set it to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Refresh Page
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Your location data is used for security monitoring and audit purposes only.
        </p>
      </div>
    </div>
  );
};

export default LocationPermissionGate;
