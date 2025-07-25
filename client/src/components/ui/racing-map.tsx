import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Navigation, 
  Search,
  MapPin
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FloatingSearch } from '@/components/navigation/floating-search';
import { AlternativeRoutes } from '@/components/navigation/alternative-routes';
import { LocationPermissionModal } from '@/components/location-permission-modal';
import { useNavigation } from '@/hooks/use-navigation';
import { ErrorBoundary } from '@/components/error-boundary';
import toast from 'react-hot-toast';

interface RacingMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onRouteSelect?: (route: any) => void;
  savedRoutes?: any[];
  onNavigationStart?: (start: [number, number], end: [number, number]) => void;
  userLocation?: [number, number] | null;
  userSpeed?: number | null;
  userHeading?: number | null;
  gpsAccuracy?: number | null;
  isGPSActive?: boolean;
}

export function RacingMap({ 
  center = [-74.006, 40.7128], 
  zoom = 13, 
  className = "",
  onRouteSelect,
  savedRoutes = [],
  onNavigationStart,
  userLocation,
  userSpeed,
  userHeading,
  gpsAccuracy,
  isGPSActive
}: RacingMapProps) {
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
  const [isAutoCenter, setIsAutoCenter] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [userSpeed, setUserSpeed] = useState<number>(0);
  const [isGPSLost, setIsGPSLost] = useState(false);
  const [showCenterButton, setShowCenterButton] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);

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
      setUserLocation(location);
      setUserSpeed(speed || 0);
      setUserHeading(heading || 0);
      setIsGPSLost(false);

      // Update car marker position and rotation
      updateCarMarker(location, heading || 0);

      // Auto-center map if navigation is active and auto-center is enabled
      if (isNavigating && isAutoCenter && map.current) {
        const zoom = isDriverView ? 17 : 14;
        const pitch = isDriverView ? 60 : 0;

        map.current.easeTo({
          center: location,
          bearing: heading || 0,
          zoom: zoom,
          pitch: pitch,
          duration: 600,
          essential: true
        });
      }

      // Check for off-route detection
      if (isNavigating && currentRoute && lastUserLocationRef.current) {
        checkOffRoute(location);
      }

      lastUserLocationRef.current = location;
    },
    onRouteAlternatives: (routes) => {
      setShowAlternatives(true);
    }
  });

  // Check GPS permission on mount
  useEffect(() => {
    const checkLocationPermission = async () => {
      if (!navigator.geolocation) {
        setShowLocationModal(true);
        return;
      }

      try {
        // Try to get current position to test permission
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000
          });
        });

        // Cache last known location
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setUserLocation(coords);
        setHasLocationPermission(true);
        setShowLocationModal(false);

        console.log('✅ Location permission already granted');
      } catch (error) {
        console.log('❌ Location permission required');
        setShowLocationModal(true);
      }
    };

    checkLocationPermission();
  }, []);

  // Location permission handler
  const handleLocationPermissionGranted = () => {
    setHasLocationPermission(true);
    setShowLocationModal(false);
    toast.success("Location access enabled!");
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
  const updateCarMarker = async (location: [number, number], heading: number = 0) => {
    if (!map.current || !isMapLoaded) return;

    try {
      if (!userMarkerRef.current) {
        // Create user marker element with pulsing effect
        const markerElement = document.createElement('div');
        markerElement.className = 'user-location-marker';
        markerElement.style.width = '20px';
        markerElement.style.height = '20px';
        markerElement.style.borderRadius = '50%';
        markerElement.style.backgroundColor = '#00D4FF';
        markerElement.style.border = '3px solid white';
        markerElement.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.6)';
        markerElement.style.position = 'relative';
        markerElement.style.zIndex = '1000';

        // Add pulsing animation
        const pulseElement = document.createElement('div');
        pulseElement.style.width = '40px';
        pulseElement.style.height = '40px';
        pulseElement.style.borderRadius = '50%';
        pulseElement.style.backgroundColor = 'rgba(0, 212, 255, 0.3)';
        pulseElement.style.position = 'absolute';
        pulseElement.style.top = '-10px';
        pulseElement.style.left = '-10px';
        pulseElement.style.animation = 'pulse 2s infinite';
        markerElement.appendChild(pulseElement);

        const mapboxgl = await import('mapbox-gl');
        userMarkerRef.current = new mapboxgl.default.Marker({
          element: markerElement,
          anchor: 'center'
        }).setLngLat(location).addTo(map.current);

        console.log('✅ User location marker created at:', location);
      } else {
        // Update existing marker position
        userMarkerRef.current.setLngLat(location);
        console.log('📍 User marker updated to:', location);
      }

      // Update marker rotation based on heading if provided
      if (userMarkerRef.current && heading > 0) {
        const markerElement = userMarkerRef.current.getElement();
        markerElement.style.transform = `rotate(${heading}deg)`;
      }

      // Center map on user location when marker is first created
      if (map.current && userMarkerRef.current) {
        map.current.flyTo({
          center: location,
          zoom: 16,
          duration: 1000
        });
      }
    } catch (error) {
      console.error('Failed to update user marker:', error);
    }
  };

  // Update user marker when location changes
  useEffect(() => {
    if (userLocation && isMapLoaded) {
      updateCarMarker(userLocation, userHeading || 0);
    }
  }, [userLocation, userHeading, isMapLoaded]);

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

  // GPS loss detection
  useEffect(() => {
    if (!isNavigating) return;

    const gpsTimeout = setTimeout(() => {
      if (!userLocation) {
        setIsGPSLost(true);
        toast.error("Searching for GPS signal...", { id: 'gps-lost' });
      }
    }, 10000); // 10 seconds without GPS update

    return () => clearTimeout(gpsTimeout);
  }, [userLocation, isNavigating]);

  // Map style configurations
  const mapStyles = {
    navigation: 'mapbox://styles/mapbox/navigation-day-v1',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12', 
    dark: 'mapbox://styles/mapbox/dark-v11'
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

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
          style: mapStyles[mapStyle],
          center: center,
          zoom: zoom,
          pitch: isNavigating ? 60 : 0, // 3D perspective during navigation
          bearing: 0,
          // Navigation-friendly settings
          doubleClickZoom: false,
          dragRotate: true
        });

        map.current.on('load', () => {
          setIsMapLoaded(true);
          setupMapLayers();
          setupMapControls();
        });

        // Add pan detection for manual navigation override
        map.current.on('dragstart', handleMapPan);
        map.current.on('zoomstart', handleMapPan);

        // Route drawing and navigation functionality
        map.current.on('click', (e: any) => {
          const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

          if (isDrawingRoute) {
            setDrawingRoute((prev: any[]) => [...prev, coords]);
            addRoutePoint(coords);
          } else if (navigationMode) {
            // Navigation mode: set start and end points
            if (!routeStart) {
              setRouteStart(coords);
              addNavigationMarker(coords, 'start');
            } else if (!routeEnd) {
              setRouteEnd(coords);
              addNavigationMarker(coords, 'end');
              // Auto-calculate route when both points are set
              calculateNavigationRoute(routeStart, coords);
            }
          }
        });


      } catch (error) {
        console.error('Failed to initialize racing map:', error);
        toast.error("Map failed to load. Please refresh the page or check your connection.");
        // Show fallback UI instead of crashing
        setIsMapLoaded(false);
      }
    };

    // Add a longer timeout to ensure DOM is ready
    const timeoutId = setTimeout(initMap, 200);

    return () => {
      clearTimeout(timeoutId);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const setupMapLayers = () => {
    if (!map.current) return;

    // Add traffic layer
    map.current.addSource('traffic', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-traffic-v1'
    });

    map.current.addLayer({
      id: 'traffic-congestion',
      type: 'line',
      source: 'traffic',
      'source-layer': 'traffic',
      layout: {
        'visibility': showTraffic ? 'visible' : 'none'
      },
      paint: {
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 1.5,
          18, 4
        ],
        'line-color': [
          'match', 
          ['get', 'congestion'],
          'low', '#00ff88',        // Neon green
          'moderate', '#ffcc00',   // Bright yellow
          'heavy', '#ff6600',      // Bright orange
          'severe', '#ff0033',     // Bright red
          '#333333'                // Dark gray
        ],
        'line-opacity': 0.7,
        'line-blur': 1
      }
    });

    // Add population density overlay (choropleth style)
    map.current.addSource('population-density', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: generateDensityData() // Simulated density data
      }
    });

    map.current.addLayer({
      id: 'population-density',
      type: 'fill',
      source: 'population-density',
      layout: {
        'visibility': showDensity ? 'visible' : 'none'
      },
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 'rgba(0, 255, 0, 0.1)',      // Low density - green
          50, 'rgba(255, 255, 0, 0.2)',   // Medium density - yellow
          100, 'rgba(255, 0, 0, 0.3)'     // High density - red
        ],
        'fill-opacity': 0.6
      }
    });

    // Add route drawing source
    map.current.addSource('current-route', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.current.addLayer({
      id: 'current-route',
      type: 'line',
      source: 'current-route',
      paint: {
        'line-color': '#00ff41',
        'line-width': 6,
        'line-opacity': 0.9
      }
    });

    // Add saved routes
    savedRoutes.forEach((route, index) => {
      addSavedRoute(route, index);
    });
  };

  const setupMapControls = async () => {
    if (!map.current) return;

    const mapboxgl = await import('mapbox-gl');

    // Add navigation controls on left side
    map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-left');

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.default.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );
  };

  const generateDensityData = () => {
    // Generate simulated population density polygons
    const features = [];
    const bounds = [
      [-74.1, 40.6], // SW
      [-73.9, 40.8]  // NE  
    ];

    for (let i = 0; i < 20; i++) {
      const lng1 = bounds[0][0] + Math.random() * (bounds[1][0] - bounds[0][0]);
      const lat1 = bounds[0][1] + Math.random() * (bounds[1][1] - bounds[0][1]);
      const lng2 = lng1 + 0.02;
      const lat2 = lat1 + 0.02;

      features.push({
        type: 'Feature',
        properties: {
          density: Math.random() * 100
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2],
            [lng1, lat1]
          ]]
        }
      });
    }

    return features;
  };

  const addRoutePoint = (coords: [number, number]) => {
    if (!map.current) return;

    const routeData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: drawingRoute.concat([coords])
        }
      }]
    };

    map.current.getSource('current-route').setData(routeData);
  };

  const addSavedRoute = (route: any, index: number) => {
    if (!map.current) return;

    map.current.addSource(`saved-route-${index}`, {
      type: 'geojson',
      data: route.data
    });

    // Glow effect with multiple layers
    map.current.addLayer({
      id: `saved-route-glow-${index}`,
      type: 'line',
      source: `saved-route-${index}`,
      paint: {
        'line-color': route.color || '#ff6b35',
        'line-width': 12,
        'line-opacity': 0.3,
        'line-blur': 3
      }
    });

    map.current.addLayer({
      id: `saved-route-${index}`,
      type: 'line',
      source: `saved-route-${index}`,
      paint: {
        'line-color': route.color || '#ff6b35',
        'line-width': 4,
        'line-opacity': 1
      }
    });
  };

  const toggleMapStyle = (newStyle: 'navigation' | 'satellite' | 'dark') => {
    if (!map.current) return;
    setMapStyle(newStyle);
    map.current.setStyle(mapStyles[newStyle]);

    // Restore layers after style change
    map.current.once('styledata', () => {
      setupMapLayers();
    });
  };

  const toggleTraffic = () => {
    if (!map.current) return;
    const newVisibility = !showTraffic;
    setShowTraffic(newVisibility);
    map.current.setLayoutProperty(
      'traffic-congestion', 
      'visibility', 
      newVisibility ? 'visible' : 'none'
    );
  };

  const toggleDensity = () => {
    if (!map.current) return;
    const newVisibility = !showDensity;
    setShowDensity(newVisibility);
    map.current.setLayoutProperty(
      'population-density', 
      'visibility', 
      newVisibility ? 'visible' : 'none'
    );
  };

  const zoomToOverview = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: center,
      zoom: 10,
      pitch: 0,
      bearing: 0
    });
  };

  const finishRoute = () => {
    if (drawingRoute.length < 2) return;

    const newRoute = {
      name: `Route ${Date.now()}`,
      color: '#ff6b35',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { name: `Route ${Date.now()}` },
          geometry: {
            type: 'LineString',
            coordinates: drawingRoute
          }
        }]
      }
    };

    onRouteSelect?.(newRoute);
    setIsDrawingRoute(false);
    setDrawingRoute([]);

    // Clear current route display
    map.current?.getSource('current-route').setData({
      type: 'FeatureCollection',
      features: []
    });
  };

  const addNavigationMarker = async (coords: [number, number], type: 'start' | 'end') => {
    if (!map.current) return;

    const mapboxgl = await import('mapbox-gl');

    // Remove existing marker if any
    const markerId = `navigation-${type}`;
    const existingMarker = (map.current as any)[markerId];
    if (existingMarker) {
      existingMarker.remove();
    }

    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'navigation-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

    if (type === 'start') {
      el.style.backgroundColor = '#00ff88';
      el.innerHTML = '<div style="color: black; font-weight: bold; text-align: center; line-height: 24px;">A</div>';
    } else {
      el.style.backgroundColor = '#ff0033';
      el.innerHTML = '<div style="color: white; font-weight: bold; text-align: center; line-height: 24px;">B</div>';
    }

    const marker = new mapboxgl.default.Marker(el)
      .setLngLat(coords)
      .addTo(map.current);

    // Store marker reference
    (map.current as any)[markerId] = marker;
  };

  const calculateNavigationRoute = async (start: [number, number], end: [number, number]) => {
    if (!map.current || !MAPBOX_TOKEN) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start.join(',')};${end.join(',')}?` +
        `geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}&overview=full&annotations=distance,duration,speed`
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Route data processed

        // Add route to map
        if (map.current.getSource('navigation-route')) {
          (map.current.getSource('navigation-route') as any).setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          });
        } else {
          map.current.addSource('navigation-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          // Add glow effect layer
          map.current.addLayer({
            id: 'navigation-route-glow',
            type: 'line',
            source: 'navigation-route',
            paint: {
              'line-color': '#00ff88',
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
              'line-color': '#00ff88',
              'line-width': 4,
              'line-opacity': 1
            }
          });
        }

        // Fit map to route bounds
        const bounds = new (await import('mapbox-gl')).default.LngLatBounds();
        route.geometry.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        map.current.fitBounds(bounds, { padding: 100 });

        // Notify parent component that navigation has started
        if (onNavigationStart) {
          onNavigationStart(start, end);
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error("Unable to calculate navigation route. Please try selecting different points.");
    }
  };

  const handleLocationSelect = (coordinates: [number, number], name: string) => {
    if (!map.current) return;

    // Fly to the selected location
    map.current.flyTo({
      center: coordinates,
      zoom: 15,
      essential: true
    });

    // Add a temporary marker
    addTemporaryMarker(coordinates, name);
  };

  const addTemporaryMarker = async (coords: [number, number], name: string) => {
    if (!map.current) return;

    const mapboxgl = await import('mapbox-gl');

    // Remove existing temporary marker if any
    const existingMarker = (map.current as any).tempMarker;
    if (existingMarker) {
      existingMarker.remove();
    }

    // Create new marker
    const el = document.createElement('div');
    el.className = 'temp-location-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#00ff88';
    el.style.border = '2px solid white';
    el.style.boxShadow = '0 0 10px rgba(0, 255, 136, 0.5)';

    const marker = new mapboxgl.default.Marker(el)
      .setLngLat(coords)
      .addTo(map.current);

    // Store marker reference and auto-remove after 5 seconds
    (map.current as any).tempMarker = marker;
    setTimeout(() => {
      if ((map.current as any).tempMarker === marker) {
        marker.remove();
        delete (map.current as any).tempMarker;
      }
    }, 5000);
  };

  const clearNavigationRoute = () => {
    if (!map.current) return;

    // Remove route layers
    if (map.current.getLayer('navigation-route-main')) {
      map.current.removeLayer('navigation-route-main');
    }
    if (map.current.getLayer('navigation-route-glow')) {
      map.current.removeLayer('navigation-route-glow');
    }
    if (map.current.getSource('navigation-route')) {
      ```text
