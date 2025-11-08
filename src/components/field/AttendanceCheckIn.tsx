import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldOperationsData } from '@/hooks/useFieldOperationsData';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const AttendanceCheckIn = () => {
  const { attendanceLogs, checkIn, checkOut } = useFieldOperationsData();
  const { user } = useAuth();
  const [locationName, setLocationName] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  const todayLog = attendanceLogs.find(log => 
    log.date === format(new Date(), 'yyyy-MM-dd') && 
    log.field_agent === user?.email &&
    !log.check_out_time
  );

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setGpsCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  const handleCheckIn = async () => {
    if (!locationName) {
      alert('Please enter location name');
      return;
    }
    await checkIn(user?.email || 'Unknown', locationName, gpsCoords?.lat, gpsCoords?.lng);
    setLocationName('');
  };

  const handleCheckOut = async () => {
    if (todayLog) {
      await checkOut(todayLog.id, gpsCoords?.lat, gpsCoords?.lng);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Field Attendance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {gpsCoords && (
          <div className="bg-muted p-3 rounded-lg flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-green-600" />
            <span>GPS: {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</span>
          </div>
        )}

        {!todayLog ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Location Name *</Label>
              <Input
                id="location"
                placeholder="e.g., Kyambogo Buying Station"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <Button onClick={handleCheckIn} className="w-full" size="lg">
              <CheckCircle className="mr-2 h-5 w-5" />
              Check In
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                <CheckCircle className="h-5 w-5" />
                Checked In
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Location: {todayLog.location_name}</p>
                <p>Time: {format(new Date(todayLog.check_in_time), 'hh:mm a')}</p>
              </div>
            </div>
            <Button onClick={handleCheckOut} variant="destructive" className="w-full" size="lg">
              Check Out
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
