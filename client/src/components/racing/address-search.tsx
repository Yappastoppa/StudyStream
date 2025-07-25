import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, X, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  geometry: {
    coordinates: [number, number];
  };
}

interface AddressSearchProps {
  map: any;
  onLocationSelect: (location: [number, number], name: string) => void;
  onClose: () => void;
}

export function AddressSearch({ map, onLocationSelect, onClose }: AddressSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  
  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchTerm.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);
  
  const performSearch = async (query: string) => {
    if (!MAPBOX_TOKEN) {
      toast({
        title: "Search Unavailable",
        description: "Mapbox token required for address search",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Check if it's coordinates first (lat,lng or lng,lat format)
      const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const [, first, second] = coordMatch;
        const lat = parseFloat(first);
        const lng = parseFloat(second);
        
        // Determine if it's lat,lng or lng,lat based on valid ranges
        let finalLat, finalLng;
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          finalLat = lat;
          finalLng = lng;
        } else if (lng >= -90 && lng <= 90 && lat >= -180 && lat <= 180) {
          finalLat = lng;
          finalLng = lat;
        } else {
          throw new Error('Invalid coordinates');
        }
        
        const coordinateResult: SearchResult = {
          id: 'coordinates',
          place_name: `${finalLat.toFixed(6)}, ${finalLng.toFixed(6)}`,
          center: [finalLng, finalLat],
          geometry: {
            coordinates: [finalLng, finalLat]
          }
        };
        
        setResults([coordinateResult]);
        setShowResults(true);
        setIsSearching(false);
        return;
      }
      
      // Regular address search using Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` + 
        new URLSearchParams({
          access_token: MAPBOX_TOKEN,
          country: 'US',
          proximity: '-74.0,40.7', // Bias towards NYC/NJ area
          types: 'place,postcode,address,poi',
          limit: '5'
        })
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      setResults(data.features || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: "Could not search for that location",
        variant: "destructive"
      });
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const selectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    onLocationSelect([lng, lat], result.place_name);
    setShowResults(false);
    setSearchTerm('');
    onClose();
    
    // Focus map on selected location
    if (map) {
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 2000
      });
    }
  };
  
  return (
    <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Search className="w-4 h-4 text-racing-blue" />
          Navigate To
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-white/70 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search address or coordinates (40.7,-74.0)"
          className="bg-white/10 border-white/20 text-white pl-10"
          autoFocus
        />
        <Search className="absolute left-3 top-3 w-4 h-4 text-white/50" />
        {isSearching && (
          <div className="absolute right-3 top-3 w-4 h-4 border-2 border-racing-blue border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      
      {showResults && results.length > 0 && (
        <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => selectLocation(result)}
              className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-racing-green mt-0.5 group-hover:text-racing-blue transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {result.place_name}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {result.center[1].toFixed(4)}, {result.center[0].toFixed(4)}
                  </p>
                </div>
                <Navigation className="w-3 h-3 text-white/50 group-hover:text-racing-blue transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
      
      {showResults && results.length === 0 && !isSearching && searchTerm.length >= 3 && (
        <div className="mt-3 p-3 text-center text-gray-400 text-sm">
          No results found for "{searchTerm}"
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-500">
        <p>💡 Try searching for:</p>
        <p>• Address: "123 Main St, Jersey City"</p>
        <p>• Coordinates: "40.7282,-74.0776"</p>
        <p>• Place: "Liberty State Park"</p>
      </div>
    </div>
  );
}