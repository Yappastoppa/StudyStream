import { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SimpleMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function SimpleMap({ center = [-74.006, 40.7128], zoom = 13, className = "" }: SimpleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
  
  console.log("🔥 SIMPLE MAP - Token:", MAPBOX_TOKEN?.substring(0, 20) + '...');
  
  useEffect(() => {
    console.log("🔥 SIMPLE MAP - useEffect running");
    console.log("🔥 SIMPLE MAP - mapContainer.current:", !!mapContainer.current);
    
    if (map.current || !mapContainer.current) return; // Exit if map already initialized or no container
    
    const initMap = async () => {
      try {
        console.log("🔥 SIMPLE MAP - Initializing...");
        const mapboxgl = await import('mapbox-gl');
        
        mapboxgl.default.accessToken = MAPBOX_TOKEN;
        
        console.log("🔥 SIMPLE MAP - Creating map instance");
        map.current = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: center,
          zoom: zoom
        });
        
        map.current.on('load', () => {
          console.log("🔥 SIMPLE MAP - Map loaded successfully!");
        });
        
        map.current.on('error', (e: any) => {
          console.error("🔥 SIMPLE MAP - Map error:", e);
        });
        
      } catch (error) {
        console.error("🔥 SIMPLE MAP - Failed to initialize:", error);
      }
    };
    
    // Small delay to ensure DOM is ready
    setTimeout(initMap, 100);
    
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Empty dependency array
  
  return (
    <div className={className}>
      <div 
        ref={mapContainer} 
        className="w-full h-full" 
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}