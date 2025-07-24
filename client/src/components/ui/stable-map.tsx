import { useEffect, useRef, useState } from 'react';

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

  const [mapReady, setMapReady] = useState(false);
  const [hasMapboxToken, setHasMapboxToken] = useState(false);

  useEffect(() => {
    // Check if we have a valid Mapbox token
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (token && token.startsWith('pk.')) {
      setHasMapboxToken(true);
      // Initialize Mapbox after a brief delay to prevent flickering
      setTimeout(() => {
        initializeRealMap();
      }, 500);
    } else {
      setMapReady(true); // Show fallback immediately
    }
  }, []);

  const initializeRealMap = async () => {
    try {
      // Dynamically import Mapbox only when we have a token
      const mapboxgl = await import('mapbox-gl');
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      mapboxgl.default.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
      
      const mapContainer = document.getElementById('map-container');
      if (!mapContainer) return;

      const map = new mapboxgl.default.Map({
        container: mapContainer,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: center,
        zoom: zoom,
        attributionControl: false
      });

      map.on('load', () => {
        setMapReady(true);
        
        // Add controls
        map.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
        map.addControl(
          new mapboxgl.default.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true
          }),
          'top-right'
        );

        // Add markers
        addMarkersToMap(map, userLocations, alerts, mapboxgl.default);
      });

      map.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapReady(true); // Show fallback on error
      });

      if (onMapClick) {
        map.on('click', (e) => onMapClick(e.lngLat.lng, e.lngLat.lat));
      }

    } catch (error) {
      console.error('Failed to load Mapbox:', error);
      setMapReady(true); // Show fallback on error
    }
  };

  const addMarkersToMap = (map: any, users: any[], alerts: any[], mapboxgl: any) => {
    // Add user markers
    users.forEach(user => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 20px; height: 20px; border-radius: 50%;
        border: 2px solid ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
        background: ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
        box-shadow: 0 0 10px ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
        ${user.isGhostMode ? 'opacity: 0.5;' : ''}
      `;

      new mapboxgl.Marker(el)
        .setLngLat([user.lng, user.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="color: white; background: #1a1a1a; padding: 8px;">
            <strong>${user.username}</strong><br>
            ${user.isCurrentUser ? 'You' : 'Racer'}
          </div>
        `))
        .addTo(map);
    });

    // Add alert markers  
    alerts.forEach(alert => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 16px; height: 16px; background: #eab308;
        border: 2px solid #facc15; border-radius: 2px;
      `;

      new mapboxgl.Marker(el)
        .setLngLat([alert.lng, alert.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="color: white; background: #1a1a1a; padding: 8px;">
            <strong style="color: #eab308;">${alert.type.toUpperCase()}</strong>
            ${alert.description ? `<br>${alert.description}` : ''}
          </div>
        `))
        .addTo(map);
    });
  };

  // Racing-themed fallback for when Mapbox isn't available
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
          <div className="w-2 h-2 bg-racing-green rounded-full animate-pulse"></div>
          <span className="text-racing-green text-sm">
            {hasMapboxToken ? 'GPS READY' : 'SIMULATION MODE'}
          </span>
        </div>
      </div>
    </div>
  );

  if (!mapReady) {
    return (
      <div className={`relative ${className} bg-racing-dark`}>
        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-racing-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Initializing Racing Interface...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {hasMapboxToken ? (
        <div id="map-container" className="w-full h-full" style={{ minHeight: '400px' }} />
      ) : (
        <RacingInterface />
      )}
    </div>
  );
}