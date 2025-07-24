import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RacingMap } from "@/components/ui/racing-map";
import { SpeedHud } from "@/components/racing/speed-hud";
import { ActionButtons } from "@/components/racing/action-buttons";
import { SideMenu } from "@/components/racing/side-menu";
import { ReportModal } from "@/components/racing/report-modal";
import { EventModal } from "@/components/racing/event-modal";
import { UserListModal } from "@/components/racing/user-list-modal";
import { CountdownOverlay } from "@/components/racing/countdown-overlay";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useToast } from "@/hooks/use-toast";
import { Flag, Satellite, Menu, Signal } from "lucide-react";
import { calculateDistance, formatDistance } from "@/lib/utils";
import type { User } from "@shared/schema";

interface MapPageProps {
  inviteCode: string;
  onLogout: () => void;
}

interface NearbyUser {
  id: number;
  username: string;
  lat: number;
  lng: number;
  distance: number;
  isGhostMode?: boolean;
}

export default function MapPage({ inviteCode, onLogout }: MapPageProps) {
  const { toast } = useToast();
  
  // UI State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [userStatus, setUserStatus] = useState("live");
  const [shareRadius, setShareRadius] = useState("2");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [countdownEvent, setCountdownEvent] = useState<any>(null);
  
  // Data State
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [distanceTraveled, setDistanceTraveled] = useState(0);
  const [lastPosition, setLastPosition] = useState<{lat: number, lng: number} | null>(null);

  // Geolocation
  const { 
    lat, 
    lng, 
    speed, 
    error: locationError,
    requestPermission 
  } = useGeolocation({
    enableHighAccuracy: true,
    watchPosition: true,
    onLocationUpdate: (position) => {
      // Calculate distance traveled
      if (lastPosition) {
        const distance = calculateDistance(
          lastPosition.lat, 
          lastPosition.lng, 
          position.coords.latitude, 
          position.coords.longitude
        );
        setDistanceTraveled(prev => prev + distance);
      }
      setLastPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
    }
  });

  // WebSocket
  const { 
    isConnected, 
    user, 
    authenticate, 
    updateLocation, 
    toggleGhostMode, 
    getNearbyUsers,
    createEvent
  } = useWebSocket({
    onUserLocationUpdate: (data) => {
      setNearbyUsers(prev => {
        const updated = prev.filter(u => u.id !== data.userId);
        if (!data.isGhostMode && lat && lng) {
          const distance = calculateDistance(lat, lng, data.lat, data.lng) * 1000; // Convert to meters
          updated.push({
            id: data.userId,
            username: data.username,
            lat: data.lat,
            lng: data.lng,
            distance,
            isGhostMode: data.isGhostMode
          });
        }
        return updated;
      });
    },
    onNewAlert: (data) => {
      setAlerts(prev => [...prev, data.alert]);
      toast({
        title: `${data.alert.type.charAt(0).toUpperCase() + data.alert.type.slice(1)} Alert`,
        description: data.alert.description || `New ${data.alert.type} reported nearby`,
      });
    },
    onEventInvitation: (data) => {
      toast({
        title: "Event Invitation",
        description: `${data.inviterUsername} has invited you to a ${data.event.type}`,
      });
    }
  });

  // Authenticate on mount
  useEffect(() => {
    if (inviteCode) {
      authenticate(inviteCode);
    }
  }, [inviteCode, authenticate]);

  // Update location via WebSocket
  useEffect(() => {
    if (lat && lng && isConnected && user) {
      updateLocation(lat, lng, speed || 0);
    }
  }, [lat, lng, speed, isConnected, user, updateLocation]);

  // Request location permission on mount
  useEffect(() => {
    requestPermission().then(permission => {
      if (permission === 'denied') {
        toast({
          title: "Location Access Required",
          description: "Please enable location access to use GhostRacer.",
          variant: "destructive"
        });
      }
    });
  }, [requestPermission, toast]);

  // Get nearby users periodically
  useEffect(() => {
    if (lat && lng && isConnected) {
      const interval = setInterval(() => {
        getNearbyUsers(lat, lng, parseInt(shareRadius));
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [lat, lng, isConnected, shareRadius, getNearbyUsers]);

  const handleGhostModeToggle = () => {
    const newGhostMode = !isGhostMode;
    setIsGhostMode(newGhostMode);
    toggleGhostMode(newGhostMode);
    
    toast({
      title: newGhostMode ? "Ghost Mode Enabled" : "Ghost Mode Disabled",
      description: newGhostMode 
        ? "You're now hidden from other racers"
        : "You're now visible to other racers"
    });
  };

  const handleReportSubmit = async (type: string, description: string, reportLat: number, reportLng: number) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          lat: reportLat,
          lng: reportLng,
          description,
          createdBy: user?.id
        })
      });

      if (response.ok) {
        toast({
          title: "Alert Reported",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} alert has been shared with nearby racers.`
        });
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      toast({
        title: "Report Failed",
        description: "Unable to submit report. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEventSubmit = (eventData: {
    type: string;
    startTime: Date;
    targetUserId?: number;
  }) => {
    if (!lat || !lng) {
      toast({
        title: "Location Required",
        description: "Current location is needed to create an event.",
        variant: "destructive"
      });
      return;
    }

    createEvent({
      eventType: eventData.type,
      startTime: eventData.startTime,
      lat,
      lng,
      targetUserId: eventData.targetUserId
    });

    toast({
      title: "Event Created",
      description: "Your racing event has been created and invitations sent."
    });
  };

  const handleChallengeUser = (userId: number) => {
    const targetUser = nearbyUsers.find(u => u.id === userId);
    if (targetUser && lat && lng) {
      const startTime = new Date(Date.now() + 30000); // 30 seconds from now
      
      createEvent({
        eventType: "sprint",
        startTime,
        lat,
        lng,
        targetUserId: userId
      });

      toast({
        title: "Challenge Sent",
        description: `Sprint challenge sent to ${targetUser.username}`
      });
    }
  };

  const centerMap = useCallback(() => {
    if (lat && lng) {
      // This would need to be implemented in the Map component
      // For now, we'll just show a toast
      toast({
        title: "Map Centered",
        description: "Centered on your current location"
      });
    }
  }, [lat, lng, toast]);

  const nearbyUsersCount = nearbyUsers.filter(u => !u.isGhostMode).length;

  const mapUserLocations = nearbyUsers.map(user => ({
    id: user.id,
    username: user.username,
    lat: user.lat,
    lng: user.lng,
    isCurrentUser: false,
    isGhostMode: user.isGhostMode
  }));

  // Add current user to map
  if (lat && lng && user) {
    mapUserLocations.push({
      id: user.id,
      username: user.username,
      lat,
      lng,
      isCurrentUser: true,
      isGhostMode: isGhostMode
    });
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-racing-dark">
      {/* Map Container */}
      <RacingMap
        center={lat && lng ? [lng, lat] : undefined}
        zoom={15}
        onMapClick={(lng, lat) => console.log('Map clicked:', lng, lat)}
        userLocations={mapUserLocations}  
        alerts={alerts}
        className="absolute inset-0"
      />

      {/* Top HUD Bar */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="bg-racing-dark/80 backdrop-blur-sm border-b border-racing-steel/30 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* App title and status */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-racing-blue to-racing-red rounded-lg flex items-center justify-center">
                <Flag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide text-white">GhostRacer</h1>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isConnected ? 'bg-racing-green' : 'bg-racing-red'
                    }`} />
                    <span className={isConnected ? 'text-racing-green' : 'text-racing-red'}>
                      {isConnected ? 'LIVE' : 'OFFLINE'}
                    </span>
                  </div>
                  <span className="text-racing-gray">•</span>
                  <span className="text-racing-gray">{nearbyUsersCount} nearby</span>
                </div>
              </div>
            </div>
            
            {/* Connection status and menu */}
            <div className="flex items-center space-x-3">
              <Button
                size="sm"
                variant="ghost"
                className="p-2 hover:bg-racing-steel/50 rounded-lg"
              >
                <Satellite className={`w-4 h-4 ${
                  locationError ? 'text-racing-red' : 'text-racing-blue'
                }`} />
              </Button>
              <Button
                onClick={() => setIsMenuOpen(true)}
                size="sm"
                variant="ghost"
                className="p-2 hover:bg-racing-steel/50 rounded-lg"
              >
                <Menu className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Speed HUD (Bottom Left) */}
      <div className="absolute bottom-24 left-4 z-20">
        <SpeedHud
          currentSpeed={speed ? Math.round(speed * 0.621371) : 0} // Convert km/h to mph
          distanceTraveled={distanceTraveled * 0.621371} // Convert km to miles
        />
      </div>

      {/* Action Buttons (Right Side) */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20">
        <ActionButtons
          isGhostMode={isGhostMode}
          onGhostModeToggle={handleGhostModeToggle}
          onReportAlert={() => setIsReportModalOpen(true)}
          onCreateEvent={() => setIsEventModalOpen(true)}
          onShowUserList={() => setIsUserListModalOpen(true)}
        />
      </div>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <div className="bg-racing-dark/90 backdrop-blur-md border-t border-racing-steel/30 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Status Toggle */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-racing-gray">Status:</span>
                <Select value={userStatus} onValueChange={setUserStatus}>
                  <SelectTrigger className="bg-racing-steel/50 border-racing-gray/30 text-white text-sm h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-racing-dark border-racing-steel/30">
                    <SelectItem value="live" className="text-white hover:bg-racing-steel/30">Live</SelectItem>
                    <SelectItem value="ghost" className="text-white hover:bg-racing-steel/30">Ghost</SelectItem>
                    <SelectItem value="offline" className="text-white hover:bg-racing-steel/30">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Center Action */}
            <Button
              onClick={centerMap}
              className="bg-gradient-to-r from-racing-blue to-racing-red hover:from-racing-blue/80 hover:to-racing-red/80 text-white px-6 py-2 text-sm font-semibold tracking-wide"
            >
              CENTER MAP
            </Button>
            
            {/* Share Radius */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-racing-gray">Range:</span>
              <Select value={shareRadius} onValueChange={setShareRadius}>
                <SelectTrigger className="bg-racing-steel/50 border-racing-gray/30 text-white text-sm h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-racing-dark border-racing-steel/30">
                  <SelectItem value="1" className="text-white hover:bg-racing-steel/30">1km</SelectItem>
                  <SelectItem value="2" className="text-white hover:bg-racing-steel/30">2km</SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-racing-steel/30">5km</SelectItem>
                  <SelectItem value="10" className="text-white hover:bg-racing-steel/30">10km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Side Menu */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        onLeaveSession={onLogout}
      />

      {/* Modals */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        currentLocation={lat && lng ? { lat, lng } : null}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleEventSubmit}
        nearbyUsers={nearbyUsers.filter(u => !u.isGhostMode)}
      />

      <UserListModal
        isOpen={isUserListModalOpen}
        onClose={() => setIsUserListModalOpen(false)}
        nearbyUsers={nearbyUsers}
        onChallengeUser={handleChallengeUser}
      />

      {/* Countdown Overlay */}
      <CountdownOverlay
        isActive={isCountdownActive}
        onComplete={() => {
          setIsCountdownActive(false);
          setCountdownEvent(null);
          toast({
            title: "Race Started!",
            description: "Good luck and race safely!"
          });
        }}
        eventType={countdownEvent?.type || "Sprint Challenge"}
        opponentName="Opponent"
      />

      {/* Location Error Notice */}
      {locationError && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-25">
          <div className="bg-racing-red/20 border border-racing-red rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <Signal className="w-4 h-4 text-racing-red" />
              <span className="text-racing-red text-sm font-medium">Location access required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
