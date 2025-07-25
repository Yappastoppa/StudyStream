import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, Search, MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FloatingSearch } from '@/components/navigation/floating-search';
import { AlternativeRoutes } from '@/components/navigation/alternative-routes';
import { LocationPermissionModal } from '@/components/location-permission-modal';
import { useNavigation } from '@/hooks/use-navigation';
import { ErrorBoundary } from '@/components/error-boundary';
import toast from 'react-hot-toast';

interface CleanRacingMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function CleanRacingMap({ 
  center = [-74.006, 40.7128], 
  zoom = 13, 
  className = ""
}: CleanRacingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const lastUserLocationRef = useRef<[number, number] | null>(null);
  const manualPanTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Core app state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(true);
  
  // Live Navigation State
  const [isDriverView, setIsDriverView] = useState(true);
  const [isAutoCenter, setIsAutoCenter] = useState(false); // Start with auto-center OFF to prevent loops
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [userSpeed, setUserSpeed] = useState<number>(0);
  const [isGPSLost, setIsGPSLost] = useState(false);
  const [showCenterButton, setShowCenterButton] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [lastCenterTime, setLastCenterTime] = useState(0);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  
  // UI state
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // Enhanced navigation hook with live GPS tracking
  const {
    isNavigating,
    currentRoute,
    alternativeRoutes,
    currentStep,
    remainingSteps,
    remainingDistance,
    remainingTime,
    eta,
    voiceEnabled,
    setVoiceEnabled,
    showAlternatives,
    setShowAlternatives,
    routeOptions,
    setRouteOptions,
    startNavigation,
    startNavigationWithRoute,
    planRouteWithAlternatives,
    stopNavigation,
    searchPlaces,
    recenterMap
  } = useNavigation({
    mapboxToken: MAPBOX_TOKEN,
    map: map.current,
    onLocationUpdate: (location: [number, number], speed?: number, heading?: number) => {
      console.log('📍 GPS Update:', location, 'Speed:', speed, 'Heading:', heading);
      
      setUserLocation(location);
      setUserSpeed(speed || 0);
      setUserHeading(heading || 0);
      setIsGPSLost(false);
      
      // Update car marker position and rotation
      updateCarMarker(location, heading || 0);
      
      // Only auto-center if user explicitly enabled following AND enough time has passed
      const now = Date.now();
      const timeSinceLastCenter = now - lastCenterTime;
      const MIN_CENTER_INTERVAL = 3000; // 3 seconds minimum between auto-centers
      
      if (isFollowingUser && map.current && timeSinceLastCenter > MIN_CENTER_INTERVAL) {
        console.log('🎯 Auto-centering on user location');
        const zoom = isDriverView ? 17 : 14;
        const pitch = isDriverView ? 60 : 0;
        
        map.current.flyTo({
          center: location,
          bearing: heading || 0,
          zoom: zoom,
          pitch: pitch,
          speed: 0.5, // Slower movement
          curve: 1,
          essential: true
        });
        
        setLastCenterTime(now);
      }
      
      // Check for off-route detection
      if (isNavigating && currentRoute && lastUserLocationRef.current) {
        checkOffRoute(location);
      }
      
      lastUserLocationRef.current = location;
    },
    onRouteAlternatives: (routes) => {
      setShowAlternatives(true);
    },

  });

  // Don't auto-check location on mount - wait for user action to prevent loops
  useEffect(() => {
    // Only check if user explicitly wants to use location features
    console.log('🔍 Component mounted, waiting for user to request location');
  }, []);

  // Location permission handler
  const handleLocationPermissionGranted = () => {
    setHasLocationPermission(true);
    setShowLocationModal(false);
    toast.success("Location access enabled!");
  };

  // Manual center button - user controlled
  const handleCenterOnUser = () => {
    if (userLocation && map.current) {
      console.log('🎯 User manually centered on location');
      setIsFollowingUser(true); // Enable following mode
      
      map.current.flyTo({
        center: userLocation,
        bearing: userHeading,
        zoom: isDriverView ? 17 : 14,
        pitch: isDriverView ? 60 : 0,
        speed: 1.2,
        essential: true
      });
      
      setLastCenterTime(Date.now());
      setShowCenterButton(false);
    }
  };

  // Off-route detection function
  const checkOffRoute = (userLocation: [number, number]) => {
    if (!currentRoute || !currentRoute.geometry?.coordinates) return;
    
    const routeCoords = currentRoute.geometry.coordinates;
    let minDistance = Infinity;
    
    // Calculate distance to route line
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const distance = distanceToLineSegment(userLocation, routeCoords[i], routeCoords[i + 1]);
      minDistance = Math.min(minDistance, distance);
    }
    
    // If user is more than 100m from route, trigger rerouting
    if (minDistance > 0.1) { // 0.1 km = 100m
      handleOffRoute();
    }
  };

  // Handle off-route situation
  const handleOffRoute = async () => {
    if (isRerouting || !userLocation) return;
    
    setIsRerouting(true);
    toast.loading("You're off route. Rerouting...", { id: 'rerouting' });
    
    try {
      // Get destination from current route
      if (currentRoute && currentRoute.geometry?.coordinates?.length > 0) {
        const destination = currentRoute.geometry.coordinates[currentRoute.geometry.coordinates.length - 1];
        await planRouteWithAlternatives(userLocation, destination as [number, number], routeOptions);
        toast.success("New route calculated", { id: 'rerouting' });
      }
    } catch (error) {
      toast.error("Failed to recalculate route", { id: 'rerouting' });
    } finally {
      setIsRerouting(false);
    }
  };

  // Distance calculation helper
  const distanceToLineSegment = (point: [number, number], lineStart: [number, number], lineEnd: [number, number]) => {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy) * 111; // Convert to km approximately
  };

  // Toggle between driver and overview modes
  const toggleViewMode = async () => {
    const newMode = !isDriverView;
    setIsDriverView(newMode);
    
    if (!map.current || !isNavigating) return;
    
    if (newMode) {
      // Switch to driver view - close follow with 3D perspective
      if (userLocation) {
        map.current.flyTo({
          center: userLocation,
          zoom: 17,
          pitch: 60,
          bearing: userHeading,
          speed: 1.2,
          essential: true
        });
      }
    } else {
      // Switch to overview - show full route
      if (currentRoute && currentRoute.geometry?.coordinates) {
        const bounds = new (await import('mapbox-gl')).default.LngLatBounds();
        currentRoute.geometry.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        
        map.current.fitBounds(bounds, { 
          padding: 50, 
          duration: 600,
          pitch: 0 
        });
      }
    }
  };

  // Handle manual pan detection
  const handleMapPan = () => {
    if (!isNavigating) return;
    
    setIsAutoCenter(false);
    setShowCenterButton(true);
    
    // Auto-hide center button after 10 seconds
    if (manualPanTimeoutRef.current) {
      clearTimeout(manualPanTimeoutRef.current);
    }
    
    manualPanTimeoutRef.current = setTimeout(() => {
      setShowCenterButton(false);
    }, 10000);
  };

  // Return to auto-center mode
  const handleRecenter = () => {
    setIsAutoCenter(true);
    setShowCenterButton(false);
    
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: isDriverView ? 17 : 14,
        pitch: isDriverView ? 60 : 0,
        bearing: userHeading,
        speed: 1.0,
        essential: true
      });
    }
  };

  // Update car marker position and rotation
  const updateCarMarker = async (location: [number, number], heading: number) => {
    if (!map.current) return;

    try {
      if (!userMarkerRef.current) {
        // Create car marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'car-marker';
        markerElement.style.width = '36px';
        markerElement.style.height = '36px';
        markerElement.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(`
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g filter="url(#filter0_d_1_1)">
              <path d="M18 4L22 10H30L28 26H24L22 30H14L12 26H8L6 10H14L18 4Z" fill="#00D4FF" stroke="#0099CC" stroke-width="1"/>
              <circle cx="12" cy="22" r="2" fill="#333"/>
              <circle cx="24" cy="22" r="2" fill="#333"/>
              <rect x="16" y="12" width="4" height="6" rx="1" fill="#004466"/>
            </g>
            <defs>
              <filter id="filter0_d_1_1" x="0" y="0" width="36" height="36" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                <feOffset dy="2"/>
                <feGaussianBlur stdDeviation="3"/>
                <feComposite in2="hardAlpha" operator="out"/>
                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0.831373 0 0 0 0 1 0 0 0 0.3 0"/>
                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_1"/>
                <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_1" result="shape"/>
              </filter>
            </defs>
          </svg>
        `)}")`;
        markerElement.style.backgroundSize = 'contain';
        markerElement.style.backgroundRepeat = 'no-repeat';
        markerElement.style.backgroundPosition = 'center';

        const mapboxgl = await import('mapbox-gl');
        userMarkerRef.current = new mapboxgl.default.Marker({
          element: markerElement,
          anchor: 'center'
        }).setLngLat(location).addTo(map.current);
      } else {
        // Update existing marker position
        userMarkerRef.current.setLngLat(location);
      }

      // Update marker rotation based on heading
      if (userMarkerRef.current && heading > 0) {
        const markerElement = userMarkerRef.current.getElement();
        markerElement.style.transform = `rotate(${heading}deg)`;
      }
    } catch (error) {
      console.error('Failed to update car marker:', error);
    }
  };

  // Format distance with proper units
  const formatDistance = (distanceInMeters: number): string => {
    if (!distanceInMeters || isNaN(distanceInMeters) || distanceInMeters < 0) {
      return '0 m';
    }
    
    if (distanceInMeters >= 1000) {
      const km = distanceInMeters / 1000;
      return `${km.toFixed(1)} km`;
    } else {
      return `${Math.round(distanceInMeters)} m`;
    }
  };

  // Format time in a readable way
  const formatTime = (timeInSeconds: number): string => {
    if (!timeInSeconds || isNaN(timeInSeconds) || timeInSeconds < 0) {
      return '0 min';
    }
    
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes} min`;
    }
  };

  // Add route polyline to map - critical for showing navigation path
  const addRoutePolylineToMap = async (route: any) => {
    if (!map.current || !route?.geometry?.coordinates) return;

    try {
      // Remove existing navigation route if any
      if (map.current.getLayer('navigation-route-glow')) {
        map.current.removeLayer('navigation-route-glow');
      }
      if (map.current.getLayer('navigation-route-main')) {
        map.current.removeLayer('navigation-route-main');
      }
      if (map.current.getSource('navigation-route')) {
        map.current.removeSource('navigation-route');
      }

      // Add route source
      map.current.addSource('navigation-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.geometry
        }
      });

      // Add glow effect layer for route
      map.current.addLayer({
        id: 'navigation-route-glow',
        type: 'line',
        source: 'navigation-route',
        paint: {
          'line-color': '#00D4FF', // Racing blue glow
          'line-width': 12,
          'line-opacity': 0.4,
          'line-blur': 3
        }
      });

      // Add main route layer
      map.current.addLayer({
        id: 'navigation-route-main',
        type: 'line',
        source: 'navigation-route',
        paint: {
          'line-color': '#00D4FF', // Racing blue
          'line-width': 6,
          'line-opacity': 1
        }
      });

      console.log('✅ Route polyline added to map');
    } catch (error) {
      console.error('❌ Failed to add route polyline:', error);
    }
  };

  // Map initialization
  useEffect(() => {
    if (map.current || !mapContainer.current || !hasLocationPermission) return;
    
    const initMap = async () => {
      try {
        if (!MAPBOX_TOKEN) {
          console.error('Mapbox token is missing');
          return;
        }

        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = MAPBOX_TOKEN;
        
        map.current = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: userLocation || center,
          zoom: zoom,
          pitch: 0,
          bearing: 0
        });
        
        map.current.on('load', () => {
          setIsMapLoaded(true);
          // Add navigation controls
          map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-left');
        });

        // Add pan detection for manual navigation override
        map.current.on('dragstart', handleMapPan);
        map.current.on('zoomstart', handleMapPan);
        
      } catch (error) {
        console.error('Failed to initialize map:', error);
        toast.error("Map failed to load. Please refresh the page.");
        setIsMapLoaded(false);
      }
    };
    
    initMap();
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [hasLocationPermission, userLocation]);

  // Remove the duplicate GPS tracking - it's handled by the navigation hook
  // This was causing the infinite loop by having two GPS watchers running!

  return (
    <ErrorBoundary>
      <div className={`relative w-screen h-screen ${className}`}>
        {/* Location Permission Modal - Block everything until permission granted */}
        <LocationPermissionModal
          isOpen={showLocationModal && !hasLocationPermission}
          onPermissionGranted={handleLocationPermissionGranted}
        />

        {/* Main map container - Hidden until location permission granted */}
        <div 
          ref={mapContainer} 
          className={`w-full h-full absolute inset-0 ${!hasLocationPermission ? 'filter blur-md pointer-events-none' : ''}`}
          style={{ minHeight: '100vh' }}
        >
          {/* Loading state - only show after location permission granted */}
          {!isMapLoaded && hasLocationPermission && (
            <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-racing-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-white text-lg">Loading GhostRacer Navigation...</div>
                <div className="text-white/60 text-sm">Initializing live GPS tracking</div>
              </div>
            </div>
          )}
        </div>

        {/* Block all functionality until location permission */}
        {!hasLocationPermission && (
          <div className="absolute inset-0 bg-black/50 z-40 pointer-events-none" />
        )}

        {/* Alternative Routes Panel - Clean route selection */}
        {hasLocationPermission && showAlternatives && alternativeRoutes.length > 0 && (
          <AlternativeRoutes
            routes={alternativeRoutes.map(route => ({
              ...route,
              id: route.id || `route-${Date.now()}-${Math.random()}`,
              weight_name: 'routability',
              weight: route.duration || 0
            }))}
            isVisible={showAlternatives}
            origin="Current Location"
            destination="Selected Destination"
            onClose={() => setShowAlternatives(false)}
            onRouteSelect={(selectedRoute) => {
              // Add route polyline immediately when route is selected
              addRoutePolylineToMap(selectedRoute);
              startNavigationWithRoute(selectedRoute);
              setShowAlternatives(false);
            }}
            onLeaveNow={() => {
              if (alternativeRoutes.length > 0) {
                // Add route polyline and start navigation
                addRoutePolylineToMap(alternativeRoutes[0]);
                startNavigationWithRoute(alternativeRoutes[0]);
                setShowAlternatives(false);
              }
            }}
            onLeaveLater={() => {
              setShowAlternatives(false);
            }}
          />
        )}

        {/* Quick Navigation Access - Only show when not navigating and location allowed */}
        {hasLocationPermission && !isNavigating && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
            <Button
              onClick={() => setShowFloatingSearch(true)}
              className="bg-black/90 hover:bg-black border border-white/20 backdrop-blur-md shadow-lg px-6 py-3 rounded-full flex items-center space-x-2"
            >
              <Search className="h-5 w-5 text-racing-blue" />
              <span className="text-white">Where to?</span>
            </Button>
          </div>
        )}

        {/* GPS Lost Banner - Show when navigation is active but GPS is lost */}
        {hasLocationPermission && isNavigating && isGPSLost && (
          <div className="fixed top-16 left-0 right-0 z-50 pointer-events-none">
            <div className="bg-red-600 text-white p-3 text-center animate-pulse">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Searching for GPS...</span>
              </div>
            </div>
          </div>
        )}

        {/* Center Button - Show when user manually pans during navigation */}
        {hasLocationPermission && isNavigating && showCenterButton && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
            <Button
              onClick={handleRecenter}
              className="bg-black/90 hover:bg-black border border-white/20 backdrop-blur-md shadow-lg px-6 py-2 rounded-full"
            >
              <span className="text-white font-semibold">CENTER</span>
            </Button>
          </div>
        )}

        {/* Driver/Overview Mode Toggle - Show during navigation */}
        {hasLocationPermission && isNavigating && (
          <div className="fixed top-20 left-4 z-40 pointer-events-auto">
            <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-2">
              <div className="flex space-x-2">
                <Button
                  onClick={toggleViewMode}
                  variant={isDriverView ? "default" : "outline"}
                  size="sm"
                  className={`${isDriverView ? 'bg-racing-blue text-white' : 'text-white border-white/20'} hover:bg-racing-blue/80`}
                >
                  Driver
                </Button>
                <Button
                  onClick={toggleViewMode}
                  variant={!isDriverView ? "default" : "outline"}
                  size="sm"
                  className={`${!isDriverView ? 'bg-racing-blue text-white' : 'text-white border-white/20'} hover:bg-racing-blue/80`}
                >
                  Overview
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Clean Navigation System with proper distance formatting */}
        {hasLocationPermission && isNavigating && currentStep && (
          <div className="fixed top-4 left-4 right-4 z-40 pointer-events-none">
            <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-xl p-4 space-y-3 max-w-md mx-auto">
              {/* Main instruction */}
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-racing-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Navigation className="h-6 w-6 text-racing-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-lg truncate">
                    {currentStep.instruction || 'Continue straight'}
                  </div>
                  <div className="text-racing-blue text-sm">
                    {formatDistance(currentStep.distance || 0)}
                  </div>
                </div>
              </div>
              
              {/* Route summary */}
              <div className="flex justify-between items-center text-sm border-t border-white/20 pt-3">
                <div className="text-center">
                  <div className="text-racing-green font-semibold">{formatTime(remainingTime)}</div>
                  <div className="text-white/60 text-xs">ETA</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">{formatDistance(remainingDistance)}</div>
                  <div className="text-white/60 text-xs">remaining</div>
                </div>
                <div className="text-center">
                  <div className="text-racing-blue font-semibold">{Math.round(userSpeed * 3.6)}</div>
                  <div className="text-white/60 text-xs">km/h</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Search Component */}
        {hasLocationPermission && (
          <FloatingSearch
            isVisible={showFloatingSearch}
            onClose={() => setShowFloatingSearch(false)}
            onDestinationSelect={async (destination) => {
              const routes = await planRouteWithAlternatives(
                userLocation || [-74.006, 40.7128], 
                destination.coordinates,
                { profile: 'driving-traffic', avoidHighways: false, avoidTolls: false, avoidFerries: false }
              );
              if (routes.length > 0) {
                setShowFloatingSearch(false);
              }
            }}
            onPlaceSearch={searchPlaces}
          />
        )}

        {/* Center Button - manual user control */}
        {hasLocationPermission && userLocation && (
          <button
            onClick={handleCenterOnUser}
            className="absolute bottom-24 right-4 bg-racing-blue hover:bg-racing-blue/80 text-white p-3 rounded-full shadow-lg z-20 transition-all"
          >
            <Crosshair className="h-6 w-6" />
          </button>
        )}

        {/* Follow User Toggle */}
        {hasLocationPermission && userLocation && (
          <button
            onClick={() => setIsFollowingUser(!isFollowingUser)}
            className={`absolute bottom-36 right-4 p-3 rounded-full shadow-lg z-20 transition-all ${
              isFollowingUser 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title={isFollowingUser ? 'Following enabled' : 'Click to follow location'}
          >
            <Flag className="h-6 w-6" />
          </button>
        )}

        {/* Location Permission Modal */}
        <LocationPermissionModal
          isOpen={showLocationModal}
          onPermissionGranted={handleLocationPermissionGranted}
        />
      </div>
    </ErrorBoundary>
  );
}