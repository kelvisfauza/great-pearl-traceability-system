import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Monitor, Smartphone, Tablet, ExternalLink } from 'lucide-react';
import type { PresenceRecord } from '@/hooks/usePresenceList';

interface UserLocationMapProps {
  users: PresenceRecord[];
}

const DeviceLabel = ({ type, model }: { type?: string | null; model?: string | null }) => {
  const Icon = type === 'Mobile' ? Smartphone : type === 'Tablet' ? Tablet : Monitor;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      {model && model !== 'Unknown Device' ? model : type || 'Unknown device'}
    </span>
  );
};

const isValidCoordinate = (value: unknown, min: number, max: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max;
};

const getStatusTone = (status: string) => {
  if (status === 'online') return 'default';
  if (status === 'away') return 'secondary';
  return 'outline';
};

const getStatusLabel = (status: string) => {
  if (status === 'online') return 'Online';
  if (status === 'away') return 'Away';
  return 'Offline';
};

const buildEmbedUrl = (latitude: number, longitude: number) => {
  const latOffset = 0.015;
  const lonOffset = 0.02;
  const left = longitude - lonOffset;
  const right = longitude + lonOffset;
  const top = latitude + latOffset;
  const bottom = latitude - latOffset;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const buildExternalMapUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const UserLocationMap = ({ users }: UserLocationMapProps) => {
  const usersWithLocation = useMemo(
    () =>
      users
        .filter(
          (user) =>
            isValidCoordinate(user.latitude, -90, 90) &&
            isValidCoordinate(user.longitude, -180, 180)
        )
        .map((user) => ({
          ...user,
          latitude: Number(user.latitude),
          longitude: Number(user.longitude),
        })),
    [users]
  );

  const [selectedUserId, setSelectedUserId] = useState<string | null>(usersWithLocation[0]?.id ?? null);

  useEffect(() => {
    if (!usersWithLocation.length) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId((current) => {
      if (current && usersWithLocation.some((user) => user.id === current)) return current;
      return usersWithLocation[0].id;
    });
  }, [usersWithLocation]);

  const selectedUser = useMemo(
    () => usersWithLocation.find((user) => user.id === selectedUserId) ?? usersWithLocation[0] ?? null,
    [selectedUserId, usersWithLocation]
  );

  const onlineCount = usersWithLocation.filter((user) => user.status === 'online').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-5 w-5 text-primary" />
          User Location Viewer
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">{onlineCount} online</Badge>
          <Badge variant="outline" className="text-[10px]">{usersWithLocation.length} with coordinates</Badge>
          <span>•</span>
          <span>Select a user to see the exact location on the map.</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!usersWithLocation.length ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No users with valid location data yet. Users need to allow location access.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
            <div className="overflow-hidden rounded-lg border bg-card">
              {selectedUser ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{selectedUser.name || selectedUser.email || 'User'}</p>
                      <p className="truncate text-xs text-muted-foreground">{selectedUser.location_address || `${selectedUser.latitude.toFixed(6)}, ${selectedUser.longitude.toFixed(6)}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusTone(selectedUser.status) as 'default' | 'secondary' | 'outline'} className="text-[10px]">
                        {getStatusLabel(selectedUser.status)}
                      </Badge>
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <a
                          href={buildExternalMapUrl(selectedUser.latitude, selectedUser.longitude)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Open Map
                        </a>
                      </Button>
                    </div>
                  </div>

                  <iframe
                    key={selectedUser.id}
                    title={`Location of ${selectedUser.name || selectedUser.email || 'user'}`}
                    src={buildEmbedUrl(selectedUser.latitude, selectedUser.longitude)}
                    className="h-[420px] w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              {usersWithLocation.map((user) => {
                const isSelected = user.id === selectedUser?.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{user.name || user.email || 'User'}</p>
                          <Badge variant={getStatusTone(user.status) as 'default' | 'secondary' | 'outline'} className="text-[10px]">
                            {getStatusLabel(user.status)}
                          </Badge>
                        </div>
                        {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {user.location_address || `${user.latitude.toFixed(6)}, ${user.longitude.toFixed(6)}`}
                        </p>
                        <DeviceLabel type={user.device_type} model={user.device_model} />
                      </div>

                      <span className="text-[10px] text-muted-foreground">
                        {user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserLocationMap;
