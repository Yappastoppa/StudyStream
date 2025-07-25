import { useState, useEffect, useCallback, useRef } from 'react';
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
    lat: null, lng: null, accuracy: null,
    speed: null, heading: null,
    error: null, isLoading: false
  });
  const [watchId, setWatchId] = useState<number | null>(null);
  const hasTriedRealGPS = useRef(false);

  const options: PositionOptions = { enableHighAccuracy, timeout, maximumAge };

  const updatePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = pos.coords;

    console.log('📍 LIVE GPS UPDATE:', { lat: latitude, lng: longitude, speed, heading });

    setState({
      lat: latitude,
      lng: longitude,
      accuracy,
      speed: speed != null ? Math.max(0, speed * 3.6) : null,
      heading,
      error: null,
      isLoading: false
    });

    onLocationUpdate?.(pos);
  }, [onLocationUpdate]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let msg = 'Unknown geolocation error';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        msg = 'Permission denied. Enable location access.';
        toast.error(msg, { id: 'geo-error' });
        break;
      case err.POSITION_UNAVAILABLE:
        msg = 'GPS unavailable. Try again.';
        toast.error(msg, { id: 'geo-error' });
        break;
      case err.TIMEOUT:
        msg = 'GPS timeout. Retrying…';
        toast.error(msg, { id: 'geo-error' });
        break;
    }
    setState(s => ({ ...s, error: msg, isLoading: false }));
  }, []);

  const startSimulation = useCallback(() => {
    console.log('🔥 GPS simulation active - Creating live pin at NYC coordinates');
    toast.success('GPS simulation active - Live tracking enabled', { id: 'geo-loading' });

    // Set initial NYC coordinates
    const initialState = {
      lat: 40.7128,
      lng: -74.0060,
      accuracy: 10,
      speed: 0,
      heading: Math.random() * 360,
      error: null,
      isLoading: false
    };

    setState(initialState);

    // Trigger location update for live pin creation
    onLocationUpdate?.({
      coords: {
        latitude: initialState.lat,
        longitude: initialState.lng,
        accuracy: initialState.accuracy,
        speed: initialState.speed,
        heading: initialState.heading,
        altitude: null,
        altitudeAccuracy: null
      },
      timestamp: Date.now()
    } as GeolocationPosition);

    let curSpd = 0, tgtSpd = 0, stopTime = 0;
    const iv = setInterval(() => {
      if (Math.random() < 0.01) tgtSpd = Math.random() * 120;
      curSpd += (tgtSpd - curSpd) * 0.05;
      let disp = curSpd < 2
        ? (stopTime += 0.5) > 1 ? (curSpd = 0, 0) : curSpd + (Math.random() - 0.5) * 0.3
        : (stopTime = 0, curSpd + (Math.random() - 0.5) * 0.8);

      setState(s => ({ 
        ...s, 
        speed: Math.max(0, disp),
        heading: s.heading ? s.heading + (Math.random() - 0.5) * 2 : Math.random() * 360
      }));
    }, 500);

    return () => clearInterval(iv);
  }, [onLocationUpdate]);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Browser geolocation unsupported.' }));
      toast.error('Geolocation unsupported', { id: 'geo-error' });
      startSimulation(); // Fallback to simulation
      return Promise.resolve('denied');
    }

    setState(s => ({ ...s, isLoading: true, error: null }));
    toast.loading('Getting your location…', { id: 'geo-loading' });

    return new Promise<PermissionState>((resolve) => {
      // Timeout for mobile Safari and Replit iframe issues
      const permTimer = setTimeout(() => {
        console.log('🔥 GPS permission timeout - using simulation mode');
        toast.success('Using simulation mode for development', { id: 'geo-loading' });
        hasTriedRealGPS.current = true;
        startSimulation();
        resolve('denied');
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(permTimer);
          updatePosition(pos);
          toast.success('Real GPS location found! Live pin active', { id: 'geo-loading' });
          hasTriedRealGPS.current = true;
          if (watchPosition) startWatching();
          resolve('granted');
        },
        err => {
          clearTimeout(permTimer);
          console.log('GPS error:', err.code, err.message);
          handleError(err);
          toast.success('Using simulation mode - Live pin active', { id: 'geo-loading' });
          hasTriedRealGPS.current = true;
          startSimulation();
          resolve('denied');
        },
        { ...options, timeout: 2500 }
      );
    });
  }, [handleError, options, startWatching, startSimulation, updatePosition, watchPosition]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;

    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const id = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      options
    );
    setWatchId(id);
  }, [handleError, options, updatePosition, watchId]);

  const stopWatching = useCallback(() => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setState(s => ({ ...s, isLoading: false }));
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
    return getCurrentPosition();
  }, [getCurrentPosition]);

  // keep loading toast up to 3s
  useEffect(() => {
    if (state.isLoading) {
      const t = setTimeout(() => {
        if (state.isLoading) toast.loading('Still searching…', { id: 'geo-slow' });
      }, 3000);
      return () => clearTimeout(t);
    } else {
      toast.dismiss('geo-slow');
    }
  }, [state.isLoading]);

  // cleanup
  useEffect(() => () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
  }, [watchId]);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission,
    isWatching: watchId != null,
    hasTriedRealGPS: hasTriedRealGPS.current
  };
}