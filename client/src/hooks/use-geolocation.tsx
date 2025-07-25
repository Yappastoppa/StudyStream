import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  error: string | null;
  isLoading: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
  onLocationUpdate?: (position: GeolocationPosition) => void;
}

export function useGeolocation({
  enableHighAccuracy = true,
  timeout = 10000,
  maximumAge = 1000,
  watchPosition = true,
  onLocationUpdate
}: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    speed: null,
    heading: null,
    error: null,
    isLoading: false
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  const options: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge
  };

  const updatePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    
    setState({
      lat: latitude,
      lng: longitude,
      accuracy,
      speed: speed ? Math.max(0, speed * 3.6) : null, // Convert m/s to km/h
      heading,
      error: null,
      isLoading: false
    });

    onLocationUpdate?.(position);
  }, [onLocationUpdate]);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown error occurred';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }

    setState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false
    }));
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
        isLoading: false
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      updatePosition,
      handleError,
      options
    );
  }, [updatePosition, handleError, options]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.'
      }));
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const id = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      options
    );

    setWatchId(id);
  }, [updatePosition, handleError, options, watchId]);

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, [watchId]);

  const requestPermission = useCallback(async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      } catch (error) {
        console.error('Error checking geolocation permission:', error);
      }
    }
    
    // Fallback: try to get current position to trigger permission request
    return new Promise<PermissionState>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            resolve('prompt');
          }
        },
        { timeout: 1000 }
      );
    });
  }, []);

  useEffect(() => {
    // 🔥 ENHANCED SPEEDOMETER SIMULATION FOR TESTING
    console.log('🔥 FORCING GPS BYPASS - Using NYC coordinates for testing');
    
    let simulationInterval: NodeJS.Timeout;
    let currentSpeed = 0;
    let targetSpeed = 0;
    let timeAccumulator = 0;
    
    // Initial position
    setTimeout(() => {
      setState({
        lat: 40.7128,
        lng: -74.0060,
        accuracy: 10,
        speed: 0,
        heading: Math.random() * 360,
        error: null,
        isLoading: false
      });
      
      // Start speed simulation
      simulationInterval = setInterval(() => {
        timeAccumulator += 0.1;
        
        // Change target speed every 3-8 seconds
        if (Math.random() < 0.02) {
          targetSpeed = Math.random() * 120; // 0-120 km/h
        }
        
        // Smooth acceleration/deceleration
        const speedDiff = targetSpeed - currentSpeed;
        currentSpeed += speedDiff * 0.1; // 10% adjustment per update
        
        // Add some realistic variation
        const variation = (Math.random() - 0.5) * 2; // ±1 km/h variation
        const displaySpeed = Math.max(0, currentSpeed + variation);
        
        setState(prev => ({
          ...prev,
          speed: displaySpeed,
          heading: (prev.heading || 0) + (Math.random() - 0.5) * 5 // Slight heading drift
        }));
      }, 100); // Update every 100ms for smooth speedometer
      
    }, 1000); // Simulate 1 second GPS "acquisition"
    
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchPosition, startWatching, getCurrentPosition, watchId]);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission,
    isWatching: watchId !== null
  };
}
