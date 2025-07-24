import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token here
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Check if Mapbox token is available
const hasMapboxToken = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

interface MapProps {
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

export function Map(props: MapProps) {
  const center = props.center || [-74.006, 40.7128];
  const zoom = props.zoom || 13;
  const onMapClick = props.onMapClick;
  const userLocations = props.userLocations || [];
  const alerts = props.alerts || [];
  const className = props.className || "";
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarkers = useRef<Map<number, mapboxgl.Marker>>(new Map<number, mapboxgl.Marker>());
  const alertMarkers = useRef<Map<number, mapboxgl.Marker>>(new Map<number, mapboxgl.Marker>());
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme for racing aesthetic
      center: center,
      zoom: zoom,
      attributionControl: false
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    map.current.on('click', (e) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
      }
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom, onMapClick]);

  // Update user markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove markers that are no longer in the userLocations array
    const currentUserIds = new Set(userLocations.map(user => user.id));
    userMarkers.current.forEach((marker, userId) => {
      if (!currentUserIds.has(userId)) {
        marker.remove();
        userMarkers.current.delete(userId);
      }
    });

    // Add or update markers for current user locations
    userLocations.forEach(user => {
      if (user.isGhostMode && !user.isCurrentUser) return; // Don't show ghost users

      let marker = userMarkers.current.get(user.id);
      
      if (!marker) {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'user-marker';
        el.style.width = user.isCurrentUser ? '16px' : '12px';
        el.style.height = user.isCurrentUser ? '16px' : '12px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.backgroundColor = user.isCurrentUser ? '#00d4ff' : '#00ff88';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        
        if (user.isCurrentUser) {
          // Add pulsing effect for current user
          const pulseEl = document.createElement('div');
          pulseEl.style.width = '32px';
          pulseEl.style.height = '32px';
          pulseEl.style.borderRadius = '50%';
          pulseEl.style.backgroundColor = 'rgba(0, 212, 255, 0.2)';
          pulseEl.style.position = 'absolute';
          pulseEl.style.top = '-8px';
          pulseEl.style.left = '-8px';
          pulseEl.style.animation = 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite';
          el.appendChild(pulseEl);
        }

        marker = new mapboxgl.Marker(el)
          .setLngLat([user.lng, user.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div style="color: white; font-weight: bold;">${user.username}</div>`))
          .addTo(map.current!);

        userMarkers.current.set(user.id, marker);
      } else {
        // Update existing marker position
        marker.setLngLat([user.lng, user.lat]);
      }
    });
  }, [userLocations, isMapLoaded]);

  // Update alert markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove markers that are no longer in the alerts array
    const currentAlertIds = new Set(alerts.map(alert => alert.id));
    alertMarkers.current.forEach((marker, alertId) => {
      if (!currentAlertIds.has(alertId)) {
        marker.remove();
        alertMarkers.current.delete(alertId);
      }
    });

    // Add or update markers for current alerts
    alerts.forEach(alert => {
      let marker = alertMarkers.current.get(alert.id);
      
      if (!marker) {
        // Create new alert marker
        const el = document.createElement('div');
        el.className = 'alert-marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid #ffaa00';
        el.style.backgroundColor = 'rgba(255, 170, 0, 0.2)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.style.animation = 'pulse 2s ease-in-out infinite';
        
        const icon = document.createElement('i');
        icon.className = alert.type === 'camera' ? 'fas fa-video' : 'fas fa-exclamation-triangle';
        icon.style.color = '#ffaa00';
        icon.style.fontSize = '10px';
        el.appendChild(icon);

        marker = new mapboxgl.Marker(el)
          .setLngLat([alert.lng, alert.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="color: white;">
                <div style="font-weight: bold; margin-bottom: 4px;">${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)} Alert</div>
                ${alert.description ? `<div style="font-size: 12px; opacity: 0.8;">${alert.description}</div>` : ''}
              </div>
            `))
          .addTo(map.current!);

        alertMarkers.current.set(alert.id, marker);
      }
    });
  }, [alerts, isMapLoaded]);

  const centerOnUser = (lng: number, lat: number) => {
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 1000
      });
    }
  };

  // Fallback UI when Mapbox token is missing or map fails to load
  if (!hasMapboxToken) {
    return (
      <div className={`relative ${className} bg-racing-dark border-racing-steel/30 rounded-lg`}>
        <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center text-racing-gray p-8">
            <div className="w-16 h-16 bg-racing-steel/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Map Configuration Needed</h3>
            <p className="text-sm">Please create a new Mapbox token with the required permissions</p>
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
      
      {/* Export centerOnUser function for external use */}
      <div style={{ display: 'none' }} ref={(el) => {
        if (el) {
          (el as any).centerOnUser = centerOnUser;
        }
      }} />
    </div>
  );
}
