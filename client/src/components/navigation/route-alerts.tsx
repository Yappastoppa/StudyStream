import React from 'react';
import { 
  AlertTriangle, 
  Camera, 
  Car, 
  Construction,
  Fuel,
  MapPin
} from 'lucide-react';

interface RouteAlert {
  id: string;
  type: 'police' | 'accident' | 'hazard' | 'camera' | 'construction' | 'gas';
  coordinates: [number, number];
  description: string;
  distance: number; // meters from current location
  severity: 'low' | 'medium' | 'high';
}

interface RouteAlertsProps {
  alerts: RouteAlert[];
  map?: any;
  isVisible: boolean;
  className?: string;
}

export function RouteAlerts({ 
  alerts, 
  map, 
  isVisible, 
  className = "" 
}: RouteAlertsProps) {
  
  // Get alert icon and color based on type
  const getAlertIcon = (type: string, severity: string) => {
    const iconClass = "h-4 w-4";
    const sizeClass = severity === 'high' ? 'h-5 w-5' : iconClass;
    
    switch (type) {
      case 'police':
        return <AlertTriangle className={`${sizeClass} text-blue-400`} />;
      case 'accident':
        return <Car className={`${sizeClass} text-red-400`} />;
      case 'hazard':
        return <AlertTriangle className={`${sizeClass} text-yellow-400`} />;
      case 'camera':
        return <Camera className={`${sizeClass} text-purple-400`} />;
      case 'construction':
        return <Construction className={`${sizeClass} text-orange-400`} />;
      case 'gas':
        return <Fuel className={`${sizeClass} text-green-400`} />;
      default:
        return <MapPin className={`${sizeClass} text-gray-400`} />;
    }
  };

  // Get background color based on type and severity
  const getAlertBg = (type: string, severity: string) => {
    const baseClasses = "rounded-full p-2 border-2 backdrop-blur-sm shadow-lg";
    
    const bgColor = {
      police: 'bg-blue-500/20 border-blue-400/50',
      accident: 'bg-red-500/20 border-red-400/50',
      hazard: 'bg-yellow-500/20 border-yellow-400/50',
      camera: 'bg-purple-500/20 border-purple-400/50',
      construction: 'bg-orange-500/20 border-orange-400/50',
      gas: 'bg-green-500/20 border-green-400/50'
    }[type] || 'bg-gray-500/20 border-gray-400/50';

    const sizeClass = severity === 'high' ? 'p-3' : 'p-2';
    
    return `${baseClasses} ${bgColor} ${sizeClass}`;
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  React.useEffect(() => {
    if (!map || !isVisible) return;

    // Add alert markers to map
    alerts.forEach(alert => {
      const el = document.createElement('div');
      el.className = getAlertBg(alert.type, alert.severity);
      el.innerHTML = `
        <div class="flex items-center justify-center">
          ${getAlertIcon(alert.type, alert.severity)}
        </div>
      `;
      
      // Add click handler for alert details
      el.addEventListener('click', () => {
        console.log('Alert clicked:', alert);
      });

      // Create Mapbox marker
      const marker = new (window as any).mapboxgl.Marker(el)
        .setLngLat(alert.coordinates)
        .addTo(map);

      // Store marker reference for cleanup
      el.setAttribute('data-alert-id', alert.id);
    });

    return () => {
      // Cleanup markers when component unmounts or alerts change
      const alertMarkers = document.querySelectorAll('[data-alert-id]');
      alertMarkers.forEach(marker => {
        const mapboxMarker = (marker as any)._mapboxMarker;
        if (mapboxMarker) {
          mapboxMarker.remove();
        }
      });
    };
  }, [map, alerts, isVisible]);

  // Render nearby alerts as floating list (optional)
  const nearbyAlerts = alerts
    .filter(alert => alert.distance < 2000) // Within 2km
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3); // Show top 3

  if (!isVisible || nearbyAlerts.length === 0) return null;

  return (
    <div className={`fixed top-20 right-4 z-30 space-y-2 pointer-events-auto ${className}`}>
      {nearbyAlerts.map(alert => (
        <div
          key={alert.id}
          className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/20 shadow-lg min-w-[200px]"
        >
          <div className="flex items-center space-x-3">
            <div className={getAlertBg(alert.type, alert.severity)}>
              {getAlertIcon(alert.type, alert.severity)}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">
                {alert.description}
              </div>
              <div className="text-white/60 text-xs">
                {formatDistance(alert.distance)} ahead
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Sample alerts data for demonstration
export const sampleAlerts: RouteAlert[] = [
  {
    id: '1',
    type: 'police',
    coordinates: [-74.006, 40.7128],
    description: 'Police reported ahead',
    distance: 500,
    severity: 'medium'
  },
  {
    id: '2',
    type: 'accident',
    coordinates: [-74.010, 40.7150],
    description: 'Vehicle accident',
    distance: 1200,
    severity: 'high'
  },
  {
    id: '3',
    type: 'camera',
    coordinates: [-74.015, 40.7180],
    description: 'Speed camera',
    distance: 800,
    severity: 'low'
  }
];