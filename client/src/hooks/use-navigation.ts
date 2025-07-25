import { useState, useEffect, useRef, useCallback } from 'react';

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
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        return data.routes[0];
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get route:', error);
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
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000
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

  return {
    isNavigating,
    currentRoute,
    alternativeRoutes,
    currentStep,
    remainingSteps,
    userLocation,
    userHeading,
    remainingDistance,
    remainingTime,
    eta,
    isOffRoute,
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
    recenterMap,
    getRoute
  };
}