map.current.removeSource('navigation-route');
    }

    // Remove markers
    ['start', 'end'].forEach(type => {
      const markerId = `navigation-${type}`;
      const marker = (map.current as any)[markerId];
      if (marker) {
        marker.remove();
        delete (map.current as any)[markerId];
      }
    });

    setRouteStart(null);
    setRouteEnd(null);
    // Route cleared
  };

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
            routes={alternativeRoutes}
            isVisible={showAlternatives}
            onClose={() => setShowAlternatives(false)}
            onRouteSelect={(selectedRoute) => {
              startNavigationWithRoute(selectedRoute);
              setShowAlternatives(false);
            }}
            formatDistance={formatDistance}
            formatTime={formatTime}
          />
        )}



      {/* Route Alerts - Only show when map is loaded and navigating */}
      {isMapLoaded && (
        <ErrorBoundary fallback={null}>
          <RouteAlerts
            alerts={sampleAlerts}
            map={map.current}
            isVisible={isNavigating}
          />
        </ErrorBoundary>
      )}

      {/* Floating Search Overlay */}
      <FloatingSearch
        isVisible={showFloatingSearch}
        onClose={() => setShowFloatingSearch(false)}
        onDestinationSelect={async (destination) => {
          // Plan route with alternatives instead of direct navigation
          const routes = await planRouteWithAlternatives(
            userLocation || [-74.006, 40.7128], 
            destination.coordinates,
            { 
              profile: 'driving-traffic', 
              avoidHighways: false, 
              avoidTolls: false,
              avoidFerries: false
            }
          );
          if (routes.length > 0) {
            setShowFloatingSearch(false);
            // AlternativeRoutes component will automatically show due to showAlternatives state
          }
        }}
        onPlaceSearch={searchPlaces}
      />

      {/* Route Planner Modal - For advanced route planning */}
      <RoutePlanner
        isActive={showRoutePlanner}
        onClose={() => setShowRoutePlanner(false)}
        onRouteStart={async (start: [number, number], end: [number, number], options: any) => {
          // Plan route with alternatives to show overview
          const routes = await planRouteWithAlternatives(start, end, options);
          if (routes.length > 0) {
            setShowRoutePlanner(false);
            // AlternativeRoutes component will show due to showAlternatives state
          }
        }}
        onPlaceSearch={searchPlaces}
        currentLocation={userLocation || undefined}
      />

      {/* Quick Navigation Access - Only show when not navigating */}
      {!isNavigating && (
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
      {isNavigating && isGPSLost && (
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
      {isNavigating && showCenterButton && (
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
      {isNavigating && (
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

      {/* Enhanced Location Tracker with Live GPS */}
      <LocationTracker
        isActive={isNavigating}
        onLocationUpdate={(location: [number, number], speed?: number, heading?: number) => {
          setUserLocation(location);
          setUserSpeed(speed || 0);
          setUserHeading(heading || 0);
          setCurrentSpeed(speed || 0);

          // Update car marker position and rotation
          updateCarMarker(location, heading || 0);

          // Auto-center map if navigation is active and auto-center is enabled
          if (isNavigating && isAutoCenter && map.current) {
            const zoom = isDriverView ? 17 : 14;
            const pitch = isDriverView ? 60 : 0;

            map.current.easeTo({
              center: location,
              bearing: heading || 0,
              zoom: zoom,
              pitch: pitch,
              duration: 600,
              essential: true
            });
          }

          // Check for off-route detection
          if (isNavigating && currentRoute && lastUserLocationRef.current) {
            checkOffRoute(location);
          }

          lastUserLocationRef.current = location;
        }}
        onGPSStatusChange={(isLost: boolean) => {
          setIsGPSLost(isLost);
          if (isLost) {
            toast.error("Searching for GPS signal...", { id: 'gps-lost' });
          } else {
            toast.dismiss('gps-lost');
          }
        }}
        className={isNavigating ? "hidden" : ""} // Hide location tracker UI during navigation
      />

      {/* Advanced Speedometer with ETA and Next Instruction */}
      {isNavigating && userLocation && (
        <div className="fixed bottom-4 left-4 z-40 pointer-events-none">
          <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-xl p-4 space-y-3">
            {/* Speed Display */}
            <div className="text-center">
              <div className="text-3xl font-bold text-racing-blue">
                {Math.round(userSpeed * 3.6)}
              </div>
              <div className="text-xs text-white/60">km/h</div>
            </div>

            {/* ETA and Distance */}
            <div className="flex justify-between text-sm">
              <div className="text-center">
                <div className="text-racing-green font-semibold">{eta}</div>
                <div className="text-white/60 text-xs">ETA</div>
              </div>
              <div className="text-center">
                <div className="text-white font-semibold">
                  {remainingDistance > 1000 
                    ? `${(remainingDistance / 1000).toFixed(1)}km` 
                    : `${remainingDistance.toFixed(0)}m`}
                </div>
                <div className="text-white/60 text-xs">distance</div>
              </div>
            </div>

            {/* Next Instruction */}
            {currentStep && (
              <div className="border-t border-white/20 pt-2">
                <div className="text-xs text-white/80 truncate max-w-32">
                  {currentStep.instruction}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Navigation UI Options */}
      {isNavigating && (
        <ErrorBoundary fallback={null}>
          {/* Choose between Waze-style or Professional UI */}
          {useProNavUI ? (
            <ProfessionalNavUI
              isActive={isNavigating}
              currentStep={currentStep || undefined}
              upcomingSteps={remainingSteps.slice(0, 5)}
              eta={eta}
              remainingDistance={remainingDistance}
              remainingTime={remainingTime}
              currentSpeed={currentSpeed}
              speedLimit={speedLimit}
              voiceEnabled={voiceEnabled}
              onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
              onStopNavigation={() => stopNavigation()}
              onRecenter={recenterMap}
            />
          ) : (
            <WazeStyleNavigation
              isActive={isNavigating}
              currentStep={currentStep || undefined}
              eta={eta}
              remainingDistance={remainingDistance}
              remainingTime={remainingTime}
              currentSpeed={currentSpeed}
              speedLimit={speedLimit}
              onStopNavigation={() => stopNavigation()}
            />
          )}

          {/* UI Style Toggle */}
          <div className="absolute top-4 left-4 pointer-events-auto z-50">
            <Button
              onClick={() => setUseProNavUI(!useProNavUI)}
              className="bg-black/80 hover:bg-black/90 border border-white/20 backdrop-blur-md shadow-lg px-3 py-2 rounded-full text-xs text-white/70 hover:text-white"
            >
              {useProNavUI ? 'Waze Style' : 'Pro UI'}
            </Button>
          </div>
        </ErrorBoundary>
      )}

      {/* Navigation Controls - Only show when not navigating */}
      {!isNavigating && (
        <NavigationControls
          isNavigating={isNavigating}
          voiceEnabled={voiceEnabled}
          onStartPlanning={() => setShowRoutePlanner(true)}
          onStopNavigation={() => stopNavigation()}
          onRecenter={recenterMap}
          onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
        />
      )}

      {/* Guidance Simulator */}
      <ErrorBoundary fallback={null}>
        <GuidanceSimulator
          route={activeNavigationRoute}
          map={map.current}
          isActive={showGuidanceSimulator}
          onClose={() => setShowGuidanceSimulator(false)}
        />
      </ErrorBoundary>

      {/* Racing-style UI overlay - Hide during navigation for clean Waze-style view */}
      {isMapLoaded && !isNavigating && (
        <>
          {/* Map controls - vertical stack with proper spacing and overflow handling */}
          <div className="absolute left-4 top-20 flex flex-col gap-4 z-10 max-h-[70vh] overflow-y-auto pl-2 pb-4">
            {/* Map style buttons */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMapStyle('dark')}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${mapStyle === 'dark' ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Dark Mode"
              >
                <Layers className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMapStyle('satellite')}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${mapStyle === 'satellite' ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Satellite View"
              >
                <Satellite className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMapStyle('navigation')}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${mapStyle === 'navigation' ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Navigation View"
              >
                <Navigation className="h-5 w-5" />
              </Button>
            </div>

            {/* Toggle controls */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTraffic}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showTraffic ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Toggle Traffic"
              >
                <Zap className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDensity}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showDensity ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Toggle Density"
              >
                {showDensity ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            </div>

            {/* Quick actions */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomToOverview}
                className="h-12 w-12 hover:bg-racing-blue/20 text-white/70 hover:text-white transition-all duration-200"
                title="Overview"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawingRoute(!isDrawingRoute)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${isDrawingRoute ? 'bg-racing-green/30 text-racing-green' : 'text-white/70 hover:text-white'}`}
                title="Draw Route"
              >
                <Route className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setNavigationMode(!navigationMode);
                  if (navigationMode) {
                    clearNavigationRoute();
                  }
                }}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${navigationMode ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Navigation Mode"
              >
                <MapPin className="h-5 w-5" />
              </Button>
            </div>

            {/* Overlay controls */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOverlays(!showOverlays)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showOverlays ? 'bg-racing-yellow/30 text-racing-yellow' : 'text-white/70 hover:text-white'}`}
                title="Route Overlays"
              >
                <Crosshair className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIRoutes(!showAIRoutes)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showAIRoutes ? 'bg-racing-orange/30 text-racing-orange' : 'text-white/70 hover:text-white'}`}
                title="AI Race Routes"
              >
                <Route className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRouteCreator(!showRouteCreator)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showRouteCreator ? 'bg-racing-green/30 text-racing-green' : 'text-white/70 hover:text-white'}`}
                title="Create Route"
              >
                <Pencil className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showHeatmap ? 'bg-racing-red/30 text-racing-red' : 'text-white/70 hover:text-white'}`}
                title="Activity Heatmap"
              >
                <Activity className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showLeaderboard ? 'bg-racing-yellow/30 text-racing-yellow' : 'text-white/70 hover:text-white'}`}
                title="Route Leaderboard"
              >
                <Trophy className="h-5 w-5" />
              </Button>

            </div>

            {/* Mobile responsive - show fewer buttons on small screens */}
            <div className="sm:hidden bg-black/70 backdrop-blur-sm rounded-lg p-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 hover:bg-racing-blue/20 text-white/70 hover:text-white transition-all duration-200"
                title="More Options"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                </div>
              </Button>
            </div>
          </div>

          {/* Route drawing dialog - centered popup */}
          {isDrawingRoute && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-racing-dark/95 backdrop-blur-md rounded-xl border border-racing-steel/30 p-6 shadow-2xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Route className="h-5 w-5 text-racing-green" />
                    Create Route
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsDrawingRoute(false);
                      setDrawingRoute([]);
                      // Clear current route display
                      if (map.current?.getSource('current-route')) {
                        map.current.getSource('current-route').setData({
                          type: 'FeatureCollection',
                          features: []
                        });
                      }
                    }}
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-racing-steel/20"
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-racing-green">
                    <div className="w-2 h-2 bg-racing-green rounded-full animate-pulse"></div>
                    <span className="text-sm">Click on the map to add route points</span>
                  </div>

                  <div className="bg-racing-steel/20 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Points added:</span>
                      <span className="text-racing-blue font-medium">{drawingRoute.length}</span>
                    </div>
                    {drawingRoute.length >= 2 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-white/70">Ready to save</span>
                        <span className="text-racing-green">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={finishRoute}
                      disabled={drawingRoute.length < 2}
                      className="flex-1 bg-racing-green/20 hover:bg-racing-green/30 text-racing-green border border-racing-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Route
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDrawingRoute([]);
                        // Clear current route display
                        if (map.current?.getSource('current-route')) {
                          map.current.getSource('current-route').setData({
                            type: 'FeatureCollection',
                            features: []
                          });
                        }
                      }}
                      className="bg-racing-steel/20 border-racing-steel/30 text-white/70 hover:text-white hover:bg-racing-steel/30"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation mode instructions */}
          {navigationMode && !routeEnd && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-black/80 backdrop-blur-sm rounded-full px-6 py-2 flex items-center space-x-3">
                <span className="text-xs text-racing-blue">
                  {!routeStart ? 'Click to set start point' : 'Click to set destination'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setNavigationMode(false);
                    clearNavigationRoute();
                  }}
                  className="h-6 w-6 text-white/70 hover:text-white"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          {/* Minimal traffic legend - bottom left corner */}
          {showTraffic && (
            <div className="absolute bottom-24 left-6 z-10">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#00ff88]"></div>
                    <span className="text-[10px] text-white/70">Clear</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#ffcc00]"></div>
                    <span className="text-[10px] text-white/70">Slow</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#ff0033]"></div>
                    <span className="text-[10px] text-white/70">Heavy</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Saved routes - minimal indicator */}
          {savedRoutes.length > 0 && (
            <div className="absolute top-2 right-6 z-10">
              <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-2">
                <Route className="h-3 w-3 text-racing-green" />
                <span className="text-xs text-white/70">{savedRoutes.length} routes</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Route Overlays */}
      <RouteOverlays 
        map={map.current}
        overlays={sampleOverlays}
        showOverlays={showOverlays}
      />

      {/* AI Routes Panel */}
      {showAIRoutes && (
        <AIRoutes 
          map={map.current}
          onRouteSelect={(route) => {
            console.log('Selected route:', route);
          }}
        />
      )}

      {/* Route Creator */}
      <RouteCreator 
        map={map.current}
        isActive={showRouteCreator}
        onClose={() => setShowRouteCreator(false)}
      />

      {/* Simulation Mode */}
      <SimulationMode 
        map={map.current}
        isActive={showSimulation}
        onToggle={() => setShowSimulation(!showSimulation)}
      />

      {/* Route Heatmap */}
      <RouteHeatmap 
        map={map.current}
        isActive={showHeatmap}
      />

      {/* Route Leaderboard */}
      {showLeaderboard && (
        <RouteLeaderboard 
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Enhanced Navigation Components */}

      {/* Alternative Routes Modal */}
      <AlternativeRoutes
        isVisible={showAlternatives}
        routes={alternativeRoutes as any[]}
        origin="Current Location"
        destination="Destination"
        onRouteSelect={(route) => {
          startNavigationWithRoute(route);
        }}
        onClose={() => setShowAlternatives(false)}
        onLeaveNow={() => {
          if (alternativeRoutes.length > 0) {
            startNavigationWithRoute(alternativeRoutes[0]);
          }
        }}
        onLeaveLater={() => {
          setShowAlternatives(false);
          // Could add scheduling functionality here
        }}
        onRouteOptionsChange={async (options) => {
          // Update route options and recalculate routes in real-time
          setRouteOptions(prev => ({
            ...prev,
            avoidTolls: options.avoidTolls,
            avoidFerries: options.avoidFerries,
            avoidHighways: options.avoidHighways
          }));

          // Recalculate routes with new options
          if (userLocation) {
            const routes = await planRouteWithAlternatives(
              userLocation,
              userLocation, // This would be the actual destination
              {
                profile: 'driving-traffic',
                avoidTolls: options.avoidTolls,
                avoidFerries: options.avoidFerries,
                avoidHighways: options.avoidHighways
              }
            );
          }
        }}
      />

      {/* Voice Navigation Control */}
      {isNavigating && (
        <div className="fixed top-4 right-4 z-30">
          <VoiceNavigation
            isEnabled={voiceEnabled}
            currentStep={currentStep || undefined}
            remainingDistance={remainingDistance}
            currentSpeed={currentSpeed}
            onToggle={setVoiceEnabled}
          />
        </div>
      )}

      {/* Lane Guidance Display */}
      {isNavigating && currentStep && (
        <LaneGuidanceDisplay
          laneData={extractLaneGuidance(currentStep) || undefined}
          isVisible={isNavigating}
          upcomingManeuver={currentStep.maneuver}
          distanceToManeuver={remainingDistance}
        />
      )}

      {/* Live Navigation UI Elements */}

      {/* Center Button - appears when user manually pans during navigation */}
      {showCenterButton && (
        <div className="fixed bottom-20 right-4 z-50">
          <Button 
            onClick={handleRecenter}
            className="bg-racing-blue hover:bg-racing-blue/80 text-white rounded-full p-3 shadow-lg"
          >
            <Crosshair className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Driver/Overview Mode Toggle */}
      {isNavigating && (
        <div className="fixed top-20 left-4 z-40">
          <Button 
            onClick={toggleViewMode}
            className="bg-black/80 backdrop-blur-md hover:bg-black/70 text-white border border-racing-blue/50"
          >
            {isDriverView ? 'Overview' : 'Driver'}
          </Button>
        </div>
      )}

      {/* GPS Status Indicator */}
      {isGPSLost && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin">
              <Navigation className="h-4 w-4" />
            </div>
            <span>Searching for GPS...</span>
          </div>
        </div>
      )}

      {/* Live Turn Instructions - Waze Style */}
      {isNavigating && currentStep && userLocation && (
        <div className="fixed top-16 left-4 right-4 z-40">
          <div className="bg-black/90 backdrop-blur-md border border-racing-blue/50 rounded-xl p-4 shadow-xl">
            {/* Distance and Main Instruction */}
            <div className="flex items-center space-x-4 mb-3">
              <div className="text-racing-blue text-3xl font-bold">
                {Math.round(remainingDistance * 1000)}m
              </div>
              <div className="flex-1">
                <div className="text-white text-lg font-medium">
                  {currentStep.instruction}
                </div>
                <div className="text-racing-green text-sm">
                  on {currentStep.name}
                </div>
              </div>
              <div className="w-16 h-16 bg-racing-blue/20 rounded-lg flex items-center justify-center">
                <Navigation className="h-8 w-8 text-racing-blue" />
              </div>
            </div>

            {/* Speed and ETA Information */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-4">
                <div className="text-white">
                  <span className="text-racing-green">{Math.round(userSpeed * 3.6)}</span> km/h
                </div>
                {speedLimit && (
                  <div className="text-white">
                    Speed limit: <span className="text-racing-blue">{speedLimit}</span> km/h
                  </div>
                )}
              </div>
              <div className="text-white">
                ETA: <span className="text-racing-green">{eta}</span>
              </div>
            </div>

            {/* Next Steps Preview */}
            {remainingSteps && remainingSteps.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-gray-400 text-xs mb-2">Next 2 steps</div>
                {remainingSteps.slice(1, 3).map((step, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-300 mb-1">
                    <Navigation className="h-3 w-3" />
                    <span>{step.instruction}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Speedometer - Bottom Left */}
      {isNavigating && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className="bg-black/90 backdrop-blur-md border border-racing-blue/50 rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-xl">
            <div className="text-racing-blue text-xl font-bold">
              {Math.round(userSpeed * 3.6)}
            </div>
            <div className="text-white text-xs">km/h</div>
          </div>
        </div>
      )}

      {/* Route Progress Bar - Bottom */}
      {isNavigating && currentRoute && (
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="bg-black/90 backdrop-blur-md border-t border-racing-blue/50 p-4">
            <div className="flex justify-between items-center text-white text-sm mb-2">
              <div>
                <span className="text-racing-green font-bold">{remainingTime}</span> remaining
              </div>
              <div>
                <span className="text-racing-blue font-bold">{(remainingDistance).toFixed(1)}</span> km
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-racing-green h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${100 - (remainingDistance / (currentRoute.distance / 1000)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Offline Routes Manager */}
      <OfflineRoutes
        isVisible={false} // Will be controlled by a future toggle
        onClose={() => {}}
      />

    </div>
    </ErrorBoundary>
  );
}