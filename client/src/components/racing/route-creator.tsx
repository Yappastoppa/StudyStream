import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Save, X, MapPin, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface RouteCreatorProps {
  map: any;
  isActive: boolean;
  onClose: () => void;
}

export function RouteCreator({ map, isActive, onClose }: RouteCreatorProps) {
  const { toast } = useToast();
  const [isDrawing, setIsDrawing] = useState(false);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [routeTags, setRouteTags] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [routeDistance, setRouteDistance] = useState(0);
  
  useEffect(() => {
    if (!map || !isActive) return;
    
    const handleMapClick = async (e: any) => {
      if (!isDrawing) return;
      
      const lngLat = e.lngLat;
      const newPoints = [...routePoints, [lngLat.lng, lngLat.lat]];
      setRoutePoints(newPoints);
      
      // Update route line on map
      if (map.getSource('drawing-route')) {
        map.getSource('drawing-route').setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: newPoints
          }
        });
      } else {
        // Add initial source and layer
        map.addSource('drawing-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: newPoints
            }
          }
        });
        
        map.addLayer({
          id: 'drawing-route',
          type: 'line',
          source: 'drawing-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#00ff88',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }
      
      // Calculate distance
      if (newPoints.length > 1) {
        let distance = 0;
        for (let i = 1; i < newPoints.length; i++) {
          const [lng1, lat1] = newPoints[i - 1];
          const [lng2, lat2] = newPoints[i];
          // Haversine formula for distance
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance += R * c;
        }
        setRouteDistance(distance);
      }
    };
    
    map.on('click', handleMapClick);
    
    // Change cursor when drawing
    if (isDrawing) {
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
    }
    
    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
      
      // Clean up drawing layer
      if (map.getLayer('drawing-route')) {
        map.removeLayer('drawing-route');
      }
      if (map.getSource('drawing-route')) {
        map.removeSource('drawing-route');
      }
    };
  }, [map, isActive, isDrawing, routePoints]);
  
  const handleSaveRoute = async () => {
    if (routePoints.length < 2) {
      toast({
        title: "Invalid Route",
        description: "Please draw a route with at least 2 points",
        variant: "destructive"
      });
      return;
    }
    
    if (!routeName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your route",
        variant: "destructive"
      });
      return;
    }
    
    const routeData = {
      type: 'Feature' as const,
      properties: {
        name: routeName,
        description: routeDescription || `User-created ${routeDistance.toFixed(1)}km route`,
        distance_km: routeDistance,
        distance_miles: routeDistance * 0.621371,
        difficulty,
        tags: routeTags,
        created_at: new Date().toISOString()
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: routePoints
      }
    };
    
    try {
      await apiRequest('/api/routes/user', {
        method: 'POST',
        body: JSON.stringify(routeData)
      });
      
      toast({
        title: "Route Saved!",
        description: `${routeName} has been added to your routes`,
      });
      
      // Refresh routes
      queryClient.invalidateQueries({ queryKey: ['/api/routes/user'] });
      
      // Reset form
      setRoutePoints([]);
      setRouteName('');
      setRouteDescription('');
      setRouteTags([]);
      setDifficulty('medium');
      setIsDrawing(false);
      onClose();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save route",
        variant: "destructive"
      });
    }
  };
  
  const addTag = (tag: string) => {
    if (tag && !routeTags.includes(tag)) {
      setRouteTags([...routeTags, tag]);
    }
  };
  
  if (!isActive) return null;
  
  return (
    <div className="absolute top-20 left-6 z-30 bg-black/90 backdrop-blur-sm rounded-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Pencil className="w-4 h-4 text-racing-green" />
          Create Custom Route
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
      
      {!isDrawing ? (
        <div className="space-y-4">
          <Button
            onClick={() => setIsDrawing(true)}
            className="w-full bg-racing-green/20 hover:bg-racing-green/30 text-racing-green border border-racing-green/50"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Start Drawing Route
          </Button>
          
          <p className="text-xs text-gray-400">
            Click the button above, then click on the map to draw your route point by point.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Points: {routePoints.length}</span>
            <span className="text-racing-green">{routeDistance.toFixed(1)}km</span>
          </div>
          
          <Button
            onClick={() => setIsDrawing(false)}
            className="w-full bg-racing-blue/20 hover:bg-racing-blue/30 text-racing-blue border border-racing-blue/50"
            disabled={routePoints.length < 2}
          >
            <Flag className="w-4 h-4 mr-2" />
            Finish Drawing
          </Button>
          
          {routePoints.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => {
                setRoutePoints(routePoints.slice(0, -1));
                // Update map
                if (map.getSource('drawing-route')) {
                  map.getSource('drawing-route').setData({
                    type: 'Feature',
                    geometry: {
                      type: 'LineString',
                      coordinates: routePoints.slice(0, -1)
                    }
                  });
                }
              }}
              className="w-full text-sm text-gray-400 hover:text-white"
            >
              Undo Last Point
            </Button>
          )}
        </div>
      )}
      
      {!isDrawing && routePoints.length >= 2 && (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="route-name" className="text-gray-400 text-xs">Route Name *</Label>
            <Input
              id="route-name"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Night Cruise Circuit"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="route-desc" className="text-gray-400 text-xs">Description</Label>
            <Input
              id="route-desc"
              value={routeDescription}
              onChange={(e) => setRouteDescription(e.target.value)}
              placeholder="Fast highway section with scenic views"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="difficulty" className="text-gray-400 text-xs">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-racing-dark border-racing-steel/30">
                <SelectItem value="easy" className="text-green-400">Easy</SelectItem>
                <SelectItem value="medium" className="text-yellow-400">Medium</SelectItem>
                <SelectItem value="hard" className="text-orange-400">Hard</SelectItem>
                <SelectItem value="extreme" className="text-red-400">Extreme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-gray-400 text-xs">Quick Tags</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {['scenic', 'fast', 'technical', 'night', 'highway', 'twisty'].map(tag => (
                <Button
                  key={tag}
                  variant="ghost"
                  size="sm"
                  onClick={() => addTag(tag)}
                  className={`h-6 text-xs ${
                    routeTags.includes(tag) 
                      ? 'bg-racing-blue/30 text-racing-blue' 
                      : 'bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
          
          <Button
            onClick={handleSaveRoute}
            className="w-full bg-racing-green hover:bg-racing-green/80 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Route
          </Button>
        </div>
      )}
    </div>
  );
}