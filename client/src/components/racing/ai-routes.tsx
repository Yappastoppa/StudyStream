import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Route, Trophy, Navigation, Zap } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface RaceRoute {
  type: 'Feature';
  properties: {
    name: string;
    description: string;
    distance_km: number;
    distance_miles: number;
    roads?: string[];
    type: 'ai_generated' | 'ai_loop' | 'user_generated';
    difficulty?: string;
    loop?: boolean;
    center?: [number, number];
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

interface RouteCollection {
  type: 'FeatureCollection';
  features: RaceRoute[];
}

interface AIRoutesProps {
  map: any;
  onRouteSelect?: (route: RaceRoute) => void;
}

export function AIRoutes({ map, onRouteSelect }: AIRoutesProps) {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [routeLayers, setRouteLayers] = useState<Map<string, any>>(new Map());
  
  // Fetch AI-generated routes
  const { data: aiRoutes, isLoading: aiLoading } = useQuery<RouteCollection>({
    queryKey: ['/api/routes/nj'],
    enabled: !!map
  });
  
  // Fetch user-generated routes
  const { data: userRoutes, isLoading: userLoading } = useQuery<RouteCollection>({
    queryKey: ['/api/routes/user'],
    enabled: !!map
  });
  
  const allRoutes = [
    ...(aiRoutes?.features || []),
    ...(userRoutes?.features || [])
  ];
  
  useEffect(() => {
    if (!map || allRoutes.length === 0) return;
    
    // Clear existing route layers
    routeLayers.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(layerId)) {
        map.removeSource(layerId);
      }
    });
    
    const newLayers = new Map();
    
    // Add each route as a layer
    allRoutes.forEach((route, index) => {
      const layerId = `race-route-${index}`;
      
      // Add source
      map.addSource(layerId, {
        type: 'geojson',
        data: route
      });
      
      // Add line layer
      map.addLayer({
        id: layerId,
        type: 'line',
        source: layerId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': route.properties.type === 'ai_generated' ? '#ff6600' : 
                       route.properties.type === 'ai_loop' ? '#ff0066' : '#00ff88',
          'line-width': selectedRoute === layerId ? 6 : 4,
          'line-opacity': selectedRoute === layerId ? 1 : 0.6,
          'line-blur': selectedRoute === layerId ? 0 : 1
        }
      });
      
      // Add glow effect for selected route
      if (selectedRoute === layerId) {
        map.addLayer({
          id: `${layerId}-glow`,
          type: 'line',
          source: layerId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': route.properties.type === 'ai_generated' ? '#ff6600' : 
                         route.properties.type === 'ai_loop' ? '#ff0066' : '#00ff88',
            'line-width': 12,
            'line-opacity': 0.3,
            'line-blur': 3
          }
        }, layerId);
      }
      
      newLayers.set(layerId, layerId);
      
      // Add click handler
      map.on('click', layerId, () => {
        setSelectedRoute(layerId);
        if (onRouteSelect) {
          onRouteSelect(route);
        }
      });
      
      // Change cursor on hover
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });
    });
    
    setRouteLayers(newLayers);
    
    // Cleanup function
    return () => {
      newLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getLayer(`${layerId}-glow`)) {
          map.removeLayer(`${layerId}-glow`);
        }
        if (map.getSource(layerId)) {
          map.removeSource(layerId);
        }
      });
    };
  }, [map, allRoutes, selectedRoute]);
  
  if (aiLoading || userLoading) {
    return (
      <div className="absolute top-20 right-6 z-20 bg-black/80 backdrop-blur-sm rounded-lg p-4">
        <div className="text-white text-sm">Loading race routes...</div>
      </div>
    );
  }
  
  if (allRoutes.length === 0) {
    return null;
  }
  
  return (
    <div className="absolute top-20 right-6 z-20 bg-black/80 backdrop-blur-sm rounded-lg p-4 max-w-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Route className="w-4 h-4 text-racing-orange" />
          Race Routes
        </h3>
        <Badge className="bg-racing-orange/20 text-racing-orange border-racing-orange/30">
          {allRoutes.length} routes
        </Badge>
      </div>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {allRoutes.map((route, index) => {
          const layerId = `race-route-${index}`;
          const isSelected = selectedRoute === layerId;
          
          return (
            <div
              key={index}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-racing-orange/20 border border-racing-orange/50' 
                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
              }`}
              onClick={() => {
                setSelectedRoute(layerId);
                if (onRouteSelect) {
                  onRouteSelect(route);
                }
                
                // Zoom to route bounds
                const bounds = route.geometry.coordinates.reduce((bounds, coord) => {
                  return bounds.extend(coord);
                }, new (window as any).mapboxgl.LngLatBounds(
                  route.geometry.coordinates[0],
                  route.geometry.coordinates[0]
                ));
                
                map.fitBounds(bounds, { padding: 100 });
              }}
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="text-white font-medium text-sm">{route.properties.name}</h4>
                {route.properties.loop && (
                  <Badge className="bg-racing-blue/20 text-racing-blue text-xs">
                    Loop
                  </Badge>
                )}
              </div>
              
              <p className="text-gray-400 text-xs mb-2">{route.properties.description}</p>
              
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  {route.properties.distance_km.toFixed(1)}km
                </span>
                
                {route.properties.difficulty && (
                  <span className={`flex items-center gap-1 ${
                    route.properties.difficulty === 'extreme' ? 'text-red-400' :
                    route.properties.difficulty === 'hard' ? 'text-orange-400' :
                    route.properties.difficulty === 'medium' ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    <Zap className="w-3 h-3" />
                    {route.properties.difficulty}
                  </span>
                )}
                
                {route.properties.type === 'ai_generated' && (
                  <Badge className="bg-racing-orange/20 text-racing-orange text-xs">
                    AI
                  </Badge>
                )}
              </div>
              
              {route.properties.roads && route.properties.roads.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Roads: {route.properties.roads.slice(0, 3).join(', ')}
                  {route.properties.roads.length > 3 && '...'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-white/10">
        <Button
          onClick={async () => {
            try {
              const response = await fetch('/api/routes/nj/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  place: "Newark, New Jersey, USA",
                  numRoutes: 3
                })
              });
              
              if (response.ok) {
                queryClient.invalidateQueries({ queryKey: ['/api/routes/nj'] });
              }
            } catch (error) {
              console.error('Failed to generate new routes:', error);
            }
          }}
          className="w-full bg-racing-orange/20 hover:bg-racing-orange/30 text-racing-orange border border-racing-orange/50"
        >
          <Trophy className="w-4 h-4 mr-2" />
          Generate New Routes
        </Button>
      </div>
    </div>
  );
}