import { useState, useEffect, useCallback } from 'react';

interface NavigationStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: {
    type: string;
    bearing_after?: number;
    bearing_before?: number;
    location: [number, number];
  };
}

interface NavigationRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: any;
  legs: any[];
  steps: NavigationStep[];
}

interface UseNavigationOptions {
  accessToken: string;
  onRouteUpdate?: (route: NavigationRoute) => void;
  onStepUpdate?: (step: NavigationStep, index: number) => void;
  profile?: 'driving' | 'driving-traffic' | 'walking' | 'cycling';
}

export function useNavigation({
  accessToken,
  onRouteUpdate,
  onStepUpdate,
  profile = 'driving-traffic'
}: UseNavigationOptions) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [routeOptions, setRouteOptions] = useState({
    avoidHighways: false,
    avoidTolls: false,
    preferFastest: true
  });
  const [eta, setEta] = useState<Date | null>(null);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Calculate route using Mapbox Directions API
  const calculateRoute = useCallback(async (
    origin: [number, number],
    dest: [number, number],
    points: [number, number][] = []
  ) => {
    if (!accessToken || !origin || !dest) return null;

    try {
      // Build coordinates string
      const coordinates = [origin, ...points, dest]
        .map(coord => coord.join(','))
        .join(';');

      // Build URL with options
      const baseUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;
      const params = new URLSearchParams();
      params.append('access_token', accessToken);
      params.append('geometries', 'geojson');
      params.append('steps', 'true');
      params.append('annotations', 'distance,duration,speed');
      params.append('overview', 'full');
      params.append('alternatives', 'false');
      
      const excludeOptions = [
        routeOptions.avoidHighways ? 'motorway' : '',
        routeOptions.avoidTolls ? 'toll' : ''
      ].filter(Boolean).join(',');
      
      if (excludeOptions) {
        params.append('exclude', excludeOptions);
      }

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Extract all steps from all legs
        const allSteps: NavigationStep[] = [];
        route.legs.forEach((leg: any) => {
          leg.steps.forEach((step: any) => {
            allSteps.push({
              instruction: step.maneuver.instruction,
              distance: step.distance,
              duration: step.duration,
              maneuver: {
                type: step.maneuver.type,
                bearing_after: step.maneuver.bearing_after,
                bearing_before: step.maneuver.bearing_before,
                location: step.maneuver.location
              }
            });
          });
        });

        const navigationRoute: NavigationRoute = {
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          legs: route.legs,
          steps: allSteps
        };

        setCurrentRoute(navigationRoute);
        setDistanceRemaining(route.distance);
        setTimeRemaining(route.duration);
        
        // Calculate ETA
        const etaTime = new Date();
        etaTime.setSeconds(etaTime.getSeconds() + route.duration);
        setEta(etaTime);

        onRouteUpdate?.(navigationRoute);
        return navigationRoute;
      }
      
      return null;
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }, [accessToken, profile, routeOptions, onRouteUpdate]);

  // Start navigation to a destination
  const startNavigation = useCallback(async (
    origin: [number, number],
    dest: [number, number]
  ) => {
    setDestination(dest);
    const route = await calculateRoute(origin, dest, waypoints);
    
    if (route) {
      setIsNavigating(true);
      setCurrentStepIndex(0);
      return true;
    }
    
    return false;
  }, [calculateRoute, waypoints]);

  // Stop navigation
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setCurrentRoute(null);
    setCurrentStepIndex(0);
    setDestination(null);
    setWaypoints([]);
    setEta(null);
    setDistanceRemaining(0);
    setTimeRemaining(0);
  }, []);

  // Add a waypoint
  const addWaypoint = useCallback((point: [number, number]) => {
    setWaypoints(prev => [...prev, point]);
  }, []);

  // Remove a waypoint
  const removeWaypoint = useCallback((index: number) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update current position and check for re-routing
  const updatePosition = useCallback(async (
    currentPosition: [number, number],
    heading?: number
  ) => {
    if (!isNavigating || !currentRoute || !destination) return;

    // Check distance to current step's maneuver location
    if (currentRoute.steps[currentStepIndex]) {
      const step = currentRoute.steps[currentStepIndex];
      const stepLocation = step.maneuver.location;
      
      // Simple distance calculation (could use Turf.js for accuracy)
      const dx = (currentPosition[0] - stepLocation[0]) * 111320;
      const dy = (currentPosition[1] - stepLocation[1]) * 110540;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If within 30 meters of the maneuver, advance to next step
      if (distance < 30 && currentStepIndex < currentRoute.steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        onStepUpdate?.(currentRoute.steps[nextIndex], nextIndex);
      }
      
      // Check if we're off route (simplified check)
      // In production, use Mapbox Map Matching API for accurate off-route detection
      if (distance > 100) {
        // Re-route from current position
        await calculateRoute(currentPosition, destination, waypoints);
      }
    }
    
    // Update remaining distance and time (simplified)
    // In production, calculate based on remaining route segments
    if (currentRoute) {
      const progress = currentStepIndex / currentRoute.steps.length;
      setDistanceRemaining(currentRoute.distance * (1 - progress));
      setTimeRemaining(currentRoute.duration * (1 - progress));
      
      const newEta = new Date();
      newEta.setSeconds(newEta.getSeconds() + timeRemaining);
      setEta(newEta);
    }
  }, [isNavigating, currentRoute, currentStepIndex, destination, waypoints, calculateRoute, onStepUpdate, timeRemaining]);

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get turn icon based on maneuver type
  const getTurnIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'turn-left': '↰',
      'turn-right': '↱',
      'turn-slight-left': '↖',
      'turn-slight-right': '↗',
      'turn-sharp-left': '⬅',
      'turn-sharp-right': '➡',
      'uturn-left': '↩',
      'uturn-right': '↪',
      'continue': '↑',
      'merge': '⤵',
      'ramp': '⬈',
      'fork': '⑂',
      'end': '🏁',
      'roundabout': '↻',
      'rotary': '↻',
      'exit': '↗',
      'arrive': '📍'
    };
    
    return iconMap[type] || '→';
  };

  return {
    // State
    isNavigating,
    currentRoute,
    currentStepIndex,
    currentStep: currentRoute?.steps[currentStepIndex] || null,
    destination,
    waypoints,
    eta,
    distanceRemaining,
    timeRemaining,
    routeOptions,
    
    // Actions
    startNavigation,
    stopNavigation,
    calculateRoute,
    addWaypoint,
    removeWaypoint,
    updatePosition,
    setRouteOptions,
    
    // Utilities
    formatDistance,
    formatDuration,
    getTurnIcon
  };
}