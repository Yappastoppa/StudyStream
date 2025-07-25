import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Gauge, Navigation } from 'lucide-react';

interface LocationTrackerProps {
  onLocationUpdate: (location: [number, number], speed?: number, heading?: number) => void;
  isActive: boolean;
  className?: string;
}

export function LocationTracker({ 
  onLocationUpdate, 
  isActive, 
  className = "" 
}: LocationTrackerProps) {
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [heading, setHeading] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);

  useEffect(() => {
    if (!isActive || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];
        
        setLocation(coords);
        setSpeed(position.coords.speed || 0);
        setHeading(position.coords.heading || 0);
        setAccuracy(position.coords.accuracy);
        
        onLocationUpdate(coords, position.coords.speed || 0, position.coords.heading || 0);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isActive, onLocationUpdate]);

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