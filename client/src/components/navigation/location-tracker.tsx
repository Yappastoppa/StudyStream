import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Gauge, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

interface LocationTrackerProps {
  onLocationUpdate: (location: [number, number], speed?: number, heading?: number) => void;
  isActive: boolean;
  className?: string;
  onGPSStatusChange?: (isLost: boolean) => void;
}

export function LocationTracker({ 
  onLocationUpdate, 
  isActive, 
  className = "",
  onGPSStatusChange
}: LocationTrackerProps) {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [isGPSAvailable, setIsGPSAvailable] = useState<boolean>(true);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);

  // Enhanced live GPS tracking with error recovery
  useEffect(() => {
    if (!isActive) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.warn('Geolocation not supported - using fallback coordinates');
      // Use NYC coordinates as fallback for development
      const fallbackCoords: [number, number] = [-74.006, 40.7128];
      setLocation(fallbackCoords);
      onLocationUpdate(fallbackCoords, 0, 0);
      return;
    }

    const startGPSTracking = () => {
      console.log('🔥 Starting high-accuracy GPS tracking for live navigation');
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude
          ];
          
          const currentTime = Date.now();
          const currentSpeed = position.coords.speed || 0;
          const currentHeading = position.coords.heading || 0;
          const currentAccuracy = position.coords.accuracy;
          
          // Filter out stale or inaccurate readings
          if (currentAccuracy > 200) {
            console.warn(`GPS accuracy too low: ${currentAccuracy}m`);
            return;
          }
          
          setLocation(coords);
          setSpeed(currentSpeed);
          setHeading(currentHeading);
          setAccuracy(currentAccuracy);
          setIsGPSAvailable(true);
          
          // Reset retry counter on successful reading
          retryCountRef.current = 0;
          lastUpdateRef.current = currentTime;
          
          // Notify parent with high-frequency updates
          onLocationUpdate(coords, currentSpeed, currentHeading);
          
          if (onGPSStatusChange) {
            onGPSStatusChange(false); // GPS is working
          }
          
          console.log(`📍 GPS Update: ${coords[1].toFixed(6)}, ${coords[0].toFixed(6)} - Speed: ${(currentSpeed * 3.6).toFixed(0)}km/h`);
        },
        (error) => {
          console.error('Live GPS tracking error:', error.message, error.code);
          setIsGPSAvailable(false);
          
          if (onGPSStatusChange) {
            onGPSStatusChange(true); // GPS is lost
          }
          
          retryCountRef.current++;
          
          // Handle different error types
          if (error.code === error.PERMISSION_DENIED) {
            toast.error("GPS access denied. Please enable location permissions.");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.error("GPS position unavailable. Using approximate location.");
          } else if (error.code === error.TIMEOUT) {
            console.warn("GPS timeout - continuing with last known position");
          }
          
          // Attempt fallback positioning after multiple failures
          if (retryCountRef.current >= 3) {
            console.log('🔥 GPS failed multiple times - using fallback NYC coordinates');
            const fallbackCoords: [number, number] = [-74.006, 40.7128];
            setLocation(fallbackCoords);
            onLocationUpdate(fallbackCoords, 0, 0);
            
            // Continue trying to get real GPS
            setTimeout(() => {
              retryCountRef.current = 0;
              startGPSTracking();
            }, 10000);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 300 // Very fresh readings for smooth live navigation
        }
      );
    };

    startGPSTracking();

    // GPS health monitoring
    const healthCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
      if (timeSinceLastUpdate > 15000 && isActive) {
        console.warn('GPS health check: No updates for 15 seconds');
        if (onGPSStatusChange) {
          onGPSStatusChange(true);
        }
      }
    }, 5000);

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(healthCheckInterval);
    };
  }, [isActive, onLocationUpdate, onGPSStatusChange]);

  if (!isActive || !location) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-40 ${className}`}>
      <Card className="bg-black/90 backdrop-blur-md border-racing-blue/50">
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-racing-green" />
              <div className="text-xs">
                <div className="text-white font-medium">
                  {location[1].toFixed(6)}, {location[0].toFixed(6)}
                </div>
                <div className="text-white/60">
                  ±{accuracy.toFixed(0)}m
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-racing-blue" />
              <div className="text-xs">
                <div className="text-white font-medium">
                  {(speed * 3.6).toFixed(0)} km/h
                </div>
                <div className="text-white/60">speed</div>
              </div>
            </div>
            
            {heading > 0 && (
              <div className="flex items-center space-x-2">
                <Navigation 
                  className="h-4 w-4 text-racing-purple" 
                  style={{ transform: `rotate(${heading}deg)` }}
                />
                <div className="text-xs">
                  <div className="text-white font-medium">
                    {heading.toFixed(0)}°
                  </div>
                  <div className="text-white/60">heading</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}