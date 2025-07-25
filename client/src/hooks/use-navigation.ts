import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface VoiceInstruction {
  distanceAlongGeometry: number;
  announcement: string;
  ssmlAnnouncement?: string;
}

interface BannerInstruction {
  text: string;
  type: 'primary' | 'secondary' | 'sub';
  modifier?: string;
  degrees?: number;
  components?: Array<{
    text: string;
    type: string;
    lanes?: Lane[];
  }>;
}

interface Lane {
  active: boolean;
  valid: boolean;
  indications: string[];
  valid_indication?: string;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after?: number;
    bearing_before?: number;
  };
  name: string;
  geometry: {
    coordinates: [number, number][];
  };
  voiceInstructions?: VoiceInstruction[];
  bannerInstructions?: BannerInstruction[];
  intersections?: Array<{
    lanes?: Lane[];
  }>;
}

interface NavigationRoute {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
  };
  legs: Array<{
    steps: NavigationStep[];
    distance: number;
    duration: number;
  }>;
  id?: string;
}

interface RouteOptions {
  profile: 'driving' | 'driving-traffic';
  avoidHighways: boolean;
  avoidTolls: boolean;
  avoidFerries: boolean;
}

interface UseNavigationProps {
  mapboxToken: string;
  map?: any;
  onLocationUpdate?: (location: [number, number], speed?: number, heading?: number) => void;
  onRouteAlternatives?: (routes: NavigationRoute[]) => void;
}

