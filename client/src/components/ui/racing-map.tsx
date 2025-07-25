import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Navigation, 
  Satellite, 
  Zap, 
  Eye, 
  EyeOff, 
  Crosshair, 
  ZoomOut,
  Route,
  MapPin,
  Layers,
  Trophy,
  Pencil,
  Activity,
  Search,
  Users
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RacingMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onRouteSelect?: (route: any) => void;
  savedRoutes?: any[];
  onNavigationStart?: (start: [number, number], end: [number, number]) => void;
}

export function RacingMap({ 
  center = [-74.006, 40.7128], 
  zoom = 13, 
  className = "",
  onRouteSelect,
  savedRoutes = [],
  onNavigationStart
}: RacingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  // Map state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<'navigation' | 'satellite' | 'dark'>('dark');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any[]>([]);
  const [navigationMode, setNavigationMode] = useState(false);
  const [routeStart, setRouteStart] = useState<[number, number] | null>(null);
  const [routeEnd, setRouteEnd] = useState<[number, number] | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<any>(null);
  const [showOverlays, setShowOverlays] = useState(false);
  const [showAIRoutes, setShowAIRoutes] = useState(false);
  const [showRouteCreator, setShowRouteCreator] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showNearbyDrivers, setShowNearbyDrivers] = useState(false);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initializeMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        
        if (!MAPBOX_TOKEN) {
          console.error('Mapbox token not found');
          return;
        }

        mapboxgl.default.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: center,
          zoom: zoom,
          pitch: 45,
          bearing: -17.6
        });

        map.current.on('load', () => {
          setIsMapLoaded(true);
          console.log('Map loaded successfully');
        });

        map.current.on('error', (e: any) => {
          console.error('Map error:', e);
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const toggleMapStyle = (style: 'navigation' | 'satellite' | 'dark') => {
    if (!map.current) return;
    
    const styleUrls = {
      dark: 'mapbox://styles/mapbox/dark-v11',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      navigation: 'mapbox://styles/mapbox/navigation-day-v1'
    };
    
    map.current.setStyle(styleUrls[style]);
    setMapStyle(style);
  };

  const toggleTraffic = () => {
    if (!map.current) return;
    
    if (showTraffic) {
      if (map.current.getLayer('traffic')) {
        map.current.removeLayer('traffic');
        map.current.removeSource('traffic');
      }
    } else {
      map.current.addSource('traffic', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-traffic-v1'
      });
      
      map.current.addLayer({
        id: 'traffic',
        type: 'line',
        source: 'traffic',
        'source-layer': 'traffic',
        paint: {
          'line-width': 3,
          'line-color': [
            'case',
            ['==', ['get', 'congestion'], 'low'], '#00ff88',
            ['==', ['get', 'congestion'], 'moderate'], '#ffcc00',
            ['==', ['get', 'congestion'], 'heavy'], '#ff0033',
            '#ffffff'
          ],
          'line-opacity': 0.8
        }
      });
    }
    
    setShowTraffic(!showTraffic);
  };

  const toggleDensity = () => {
    setShowDensity(!showDensity);
  };

  const zoomToOverview = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: center,
      zoom: 10,
      pitch: 0,
      bearing: 0
    });
  };

  return (
    <div className="absolute inset-0 bg-racing-dark overflow-hidden">
      {/* Map Container - Full Background */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm border-b border-racing-steel/30">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">GHOSTRACER</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-500">ONLINE</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Range</div>
              <div className="text-sm text-white">2km</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Floating Control Hub - Evenly Distributed */}
      {isMapLoaded && (
        <>
          <div className="absolute top-0 right-0 h-full flex flex-col justify-between items-end p-6 pointer-events-none z-40" style={{ paddingTop: '80px', paddingBottom: '120px' }}>
            {/* Search & Navigation */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddressSearch(!showAddressSearch)}
              className={`h-12 w-12 hover:bg-blue-500/20 pointer-events-auto ${showAddressSearch ? 'bg-blue-600/30 text-blue-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Search Address"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            {/* AI Routes */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAIRoutes(!showAIRoutes)}
              className={`h-12 w-12 hover:bg-orange-500/20 pointer-events-auto ${showAIRoutes ? 'bg-orange-600/30 text-orange-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="AI Race Routes"
            >
              <Route className="h-5 w-5" />
            </Button>
            
            {/* Route Creator */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRouteCreator(!showRouteCreator)}
              className={`h-12 w-12 hover:bg-green-500/20 pointer-events-auto ${showRouteCreator ? 'bg-green-600/30 text-green-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Create Route"
            >
              <Pencil className="h-5 w-5" />
            </Button>
            
            {/* Activity Heatmap */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`h-12 w-12 hover:bg-red-500/20 pointer-events-auto ${showHeatmap ? 'bg-red-600/30 text-red-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Activity Heatmap"
            >
              <Activity className="h-5 w-5" />
            </Button>
            
            {/* Route Leaderboard */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`h-12 w-12 hover:bg-yellow-500/20 pointer-events-auto ${showLeaderboard ? 'bg-yellow-600/30 text-yellow-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Route Leaderboard"
            >
              <Trophy className="h-5 w-5" />
            </Button>
            
            {/* Nearby Drivers */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNearbyDrivers(!showNearbyDrivers)}
              className={`h-12 w-12 hover:bg-purple-500/20 pointer-events-auto ${showNearbyDrivers ? 'bg-purple-600/30 text-purple-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Nearby Drivers"
            >
              <Users className="h-5 w-5" />
            </Button>
            
            {/* Map Style Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleMapStyle('dark')}
              className={`h-12 w-12 hover:bg-blue-500/20 pointer-events-auto ${mapStyle === 'dark' ? 'bg-blue-600/30 text-blue-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Map Style"
            >
              <Layers className="h-5 w-5" />
            </Button>
          </div>

          {/* Speedometer - Bottom Left */}
          <div className="absolute bottom-6 left-6 z-30">
            <div className="bg-black/80 backdrop-blur-sm rounded-full p-6 border border-green-400/30">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">0</div>
                <div className="text-xs text-gray-400">MPH</div>
                <div className="text-xs text-gray-500 mt-1">0.0 mi</div>
              </div>
            </div>
          </div>

          {/* Map Controls - Bottom Right */}
          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTraffic}
              className={`h-10 w-10 hover:bg-blue-500/20 ${showTraffic ? 'bg-blue-600/30 text-blue-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Toggle Traffic"
            >
              <Zap className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDensity}
              className={`h-10 w-10 hover:bg-blue-500/20 ${showDensity ? 'bg-blue-600/30 text-blue-400' : 'text-white/70'} bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg`}
              title="Toggle Density"
            >
              {showDensity ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomToOverview}
              className="h-10 w-10 hover:bg-blue-500/20 text-white/70 bg-black/80 backdrop-blur-sm border border-white/10 rounded-lg"
              title="Overview"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Feature Panels - Conditionally Rendered */}
          {showAddressSearch && (
            <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="text-white mb-2">Address Search</div>
              <div className="text-sm text-gray-400">Search functionality will be implemented</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddressSearch(false)}
                className="mt-2 text-white/70"
              >
                Close
              </Button>
            </div>
          )}

          {showAIRoutes && (
            <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="text-white mb-2">AI Race Routes</div>
              <div className="text-sm text-gray-400">AI route generation will be implemented</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIRoutes(false)}
                className="mt-2 text-white/70"
              >
                Close
              </Button>
            </div>
          )}

          {showRouteCreator && (
            <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="text-white mb-2">Route Creator</div>
              <div className="text-sm text-gray-400">Route creation tools will be implemented</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRouteCreator(false)}
                className="mt-2 text-white/70"
              >
                Close
              </Button>
            </div>
          )}

          {showHeatmap && (
            <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="text-white mb-2">Activity Heatmap</div>
              <div className="text-sm text-gray-400">Heatmap visualization will be implemented</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHeatmap(false)}
                className="mt-2 text-white/70"
              >
                Close
              </Button>
            </div>
          )}

          {showLeaderboard && (
            <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="text-white mb-2">Route Leaderboard</div>
              <div className="text-sm text-gray-400">Leaderboard system will be implemented</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLeaderboard(false)}
                className="mt-2 text-white/70"
              >
                Close
              </Button>
            </div>
          )}

          {showNearbyDrivers && (
            <div className="absolute top-20 left-6 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <div className="text-white mb-2">Nearby Drivers</div>
              <div className="text-sm text-gray-400">Driver interaction features will be implemented</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNearbyDrivers(false)}
                className="mt-2 text-white/70"
              >
                Close
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}