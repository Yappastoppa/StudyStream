import { useEffect } from 'react';

interface RouteHeatmapProps {
  map: any;
  isActive: boolean;
}

export function RouteHeatmap({ map, isActive }: RouteHeatmapProps) {
  useEffect(() => {
    if (!map) return;
    
    if (!isActive) {
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
  }, [map, isActive]);
  
  return null;
}