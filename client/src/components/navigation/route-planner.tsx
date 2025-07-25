import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Route, 
  Clock, 
  Fuel, 
  Car,
  Search,
  X,
  Play,
  RotateCcw
} from 'lucide-react';

interface RouteOption {
  profile: 'driving' | 'driving-traffic';
  avoidHighways: boolean;
  avoidTolls: boolean;
  avoidFerries: boolean;
}

interface RoutePlannerProps {
  isActive: boolean;
  onClose: () => void;
  onRouteStart: (start: [number, number], end: [number, number], options: RouteOption) => void;
  onPlaceSearch: (query: string) => Promise<any[]>;
  currentLocation?: [number, number];
  className?: string;
}

export function RoutePlanner({ 
  isActive,
  onClose,
  onRouteStart,
  onPlaceSearch,
  currentLocation,
  className = "" 
}: RoutePlannerProps) {
  const [startLocation, setStartLocation] = useState<string>('Current Location');
  const [endLocation, setEndLocation] = useState<string>('');
  const [startCoords, setStartCoords] = useState<[number, number] | null>(currentLocation || null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeInput, setActiveInput] = useState<'start' | 'end' | null>(null);
  
  // Route options
  const [routeOptions, setRouteOptions] = useState<RouteOption>({
    profile: 'driving-traffic',
    avoidHighways: false,
    avoidTolls: false,
    avoidFerries: true
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle place search
  const handleSearch = async (query: string, inputType: 'start' | 'end') => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await onPlaceSearch(query);
      setSearchResults(results);
      setActiveInput(inputType);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Handle place selection
  const handlePlaceSelect = (place: any) => {
    const coords: [number, number] = [place.geometry.coordinates[0], place.geometry.coordinates[1]];
    
    if (activeInput === 'start') {
      setStartLocation(place.place_name);
      setStartCoords(coords);
    } else if (activeInput === 'end') {
      setEndLocation(place.place_name);
      setEndCoords(coords);
    }
    
    setSearchResults([]);
    setActiveInput(null);
  };

  // Start navigation
  const handleStartNavigation = () => {
    if (startCoords && endCoords) {
      onRouteStart(startCoords, endCoords, routeOptions);
      onClose();
    }
  };

  // Swap start and end locations
  const swapLocations = () => {
    const tempLocation = startLocation;
    const tempCoords = startCoords;
    
    setStartLocation(endLocation);
    setStartCoords(endCoords);
    setEndLocation(tempLocation);
    setEndCoords(tempCoords);
  };

  if (!isActive) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <Card className="bg-black/95 backdrop-blur-md border-racing-blue/50 shadow-2xl w-full max-w-md mx-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-racing-blue text-lg flex items-center justify-between">
            <div className="flex items-center">
              <Route className="h-5 w-5 mr-2" />
              Plan Route
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-racing-red/20"
            >
              <X className="h-4 w-4 text-racing-red" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Start Location */}
          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">From</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-racing-green" />
              <Input
                value={startLocation}
                onChange={(e) => {
                  setStartLocation(e.target.value);
                  handleSearch(e.target.value, 'start');
                }}
                onFocus={() => setActiveInput('start')}
                placeholder="Enter start location"
                className="pl-10 bg-racing-steel/30 border-racing-green/30 text-white placeholder:text-white/50"
              />
            </div>
          </div>

          {/* End Location */}
          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">To</label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-racing-red" />
              <Input
                value={endLocation}
                onChange={(e) => {
                  setEndLocation(e.target.value);
                  handleSearch(e.target.value, 'end');
                }}
                onFocus={() => setActiveInput('end')}
                placeholder="Enter destination"
                className="pl-10 bg-racing-steel/30 border-racing-red/30 text-white placeholder:text-white/50"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={swapLocations}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-racing-blue/20"
              >
                <RotateCcw className="h-3 w-3 text-white/60" />
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto bg-racing-steel/20 rounded-lg border border-racing-blue/30">
              {searchResults.map((place, index) => (
                <button
                  key={index}
                  onClick={() => handlePlaceSelect(place)}
                  className="w-full text-left p-3 hover:bg-racing-blue/20 border-b border-white/10 last:border-b-0"
                >
                  <div className="text-white font-medium">{place.text}</div>
                  <div className="text-white/60 text-sm">{place.place_name}</div>
                </button>
              ))}
            </div>
          )}

          {/* Route Options */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="text-white/70 text-sm font-medium">Route Options</div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-white/60" />
                  <span className="text-white text-sm">Avoid Highways</span>
                </div>
                <Switch
                  checked={routeOptions.avoidHighways}
                  onCheckedChange={(checked) => 
                    setRouteOptions(prev => ({ ...prev, avoidHighways: checked }))
                  }
                  className="scale-75"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fuel className="h-4 w-4 text-white/60" />
                  <span className="text-white text-sm">Avoid Tolls</span>
                </div>
                <Switch
                  checked={routeOptions.avoidTolls}
                  onCheckedChange={(checked) => 
                    setRouteOptions(prev => ({ ...prev, avoidTolls: checked }))
                  }
                  className="scale-75"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4 text-white/60" />
                  <span className="text-white text-sm">Live Traffic</span>
                </div>
                <Switch
                  checked={routeOptions.profile === 'driving-traffic'}
                  onCheckedChange={(checked) => 
                    setRouteOptions(prev => ({ 
                      ...prev, 
                      profile: checked ? 'driving-traffic' : 'driving' 
                    }))
                  }
                  className="scale-75"
                />
              </div>
            </div>
          </div>

          {/* Start Navigation Button */}
          <Button
            onClick={handleStartNavigation}
            disabled={!startCoords || !endCoords}
            className="w-full bg-racing-blue hover:bg-racing-blue/80 text-white font-semibold py-3"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Navigation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}