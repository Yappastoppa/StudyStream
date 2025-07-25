import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Navigation, 
  Satellite, 
  Zap, 
  Eye, 
  EyeOff, 
  Crosshair, 
  ZoomIn, 
  ZoomOut,
  Route,
  MapPin,
  Layers
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface RacingMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  onRouteSelect?: (route: any) => void;
  savedRoutes?: any[];
}

export function RacingMap({ 
  center = [-74.006, 40.7128], 
  zoom = 13, 
  className = "",
  onRouteSelect,
  savedRoutes = []
}: RacingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  
  // Map state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<'navigation' | 'satellite' | 'dark'>('navigation');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const [showHighwaysOnly, setShowHighwaysOnly] = useState(false);
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any[]>([]);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  
  // Map style configurations
  const mapStyles = {
    navigation: 'mapbox://styles/mapbox/navigation-day-v1',
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12', 
    dark: 'mapbox://styles/mapbox/dark-v11'
  };
  
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    const initMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = MAPBOX_TOKEN;
        
        map.current = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: mapStyles[mapStyle],
          center: center,
          zoom: zoom,
          pitch: 0,
          bearing: 0
        });
        
        map.current.on('load', () => {
          setIsMapLoaded(true);
          setupMapLayers();
          setupMapControls();
        });
        
        // Route drawing functionality
        map.current.on('click', (e: any) => {
          if (isDrawingRoute) {
            const coords = [e.lngLat.lng, e.lngLat.lat];
            setCurrentRoute(prev => [...prev, coords]);
            addRoutePoint(coords);
          }
        });
        
      } catch (error) {
        console.error('Failed to initialize racing map:', error);
      }
    };
    
    setTimeout(initMap, 100);
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  
  const setupMapLayers = () => {
    if (!map.current) return;
    
    // Add traffic layer
    map.current.addSource('traffic', {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-traffic-v1'
    });
    
    map.current.addLayer({
      id: 'traffic-congestion',
      type: 'line',
      source: 'traffic',
      'source-layer': 'traffic',
      layout: {
        'visibility': showTraffic ? 'visible' : 'none'
      },
      paint: {
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 2,
          18, 6
        ],
        'line-color': [
          'match', 
          ['get', 'congestion'],
          'low', '#00ff41',        // Racing green
          'moderate', '#ffff00',   // Warning yellow
          'heavy', '#ff8c00',      // Racing orange
          'severe', '#ff0000',     // Danger red
          '#666666'                // Default gray
        ],
        'line-opacity': 0.8
      }
    });
    
    // Add population density overlay (choropleth style)
    map.current.addSource('population-density', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: generateDensityData() // Simulated density data
      }
    });
    
    map.current.addLayer({
      id: 'population-density',
      type: 'fill',
      source: 'population-density',
      layout: {
        'visibility': showDensity ? 'visible' : 'none'
      },
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'density'],
          0, 'rgba(0, 255, 0, 0.1)',      // Low density - green
          50, 'rgba(255, 255, 0, 0.2)',   // Medium density - yellow
          100, 'rgba(255, 0, 0, 0.3)'     // High density - red
        ],
        'fill-opacity': 0.6
      }
    });
    
    // Add route drawing source
    map.current.addSource('current-route', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
    
    map.current.addLayer({
      id: 'current-route',
      type: 'line',
      source: 'current-route',
      paint: {
        'line-color': '#00ff41',
        'line-width': 6,
        'line-opacity': 0.9
      }
    });
    
    // Add saved routes
    savedRoutes.forEach((route, index) => {
      addSavedRoute(route, index);
    });
  };
  
  const setupMapControls = async () => {
    if (!map.current) return;
    
    const mapboxgl = await import('mapbox-gl');
    
    // Add navigation controls
    map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
    
    // Add geolocate control
    map.current.addControl(
      new mapboxgl.default.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );
  };
  
  const generateDensityData = () => {
    // Generate simulated population density polygons
    const features = [];
    const bounds = [
      [-74.1, 40.6], // SW
      [-73.9, 40.8]  // NE  
    ];
    
    for (let i = 0; i < 20; i++) {
      const lng1 = bounds[0][0] + Math.random() * (bounds[1][0] - bounds[0][0]);
      const lat1 = bounds[0][1] + Math.random() * (bounds[1][1] - bounds[0][1]);
      const lng2 = lng1 + 0.02;
      const lat2 = lat1 + 0.02;
      
      features.push({
        type: 'Feature',
        properties: {
          density: Math.random() * 100
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2],
            [lng1, lat1]
          ]]
        }
      });
    }
    
    return features;
  };
  
  const addRoutePoint = (coords: [number, number]) => {
    if (!map.current) return;
    
    const routeData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: currentRoute.concat([coords])
        }
      }]
    };
    
    map.current.getSource('current-route').setData(routeData);
  };
  
  const addSavedRoute = (route: any, index: number) => {
    if (!map.current) return;
    
    map.current.addSource(`saved-route-${index}`, {
      type: 'geojson',
      data: route.data
    });
    
    // Glow effect with multiple layers
    map.current.addLayer({
      id: `saved-route-glow-${index}`,
      type: 'line',
      source: `saved-route-${index}`,
      paint: {
        'line-color': route.color || '#ff6b35',
        'line-width': 12,
        'line-opacity': 0.3,
        'line-blur': 3
      }
    });
    
    map.current.addLayer({
      id: `saved-route-${index}`,
      type: 'line',
      source: `saved-route-${index}`,
      paint: {
        'line-color': route.color || '#ff6b35',
        'line-width': 4,
        'line-opacity': 1
      }
    });
  };
  
  const toggleMapStyle = (newStyle: 'navigation' | 'satellite' | 'dark') => {
    if (!map.current) return;
    setMapStyle(newStyle);
    map.current.setStyle(mapStyles[newStyle]);
    
    // Restore layers after style change
    map.current.once('styledata', () => {
      setupMapLayers();
    });
  };
  
  const toggleTraffic = () => {
    if (!map.current) return;
    const newVisibility = !showTraffic;
    setShowTraffic(newVisibility);
    map.current.setLayoutProperty(
      'traffic-congestion', 
      'visibility', 
      newVisibility ? 'visible' : 'none'
    );
  };
  
  const toggleDensity = () => {
    if (!map.current) return;
    const newVisibility = !showDensity;
    setShowDensity(newVisibility);
    map.current.setLayoutProperty(
      'population-density', 
      'visibility', 
      newVisibility ? 'visible' : 'none'
    );
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
  
  const finishRoute = () => {
    if (currentRoute.length < 2) return;
    
    const newRoute = {
      name: `Route ${Date.now()}`,
      color: '#ff6b35',
      data: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { name: `Route ${Date.now()}` },
          geometry: {
            type: 'LineString',
            coordinates: currentRoute
          }
        }]
      }
    };
    
    onRouteSelect?.(newRoute);
    setIsDrawingRoute(false);
    setCurrentRoute([]);
    
    // Clear current route display
    map.current?.getSource('current-route').setData({
      type: 'FeatureCollection',
      features: []
    });
  };
  
  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ minHeight: '400px' }}
      />
      
      {/* Racing-style UI overlay */}
      {isMapLoaded && (
        <>
          {/* Top control bar */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-racing-dark/90 backdrop-blur-sm border border-racing-steel/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                {/* Map style selector */}
                <div className="flex space-x-2">
                  <Button
                    variant={mapStyle === 'navigation' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMapStyle('navigation')}
                    className="text-xs"
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    NAV
                  </Button>
                  <Button
                    variant={mapStyle === 'satellite' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMapStyle('satellite')}
                    className="text-xs"
                  >
                    <Satellite className="w-3 h-3 mr-1" />
                    SAT
                  </Button>
                  <Button
                    variant={mapStyle === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMapStyle('dark')}
                    className="text-xs"
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    DARK
                  </Button>
                </div>
                
                {/* Overlay toggles */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-racing-gray">TRAFFIC</label>
                    <Switch
                      checked={showTraffic}
                      onCheckedChange={toggleTraffic}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-racing-gray">DENSITY</label>
                    <Switch
                      checked={showDensity}
                      onCheckedChange={toggleDensity}
                      className="scale-75"
                    />
                  </div>
                </div>
                
                {/* Quick actions */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomToOverview}
                    className="text-xs"
                  >
                    <ZoomOut className="w-3 h-3 mr-1" />
                    OVERVIEW
                  </Button>
                  <Button
                    variant={isDrawingRoute ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setIsDrawingRoute(!isDrawingRoute)}
                    className="text-xs"
                  >
                    <Route className="w-3 h-3 mr-1" />
                    {isDrawingRoute ? 'DRAWING' : 'ROUTE'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Route drawing instructions */}
          {isDrawingRoute && (
            <div className="absolute top-20 left-4 right-4 z-10">
              <div className="bg-racing-blue/90 backdrop-blur-sm border border-racing-blue/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white">
                    Click on the map to add route points
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={finishRoute}
                      disabled={currentRoute.length < 2}
                      className="text-xs"
                    >
                      SAVE ROUTE
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDrawingRoute(false);
                        setCurrentRoute([]);
                      }}
                      className="text-xs"
                    >
                      CANCEL
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Traffic legend */}
          {showTraffic && (
            <div className="absolute bottom-4 left-4 z-10">
              <div className="bg-racing-dark/90 backdrop-blur-sm border border-racing-steel/30 rounded-lg p-3">
                <div className="text-xs text-racing-gray mb-2">TRAFFIC</div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-1 bg-racing-green"></div>
                    <span className="text-xs text-white">Free Flow</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-1 bg-yellow-400"></div>
                    <span className="text-xs text-white">Moderate</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-1 bg-orange-400"></div>
                    <span className="text-xs text-white">Heavy</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-1 bg-racing-red"></div>
                    <span className="text-xs text-white">Severe</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Saved routes panel */}
          {savedRoutes.length > 0 && (
            <div className="absolute bottom-4 right-4 z-10">
              <div className="bg-racing-dark/90 backdrop-blur-sm border border-racing-steel/30 rounded-lg p-3">
                <div className="text-xs text-racing-gray mb-2">SAVED ROUTES</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {savedRoutes.map((route, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-1 rounded"
                        style={{ backgroundColor: route.color || '#ff6b35' }}
                      ></div>
                      <span className="text-xs text-white truncate">
                        {route.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}