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
  Layers,
  Trophy,
  Pencil,
  Activity
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { RouteOverlays, sampleOverlays } from '@/components/racing/route-overlays';
import { AIRoutes } from '@/components/racing/ai-routes';
import { RouteCreator } from '@/components/racing/route-creator';
import { SimulationMode } from '@/components/racing/simulation-mode';
import { RouteHeatmap } from '@/components/racing/route-heatmap';
import { RouteLeaderboard } from '@/components/racing/route-leaderboard';

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
  const [showHighwaysOnly, setShowHighwaysOnly] = useState(false);
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
        
        // Route drawing and navigation functionality
        map.current.on('click', (e: any) => {
          const coords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          
          if (isDrawingRoute) {
            setCurrentRoute(prev => [...prev, coords]);
            addRoutePoint(coords);
          } else if (navigationMode) {
            // Navigation mode: set start and end points
            if (!routeStart) {
              setRouteStart(coords);
              addNavigationMarker(coords, 'start');
            } else if (!routeEnd) {
              setRouteEnd(coords);
              addNavigationMarker(coords, 'end');
              // Auto-calculate route when both points are set
              calculateNavigationRoute(routeStart, coords);
            }
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
          10, 1.5,
          18, 4
        ],
        'line-color': [
          'match', 
          ['get', 'congestion'],
          'low', '#00ff88',        // Neon green
          'moderate', '#ffcc00',   // Bright yellow
          'heavy', '#ff6600',      // Bright orange
          'severe', '#ff0033',     // Bright red
          '#333333'                // Dark gray
        ],
        'line-opacity': 0.7,
        'line-blur': 1
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
  
  const addNavigationMarker = async (coords: [number, number], type: 'start' | 'end') => {
    if (!map.current) return;
    
    const mapboxgl = await import('mapbox-gl');
    
    // Remove existing marker if any
    const markerId = `navigation-${type}`;
    const existingMarker = (map.current as any)[markerId];
    if (existingMarker) {
      existingMarker.remove();
    }
    
    // Create custom marker element
    const el = document.createElement('div');
    el.className = 'navigation-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    
    if (type === 'start') {
      el.style.backgroundColor = '#00ff88';
      el.innerHTML = '<div style="color: black; font-weight: bold; text-align: center; line-height: 24px;">A</div>';
    } else {
      el.style.backgroundColor = '#ff0033';
      el.innerHTML = '<div style="color: white; font-weight: bold; text-align: center; line-height: 24px;">B</div>';
    }
    
    const marker = new mapboxgl.default.Marker(el)
      .setLngLat(coords)
      .addTo(map.current);
    
    // Store marker reference
    (map.current as any)[markerId] = marker;
  };
  
  const calculateNavigationRoute = async (start: [number, number], end: [number, number]) => {
    if (!map.current || !MAPBOX_TOKEN) return;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start.join(',')};${end.join(',')}?` +
        `geometries=geojson&steps=true&access_token=${MAPBOX_TOKEN}&overview=full&annotations=distance,duration,speed`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setNavigationRoute(route);
        
        // Add route to map
        if (map.current.getSource('navigation-route')) {
          (map.current.getSource('navigation-route') as any).setData({
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          });
        } else {
          map.current.addSource('navigation-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });
          
          // Add glow effect layer
          map.current.addLayer({
            id: 'navigation-route-glow',
            type: 'line',
            source: 'navigation-route',
            paint: {
              'line-color': '#00ff88',
              'line-width': 12,
              'line-opacity': 0.4,
              'line-blur': 3
            }
          });
          
          // Add main route layer
          map.current.addLayer({
            id: 'navigation-route-main',
            type: 'line',
            source: 'navigation-route',
            paint: {
              'line-color': '#00ff88',
              'line-width': 4,
              'line-opacity': 1
            }
          });
        }
        
        // Fit map to route bounds
        const bounds = new (await import('mapbox-gl')).default.LngLatBounds();
        route.geometry.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        map.current.fitBounds(bounds, { padding: 100 });
        
        // Notify parent component that navigation has started
        if (onNavigationStart) {
          onNavigationStart(start, end);
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };
  
  const clearNavigationRoute = () => {
    if (!map.current) return;
    
    // Remove route layers
    if (map.current.getLayer('navigation-route-main')) {
      map.current.removeLayer('navigation-route-main');
    }
    if (map.current.getLayer('navigation-route-glow')) {
      map.current.removeLayer('navigation-route-glow');
    }
    if (map.current.getSource('navigation-route')) {
      map.current.removeSource('navigation-route');
    }
    
    // Remove markers
    ['start', 'end'].forEach(type => {
      const markerId = `navigation-${type}`;
      const marker = (map.current as any)[markerId];
      if (marker) {
        marker.remove();
        delete (map.current as any)[markerId];
      }
    });
    
    setRouteStart(null);
    setRouteEnd(null);
    setNavigationRoute(null);
  };
  
  return (
    <div className={`relative w-screen h-screen ${className}`}>
      {/* Map container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full absolute inset-0" 
        style={{ minHeight: '100vh' }}
      />
      
      {/* Racing-style UI overlay */}
      {isMapLoaded && (
        <>
          {/* Map controls - vertical stack with proper spacing and overflow handling */}
          <div className="absolute left-4 top-1/4 flex flex-col gap-4 z-10 max-h-[70vh] overflow-y-auto pl-2 pb-4">
            {/* Map style buttons */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMapStyle('dark')}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${mapStyle === 'dark' ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Dark Mode"
              >
                <Layers className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMapStyle('satellite')}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${mapStyle === 'satellite' ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Satellite View"
              >
                <Satellite className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMapStyle('navigation')}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${mapStyle === 'navigation' ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Navigation View"
              >
                <Navigation className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Toggle controls */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTraffic}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showTraffic ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Toggle Traffic"
              >
                <Zap className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDensity}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showDensity ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Toggle Density"
              >
                {showDensity ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            </div>
            
            {/* Quick actions */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomToOverview}
                className="h-12 w-12 hover:bg-racing-blue/20 text-white/70 hover:text-white transition-all duration-200"
                title="Overview"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDrawingRoute(!isDrawingRoute)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${isDrawingRoute ? 'bg-racing-green/30 text-racing-green' : 'text-white/70 hover:text-white'}`}
                title="Draw Route"
              >
                <Route className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setNavigationMode(!navigationMode);
                  if (navigationMode) {
                    clearNavigationRoute();
                  }
                }}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${navigationMode ? 'bg-racing-blue/30 text-racing-blue' : 'text-white/70 hover:text-white'}`}
                title="Navigation Mode"
              >
                <MapPin className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Overlay controls */}
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex flex-col gap-2 min-w-[52px]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOverlays(!showOverlays)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showOverlays ? 'bg-racing-yellow/30 text-racing-yellow' : 'text-white/70 hover:text-white'}`}
                title="Route Overlays"
              >
                <Crosshair className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIRoutes(!showAIRoutes)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showAIRoutes ? 'bg-racing-orange/30 text-racing-orange' : 'text-white/70 hover:text-white'}`}
                title="AI Race Routes"
              >
                <Route className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRouteCreator(!showRouteCreator)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showRouteCreator ? 'bg-racing-green/30 text-racing-green' : 'text-white/70 hover:text-white'}`}
                title="Create Route"
              >
                <Pencil className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showHeatmap ? 'bg-racing-red/30 text-racing-red' : 'text-white/70 hover:text-white'}`}
                title="Activity Heatmap"
              >
                <Activity className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`h-12 w-12 hover:bg-racing-blue/20 transition-all duration-200 ${showLeaderboard ? 'bg-racing-yellow/30 text-racing-yellow' : 'text-white/70 hover:text-white'}`}
                title="Route Leaderboard"
              >
                <Trophy className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile responsive - show fewer buttons on small screens */}
            <div className="sm:hidden bg-black/70 backdrop-blur-sm rounded-lg p-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 hover:bg-racing-blue/20 text-white/70 hover:text-white transition-all duration-200"
                title="More Options"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                  <div className="w-1 h-1 bg-current rounded-full"></div>
                </div>
              </Button>
            </div>
          </div>
          
          {/* Route drawing dialog - centered popup */}
          {isDrawingRoute && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-racing-dark/95 backdrop-blur-md rounded-xl border border-racing-steel/30 p-6 shadow-2xl max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Route className="h-5 w-5 text-racing-green" />
                    Create Route
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsDrawingRoute(false);
                      setCurrentRoute([]);
                      // Clear current route display
                      map.current?.getSource('current-route').setData({
                        type: 'FeatureCollection',
                        features: []
                      });
                    }}
                    className="h-8 w-8 text-white/70 hover:text-white hover:bg-racing-steel/20"
                  >
                    ×
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-racing-green">
                    <div className="w-2 h-2 bg-racing-green rounded-full animate-pulse"></div>
                    <span className="text-sm">Click on the map to add route points</span>
                  </div>
                  
                  <div className="bg-racing-steel/20 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/70">Points added:</span>
                      <span className="text-racing-blue font-medium">{currentRoute.length}</span>
                    </div>
                    {currentRoute.length >= 2 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-white/70">Ready to save</span>
                        <span className="text-racing-green">✓</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={finishRoute}
                      disabled={currentRoute.length < 2}
                      className="flex-1 bg-racing-green/20 hover:bg-racing-green/30 text-racing-green border border-racing-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Route
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentRoute([]);
                        // Clear current route display
                        map.current?.getSource('current-route').setData({
                          type: 'FeatureCollection',
                          features: []
                        });
                      }}
                      className="bg-racing-steel/20 border-racing-steel/30 text-white/70 hover:text-white hover:bg-racing-steel/30"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation mode instructions */}
          {navigationMode && !routeEnd && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-black/80 backdrop-blur-sm rounded-full px-6 py-2 flex items-center space-x-3">
                <span className="text-xs text-racing-blue">
                  {!routeStart ? 'Click to set start point' : 'Click to set destination'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setNavigationMode(false);
                    clearNavigationRoute();
                  }}
                  className="h-6 w-6 text-white/70 hover:text-white"
                >
                  ×
                </Button>
              </div>
            </div>
          )}
          
          {/* Minimal traffic legend - bottom left corner */}
          {showTraffic && (
            <div className="absolute bottom-24 left-6 z-10">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#00ff88]"></div>
                    <span className="text-[10px] text-white/70">Clear</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#ffcc00]"></div>
                    <span className="text-[10px] text-white/70">Slow</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#ff0033]"></div>
                    <span className="text-[10px] text-white/70">Heavy</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Saved routes - minimal indicator */}
          {savedRoutes.length > 0 && (
            <div className="absolute top-2 right-6 z-10">
              <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-2">
                <Route className="h-3 w-3 text-racing-green" />
                <span className="text-xs text-white/70">{savedRoutes.length} routes</span>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Route Overlays */}
      <RouteOverlays 
        map={map.current}
        overlays={sampleOverlays}
        showOverlays={showOverlays}
      />
      
      {/* AI Routes Panel */}
      {showAIRoutes && (
        <AIRoutes 
          map={map.current}
          onRouteSelect={(route) => {
            console.log('Selected route:', route);
          }}
        />
      )}
      
      {/* Route Creator */}
      <RouteCreator 
        map={map.current}
        isActive={showRouteCreator}
        onClose={() => setShowRouteCreator(false)}
      />
      
      {/* Simulation Mode */}
      <SimulationMode 
        map={map.current}
        isActive={showSimulation}
        onToggle={() => setShowSimulation(!showSimulation)}
      />
      
      {/* Route Heatmap */}
      <RouteHeatmap 
        map={map.current}
        isActive={showHeatmap}
      />
      
      {/* Route Leaderboard */}
      {showLeaderboard && (
        <RouteLeaderboard 
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  );
}