import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, Clock, Users } from 'lucide-react';

interface RouteHeatmapProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
  map: any;
}

export function RouteHeatmap({ 
  isVisible, 
  onToggle,
  className = "",
  map
}: RouteHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState('24h');

  useEffect(() => {
    if (!map) return;
    
    if (!isVisible) {
      // Remove heatmap layer when inactive
      if (map.getLayer && map.getLayer('racing-heatmap')) {
        map.removeLayer('racing-heatmap');
      }
      if (map.getSource && map.getSource('racing-heatmap')) {
        map.removeSource('racing-heatmap');
      }
      return;
    }
    
    // Generate sample heatmap data for NJ racing areas
    const heatmapData = {
      type: 'FeatureCollection',
      features: [
        // High activity areas - major highways
        { type: 'Feature', properties: { intensity: 0.9 }, geometry: { type: 'Point', coordinates: [-74.0776, 40.7282] } },
        { type: 'Feature', properties: { intensity: 0.8 }, geometry: { type: 'Point', coordinates: [-74.0934, 40.7402] } },
        { type: 'Feature', properties: { intensity: 0.85 }, geometry: { type: 'Point', coordinates: [-74.1156, 40.7655] } },
        { type: 'Feature', properties: { intensity: 0.7 }, geometry: { type: 'Point', coordinates: [-74.0565, 40.7089] } },
        { type: 'Feature', properties: { intensity: 0.75 }, geometry: { type: 'Point', coordinates: [-74.1687, 40.6895] } },
        
        // Medium activity areas
        { type: 'Feature', properties: { intensity: 0.6 }, geometry: { type: 'Point', coordinates: [-74.0423, 40.7012] } },
        { type: 'Feature', properties: { intensity: 0.5 }, geometry: { type: 'Point', coordinates: [-74.0889, 40.7289] } },
        { type: 'Feature', properties: { intensity: 0.55 }, geometry: { type: 'Point', coordinates: [-74.1234, 40.7456] } },
        { type: 'Feature', properties: { intensity: 0.45 }, geometry: { type: 'Point', coordinates: [-74.0312, 40.7189] } },
        
        // Low activity areas
        { type: 'Feature', properties: { intensity: 0.3 }, geometry: { type: 'Point', coordinates: [-74.0145, 40.6989] } },
        { type: 'Feature', properties: { intensity: 0.35 }, geometry: { type: 'Point', coordinates: [-74.1456, 40.7234] } },
        { type: 'Feature', properties: { intensity: 0.25 }, geometry: { type: 'Point', coordinates: [-74.0678, 40.7567] } },
        
        // Add more points to create a realistic heatmap
        ...Array.from({ length: 50 }, () => ({
          type: 'Feature' as const,
          properties: { 
            intensity: Math.random() * 0.5 + 0.2 // Random intensity between 0.2 and 0.7
          },
          geometry: { 
            type: 'Point' as const, 
            coordinates: [
              -74.0 + (Math.random() - 0.5) * 0.3, // Random lng around Jersey City
              40.7 + (Math.random() - 0.5) * 0.2   // Random lat around Jersey City
            ]
          }
        }))
      ]
    };
    
    // Add source
    map.addSource('racing-heatmap', {
      type: 'geojson',
      data: heatmapData
    });
    
    // Add heatmap layer
    map.addLayer({
      id: 'racing-heatmap',
      type: 'heatmap',
      source: 'racing-heatmap',
      maxzoom: 15,
      paint: {
        // Increase weight based on intensity property
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'intensity'],
          0, 0,
          1, 1
        ],
        // Increase intensity as zoom level increases
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          15, 3
        ],
        // Color ramp for heatmap - racing theme
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgba(0,100,255,0.3)',     // Blue for low activity
          0.4, 'rgba(0,255,136,0.5)',     // Green for medium
          0.6, 'rgba(255,153,0,0.7)',     // Orange for high
          0.8, 'rgba(255,102,0,0.8)',     // Deep orange for very high
          1, 'rgba(255,0,0,0.9)'          // Red for extreme activity
        ],
        // Adjust radius as zoom increases
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 2,
          15, 20
        ],
        // Transition from heatmap to circle layer
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7, 0.8,
          15, 0.3
        ]
      }
    }, 'road-label'); // Place below road labels
    
    return () => {
      if (map.getLayer('racing-heatmap')) {
        map.removeLayer('racing-heatmap');
      }
      if (map.getSource('racing-heatmap')) {
        map.removeSource('racing-heatmap');
      }
    };
  }, [map, isVisible]);

  return (
    <div className={`${className}`}>
      <Card className="bg-black/80 backdrop-blur-sm border-racing-red/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-racing-red text-sm flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Traffic Heatmap
            </div>
            <Switch
              checked={isVisible}
              onCheckedChange={onToggle}
              className="scale-75"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs">Period:</span>
            <Badge variant="outline" className="border-racing-red/50 text-racing-red">
              {timeFilter}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3 text-racing-blue" />
              <span className="text-white/70">Active: 12</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 text-racing-green" />
              <span className="text-white/70">Peak: 18:30</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}