import { useState, useEffect } from 'react';
import { MapPin, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LocationPermissionGateProps {
  children: React.ReactNode;
}

const LocationPermissionGate = ({ children }: LocationPermissionGateProps) => {
  const [status, setStatus] = useState<'checking' | 'granted' | 'prompt' | 'denied'>('checking');

  useEffect(() => {
    if (!navigator.permissions) {
      // Browser doesn't support permissions API — try requesting directly
      setStatus('prompt');
      return;
    }

    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      if (result.state === 'granted') {
        setStatus('granted');
      } else if (result.state === 'denied') {
        setStatus('denied');
      } else {
        setStatus('prompt');
      }

      result.onchange = () => {
        if (result.state === 'granted') setStatus('granted');
        else if (result.state === 'denied') setStatus('denied');
        else setStatus('prompt');
      };
    }).catch(() => {
      setStatus('prompt');
    });
  }, []);

  const requestLocation = () => {
    setStatus('checking');
    navigator.geolocation.getCurrentPosition(
      () => setStatus('granted'),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          // Position unavailable or timeout — still allow access
          setStatus('granted');
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

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
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          {status === 'denied' ? (
            <ShieldAlert className="h-10 w-10 text-destructive" />
          ) : (
            <MapPin className="h-10 w-10 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            {status === 'denied' ? 'Location Access Blocked' : 'Location Required'}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {status === 'denied'
              ? 'You have blocked location access. To use this system, please enable location permissions in your browser settings, then refresh this page.'
              : 'This system requires your location for security and activity tracking. Please allow location access to continue.'}
          </p>
        </div>

        {status === 'prompt' && (
          <Button onClick={requestLocation} size="lg" className="w-full gap-2">
            <MapPin className="h-5 w-5" />
            Allow Location Access
          </Button>
        )}

        {status === 'denied' && (
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
        )}

        <p className="text-xs text-muted-foreground">
          Your location data is used for security monitoring and audit purposes only.
        </p>
      </div>
    </div>
  );
};

export default LocationPermissionGate;
