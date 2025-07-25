import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import toast from 'react-hot-toast';

interface CleanRacingMapProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  driverView?: boolean;
}

export function CleanRacingMap({ 
  center = [-74.006, 40.7128], 
  zoom = 13, 
  className = "",
  driverView = false
}: CleanRacingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    // Add debug info to verify React is mounting
    console.log('🔥 CleanRacingMap mounting, mapContainer:', mapContainer.current);
    console.log('🔥 MAPBOX_TOKEN exists:', !!MAPBOX_TOKEN);

    if (map.current || !mapContainer.current) {
      console.log('🔥 Map already exists or container not ready');
      return;
    }

    const initMap = async () => {
      try {
        console.log('🔥 Starting map initialization...');

        if (!MAPBOX_TOKEN) {
          throw new Error('Mapbox token is missing from environment variables');
        }

        const mapboxgl = await import('mapbox-gl');
        console.log('🔥 Mapbox GL imported successfully');

        mapboxgl.default.accessToken = MAPBOX_TOKEN;
        console.log('🔥 Mapbox token set, creating map...');

        // Ensure container is empty
        if (mapContainer.current) {
          mapContainer.current.innerHTML = '';
        }

        map.current = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: driverView 
            ? 'mapbox://styles/mapbox/navigation-night-v1' 
            : 'mapbox://styles/mapbox/dark-v11',
          center: center,
          zoom: zoom,
          attributionControl: false
        });

        console.log('🔥 Map created, waiting for load event...');

        map.current.on('load', () => {
          console.log('🔥 Map loaded successfully');
          setIsMapLoaded(true);
          setMapError(null);
        });

        map.current.on('error', (e: any) => {
          console.error('🔥 Map error:', e);
          setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
        });

      } catch (error) {
        console.error('🔥 Map initialization failed:', error);
        setMapError(`Map init failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

        // Fallback to simulation mode
        toast.error('Map failed to load - using simulation mode');
        setIsMapLoaded(true); // Show fallback UI
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        console.log('🔥 Cleaning up map...');
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, MAPBOX_TOKEN]);

  // Debug overlay to verify React is mounting
  const debugOverlay = (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      zIndex: 9999, 
      color: 'white', 
      background: 'rgba(0,0,0,0.8)', 
      padding: '10px',
      fontSize: '12px'
    }}>
      DEBUG: Map Status - Loaded: {isMapLoaded ? 'YES' : 'NO'} | Error: {mapError || 'NONE'}
    </div>
  );

  return (
    <ErrorBoundary fallback={<div className="w-full h-full bg-red-500 text-white p-4">Map Error Boundary Triggered</div>}>
      <div className={`relative w-full h-full ${className}`}>
        {/* Always show debug overlay for now */}
        {debugOverlay}

        {/* Map container */}
        <div
          ref={mapContainer}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />

        {/* Loading overlay */}
        {!isMapLoaded && !mapError && (
          <div className="absolute inset-0 bg-racing-dark flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="w-8 h-8 border-2 border-racing-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm">Loading Racing Map...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {mapError && (
          <div className="absolute inset-0 bg-racing-dark flex items-center justify-center z-10">
            <div className="text-center text-white p-4">
              <div className="text-red-400 mb-2">Map Load Failed</div>
              <div className="text-sm text-gray-300 mb-4">{mapError}</div>
              <div className="text-xs text-gray-500">Using fallback racing interface</div>
            </div>
          </div>
        )}

        {/* Fallback racing interface when map fails */}
        {mapError && (
          <div className="absolute inset-0 bg-gradient-to-br from-racing-dark via-racing-charcoal to-racing-dark">
            <div className="absolute inset-0 opacity-10">
              <div className="grid grid-cols-8 h-full">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="border-r border-racing-steel/20"></div>
                ))}
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-8 h-8 border-2 border-racing-blue rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-racing-blue rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}