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
    console.log('🔥 CleanRacingMap mounting, mapContainer:', !!mapContainer.current);
    console.log('🔥 MAPBOX_TOKEN exists:', !!MAPBOX_TOKEN);

    if (map.current || !mapContainer.current) {
      console.log('🔥 Map already exists or container not ready');
      return;
    }

    const initMap = async () => {
      try {
        console.log('🔥 Starting map initialization...');

        if (!MAPBOX_TOKEN) {
          console.warn('No Mapbox token - showing fallback');
          setMapError('No Mapbox token configured');
          setIsMapLoaded(true);
          return;
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
          setIsMapLoaded(true); // Show fallback
        });

      } catch (error) {
        console.error('🔥 Map initialization failed:', error);
        setMapError(`Map init failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsMapLoaded(true); // Show fallback UI
        toast.error('Map failed to load - using simulation mode');
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        console.log('🔥 Cleaning up map...');
        try {
          map.current.remove();
        } catch (e) {
          console.warn('Map cleanup error:', e);
        }
        map.current = null;
      }
    };
  }, [center, zoom, MAPBOX_TOKEN, driverView]);

  return (
    <ErrorBoundary fallback={
      <div className="w-full h-full bg-red-500 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold mb-2">Map Error</div>
          <div className="text-sm">Using simulation mode</div>
        </div>
      </div>
    }>
      <div className={`relative w-full h-full ${className}`}>
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

        {/* Error/Fallback overlay */}
        {mapError && isMapLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-10">
            <div className="text-center text-white p-4">
              <div className="text-xl mb-4">🏁 GhostRacer</div>
              <div className="text-sm text-gray-300 mb-4">Simulation Mode</div>
              <div className="w-8 h-8 border-2 border-blue-500 rounded-full flex items-center justify-center mx-auto">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-xs text-gray-500 mt-4">Map tiles unavailable</div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}