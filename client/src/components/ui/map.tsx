import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token here
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.your_mapbox_token_here';

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

export function Map({ 
  center = [-74.006, 40.7128], 
  zoom = 13,
  onMapClick,
  userLocations = [],
  alerts = [],
  className = ""
}: MapProps) {
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
