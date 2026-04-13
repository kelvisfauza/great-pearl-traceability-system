import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Monitor, Smartphone, Tablet, AlertCircle } from 'lucide-react';
import type { PresenceRecord } from '@/hooks/usePresenceList';

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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [MapComponents, setMapComponents] = useState<any>(null);

  const usersWithLocation = useMemo(
    () => users.filter(u => u.latitude && u.longitude),
    [users]
  );

  const center = useMemo<[number, number]>(() => {
    if (usersWithLocation.length > 0) {
      return [usersWithLocation[0].latitude!, usersWithLocation[0].longitude!];
    }
    return [0.1865, 30.0886];
  }, [usersWithLocation]);

  // Dynamically import leaflet to avoid SSR/crash issues
  useEffect(() => {
    let cancelled = false;
    const loadMap = async () => {
      try {
        const [leaflet, reactLeaflet] = await Promise.all([
          import('leaflet'),
          import('react-leaflet'),
        ]);
        // Load CSS
        await import('leaflet/dist/leaflet.css');
        
        const L = leaflet.default;
        // Fix marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        const onlineIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
        });
        const awayIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
        });
        const offlineIcon = new L.Icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
        });

        if (!cancelled) {
          setMapComponents({
            MapContainer: reactLeaflet.MapContainer,
            TileLayer: reactLeaflet.TileLayer,
            Marker: reactLeaflet.Marker,
            Popup: reactLeaflet.Popup,
            onlineIcon,
            awayIcon,
            offlineIcon,
          });
          setMapReady(true);
        }
      } catch (err) {
        console.error('Failed to load map:', err);
        if (!cancelled) setMapError('Failed to load map library');
      }
    };
    loadMap();
    return () => { cancelled = true; };
  }, []);

  const onlineWithLoc = usersWithLocation.filter(u => u.status === 'online').length;

  const getIcon = (status: string) => {
    if (!MapComponents) return undefined;
    if (status === 'online') return MapComponents.onlineIcon;
    if (status === 'away') return MapComponents.awayIcon;
    return MapComponents.offlineIcon;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5 text-destructive" />
          User Location Map
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">{onlineWithLoc} online</Badge>
          <Badge variant="outline" className="text-[10px]">{usersWithLocation.length} with location</Badge>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Online</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> Away</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Offline</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {mapError && (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground gap-2">
            <AlertCircle className="h-4 w-4" /> {mapError}
          </div>
        )}
        {!mapError && !mapReady && (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            Loading map...
          </div>
        )}
        {!mapError && usersWithLocation.length === 0 && mapReady && (
          <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
            No users with location data. Users need to allow location access.
          </div>
        )}
        {!mapError && mapReady && usersWithLocation.length > 0 && MapComponents && (
          <div style={{ height: '450px', width: '100%' }} className="rounded-b-lg overflow-hidden">
            <MapComponents.MapContainer
              center={center}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapComponents.TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {usersWithLocation.map((u) => (
                <MapComponents.Marker
                  key={u.id}
                  position={[u.latitude!, u.longitude!]}
                  icon={getIcon(u.status)}
                >
                  <MapComponents.Popup>
                    <div style={{ minWidth: 180 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{u.name || 'User'}</p>
                      <p style={{ fontSize: 12, color: '#666' }}>{u.email}</p>
                      {u.department && <p style={{ fontSize: 12, color: '#666' }}>{u.department}</p>}
                      <hr style={{ margin: '6px 0' }} />
                      {u.location_address && (
                        <p style={{ fontSize: 12 }}>📍 {u.location_address}</p>
                      )}
                      <p style={{ fontSize: 11, color: '#999' }}>
                        {u.latitude!.toFixed(6)}, {u.longitude!.toFixed(6)}
                      </p>
                      <DeviceLabel type={u.device_type} model={u.device_model} />
                      {u.browser && <p style={{ fontSize: 11, color: '#666' }}>{u.browser} • {u.os}</p>}
                      {u.ip_address && u.ip_address !== 'unknown' && (
                        <p style={{ fontSize: 11, color: '#999' }}>IP: {u.ip_address}</p>
                      )}
                      <p style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: u.status === 'online' ? '#16a34a' : u.status === 'away' ? '#ca8a04' : '#dc2626' }}>
                        {u.status === 'online' ? '🟢 Online' : u.status === 'away' ? '🟡 Away' : '🔴 Offline'}
                      </p>
                    </div>
                  </MapComponents.Popup>
                </MapComponents.Marker>
              ))}
            </MapComponents.MapContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserLocationMap;
