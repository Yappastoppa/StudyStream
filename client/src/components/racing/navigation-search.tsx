
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  MapPin, 
  Navigation, 
  X, 
  Clock, 
  Route,
  Crosshair
} from 'lucide-react';

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
  context?: any[];
}

interface NavigationSearchProps {
  map: any;
  onLocationSelect: (coordinates: [number, number], name: string) => void;
  onNavigationStart: (start: [number, number], end: [number, number]) => void;
  className?: string;
}

export function NavigationSearch({ 
  map, 
  onLocationSelect, 
  onNavigationStart,
  className = ""
}: NavigationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [startPoint, setStartPoint] = useState<{ coords: [number, number], name: string } | null>(null);
  const [endPoint, setEndPoint] = useState<{ coords: [number, number], name: string } | null>(null);
  const [searchMode, setSearchMode] = useState<'search' | 'start' | 'end'>('search');
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (result: SearchResult) => {
    const updated = [result, ...recentSearches.filter(r => r.id !== result.id)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Parse coordinate input (supports various formats)
  const parseCoordinates = (input: string): [number, number] | null => {
    // Remove extra spaces and normalize
    const cleaned = input.trim().replace(/\s+/g, ' ');
    
    // Try different coordinate formats
    const patterns = [
      // Decimal degrees: "40.7128, -74.0060" or "40.7128,-74.0060"
      /^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/,
      // With parentheses: "(40.7128, -74.0060)"
      /^\((-?\d+\.?\d*),?\s*(-?\d+\.?\d*)\)$/,
      // Lat/Lng format: "lat: 40.7128, lng: -74.0060"
      /^lat:\s*(-?\d+\.?\d*),?\s*lng:\s*(-?\d+\.?\d*)$/i,
      // Lng/Lat format: "lng: -74.0060, lat: 40.7128"
      /^lng:\s*(-?\d+\.?\d*),?\s*lat:\s*(-?\d+\.?\d*)$/i,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        let lat, lng;
        
        if (pattern.source.includes('lng.*lat')) {
          // lng, lat order
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        } else {
          // lat, lng order
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        }

        // Validate coordinate ranges
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return [lng, lat]; // Mapbox uses [lng, lat]
        }
      }
    }

    return null;
  };

  // Search function with debouncing
  const performSearch = async (query: string) => {
    if (!query.trim() || !MAPBOX_TOKEN) return;

    setIsSearching(true);
    
    try {
      // First, try to parse as coordinates
      const coords = parseCoordinates(query);
      if (coords) {
        // Reverse geocode to get address
        const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(reverseUrl);
        const data = await response.json();
        
        const coordinateResult: SearchResult = {
          id: `coords-${coords[0]}-${coords[1]}`,
          place_name: data.features?.[0]?.place_name || `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`,
          center: coords,
          place_type: ['coordinate']
        };
        
        setSearchResults([coordinateResult]);
        setShowResults(true);
        setIsSearching(false);
        return;
      }

      // Search by address/place name
      const searchUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=place,locality,neighborhood,address,poi`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.features) {
        const results: SearchResult[] = data.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
          place_type: feature.place_type,
          context: feature.context
        }));
        
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debouncing
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setShowResults(false);
      setSearchResults([]);
    }
  };

  // Handle location selection
  const handleLocationSelect = (result: SearchResult) => {
    saveRecentSearch(result);
    
    if (searchMode === 'start') {
      setStartPoint({ coords: result.center, name: result.place_name });
    } else if (searchMode === 'end') {
      setEndPoint({ coords: result.center, name: result.place_name });
    } else {
      onLocationSelect(result.center, result.place_name);
    }
    
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
    
    // Auto-start navigation if both points are set
    if (searchMode === 'end' && startPoint) {
      onNavigationStart(startPoint.coords, result.center);
    } else if (searchMode === 'start' && endPoint) {
      onNavigationStart(result.center, endPoint.coords);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        
        if (searchMode === 'start') {
          setStartPoint({ coords, name: 'Current Location' });
        } else if (searchMode === 'end') {
          setEndPoint({ coords, name: 'Current Location' });
        } else {
          onLocationSelect(coords, 'Current Location');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Error getting your location. Please check your location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Clear navigation points
  const clearNavigation = () => {
    setStartPoint(null);
    setEndPoint(null);
    setSearchMode('search');
  };

  return (
    <div className={`${className}`}>
      {/* Navigation Mode Toggle */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={searchMode === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchMode('search')}
          className="flex-1"
        >
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
        <Button
          variant={searchMode === 'start' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchMode('start')}
          className="flex-1"
        >
          <MapPin className="h-4 w-4 mr-1" />
          From
        </Button>
        <Button
          variant={searchMode === 'end' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchMode('end')}
          className="flex-1"
        >
          <Navigation className="h-4 w-4 mr-1" />
          To
        </Button>
      </div>

      {/* Navigation Points Display */}
      {(startPoint || endPoint) && (
        <div className="bg-racing-steel/20 rounded-lg p-3 mb-3 space-y-2">
          {startPoint && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-racing-green rounded-full"></div>
                <span className="text-racing-green">From:</span>
                <span className="text-white/90">{startPoint.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setStartPoint(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {endPoint && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-racing-red rounded-full"></div>
                <span className="text-racing-red">To:</span>
                <span className="text-white/90">{endPoint.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setEndPoint(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => startPoint && endPoint && onNavigationStart(startPoint.coords, endPoint.coords)}
              disabled={!startPoint || !endPoint}
              className="flex-1 bg-racing-blue/20 hover:bg-racing-blue/30 text-racing-blue border border-racing-blue/30"
            >
              <Route className="h-3 w-3 mr-1" />
              Navigate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearNavigation}
              className="bg-racing-steel/20 border-racing-steel/30 text-white/70 hover:text-white"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            type="text"
            placeholder={
              searchMode === 'search' ? 'Search address or coordinates...' :
              searchMode === 'start' ? 'Search starting location...' :
              'Search destination...'
            }
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-10 pr-10 bg-racing-steel/20 border-racing-steel/30 text-white placeholder:text-white/50"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={getCurrentLocation}
            title="Use current location"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results */}
        {showResults && (searchResults.length > 0 || recentSearches.length > 0) && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 bg-racing-dark/95 backdrop-blur-md border-racing-steel/30 max-h-64 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className="p-2">
                <div className="text-xs text-racing-blue mb-2 px-2">Search Results</div>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleLocationSelect(result)}
                    className="w-full text-left p-2 rounded hover:bg-racing-steel/20 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-racing-blue mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-white text-sm">{result.place_name}</div>
                        {result.place_type[0] === 'coordinate' && (
                          <div className="text-racing-green text-xs">
                            {result.center[1].toFixed(6)}, {result.center[0].toFixed(6)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : recentSearches.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-racing-amber mb-2 px-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                {recentSearches.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleLocationSelect(result)}
                    className="w-full text-left p-2 rounded hover:bg-racing-steel/20 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-racing-amber mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-white text-sm">{result.place_name}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-racing-dark/95 backdrop-blur-md border border-racing-steel/30 rounded-lg p-3 text-center">
            <div className="text-racing-blue text-sm">Searching...</div>
          </div>
        )}
      </div>

      {/* Coordinate Input Help */}
      <div className="mt-2 text-xs text-white/50">
        <div>Try: "Times Square, NYC" or "40.7128, -74.0060"</div>
      </div>
    </div>
  );
}
