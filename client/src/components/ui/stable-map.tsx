import { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface StableMapProps {
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

export function StableMap(props: StableMapProps) {
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

  // Enhanced token validation
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const hasMapboxToken = Boolean(mapboxToken && mapboxToken.startsWith('pk.') && mapboxToken.length > 50);

  // Debug logging
  useEffect(() => {
    console.log('🗺️ Mapbox Debug Info:', {
      hasToken: !!mapboxToken,
      tokenLength: mapboxToken?.length,
      tokenPrefix: mapboxToken?.substring(0, 10) + '...',
      isValidFormat: hasMapboxToken,
      envKeys: Object.keys(import.meta.env).filter(k => k.includes('MAPBOX')),
      allEnvKeys: Object.keys(import.meta.env),
      rawToken: mapboxToken,
      userAgent: navigator.userAgent,
      windowLocation: window.location.href
    });
    
    // Test network connectivity
    console.log('🌐 Testing network connectivity...');
    fetch('https://httpbin.org/get')
      .then(response => {
        console.log('✅ Network test passed:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('📡 Network response:', data);
      })
      .catch(error => {
        console.error('❌ Network test failed:', error);
      });
    
    // Test Mapbox API specifically if we have a token
    if (hasMapboxToken) {
      console.log('🗝️ Testing Mapbox API access...');
      fetch(`https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${mapboxToken}`)
        .then(response => {
          console.log('🗺️ Mapbox API test:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          });
          if (!response.ok) {
            return response.text().then(text => {
              console.error('❌ Mapbox API error response:', text);
            });
          }
        })
        .catch(error => {
          console.error('❌ Mapbox API test failed:', error);
        });
    }
  }, []);

  useEffect(() => {
    if (!hasMapboxToken) {
      console.warn('❌ Invalid or missing Mapbox token');
      setMapError('Mapbox token required');
      setIsMapLoaded(true);
      return;
    }

    if (!mapContainer.current || map.current) return;

    const initializeMap = async () => {
      try {
        console.log('🚀 Starting map initialization...');
        console.log('📍 Map center:', center);
        console.log('🔍 Map zoom:', zoom);
        console.log('📦 Container element:', mapContainer.current);

        // Dynamic import of Mapbox
        console.log('📥 Loading Mapbox GL JS...');
        const mapboxgl = await import('mapbox-gl');
        console.log('✅ Mapbox GL JS loaded:', typeof mapboxgl.default);

        // Set access token
        console.log('🗝️ Setting Mapbox access token...');
        mapboxgl.default.accessToken = mapboxToken;
        console.log('✅ Token set. Current token:', mapboxgl.default.accessToken?.substring(0, 20) + '...');

        // Test if we can create a basic map
        console.log('🏗️ Creating map instance...');
        const mapConfig = {
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: center,
          zoom: zoom,
          attributionControl: false
        };
        console.log('⚙️ Map config:', mapConfig);

        map.current = new mapboxgl.default.Map(mapConfig);
        console.log('✅ Map instance created successfully:', map.current);

        // Add comprehensive event listeners
        console.log('🎧 Adding event listeners...');
        
        map.current.on('load', () => {
          console.log('✅ MAP LOAD EVENT FIRED!');
          console.log('📊 Map state:', {
            loaded: map.current.loaded(),
            style: map.current.getStyle()?.name,
            zoom: map.current.getZoom(),
            center: map.current.getCenter()
          });
          setIsMapLoaded(true);
          setMapError(null);
        });

        map.current.on('error', (e: any) => {
          console.error('❌ MAP ERROR EVENT:', e);
          console.error('🔍 Full error object:', JSON.stringify(e, null, 2));
          const errorMsg = e.error?.message || e.message || 'Unknown map error';
          console.error('📝 Error details:', {
            type: e.error?.type,
            status: e.error?.status,
            message: errorMsg,
            url: e.error?.url,
            stack: e.error?.stack
          });
          setMapError(`Map error: ${errorMsg}`);
          setIsMapLoaded(true);
        });

        map.current.on('styledata', () => {
          console.log('🎨 Style data loaded');
        });

        map.current.on('sourcedata', (e: any) => {
          console.log('📡 Source data event:', e.sourceDataType, e.isSourceLoaded);
        });

        map.current.on('idle', () => {
          console.log('😴 Map idle - rendering complete');
        });

        map.current.on('render', () => {
          console.log('🖼️ Map render event');
        });

        // Add debugging for style loading
        console.log('🎨 Checking style loading...');
        const checkStyleStatus = () => {
          if (map.current) {
            console.log('🔍 Style status:', {
              loaded: map.current.loaded(),
              isStyleLoaded: map.current.isStyleLoaded(),
              style: map.current.getStyle()
            });
          }
        };
        
        setTimeout(checkStyleStatus, 1000);
        setTimeout(checkStyleStatus, 3000);
        setTimeout(checkStyleStatus, 5000);

        if (onMapClick) {
          map.current.on('click', (e: any) => {
            console.log('🖱️ Map clicked:', e.lngLat);
            onMapClick(e.lngLat.lng, e.lngLat.lat);
          });
        }

        // Add navigation controls
        map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');

      } catch (error) {
        console.error('❌ MAPBOX INITIALIZATION FAILED!');
        console.error('🔍 Error type:', typeof error);
        console.error('📝 Error message:', error instanceof Error ? error.message : String(error));
        console.error('📚 Error stack:', error instanceof Error ? error.stack : 'No stack available');
        console.error('🔍 Full error object:', error);
        
        // Try to get more specific error info
        if (error instanceof Error) {
          console.error('🔎 Error name:', error.name);
          console.error('🔎 Error cause:', (error as any).cause);
        }
        
        setMapError(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsMapLoaded(true);
      }
    };

    initializeMap();

    // Cleanup
    return () => {
      if (map.current) {
        try {
          map.current.remove();
        } catch (e) {
          console.warn('Cleanup warning:', e);
        }
        map.current = null;
      }
      markersRef.current.clear();
    };
  }, [center, zoom, onMapClick, hasMapboxToken, mapboxToken]);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !isMapLoaded || mapError) return;

    const updateMarkers = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');

        // Clear existing markers
        markersRef.current.forEach(marker => {
          try {
            marker.remove();
          } catch (e) {
            console.warn('Marker cleanup warning:', e);
          }
        });
        markersRef.current.clear();

        // Add user markers
        userLocations.forEach(user => {
          if (user.isGhostMode && !user.isCurrentUser) return;

          const el = document.createElement('div');
          el.style.cssText = `
            width: ${user.isCurrentUser ? '20px' : '16px'};
            height: ${user.isCurrentUser ? '20px' : '16px'};
            border-radius: 50%;
            border: 2px solid white;
            background: ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
            box-shadow: 0 0 10px ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
            cursor: pointer;
            ${user.isCurrentUser ? 'animation: pulse 2s infinite;' : ''}
          `;

          const marker = new mapboxgl.default.Marker(el)
            .setLngLat([user.lng, user.lat])
            .setPopup(new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`
                <div style="color: white; background: #1a1a1a; padding: 8px; border-radius: 4px;">
                  <strong>${user.username}</strong><br>
                  <small>${user.isCurrentUser ? 'You' : 'Racer'}</small>
                </div>
              `))
            .addTo(map.current);

          markersRef.current.set(`user-${user.id}`, marker);
        });

        // Add alert markers
        alerts.forEach(alert => {
          const el = document.createElement('div');
          el.style.cssText = `
            width: 18px;
            height: 18px;
            background: #eab308;
            border: 2px solid #facc15;
            border-radius: 3px;
            cursor: pointer;
            animation: bounce 1s infinite;
            display: flex;
            align-items: center;
            justify-content: center;
          `;

          const icon = document.createElement('div');
          icon.textContent = '⚠';
          icon.style.cssText = 'font-size: 10px; color: white;';
          el.appendChild(icon);

          const marker = new mapboxgl.default.Marker(el)
            .setLngLat([alert.lng, alert.lat])
            .setPopup(new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`
                <div style="color: white; background: #1a1a1a; padding: 8px; border-radius: 4px;">
                  <strong style="color: #eab308;">${alert.type.toUpperCase()}</strong>
                  ${alert.description ? `<br><small>${alert.description}</small>` : ''}
                </div>
              `))
            .addTo(map.current);

          markersRef.current.set(`alert-${alert.id}`, marker);
        });

        console.log(`✅ Updated ${userLocations.length} users, ${alerts.length} alerts`);

      } catch (error) {
        console.error('❌ Failed to update markers:', error);
      }
    };

    updateMarkers();
  }, [userLocations, alerts, isMapLoaded, mapError]);

  // Enhanced Racing-themed fallback interface
  const RacingInterface = () => (
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

      {/* Error message */}
      {mapError && (
        <div className="absolute top-4 right-4 bg-red-900/90 border border-red-500 rounded-lg p-3 max-w-sm">
          <div className="text-red-200 text-sm">
            <strong>Map Error:</strong><br />
            {mapError}
          </div>
        </div>
      )}

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
              <div className="text-racing-green text-lg font-bold">{hasMapboxToken ? 'GPS' : 'SIM'}</div>
              <div className="text-racing-gray text-xs">Mode</div>
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 bg-racing-charcoal/90 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${hasMapboxToken ? 'bg-racing-red' : 'bg-racing-yellow'}`}></div>
          <span className={`text-sm ${hasMapboxToken ? 'text-racing-red' : 'text-racing-yellow'}`}>
            {hasMapboxToken ? 'GPS ERROR' : 'SIMULATION MODE'}
          </span>
        </div>
      </div>
    </div>
  );

  // Show enhanced loading state
  if (!isMapLoaded && hasMapboxToken && !mapError) {
    return (
      <div className={`relative ${className} bg-racing-dark`}>
        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-racing-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Loading GPS Map...</p>
            <p className="text-xs text-racing-gray mt-1">Connecting to Mapbox...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {hasMapboxToken && !mapError ? (
        <>
          <div 
            ref={mapContainer} 
            className="w-full h-full" 
            style={{ 
              minHeight: '400px',
              height: '100%',
              width: '100%',
              position: 'relative'
            }} 
          />
          {isMapLoaded && (
            <div className="absolute top-4 left-4 bg-racing-charcoal/90 backdrop-blur-sm rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-racing-green rounded-full animate-pulse"></div>
                <span className="text-racing-green text-sm">GPS ACTIVE</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <RacingInterface />
      )}
    </div>
  );
}