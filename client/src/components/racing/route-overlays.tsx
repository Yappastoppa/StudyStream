import { useEffect } from 'react';
import { AlertTriangle, Fuel, Car, Route as RouteIcon } from 'lucide-react';

interface RouteOverlay {
  id: string;
  type: 'speedtrap' | 'parking' | 'fuel' | 'scenic';
  coordinates: [number, number];
  name: string;
  description?: string;
}

interface RouteOverlaysProps {
  map: any;
  overlays: RouteOverlay[];
  showOverlays: boolean;
}

export function RouteOverlays({ map, overlays, showOverlays }: RouteOverlaysProps) {
  useEffect(() => {
    if (!map) return;

    const addOverlayMarkers = async () => {
      const mapboxgl = await import('mapbox-gl');
      
      // Remove existing overlay markers
      const existingMarkers = (map as any).overlayMarkers || [];
      existingMarkers.forEach((marker: any) => marker.remove());
      (map as any).overlayMarkers = [];
      
      if (!showOverlays) return;
      
      // Add new overlay markers
      overlays.forEach(overlay => {
        const el = document.createElement('div');
        el.className = 'overlay-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        
        // Style based on type
        switch (overlay.type) {
          case 'speedtrap':
            el.style.backgroundColor = '#ff0033';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
            break;
          case 'parking':
            el.style.backgroundColor = '#0066ff';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M13 3H6v18h4v-6h3c3.31 0 6-2.69 6-6s-2.69-6-6-6zm.2 8H10V7h3.2c1.1 0 2 .9 2 2s-.9 2-2 2z"/></svg>';
            break;
          case 'fuel':
            el.style.backgroundColor = '#ff9900';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>';
            break;
          case 'scenic':
            el.style.backgroundColor = '#00ff88';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="black"><path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z"/></svg>';
            break;
        }
        
        const marker = new mapboxgl.default.Marker(el)
          .setLngLat(overlay.coordinates)
          .setPopup(
            new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${overlay.name}</h3>
                  ${overlay.description ? `<p style="margin: 0; font-size: 12px; color: #666;">${overlay.description}</p>` : ''}
                </div>
              `)
          )
          .addTo(map);
        
        (map as any).overlayMarkers.push(marker);
      });
    };
    
    addOverlayMarkers();
  }, [map, overlays, showOverlays]);
  
  return null;
}

// Sample overlay data for NYC area
export const sampleOverlays: RouteOverlay[] = [
  {
    id: '1',
    type: 'speedtrap',
    coordinates: [-73.985, 40.748],
    name: 'Times Square Speed Camera',
    description: 'Active 24/7, 25mph limit'
  },
  {
    id: '2',
    type: 'parking',
    coordinates: [-73.978, 40.752],
    name: 'Bryant Park Garage',
    description: 'Safe underground parking, $30/day'
  },
  {
    id: '3',
    type: 'fuel',
    coordinates: [-73.990, 40.745],
    name: 'Shell Station',
    description: '24hr, premium fuel available'
  },
  {
    id: '4',
    type: 'scenic',
    coordinates: [-73.973, 40.764],
    name: 'Central Park Loop',
    description: 'Great driving route, 6.1 miles'
  },
  {
    id: '5',
    type: 'speedtrap',
    coordinates: [-73.996, 40.741],
    name: 'Highway Patrol Point',
    description: 'Frequent monitoring area'
  },
  {
    id: '6',
    type: 'parking',
    coordinates: [-73.982, 40.758],
    name: 'Secure Lot - Midtown',
    description: 'Valet service, covered parking'
  }
];