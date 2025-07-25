import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  X, 
  MapPin, 
  Clock, 
  Navigation,
  Star,
  Home,
  Briefcase
} from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number];
  type: 'place' | 'recent' | 'favorite';
  distance?: string;
}

interface FloatingSearchProps {
  isVisible: boolean;
  onClose: () => void;
  onDestinationSelect: (destination: SearchResult) => void;
  onPlaceSearch?: (query: string) => Promise<SearchResult[]>;
  className?: string;
}

export function FloatingSearch({
  isVisible,
  onClose,
  onDestinationSelect,
  onPlaceSearch,
  className = ""
}: FloatingSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sample recent/favorite places
  const quickResults: SearchResult[] = [
    {
      id: 'home',
      name: 'Home',
      address: '123 Main St, Jersey City, NJ',
      coordinates: [-74.0431, 40.7282],
      type: 'favorite'
    },
    {
      id: 'work',
      name: 'Work',
      address: '456 Business Ave, New York, NY',
      coordinates: [-74.0060, 40.7128],
      type: 'favorite'
    },
    {
      id: 'recent1',
      name: 'Liberty State Park',
      address: 'Jersey City, NJ 07305',
      coordinates: [-74.0431, 40.7048],
      type: 'recent'
    }
  ];

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
    const searchPlaces = async () => {
      if (!query.trim()) {
        setResults(quickResults);
        return;
      }

      setIsSearching(true);
      try {
        if (onPlaceSearch) {
          const searchResults = await onPlaceSearch(query);
          setResults(searchResults);
        } else {
          // Fallback: filter quick results
          const filtered = quickResults.filter(place =>
            place.name.toLowerCase().includes(query.toLowerCase()) ||
            place.address.toLowerCase().includes(query.toLowerCase())
          );
          setResults(filtered);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchPlaces, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, onPlaceSearch]);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'favorite':
        return <Star className="h-4 w-4 text-racing-yellow" />;
      case 'recent':
        return <Clock className="h-4 w-4 text-white/60" />;
      default:
        return <MapPin className="h-4 w-4 text-racing-blue" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 pointer-events-none ${className}`}>
      {/* Semi-transparent backdrop - only for touch areas */}
      <div 
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Floating search overlay */}
      <div className="absolute top-4 left-4 right-4 pointer-events-auto animate-in slide-in-from-top duration-300">
        <Card className="bg-black/95 backdrop-blur-lg border-white/20 shadow-2xl">
          <CardContent className="p-0">
            {/* Search input header */}
            <div className="flex items-center p-4 border-b border-white/10">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/60" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for places..."
                  className="pl-10 bg-racing-steel/20 border-white/20 text-white placeholder:text-white/60 focus:border-racing-blue/50 focus:ring-racing-blue/20"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="ml-3 h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Search results */}
            <div className="max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center">
                  <div className="text-white/60">Searching...</div>
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        onDestinationSelect(result);
                        onClose();
                      }}
                      className="w-full p-4 text-left hover:bg-white/5 transition-colors duration-200 flex items-center space-x-3"
                    >
                      <div className="flex-shrink-0">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">
                          {result.name}
                        </div>
                        <div className="text-white/60 text-sm truncate">
                          {result.address}
                        </div>
                      </div>
                      {result.distance && (
                        <div className="text-racing-blue text-sm font-medium">
                          {result.distance}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="p-4 text-center">
                  <div className="text-white/60">No places found</div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="text-white/60 text-sm mb-3">Quick access</div>
                  <div className="space-y-2">
                    {quickResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          onDestinationSelect(result);
                          onClose();
                        }}
                        className="w-full p-3 text-left hover:bg-white/5 transition-colors duration-200 flex items-center space-x-3 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {getResultIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {result.name}
                          </div>
                          <div className="text-white/60 text-sm truncate">
                            {result.address}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}