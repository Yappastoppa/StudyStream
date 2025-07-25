import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  MessageCircle, 
  UserPlus, 
  Zap, 
  MapPin, 
  Clock,
  Radio,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NearbyDriver {
  id: string;
  username: string;
  distance: number; // meters
  lastSeen: Date;
  speed: number; // mph
  heading: number; // degrees
  status: 'racing' | 'cruising' | 'parked' | 'ghost';
  isOnline: boolean;
}

interface NearbyDriversProps {
  map: any;
  currentLocation: [number, number] | null;
  onClose: () => void;
}

export function NearbyDrivers({ map, currentLocation, onClose }: NearbyDriversProps) {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(2); // 2km default radius
  const { toast } = useToast();
  
  // Mock nearby drivers data (in real app this would come from WebSocket)
  useEffect(() => {
    const mockDrivers: NearbyDriver[] = [
      {
        id: 'driver-1',
        username: 'Night_Hawk_777',
        distance: 450,
        lastSeen: new Date(Date.now() - 30000), // 30 seconds ago
        speed: 85,
        heading: 45,
        status: 'racing',
        isOnline: true
      },
      {
        id: 'driver-2',
        username: 'Ghost_Rider_420',
        distance: 1200,
        lastSeen: new Date(Date.now() - 120000), // 2 minutes ago
        speed: 0,
        heading: 0,
        status: 'parked',
        isOnline: true
      },
      {
        id: 'driver-3',
        username: 'Speed_Demon_666',
        distance: 890,
        lastSeen: new Date(Date.now() - 45000), // 45 seconds ago
        speed: 67,
        heading: 180,
        status: 'cruising',
        isOnline: true
      },
      {
        id: 'driver-4',
        username: 'Shadow_Racer_X',
        distance: 1650,
        lastSeen: new Date(Date.now() - 600000), // 10 minutes ago
        speed: 95,
        heading: 270,
        status: 'ghost',
        isOnline: false
      },
      {
        id: 'driver-5',
        username: 'Turbo_King_999',
        distance: 320,
        lastSeen: new Date(Date.now() - 15000), // 15 seconds ago
        speed: 110,
        heading: 90,
        status: 'racing',
        isOnline: true
      }
    ];
    
    // Filter by radius and sort by distance
    const filtered = mockDrivers
      .filter(driver => driver.distance <= radiusKm * 1000)
      .sort((a, b) => a.distance - b.distance);
    
    setDrivers(filtered);
  }, [radiusKm]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'racing': return 'text-racing-red';
      case 'cruising': return 'text-racing-blue';
      case 'parked': return 'text-racing-green';
      case 'ghost': return 'text-gray-500';
      default: return 'text-white';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'racing': return 'bg-racing-red/20 text-racing-red border-racing-red/30';
      case 'cruising': return 'bg-racing-blue/20 text-racing-blue border-racing-blue/30';
      case 'parked': return 'bg-racing-green/20 text-racing-green border-racing-green/30';
      case 'ghost': return 'bg-gray-700/20 text-gray-400 border-gray-600/30';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };
  
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  };
  
  const sendMessage = (driverId: string, username: string) => {
    toast({
      title: "Message Sent",
      description: `Sent proximity message to ${username}`,
    });
  };
  
  const challengeRace = (driverId: string, username: string) => {
    toast({
      title: "Race Challenge",
      description: `Sent race challenge to ${username}`,
    });
  };
  
  const focusOnDriver = (driver: NearbyDriver) => {
    if (!map || !currentLocation) return;
    
    // Calculate approximate driver location based on distance and heading
    const [myLng, myLat] = currentLocation;
    const distanceKm = driver.distance / 1000;
    const headingRad = (driver.heading * Math.PI) / 180;
    
    // Rough calculation for demo purposes
    const driverLat = myLat + (distanceKm / 111) * Math.cos(headingRad);
    const driverLng = myLng + (distanceKm / (111 * Math.cos(myLat * Math.PI / 180))) * Math.sin(headingRad);
    
    map.flyTo({
      center: [driverLng, driverLat],
      zoom: 16,
      duration: 2000
    });
    
    setSelectedDriver(driver.id);
    toast({
      title: "Focusing on Driver",
      description: `Centered map on ${driver.username}`,
    });
  };
  
  return (
    <div className="absolute top-20 right-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-racing-blue" />
          Nearby Drivers
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-white/70 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Radius Control */}
      <div className="mb-4 p-3 bg-white/5 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Search Radius</span>
          <Badge className="bg-racing-blue/20 text-racing-blue border-racing-blue/30">
            {radiusKm}km
          </Badge>
        </div>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={radiusKm}
          onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.5km</span>
          <span>10km</span>
        </div>
      </div>
      
      {/* Drivers List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {drivers.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No drivers within {radiusKm}km</p>
            <p className="text-xs mt-1">Expand radius or wait for nearby racers</p>
          </div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className={`p-3 rounded-lg border transition-all ${
                selectedDriver === driver.id
                  ? 'bg-racing-blue/20 border-racing-blue/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-racing-dark text-white text-xs">
                    {driver.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white text-sm font-medium truncate">
                      {driver.username}
                    </h4>
                    {driver.isOnline && (
                      <div className="w-2 h-2 bg-racing-green rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formatDistance(driver.distance)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {driver.speed} mph
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(driver.lastSeen, 'HH:mm')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusBadge(driver.status)}>
                      {driver.status}
                    </Badge>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => focusOnDriver(driver)}
                        className="h-6 w-6 text-white/70 hover:text-racing-blue"
                        title="Focus on map"
                      >
                        <MapPin className="w-3 h-3" />
                      </Button>
                      
                      {driver.isOnline && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sendMessage(driver.id, driver.username)}
                            className="h-6 w-6 text-white/70 hover:text-racing-green"
                            title="Send message"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                          
                          {driver.status === 'racing' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => challengeRace(driver.id, driver.username)}
                              className="h-6 w-6 text-white/70 hover:text-racing-red"
                              title="Challenge to race"
                            >
                              <UserPlus className="w-3 h-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <p className="text-xs text-gray-400">
          {drivers.filter(d => d.isOnline).length} online • {drivers.length} total within {radiusKm}km
        </p>
      </div>
    </div>
  );
}