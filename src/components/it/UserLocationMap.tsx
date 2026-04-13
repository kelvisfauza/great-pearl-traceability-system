import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { PresenceRecord } from '@/hooks/usePresenceList';

// Fix default marker icons for leaflet in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const onlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const awayIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const offlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getIcon = (status: string) => {
  if (status === 'online') return onlineIcon;
  if (status === 'away') return awayIcon;
  return offlineIcon;
};

const DeviceLabel = ({ type, model }: { type?: string | null; model?: string | null }) => {
  const Icon = type === 'Mobile' ? Smartphone : type === 'Tablet' ? Tablet : Monitor;
  return (
    <span className="flex items-center gap-1 text-xs">
      <Icon className="h-3 w-3" />
      {model && model !== 'Unknown Device' ? model : type || 'Unknown'}
    </span>
  );
};

interface UserLocationMapProps {
  users: PresenceRecord[];
}

const UserLocationMap = ({ users }: UserLocationMapProps) => {
  const usersWithLocation = useMemo(
    () => users.filter(u => u.latitude && u.longitude),
    [users]
  );

  // Center on Kasese, Uganda by default; or first user with location
  const center = useMemo<[number, number]>(() => {
    if (usersWithLocation.length > 0) {
      return [usersWithLocation[0].latitude!, usersWithLocation[0].longitude!];
    }
    return [0.1865, 30.0886]; // Kasese default
  }, [usersWithLocation]);

  const onlineWithLoc = usersWithLocation.filter(u => u.status === 'online').length;
  const totalWithLoc = usersWithLocation.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5 text-red-500" />
          User Location Map
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge className="bg-green-100 text-green-800 text-[10px]">{onlineWithLoc} online</Badge>
          <Badge variant="outline" className="text-[10px]">{totalWithLoc} with location</Badge>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Online
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-orange-500" /> Away
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Offline
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {usersWithLocation.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-sm text-muted-foreground">
            No users with location data available. Users need to allow location access.
          </div>
        ) : (
          <div className="h-[450px] w-full rounded-b-lg overflow-hidden">
            <MapContainer
              center={center}
              zoom={14}
              className="h-full w-full"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {usersWithLocation.map((u) => (
                <Marker
                  key={u.id}
                  position={[u.latitude!, u.longitude!]}
                  icon={getIcon(u.status)}
                >
                  <Popup>
                    <div className="min-w-[180px] space-y-1.5">
                      <p className="font-semibold text-sm">{u.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {u.department && <p className="text-xs text-gray-500">{u.department}</p>}
                      <hr />
                      {u.location_address && (
                        <p className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-red-500" />
                          {u.location_address}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {u.latitude!.toFixed(6)}, {u.longitude!.toFixed(6)}
                      </p>
                      <DeviceLabel type={u.device_type} model={u.device_model} />
                      {u.browser && (
                        <p className="text-xs text-gray-500">{u.browser} • {u.os}</p>
                      )}
                      {u.ip_address && u.ip_address !== 'unknown' && (
                        <p className="text-xs text-gray-400">IP: {u.ip_address}</p>
                      )}
                      <Badge
                        className={`text-[10px] ${
                          u.status === 'online' ? 'bg-green-100 text-green-800' :
                          u.status === 'away' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status === 'online' ? '🟢 Online' : u.status === 'away' ? '🟡 Away' : '🔴 Offline'}
                      </Badge>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserLocationMap;
