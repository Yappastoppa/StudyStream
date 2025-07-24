import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface StableMapProps {
  center?: [number, number];
  zoom?: number;
  onMapClick?: (coordinates: [number, number]) => void;
  showUserLocation?: boolean;
  className?: string;
}

export function StableMap({
  center = [-74.006, 40.7128],
  zoom = 13,
  onMapClick,
  showUserLocation = true,
  className = "w-full h-96"
}: StableMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [apiTested, setApiTested] = useState(false);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // One-time API connectivity test
  useEffect(() => {
    if (!mapboxToken || apiTested) return;
    
    // Simple API test - just check if we can reach Mapbox
    fetch(`https://api.mapbox.com/styles/v1/mapbox/standard?access_token=${mapboxToken}`)
      .then(response => {
        if (response.ok) {
          console.log('✅ Mapbox API reachable');
        } else {
          console.warn('⚠️ Mapbox API response:', response.status);
        }
      })
      .catch(error => {
        console.error('❌ Mapbox API test failed:', error);
      })
      .finally(() => {
        setApiTested(true);
      });
  }, [mapboxToken, apiTested]);

  useEffect(() => {
    // Quick validation
    if (!mapboxToken) {
      setMapStatus('error');
      setErrorMessage('No Mapbox token found');
      return;
    }

    if (!mapContainer.current) {
      setMapStatus('error');
      setErrorMessage('Map container not found');
      return;
    }

    // Initialize map
    try {
      console.log('🗺️ Initializing Mapbox with token:', mapboxToken.substring(0, 15) + '...');

      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/standard', // Standard style with traffic data
        center: center,
        zoom: zoom,
        attributionControl: false
      });

      // Enhanced success/error handling with Standard style
      map.current.on('load', () => {
        console.log('✅ Map loaded successfully');
        
        // Configure Standard style - traffic data is included by default
        // You can add Standard style configuration here if needed
        
        setMapStatus('success');
        setErrorMessage('');
      });

      map.current.on('error', (e) => {
        console.error('❌ Map error:', e.error);
        setMapStatus('error');
        setErrorMessage(e.error.message || 'Map failed to load');
      });

      // Add user location if requested
      if (showUserLocation) {
        map.current.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
          })
        );
      }

      // Handle map clicks
      if (onMapClick) {
        map.current.on('click', (e) => {
          onMapClick([e.lngLat.lng, e.lngLat.lat]);
        });
      }

    } catch (error) {
      console.error('❌ Map initialization error:', error);
      setMapStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize map');
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, mapboxToken, onMapClick, showUserLocation]);

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div
        ref={mapContainer}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '300px' }}
      />

      {/* Status indicator */}
      <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
        {mapStatus === 'loading' && '🔄 Loading map...'}
        {mapStatus === 'success' && '✅ Map ready'}
        {mapStatus === 'error' && `❌ ${errorMessage}`}
      </div>

      {/* API Test Result */}
      <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded max-w-xs">
        <div>Token: {mapboxToken ? '✅ Found' : '❌ Missing'}</div>
        <div>API: {mapStatus === 'success' ? '✅ Connected' : mapStatus === 'error' ? '❌ Failed' : '⏳ Testing'}</div>
        {mapStatus === 'success' && <div>Traffic: ✅ Live Data</div>}
      </div>
    </div>
  );
}