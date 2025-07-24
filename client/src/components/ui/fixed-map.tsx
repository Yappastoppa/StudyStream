import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface FixedMapProps {
  center?: [number, number];
  zoom?: number;
  onMapClick?: (lng: number, lat: number) => void;
  userLocations?: Array<{
    id: number;
    username: string;
    lat: number;
    lng: number;
    isCurrentUser?: boolean;
    isGhostMode?: boolean;
  }>;
  alerts?: Array<{
    id: number;
    type: string;
    lat: number;
    lng: number;
    description?: string;
  }>;
  className?: string;
}

export function FixedMap(props: FixedMapProps) {
  const center = props?.center || [-74.006, 40.7128];
  const zoom = props?.zoom || 13;
  const onMapClick = props?.onMapClick;
  const userLocations = props?.userLocations || [];
  const alerts = props?.alerts || [];
  const className = props?.className || "";

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get token from environment - Vite exposes env vars via import.meta.env
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

  // Check if we have a valid Mapbox token
  const hasValidToken = Boolean(MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.') && MAPBOX_TOKEN.length > 30);

  // Debug token info
  useEffect(() => {
    console.log('🗺️ Mapbox Token Debug:', {
      hasToken: !!MAPBOX_TOKEN,
      tokenLength: MAPBOX_TOKEN?.length,
      tokenPrefix: MAPBOX_TOKEN?.substring(0, 20) + '...',
      isValidFormat: hasValidToken,
      fullToken: MAPBOX_TOKEN // Remove this in production
    });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isComponentMounted = true;

    const initializeMap = async () => {
      // If no valid token, show fallback immediately
      if (!hasValidToken) {
        console.warn('No valid Mapbox token found - using simulation mode');
        setShowFallback(true);
        setIsLoading(false);
        setIsMapLoaded(true);
        return;
      }

      if (!mapContainer.current || map.current) return;

      // Set 10-second timeout
      timeoutId = setTimeout(() => {
        if (isComponentMounted && !isMapLoaded) {
          console.warn('Map loading timeout after 10 seconds - showing fallback');
          setMapError('Map loading timeout - using simulation mode');
          setShowFallback(true);
          setIsLoading(false);
          setIsMapLoaded(true);
        }
      }, 10000);

      try {
        // Dynamic import of Mapbox
        const mapboxgl = await import('mapbox-gl');

        // Set access token
        mapboxgl.default.accessToken = MAPBOX_TOKEN;

        if (!isComponentMounted) return;

        // Create map instance
        map.current = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: center,
          zoom: zoom,
          attributionControl: false
        });

        // Add event listeners
        map.current.on('load', () => {
          if (!isComponentMounted) return;

          clearTimeout(timeoutId);
          setIsMapLoaded(true);
          setIsLoading(false);
          setMapError(null);

          // Add controls after map loads
          try {
            map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
            map.current.addControl(
              new mapboxgl.default.GeolocateControl({
                positionOptions: { enableHighAccuracy: true },
                trackUserLocation: true,
                showUserHeading: true
              }),
              'top-right'
            );
          } catch (controlError) {
            console.error('Failed to add map controls:', controlError);
          }
        });

        map.current.on('error', (e: any) => {
          console.error('Mapbox error:', e);
          if (!isComponentMounted) return;

          clearTimeout(timeoutId);
          setMapError(`Map error: ${e.error?.message || 'Unknown error'}`);
          setShowFallback(true);
          setIsLoading(false);
          setIsMapLoaded(true);
        });

        if (onMapClick) {
          map.current.on('click', (e: any) => {
            if (onMapClick && isComponentMounted) {
              onMapClick(e.lngLat.lng, e.lngLat.lat);
            }
          });
        }

      } catch (error) {
        console.error('Failed to initialize Mapbox:', error);
        if (!isComponentMounted) return;

        clearTimeout(timeoutId);
        setMapError(`Initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setShowFallback(true);
        setIsLoading(false);
        setIsMapLoaded(true);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      isComponentMounted = false;
      clearTimeout(timeoutId);
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        map.current = null;
      }
      markersRef.current.clear();
    };
  }, [center, zoom, onMapClick, hasValidToken, MAPBOX_TOKEN]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !isMapLoaded || showFallback || mapError) return;

    const updateMarkers = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');

        // Clear existing markers
        markersRef.current.forEach(marker => {
          try {
            marker.remove();
          } catch (e) {
            console.warn('Error removing marker:', e);
          }
        });
        markersRef.current.clear();

        // Add user markers
        userLocations.forEach(user => {
          try {
            const el = document.createElement('div');
            el.style.cssText = `
              width: 20px; height: 20px; border-radius: 50%;
              border: 2px solid ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
              background: ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
              box-shadow: 0 0 10px ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
              cursor: pointer;
              ${user.isGhostMode ? 'opacity: 0.5;' : ''}
            `;

            const marker = new mapboxgl.default.Marker(el)
              .setLngLat([user.lng, user.lat])
              .setPopup(
                new mapboxgl.default.Popup({ offset: 25 })
                  .setHTML(`
                    <div style="color: white; background: #1a1a1a; padding: 8px; border-radius: 4px;">
                      <div style="font-weight: bold; margin-bottom: 4px;">${user.username}</div>
                      <div style="font-size: 12px; opacity: 0.8;">
                        ${user.isCurrentUser ? 'You' : 'Racer'}
                        ${user.isGhostMode ? ' (Ghost Mode)' : ''}
                      </div>
                    </div>
                  `)
              )
              .addTo(map.current);

            markersRef.current.set(`user-${user.id}`, marker);
          } catch (error) {
            console.warn(`Failed to add marker for user ${user.id}:`, error);
          }
        });

        // Add alert markers
        alerts.forEach(alert => {
          try {
            const el = document.createElement('div');
            el.style.cssText = `
              width: 16px; height: 16px; background: #eab308;
              border: 2px solid #facc15; border-radius: 2px;
              cursor: pointer; animation: pulse 2s infinite;
            `;

            const marker = new mapboxgl.default.Marker(el)
              .setLngLat([alert.lng, alert.lat])
              .setPopup(
                new mapboxgl.default.Popup({ offset: 25 })
                  .setHTML(`
                    <div style="color: white; background: #1a1a1a; padding: 8px; border-radius: 4px;">
                      <div style="font-weight: bold; margin-bottom: 4px; color: #eab308;">
                        ${alert.type.toUpperCase()} Alert
                      </div>
                      ${alert.description ? `<div style="font-size: 12px; opacity: 0.8;">${alert.description}</div>` : ''}
                    </div>
                  `)
              )
              .addTo(map.current);

            markersRef.current.set(`alert-${alert.id}`, marker);
          } catch (error) {
            console.warn(`Failed to add marker for alert ${alert.id}:`, error);
          }
        });

      } catch (error) {
        console.error('Failed to update markers:', error);
      }
    };

    updateMarkers();
  }, [userLocations, alerts, isMapLoaded, showFallback, mapError]);

  // Racing-themed fallback interface
  const RacingFallback = () => (
    <div className="w-full h-full bg-gradient-to-br from-racing-dark via-racing-charcoal to-racing-dark relative">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-8 h-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-r border-racing-steel/20"></div>
          ))}
        </div>
        <div className="absolute inset-0 grid grid-rows-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-b border-racing-steel/20"></div>
          ))}
        </div>
      </div>

      {/* Center crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-8 h-8 border-2 border-racing-blue rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-racing-blue rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* User locations */}
      {userLocations.map((user, index) => (
        <div
          key={user.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${30 + (index * 15) % 60}%`,
            top: `${40 + (index * 20) % 40}%`,
          }}
        >
          <div className={`w-3 h-3 rounded-full ${user.isCurrentUser ? 'bg-racing-red' : 'bg-racing-blue'} animate-pulse`}></div>
          <div className="text-xs text-white mt-1 text-center min-w-max">{user.username}</div>
        </div>
      ))}

      {/* Alerts */}
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${20 + (index * 25) % 70}%`,
            top: `${20 + (index * 30) % 60}%`,
          }}
        >
          <div className="w-4 h-4 bg-racing-yellow rounded-sm animate-bounce"></div>
          <div className="text-xs text-racing-yellow mt-1 text-center">{alert.type}</div>
        </div>
      ))}

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-racing-charcoal/80 backdrop-blur-sm rounded-lg p-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-racing-blue text-lg font-bold">{userLocations.length}</div>
              <div className="text-racing-gray text-xs">Racers</div>
            </div>
            <div>
              <div className="text-racing-yellow text-lg font-bold">{alerts.length}</div>
              <div className="text-racing-gray text-xs">Alerts</div>
            </div>
            <div>
              <div className="text-racing-green text-lg font-bold">SIM</div>
              <div className="text-racing-gray text-xs">Mode</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-racing-charcoal/90 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-racing-yellow rounded-full animate-pulse"></div>
          <span className="text-racing-yellow text-sm">
            {mapError ? 'MAP ERROR' : 'SIMULATION MODE'}
          </span>
        </div>
        {mapError && (
          <div className="text-xs text-racing-gray mt-1 max-w-xs">
            {mapError}
          </div>
        )}
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative ${className} bg-racing-dark`}>
        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-racing-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">
              {hasValidToken ? 'Loading GPS Map...' : 'Initializing Racing Interface...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showFallback ? (
        <RacingFallback />
      ) : (
        <div
          ref={mapContainer}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      )}

      {/* GPS Active indicator when map is loaded */}
      {isMapLoaded && !showFallback && !mapError && (
        <div className="absolute top-4 left-4 bg-racing-charcoal/90 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-racing-green rounded-full animate-pulse"></div>
            <span>GPS Active</span>
          </div>
        </div>
      )}
    </div>
  );
}