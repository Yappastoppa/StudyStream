
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
  Crosshair,
  Loader2
} from 'lucide-react';

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
  context?: any[];
  distance?: number;
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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // Get user location for distance sorting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.log('Location access denied or unavailable');
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.slice(0, 3)); // Show only top 3 recent
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

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (point2[1] - point1[1]) * Math.PI / 180;
    const dLon = (point2[0] - point1[0]) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1[1] * Math.PI / 180) * Math.cos(point2[1] * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Parse coordinate input (supports various formats)
  const parseCoordinates = (input: string): [number, number] | null => {
    const cleaned = input.trim().replace(/\s+/g, ' ');
    
    const patterns = [
      /^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/,
      /^\((-?\d+\.?\d*),?\s*(-?\d+\.?\d*)\)$/,
      /^lat:\s*(-?\d+\.?\d*),?\s*lng:\s*(-?\d+\.?\d*)$/i,
      /^lng:\s*(-?\d+\.?\d*),?\s*lat:\s*(-?\d+\.?\d*)$/i,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        let lat, lng;
        
        if (pattern.source.includes('lng.*lat')) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        } else {
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        }

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return [lng, lat];
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
        const reverseUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(reverseUrl);
        const data = await response.json();
        
        const coordinateResult: SearchResult = {
          id: `coords-${coords[0]}-${coords[1]}`,
          place_name: data.features?.[0]?.place_name || `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`,
          center: coords,
          place_type: ['coordinate'],
          distance: userLocation ? calculateDistance(userLocation, coords) : 0
        };
        
        setSearchResults([coordinateResult]);
        setShowResults(true);
        setIsSearching(false);
        return;
      }

      // Search by address/place name
      const searchUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=8&types=place,locality,neighborhood,address,poi`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.features) {
        let results: SearchResult[] = data.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
          place_type: feature.place_type,
          context: feature.context,
          distance: userLocation ? calculateDistance(userLocation, feature.center) : 0
        }));

        // Sort by distance if user location is available
        if (userLocation) {
          results = results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        
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
      setShowResults(true);
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else if (value.length === 0) {
      setShowResults(false);
      setSearchResults([]);
    } else {
      setShowResults(value.length === 0 && recentSearches.length > 0);
    }
  };

  // Handle location selection
  const handleLocationSelect = (result: SearchResult) => {
    saveRecentSearch(result);
    onLocationSelect(result.center, result.place_name);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
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
        onLocationSelect(coords, 'Current Location');
        setSearchQuery('');
        setShowResults(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Error getting your location. Please check your location permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance.toFixed(1)}km`;
    } else {
      return `${Math.round(distance)}km`;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
          <Input
            type="text"
            placeholder="Search places, addresses, or coordinates..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setShowResults(searchQuery.length >= 2 || recentSearches.length > 0)}
            className="pl-12 pr-12 h-12 bg-racing-dark/95 backdrop-blur-md border-racing-steel/30 text-white placeholder:text-white/60 text-base rounded-xl shadow-2xl focus:ring-2 focus:ring-racing-blue/50 focus:border-racing-blue/50"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-racing-blue/20"
            onClick={getCurrentLocation}
            title="Use current location"
          >
            <Crosshair className="h-4 w-4 text-white/60" />
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <Card className="absolute top-full left-0 right-0 mt-2 z-50 bg-racing-dark/98 backdrop-blur-xl border-racing-steel/30 shadow-2xl rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            {isSearching && (
              <div className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-racing-blue" />
                  <span className="text-sm text-racing-blue">Searching...</span>
                </div>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-racing-blue mb-2 px-3 py-1 flex items-center gap-2">
                  <Search className="h-3 w-3" />
                  Search Results
                  {userLocation && <span className="text-white/50">• Sorted by distance</span>}
                </div>
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleLocationSelect(result)}
                    className="w-full text-left p-3 rounded-lg hover:bg-racing-steel/20 transition-all duration-150 flex items-start justify-between group"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-racing-blue mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate group-hover:text-racing-blue transition-colors">
                          {result.place_name.split(',')[0]}
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          {result.place_name.split(',').slice(1).join(',').trim()}
                        </div>
                        {result.place_type[0] === 'coordinate' && (
                          <div className="text-racing-green text-xs mt-1">
                            {result.center[1].toFixed(6)}, {result.center[0].toFixed(6)}
                          </div>
                        )}
                      </div>
                    </div>
                    {userLocation && result.distance && (
                      <div className="text-xs text-white/50 flex-shrink-0 ml-2">
                        {formatDistance(result.distance)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="p-4 text-center">
                <div className="text-white/60 text-sm">No results found for "{searchQuery}"</div>
                <div className="text-white/40 text-xs mt-1">
                  Try searching for a city, address, or coordinates
                </div>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery.length < 2 && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="text-xs text-racing-amber mb-2 px-3 py-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                {recentSearches.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleLocationSelect(result)}
                    className="w-full text-left p-3 rounded-lg hover:bg-racing-steel/20 transition-all duration-150 flex items-start justify-between group"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-racing-amber mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate group-hover:text-racing-amber transition-colors">
                          {result.place_name.split(',')[0]}
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          {result.place_name.split(',').slice(1).join(',').trim()}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