export function useNavigation({ mapboxToken, map, onLocationUpdate, onRouteAlternatives }: UseNavigationProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<NavigationRoute[]>([]);
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [remainingSteps, setRemainingSteps] = useState<NavigationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number>(0);
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [eta, setEta] = useState('');
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [routeOptions, setRouteOptions] = useState<RouteOptions>({
    profile: 'driving-traffic',
    avoidHighways: false,
    avoidTolls: false,
    avoidFerries: false
  });

  const watchPositionId = useRef<number | null>(null);
  const routeSource = useRef<string>('navigation-route');
  const routeLayer = useRef<string>('navigation-route-line');

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((point1: [number, number], point2: [number, number]): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1[1] * Math.PI) / 180;
    const φ2 = (point2[1] * Math.PI) / 180;
    const Δφ = ((point2[1] - point1[1]) * Math.PI) / 180;
    const Δλ = ((point2[0] - point1[0]) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // Get route from Mapbox Directions API
  const getRoute = useCallback(async (
    start: [number, number],
    end: [number, number],
    options: RouteOptions = {
      profile: 'driving-traffic',
      avoidHighways: false,
      avoidTolls: false,
      avoidFerries: true
    }
  ): Promise<NavigationRoute | null> => {
    try {
      if (!mapboxToken) {
        console.error('Mapbox token is missing');
        return null;
      }

      const profile = options.profile;
      const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;

      let url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;
      url += '?geometries=geojson&steps=true&voice_instructions=true&banner_instructions=true';

      // Add route options
      const excludeParams = [];
      if (options.avoidHighways) excludeParams.push('motorway');
      if (options.avoidTolls) excludeParams.push('toll');
      if (options.avoidFerries) excludeParams.push('ferry');

      if (excludeParams.length > 0) {
        url += `&exclude=${excludeParams.join(',')}`;
      }

      url += `&access_token=${mapboxToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        return data.routes[0];
      }

      return null;
    } catch (error) {
      console.error('Failed to get route:', error);
      toast.error("Unable to calculate route. Please check your connection and try again.");
      return null;
    }
  }, [mapboxToken]);

  // Search for places using Mapbox Geocoding API
  const searchPlaces = useCallback(async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&types=address,poi`
      );
      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error('Place search failed:', error);
      toast.error("Couldn't find that place. Check your connection or try a different search.");
      return [];
    }
  }, [mapboxToken]);

  // Draw route on map
  const drawRoute = useCallback((route: NavigationRoute) => {
    if (!map) return;

    // Remove existing route
    if (map.getLayer(routeLayer.current)) {
      map.removeLayer(routeLayer.current);
    }
    if (map.getSource(routeSource.current)) {
      map.removeSource(routeSource.current);
    }

    // Add route source
    map.addSource(routeSource.current, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    // Add route layer
    map.addLayer({
      id: routeLayer.current,
      type: 'line',
      source: routeSource.current,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#007AFF',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 6,
          18, 12
        ],
        'line-opacity': 0.9,
        'line-blur': 1
      }
    });

    // Add route outline for better visibility
    map.addLayer({
      id: `${routeLayer.current}-outline`,
      type: 'line',
      source: routeSource.current,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 8,
          18, 16
        ],
        'line-opacity': 0.4,
        'line-blur': 2
      }
    }, routeLayer.current);
  }, [map]);

  // Start navigation
  const startNavigation = useCallback(async (
    start: [number, number],
    end: [number, number],
    options?: RouteOptions
  ) => {
    const route = await getRoute(start, end, options);
    if (!route) return false;

    setCurrentRoute(route);
    setIsNavigating(true);
    setCurrentStepIndex(0);

    // Set up steps
    const allSteps = route.legs.flatMap(leg => leg.steps);
    setCurrentStep(allSteps[0] || null);
    setRemainingSteps(allSteps.slice(1));

    // Calculate ETA
    const arrivalTime = new Date(Date.now() + route.duration * 1000);
    setEta(arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    // Draw route on map
    drawRoute(route);

    // Start location tracking
    startLocationTracking();

    return true;
  }, [getRoute, drawRoute]);

  // Start location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];
        const heading = position.coords.heading || 0;

        setUserLocation(newLocation);
        setUserHeading(heading);

        if (onLocationUpdate) {
          onLocationUpdate(newLocation, position.coords.speed || 0, heading);
        }

        // Update navigation progress
        updateNavigationProgress(newLocation);
      },
      (error) => {
        console.error('Location tracking error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Enable GPS for navigation.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("GPS signal unavailable. Please try again.");
            break;
          case error.TIMEOUT:
            toast.error("GPS timeout. Retrying...");
            break;
          default:
            toast.error("Could not get your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 3000
      }
    );
  }, [onLocationUpdate]);

  // Update navigation progress based on current location
  const updateNavigationProgress = useCallback((location: [number, number]) => {
    if (!currentRoute || !currentStep) return;

    // Check if we're close to the next step
    const stepCoords = currentStep.geometry.coordinates[0];
    const distanceToStep = calculateDistance(location, stepCoords);

    // If we're within 30 meters of the step, advance to next step
    if (distanceToStep <= 30 && remainingSteps.length > 0) {
      const nextStep = remainingSteps[0];
      setCurrentStep(nextStep);
      setRemainingSteps(prev => prev.slice(1));
      setCurrentStepIndex(prev => prev + 1);
    }

    // Calculate remaining distance and time
    let totalRemainingDistance = 0;
    let totalRemainingTime = 0;

    if (currentStep) {
      totalRemainingDistance += currentStep.distance;
      totalRemainingTime += currentStep.duration;
    }

    remainingSteps.forEach(step => {
      totalRemainingDistance += step.distance;
      totalRemainingTime += step.duration;
    });

    setRemainingDistance(totalRemainingDistance);
    setRemainingTime(totalRemainingTime);

    // Update ETA
    const arrivalTime = new Date(Date.now() + totalRemainingTime * 1000);
    setEta(arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    // Check if user is off route (more than 100 meters from route)
    const routeCoords = currentRoute.geometry.coordinates;
    const minDistanceToRoute = Math.min(...routeCoords.map(coord => 
      calculateDistance(location, coord)
    ));

    setIsOffRoute(minDistanceToRoute > 100);
  }, [currentRoute, currentStep, remainingSteps, calculateDistance]);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setCurrentRoute(null);
    setCurrentStep(null);
    setRemainingSteps([]);
    setCurrentStepIndex(0);
    setIsOffRoute(false);

    // Stop location tracking
    if (watchPositionId.current) {
      navigator.geolocation.clearWatch(watchPositionId.current);
      watchPositionId.current = null;
    }

    // Remove route from map
    if (map) {
      if (map.getLayer(routeLayer.current)) {
        map.removeLayer(routeLayer.current);
      }
      if (map.getLayer(`${routeLayer.current}-outline`)) {
        map.removeLayer(`${routeLayer.current}-outline`);
      }
      if (map.getSource(routeSource.current)) {
        map.removeSource(routeSource.current);
      }
    }
  }, [map]);

  // Enhanced route planning with alternatives, voice, and banner instructions
  const planRouteWithAlternatives = useCallback(async (start: [number, number], end: [number, number], options?: Partial<RouteOptions>) => {
    if (!mapboxToken) return null;

    try {
      const routeOpts = { ...routeOptions, ...options };

      const params = new URLSearchParams({
        geometries: 'geojson',
        steps: 'true',
        alternatives: 'true', // Get alternative routes
        voice_instructions: 'true', // Enable voice guidance
        banner_instructions: 'true', // Enable lane guidance
        access_token: mapboxToken,
        overview: 'full',
        annotations: 'distance,duration,speed,congestion'
      });

      if (routeOpts.avoidHighways) params.append('exclude', 'motorway');
      if (routeOpts.avoidTolls) params.append('exclude', 'toll');
      if (routeOpts.avoidFerries) params.append('exclude', 'ferry');

      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${routeOpts.profile}/${start.join(',')};${end.join(',')}?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        // Process all route alternatives
        const routes = data.routes.map((route: any, index: number) => ({
          ...route,
          id: `route_${index}_${Date.now()}`
        }));

        setAlternativeRoutes(routes);

        // Notify parent component about alternatives
        if (onRouteAlternatives) {
          onRouteAlternatives(routes);
        }

        return routes;
      }
    } catch (error) {
      console.error('Route planning failed:', error);
      toast.error("Route planning failed. Please try again or check your destination.");
      return null;
    }
  }, [mapboxToken, routeOptions, onRouteAlternatives]);

  // Start navigation with selected route
  const startNavigationWithRoute = useCallback(async (selectedRoute?: NavigationRoute) => {
    if (!selectedRoute && alternativeRoutes.length === 0) return null;

    const route = selectedRoute || alternativeRoutes[0];

    try {
      setCurrentRoute(route);
      setIsNavigating(true);
      setShowAlternatives(false);

      // Set up navigation steps with enhanced data
      if (route.legs && route.legs.length > 0) {
        const allSteps = route.legs.flatMap((leg: any) => leg.steps);
        setRemainingSteps(allSteps);
        setCurrentStep(allSteps[0] || null);
        setCurrentStepIndex(0);
      }

      // Calculate initial values
      setRemainingDistance(route.distance);
      setRemainingTime(route.duration);

      // Update ETA
      const arrivalTime = new Date(Date.now() + route.duration * 1000);
      setEta(arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Draw route on map
      drawRoute(route);

      // Start location tracking
      startLocationTracking();

      return route;
    } catch (error) {
      console.error('Navigation start failed:', error);
      return null;
    }
  }, [alternativeRoutes, drawRoute, startLocationTracking]);

  // Recenter map on user location
  const recenterMap = useCallback(() => {
    if (map && userLocation) {
      map.flyTo({
        center: userLocation,
        bearing: userHeading,
        zoom: 16,
        pitch: 60,
        speed: 1.2,
        essential: true
      });
    }
  }, [map, userLocation, userHeading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchPositionId.current) {
        navigator.geolocation.clearWatch(watchPositionId.current);
      }
    };
  }, []);

    // Get route alternatives from Mapbox Directions API
    const getRouteAlternatives = useCallback(async (
        start: [number, number],
        end: [number, number],
        options: RouteOptions = {
          profile: 'driving-traffic',
          avoidHighways: false,
          avoidTolls: false,
          avoidFerries: true
        }
      ): Promise<NavigationRoute[]> => {
        try {
          const profile = options.profile;
          const coordinates = `${start[0]},${start[1]};${end[0]},${end[1]}`;

          let url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;
          url += '?geometries=geojson&steps=true&voice_instructions=true&banner_instructions=true&alternatives=true';

          // Add route options
          const excludeParams = [];
          if (options.avoidHighways) excludeParams.push('motorway');
          if (options.avoidTolls) excludeParams.push('toll');
          if (options.avoidFerries) excludeParams.push('ferry');

          if (excludeParams.length > 0) {
            url += `&exclude=${excludeParams.join(',')}`;
          }

          url += `&access_token=${mapboxToken}`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            return data.routes.map((route: any, index: number) => ({
              ...route,
              id: `route_${index}_${Date.now()}`
            }));
          }

          return [];
        } catch (error) {
          console.error('Failed to get route alternatives:', error);
          toast.error("Unable to find alternative routes. Using default route.");
          return [];
        }
      }, [mapboxToken]);

      // Display multiple routes on map
      const displayRoutesOnMap = useCallback((routes: NavigationRoute[]) => {
        if (!map) return;

        // Clear existing routes
        clearRoutesFromMap();

        routes.forEach((route, index) => {
          const sourceId = `route-${index}`;
          const layerId = `route-line-${index}`;
          const glowLayerId = `route-glow-${index}`;

          // Route colors: main route (blue), alternative 1 (green), alternative 2 (orange)
          const colors = ['#3B82F6', '#10B981', '#F59E0B'];
          const color = colors[index] || '#6B7280';

          if (map.getSource(sourceId)) {
            map.removeLayer(glowLayerId);
            map.removeLayer(layerId);
            map.removeSource(sourceId);
          }

          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { routeIndex: index },
              geometry: route.geometry
            }
          });

          // Add glow effect
          map.addLayer({
            id: glowLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': index === 0 ? 12 : 8,
              'line-opacity': 0.4,
              'line-blur': 3
            }
          });

          // Add main route line
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': index === 0 ? 6 : 4,
              'line-opacity': 1
            }
          });
        });

        // Fit map to show all routes
        if (routes.length > 0) {
          const coordinates = routes[0].geometry.coordinates;
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord as [number, number]);
          }, new (window as any).mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          map.fitBounds(bounds, { padding: 100 });
        }
      }, [map]);

      // Clear routes from map
      const clearRoutesFromMap = useCallback(() => {
        if (!map) return;

        for (let i = 0; i < 5; i++) {
          const sourceId = `route-${i}`;
          const layerId = `route-line-${i}`;
          const glowLayerId = `route-glow-${i}`;

          if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      }, [map]);

      // Display single selected route
      const displaySingleRoute = useCallback((route: NavigationRoute) => {
        if (!map) return;

        clearRoutesFromMap();

        const sourceId = 'selected-route';
        const layerId = 'selected-route-line';
        const glowLayerId = 'selected-route-glow';

        if (map.getSource(sourceId)) {
          map.removeLayer(glowLayerId);
          map.removeLayer(layerId);
          map.removeSource(sourceId);
        }

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        // Add glow effect
        map.addLayer({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#00ff88',
            'line-width': 12,
            'line-opacity': 0.4,
            'line-blur': 3
          }
        });

        // Add main route line
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#00ff88',
            'line-width': 6,
            'line-opacity': 1
          }
        });
      }, [map]);

  // Plan route with alternatives and show overview
  const planRouteWithAlternatives2 = useCallback(async (
    start: [number, number],
    end: [number, number],
    options?: RouteOptions
  ) => {
    const routes = await getRouteAlternatives(start, end, options || routeOptions);
    setAlternativeRoutes(routes);

    if (routes.length > 0) {
      onRouteAlternatives?.(routes);
      setShowAlternatives(true);

      // Display routes on map
      if (map) {
        displayRoutesOnMap(routes);
      }
    }

    return routes;
  }, [getRouteAlternatives, routeOptions, onRouteAlternatives, map]);

  // Start navigation with a specific route
  const startNavigationWithRoute2 = useCallback(async (route: NavigationRoute) => {
    setCurrentRoute(route);
    setAlternativeRoutes([]);
    setShowAlternatives(false);
    setIsNavigating(true);
    setCurrentStepIndex(0);

    // Extract steps from route
    const allSteps: NavigationStep[] = [];
    route.legs?.forEach((leg: any) => {
      leg.steps?.forEach((step: any) => {
        allSteps.push({
          instruction: step.maneuver?.instruction || '',
          distance: step.distance || 0,
          duration: step.duration || 0,
          maneuver: {
            type: step.maneuver?.type || 'continue',
            modifier: step.maneuver?.modifier,
            bearing_after: step.maneuver?.bearing_after,
            bearing_before: step.maneuver?.bearing_before
          },
          name: step.name || '',
          geometry: step.geometry || { coordinates: [] },
          voiceInstructions: step.voiceInstructions,
          bannerInstructions: step.bannerInstructions,
          intersections: step.intersections
        });
      });
    });

    setRemainingSteps(allSteps);
    setCurrentStep(allSteps[0] || null);
    setRemainingDistance(route.distance || 0);
    setRemainingTime(route.duration || 0);

    // Calculate ETA
    const now = new Date();
    const etaTime = new Date(now.getTime() + (route.duration || 0) * 1000);
    setEta(etaTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    // Clear route alternatives from map and show only selected route
    if (map) {
      clearRoutesFromMap();
      displaySingleRoute(route);
    }

    return true;
  }, [map]);

  return {
    // State
    isNavigating,
    currentRoute,
    alternativeRoutes,
    currentStep,
    remainingSteps,
    currentStepIndex,
    userLocation,
    userHeading,
    remainingDistance,
    remainingTime,
    eta,
    isOffRoute,
    voiceEnabled,
    showAlternatives,
    routeOptions,

    // Actions
    startNavigation,
    startNavigationWithRoute: startNavigationWithRoute2,
    planRouteWithAlternatives: planRouteWithAlternatives2,
    stopNavigation,
    updateNavigationProgress,
    setVoiceEnabled,
    setShowAlternatives,
    setRouteOptions,
    searchPlaces,
    recenterMap,
    getRoute,

    // Utilities
    formatDistance: (meters: number) => meters < 1000 ? `${Math.round(meters)}m` : `${(meters/1000).toFixed(1)}km`,
    formatDuration: (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
  };
}