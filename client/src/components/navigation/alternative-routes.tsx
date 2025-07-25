import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Route, 
  AlertTriangle, 
  DollarSign,
  MapPin,
  ArrowRight,
  Zap,
  Car
} from 'lucide-react';

interface RouteAlternative {
  id: string;
  distance: number;
  duration: number;
  duration_typical?: number;
  legs: Array<{
    steps: any[];
    distance: number;
    duration: number;
  }>;
  geometry: {
    coordinates: [number, number][];
  };
  weight_name: string;
  weight: number;
  annotation?: {
    speed?: number[];
    congestion?: string[];
  };
  // Mapbox route metadata
  voiceInstructions?: any[];
  bannerInstructions?: any[];
}

interface AlternativeRoute {
  route: RouteAlternative;
  type: 'best' | 'fastest' | 'shortest';
  hazards: number;
  tolls: boolean;
  traffic: 'light' | 'moderate' | 'heavy';
  description: string;
  color: string;
}

interface AlternativeRoutesProps {
  isVisible: boolean;
  routes: RouteAlternative[];
  origin: string;
  destination: string;
  onRouteSelect: (route: RouteAlternative) => void;
  onClose: () => void;
  onLeaveNow: () => void;
  onLeaveLater: () => void;
  className?: string;
}

export function AlternativeRoutes({
  isVisible,
  routes,
  origin,
  destination,
  onRouteSelect,
  onClose,
  onLeaveNow,
  onLeaveLater,
  className = ""
}: AlternativeRoutesProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeOptions, setRouteOptions] = useState<AlternativeRoute[]>([]);

  // Process routes into display format
  useEffect(() => {
    if (!routes?.length) return;

    const processedRoutes: AlternativeRoute[] = routes.map((route, index) => {
      const isMain = index === 0;
      const duration = Math.round(route.duration / 60); // Convert to minutes
      const distance = (route.distance / 1000).toFixed(1); // Convert to km
      
      // Simulate route analysis (in real app, this would come from Mapbox)
      const hazards = Math.floor(Math.random() * 3) + (isMain ? 2 : 1);
      const tolls = Math.random() > 0.7;
      const traffic = isMain ? 'moderate' : (Math.random() > 0.5 ? 'light' : 'heavy');
      
      let type: 'best' | 'fastest' | 'shortest' = 'fastest';
      let description = '';
      let color = '#8B5CF6'; // Default purple
      
      if (isMain) {
        type = 'best';
        description = 'Best route, typical traffic';
        color = '#8B5CF6'; // Purple for main route
      } else if (route.duration < routes[0].duration) {
        type = 'fastest';
        description = 'Fastest route available';
        color = '#10B981'; // Green for fastest
      } else {
        type = 'shortest';
        description = 'Shorter distance';
        color = '#F59E0B'; // Orange for shortest
      }

      return {
        route,
        type,
        hazards,
        tolls,
        traffic,
        description,
        color
      };
    });

    setRouteOptions(processedRoutes);
    setSelectedRouteId(processedRoutes[0]?.route.id || null);
  }, [routes]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  const getRouteTypeIcon = (type: string) => {
    switch (type) {
      case 'best':
        return <Zap className="h-4 w-4" />;
      case 'fastest':
        return <Clock className="h-4 w-4" />;
      case 'shortest':
        return <Route className="h-4 w-4" />;
      default:
        return <Car className="h-4 w-4" />;
    }
  };

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case 'light': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';  
      case 'heavy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isVisible || !routeOptions.length) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm ${className}`}>
      <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-hidden">
        <Card className="bg-racing-dark/95 border-racing-blue/30 rounded-t-3xl rounded-b-none shadow-2xl">
          <CardContent className="p-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-racing-blue/20">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-racing-blue" />
                <div>
                  <p className="text-white font-medium text-sm truncate max-w-[200px]">
                    {origin}
                  </p>
                  <ArrowRight className="h-3 w-3 text-gray-400 inline mx-1" />
                  <p className="text-gray-300 text-sm truncate max-w-[200px] inline">
                    {destination}
                  </p>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                ×
              </Button>
            </div>

            {/* Route Options */}
            <div className="max-h-[40vh] overflow-y-auto">
              {routeOptions.map((routeOption, index) => (
                <div
                  key={routeOption.route.id || index}
                  className={`p-4 border-b border-racing-blue/10 cursor-pointer transition-all ${
                    selectedRouteId === routeOption.route.id 
                      ? 'bg-racing-blue/20 border-l-4 border-l-racing-blue' 
                      : 'hover:bg-racing-blue/10'
                  }`}
                  onClick={() => {
                    setSelectedRouteId(routeOption.route.id);
                    onRouteSelect(routeOption.route);
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Route Info */}
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Duration & Distance */}
                      <div className="text-left">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-white">
                            {formatDuration(routeOption.route.duration)}
                          </span>
                          {index === 0 && (
                            <Badge 
                              className="bg-racing-blue text-white text-xs px-2 py-0.5"
                            >
                              Best
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {formatDistance(routeOption.route.distance)}
                        </p>
                      </div>

                      {/* Route Description */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getRouteTypeIcon(routeOption.type)}
                          <span className="text-sm text-gray-300 truncate">
                            {routeOption.description}
                          </span>
                        </div>
                        
                        {/* Route Indicators */}
                        <div className="flex items-center space-x-3 text-xs">
                          {routeOption.hazards > 0 && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3 text-yellow-400" />
                              <span className="text-yellow-400">{routeOption.hazards} hazards</span>
                            </div>
                          )}
                          
                          {routeOption.tolls && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3 text-green-400" />
                              <span className="text-green-400">Tolls</span>
                            </div>
                          )}
                          
                          <span className={`${getTrafficColor(routeOption.traffic)} capitalize`}>
                            {routeOption.traffic} traffic
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Route Color Indicator */}        
                    <div 
                      className="w-1 h-12 rounded-full ml-3"
                      style={{ backgroundColor: routeOption.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-racing-dark/50 border-t border-racing-blue/20">
              <div className="flex space-x-3">
                <Button
                  onClick={onLeaveLater}
                  variant="outline"
                  className="flex-1 border-racing-blue/30 text-white hover:bg-racing-blue/20"
                >
                  Leave later
                </Button>
                <Button
                  onClick={onLeaveNow}
                  className="flex-1 bg-racing-blue hover:bg-racing-blue/80 text-white font-semibold"
                >
                  Go now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}