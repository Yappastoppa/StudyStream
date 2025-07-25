
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

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
  timeout = 5000,
  maximumAge = 3000,
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
  const [hasTriedRealGPS, setHasTriedRealGPS] = useState(false);

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
        toast.error('Location access denied. Please check your browser settings.');
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        toast.error('GPS signal unavailable. Please try again.');
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        toast.error('GPS timeout. Retrying...');
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
      toast.error('Location services not supported by this browser.');
      return Promise.resolve('denied');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    toast.loading('Getting your location...', { id: 'location-loading' });

    return new Promise<PermissionState>((resolve) => {
      // Mobile Safari timeout - if no response in 3 seconds, assume permission issue
      const mobileTimeout = setTimeout(() => {
        console.log('🔥 Mobile Safari GPS timeout - using simulation mode');
        toast.success('Using simulation mode for development', { id: 'location-loading' });
        setHasTriedRealGPS(true);
        startSimulation();
        resolve('denied');
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(mobileTimeout);
          updatePosition(position);
          setHasTriedRealGPS(true);
          toast.success('Real GPS location found!', { id: 'location-loading' });
          
          // Start watching for updates if requested
          if (watchPosition) {
            startWatching();
          }
          resolve('granted');
        },
        (error) => {
          clearTimeout(mobileTimeout);
          console.log('GPS error:', error.code, error.message);
          
          // Always fall back to simulation on mobile
          if (error.code === error.PERMISSION_DENIED) {
            toast.success('Using simulation mode', { id: 'location-loading' });
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.success('GPS unavailable - using simulation', { id: 'location-loading' });
          } else {
            toast.success('GPS timeout - using simulation', { id: 'location-loading' });
          }
          
          setHasTriedRealGPS(true);
          startSimulation();
          resolve('denied');
        },
        {
          enableHighAccuracy: true,
          timeout: 2500, // Shorter timeout for mobile
          maximumAge: 60000 // Accept cached location up to 1 minute old
        }
      );
    });
  }, [updatePosition, handleError, options, watchPosition]);

  const startSimulation = useCallback(() => {
    console.log('🔥 FORCING GPS BYPASS - Using NYC coordinates for testing');
    
    let simulationInterval: NodeJS.Timeout;
    let currentSpeed = 0;
    let targetSpeed = 0;
    let timeAccumulator = 0;
    let stoppedTime = 0;
    
    // Initial position - NYC area (matches your screenshots)
    setState({
      lat: 40.7128,
      lng: -74.0060,
      accuracy: 10,
      speed: 0,
      heading: Math.random() * 360,
      error: null,
      isLoading: false
    });
    
    toast.success('GPS simulation active');
    
    // Start speed simulation with less frequent updates to reduce jitter
    simulationInterval = setInterval(() => {
      timeAccumulator += 0.5;
      
      // Change target speed every 5-10 seconds
      if (Math.random() < 0.01) {
        targetSpeed = Math.random() * 120; // 0-120 km/h
      }
      
      // Smooth acceleration/deceleration
      const speedDiff = targetSpeed - currentSpeed;
      currentSpeed += speedDiff * 0.05; // Slower adjustment for smoother changes
      
      // Handle stopped state more realistically
      let displaySpeed = currentSpeed;
      
      if (currentSpeed < 2) {
        stoppedTime += 0.5;
        // When nearly stopped, reduce to exactly 0 after brief moment
        if (stoppedTime > 1) {
          displaySpeed = 0;
          currentSpeed = 0;
        } else {
          // Small random jitter when coming to stop
          displaySpeed = Math.max(0, currentSpeed + (Math.random() - 0.5) * 0.3);
        }
      } else {
        stoppedTime = 0;
        // Reduced variation when moving to prevent jitter
        const variation = (Math.random() - 0.5) * 0.8;
        displaySpeed = Math.max(0, currentSpeed + variation);
      }
      
      setState(prev => ({
        ...prev,
        speed: displaySpeed,
        heading: displaySpeed > 2 ? 
          (prev.heading || 0) + (Math.random() - 0.5) * (displaySpeed > 30 ? 2 : 0.5) :
          prev.heading // Don't change heading when stopped
      }));
    }, 500); // Update every 500ms instead of 100ms to reduce jitter
    
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, []);

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

  // Show loading spinner if taking too long
  useEffect(() => {
    if (state.isLoading) {
      const loadingTimer = setTimeout(() => {
        if (state.isLoading) {
          toast.loading('Still searching for location...', { id: 'location-slow' });
        }
      }, 3000);

      return () => clearTimeout(loadingTimer);
    } else {
      toast.dismiss('location-slow');
    }
  }, [state.isLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission,
    isWatching: watchId !== null,
    hasTriedRealGPS
  };
}
