import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface RacingMapProps {
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

export function RacingMap(props: RacingMapProps) {
  const center = props?.center || [-74.006, 40.7128];
  const zoom = props?.zoom || 13;
  const onMapClick = props?.onMapClick;
  const userLocations = props?.userLocations || [];
  const alerts = props?.alerts || [];
  const className = props?.className || "";

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11', // Dark racing theme
        center: center,
        zoom: zoom,
        attributionControl: false
      });

      map.current.on('load', () => {
        setIsMapLoaded(true);
        setMapError(null);
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Map failed to load. Check your Mapbox token.');
      });

      map.current.on('click', (e) => {
        if (onMapClick) {
          onMapClick(e.lngLat.lng, e.lngLat.lat);
        }
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control for GPS
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom, onMapClick]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add user markers
    userLocations.forEach(user => {
      const el = document.createElement('div');
      el.className = 'racing-marker';
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
        background: ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
        box-shadow: 0 0 10px ${user.isCurrentUser ? '#ef4444' : '#3b82f6'};
        cursor: pointer;
        ${user.isGhostMode ? 'opacity: 0.5;' : ''}
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([user.lng, user.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
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
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Add alert markers
    alerts.forEach(alert => {
      const el = document.createElement('div');
      el.className = 'alert-marker';
      el.style.cssText = `
        width: 16px;
        height: 16px;
        background: #eab308;
        border: 2px solid #facc15;
        border-radius: 2px;
        cursor: pointer;
        animation: pulse 2s infinite;
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([alert.lng, alert.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="color: white; background: #1a1a1a; padding: 8px; border-radius: 4px;">
                <div style="font-weight: bold; margin-bottom: 4px; color: #eab308;">
                  ${alert.type.toUpperCase()} Alert
                </div>
                ${alert.description ? `<div style="font-size: 12px; opacity: 0.8;">${alert.description}</div>` : ''}
              </div>
            `)
        )
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [userLocations, alerts, isMapLoaded]);

  // Show error state
  if (mapError || !import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div className={`relative ${className} bg-racing-dark border-racing-steel/30 rounded-lg`}>
        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center text-racing-gray p-8">
            <div className="w-16 h-16 bg-racing-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-racing-red" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Map Unavailable</h3>
            <p className="text-sm text-racing-gray mb-4">
              {mapError || 'Mapbox token required for GPS map functionality'}
            </p>
            <div className="bg-racing-charcoal rounded-lg p-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-racing-blue text-lg font-bold">{userLocations.length}</div>
                  <div className="text-racing-gray text-xs">Active Racers</div>
                </div>
                <div>
                  <div className="text-racing-yellow text-lg font-bold">{alerts.length}</div>
                  <div className="text-racing-gray text-xs">Live Alerts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* Map loading overlay */}
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-racing-dark/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-2 border-racing-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Loading GPS Map...</p>
          </div>
        </div>
      )}

      {/* Map info overlay */}
      {isMapLoaded && (
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