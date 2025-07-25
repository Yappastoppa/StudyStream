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
import { NavigationPanel } from "@/components/racing/navigation-panel";
import { useWebSocket } from "@/hooks/use-websocket";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useToast } from "@/hooks/use-toast";
import { Flag, Satellite, Menu, Signal, Crosshair } from "lucide-react";
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
  console.log("🔥 MAP PAGE COMPONENT LOADED!");
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
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [navigationStart, setNavigationStart] = useState<[number, number] | null>(null);
  const [navigationEnd, setNavigationEnd] = useState<[number, number] | null>(null);
  const [showNavigationPanel, setShowNavigationPanel] = useState(false);

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
      {/* Full Screen Racing Map */}
      <RacingMap
        center={lat && lng ? [lng, lat] : [-74.006, 40.7128]}
        zoom={15}
        className="absolute inset-0 z-0"
        savedRoutes={savedRoutes}
        onRouteSelect={(route) => {
          setSavedRoutes(prev => [...prev, route]);
          toast({
            title: "Route Saved",
            description: `${route.name} has been saved to your routes.`,
          });
        }}
        onNavigationStart={(start, end) => {
          setNavigationStart(start);
          setNavigationEnd(end);
          setShowNavigationPanel(true);
        }}
      />

      {/* Minimal Floating Status Indicator - Top Right */}
      <div className="absolute top-4 right-4 z-30 flex items-center space-x-2">
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full backdrop-blur-sm ${
          isConnected ? 'bg-racing-green/20' : 'bg-racing-red/20'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-racing-green' : 'bg-racing-red'
          }`} />
          <span className={`text-xs font-medium ${
            isConnected ? 'text-racing-green' : 'text-racing-red'
          }`}>
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        <Button
          onClick={() => setIsMenuOpen(true)}
          size="icon"
          variant="ghost"
          className="h-8 w-8 bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full"
        >
          <Menu className="w-4 h-4 text-white" />
        </Button>
      </div>

      {/* Minimal Speed HUD - Bottom Left */}
      <SpeedHud
        currentSpeed={speed || 0}
        distanceTraveled={distanceTraveled}
        className="absolute bottom-4 left-4 z-20"
      />

      {/* Minimal Center Map Button - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <Button
          onClick={centerMap}
          className="bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white px-4 py-2 text-sm font-semibold rounded-full"
        >
          CENTER
        </Button>
      </div>

      {/* Navigation Panel */}
      {showNavigationPanel && (
        <NavigationPanel
          origin={navigationStart}
          destination={navigationEnd}
          onClose={() => {
            setShowNavigationPanel(false);
            setNavigationStart(null);
            setNavigationEnd(null);
          }}
          className="absolute bottom-24 left-6 z-20 max-w-sm"
        />
      )}

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
