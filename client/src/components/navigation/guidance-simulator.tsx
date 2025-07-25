import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from 'lucide-react';

interface GuidanceSimulatorProps {
  route?: any;
  map?: any;
  isActive: boolean;
  onClose: () => void;
  className?: string;
}

export function GuidanceSimulator({
  route,
  map,
  isActive,
  onClose,
  className = ""
}: GuidanceSimulatorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const routeCoordinates = route?.geometry?.coordinates || [];
  const totalDistance = route?.distance || 0;
  const estimatedDuration = route?.duration || 0;

  // Simulate navigation along the route
  useEffect(() => {
    if (!isPlaying || !route || !map || routeCoordinates.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min((elapsed * playbackSpeed) / (estimatedDuration * 10), 1); // 10x faster than real-time base
      
      setSimulationProgress(progress);
      
      if (progress < 1) {
        // Calculate current position along route
        const routeIndex = Math.floor(progress * (routeCoordinates.length - 1));
        const currentCoords = routeCoordinates[routeIndex];
        
        if (currentCoords) {
          setCurrentPosition(routeIndex);
          
          // Update map camera to follow simulation
          map.flyTo({
            center: currentCoords,
            zoom: 17,
            pitch: 60,
            bearing: calculateBearing(
              routeCoordinates[Math.max(0, routeIndex - 1)],
              currentCoords
            ),
            speed: 1.5,
            essential: true
          });

          // Add current position marker
          updateSimulationMarker(currentCoords);
        }
        
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        startTimeRef.current = undefined;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, route, map]);

  const calculateBearing = (from: [number, number], to: [number, number]): number => {
    if (!from || !to) return 0;
    
    const [fromLng, fromLat] = from;
    const [toLng, toLat] = to;
    
    const dLng = (toLng - fromLng) * Math.PI / 180;
    const lat1 = fromLat * Math.PI / 180;
    const lat2 = toLat * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const updateSimulationMarker = (coords: [number, number]) => {
    if (!map) return;

    // Remove existing simulation marker
    if (map.getLayer('simulation-marker')) {
      map.removeLayer('simulation-marker');
    }
    if (map.getSource('simulation-marker')) {
      map.removeSource('simulation-marker');
    }

    // Add new simulation marker
    map.addSource('simulation-marker', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coords
        }
      }
    });

    map.addLayer({
      id: 'simulation-marker',
      type: 'circle',
      source: 'simulation-marker',
      paint: {
        'circle-radius': 12,
        'circle-color': '#00ff88',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9
      }
    });
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      startTimeRef.current = undefined;
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSimulationProgress(0);
    setCurrentPosition(0);
    startTimeRef.current = undefined;
    
    if (route && map) {
      // Reset to route start
      const startCoords = routeCoordinates[0];
      if (startCoords) {
        map.flyTo({
          center: startCoords,
          zoom: 15,
          pitch: 0,
          bearing: 0,
          speed: 1
        });
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const progress = value[0] / 100;
    setSimulationProgress(progress);
    
    const routeIndex = Math.floor(progress * (routeCoordinates.length - 1));
    setCurrentPosition(routeIndex);
    
    if (routeCoordinates[routeIndex] && map) {
      map.flyTo({
        center: routeCoordinates[routeIndex],
        zoom: 17,
        pitch: 60,
        speed: 1
      });
      updateSimulationMarker(routeCoordinates[routeIndex]);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  if (!isActive || !route) return null;

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 pointer-events-auto ${className}`}>
      <Card className="bg-black/95 backdrop-blur-lg border-racing-blue/50 shadow-2xl">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-racing-green rounded-full animate-pulse"></div>
              <span className="text-white font-medium">Route Simulation</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            >
              ×
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
              <span>Progress: {Math.round(simulationProgress * 100)}%</span>
              <span>
                {formatDistance(totalDistance * simulationProgress)} / {formatDistance(totalDistance)}
              </span>
            </div>
            <Slider
              value={[simulationProgress * 100]}
              onValueChange={handleSeek}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSeek([(simulationProgress * 100) - 10])}
              className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            <Button
              onClick={handlePlay}
              className="h-12 w-12 rounded-full bg-racing-blue hover:bg-racing-blue/80"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSeek([(simulationProgress * 100) + 10])}
              className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
            >
              {voiceEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Playback Speed</span>
            <div className="flex space-x-2">
              {[0.5, 1, 2, 5, 10].map((speed) => (
                <Button
                  key={speed}
                  variant={playbackSpeed === speed ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`text-xs ${
                    playbackSpeed === speed
                      ? 'bg-racing-blue text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>

          {/* Route Info */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-racing-blue font-bold">
                  {formatTime(estimatedDuration)}
                </div>
                <div className="text-white/60 text-xs">Duration</div>
              </div>
              <div>
                <div className="text-racing-green font-bold">
                  {formatDistance(totalDistance)}
                </div>
                <div className="text-white/60 text-xs">Distance</div>
              </div>
              <div>
                <div className="text-racing-purple font-bold">
                  {Math.round(playbackSpeed * 10)}x
                </div>
                <div className="text-white/60 text-xs">Real Speed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}