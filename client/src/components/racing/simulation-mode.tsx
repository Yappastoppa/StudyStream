import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, AlertTriangle, Users, Zap } from 'lucide-react';

interface SimulationModeProps {
  map: any;
  isActive: boolean;
  onToggle: () => void;
}

interface SimulatedRacer {
  id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  username: string;
}

interface SimulatedAlert {
  id: string;
  lat: number;
  lng: number;
  type: 'camera' | 'police' | 'hazard';
  timestamp: Date;
}

export function SimulationMode({ map, isActive, onToggle }: SimulationModeProps) {
  const [simulatedRacers, setSimulatedRacers] = useState<SimulatedRacer[]>([]);
  const [simulatedAlerts, setSimulatedAlerts] = useState<SimulatedAlert[]>([]);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  // Generate random racers in NJ area
  const generateRacers = (): SimulatedRacer[] => {
    const racers: SimulatedRacer[] = [];
    const names = ['Ghost_Rider', 'Night_Hawk', 'Speed_Demon', 'Shadow_Racer', 'Turbo_King'];
    
    for (let i = 0; i < 5; i++) {
      racers.push({
        id: `sim-racer-${i}`,
        lat: 40.7 + (Math.random() - 0.5) * 0.2,
        lng: -74.0 + (Math.random() - 0.5) * 0.2,
        speed: 80 + Math.random() * 60,
        heading: Math.random() * 360,
        username: `${names[i]}_${Math.floor(Math.random() * 999)}`
      });
    }
    
    return racers;
  };
  
  // Generate random alerts
  const generateAlerts = (): SimulatedAlert[] => {
    const alerts: SimulatedAlert[] = [];
    const types: ('camera' | 'police' | 'hazard')[] = ['camera', 'police', 'hazard'];
    
    for (let i = 0; i < 8; i++) {
      alerts.push({
        id: `sim-alert-${i}`,
        lat: 40.7 + (Math.random() - 0.5) * 0.3,
        lng: -74.0 + (Math.random() - 0.5) * 0.3,
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: new Date()
      });
    }
    
    return alerts;
  };
  
  useEffect(() => {
    if (!map || !isActive) {
      // Clean up when deactivated
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      
      // Remove all simulation markers
      simulatedRacers.forEach(racer => {
        const marker = (map as any)[`marker-${racer.id}`];
        if (marker) {
          marker.remove();
          delete (map as any)[`marker-${racer.id}`];
        }
      });
      
      simulatedAlerts.forEach(alert => {
        const marker = (map as any)[`marker-${alert.id}`];
        if (marker) {
          marker.remove();
          delete (map as any)[`marker-${alert.id}`];
        }
      });
      
      setSimulatedRacers([]);
      setSimulatedAlerts([]);
      
      return;
    }
    
    // Initialize simulation
    const racers = generateRacers();
    const alerts = generateAlerts();
    setSimulatedRacers(racers);
    setSimulatedAlerts(alerts);
    
    // Add markers to map
    const addMarkers = async () => {
      const mapboxgl = await import('mapbox-gl');
      
      // Add racer markers
      racers.forEach(racer => {
        const el = document.createElement('div');
        el.className = 'simulated-racer';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.backgroundColor = '#00ff88';
        el.style.border = '2px solid #000';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.boxShadow = '0 0 10px rgba(0,255,136,0.8)';
        el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="black"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>';
        
        const marker = new mapboxgl.default.Marker(el)
          .setLngLat([racer.lng, racer.lat])
          .setPopup(
            new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px;">
                  <h4 style="margin: 0 0 4px 0; font-weight: bold;">${racer.username}</h4>
                  <p style="margin: 0; font-size: 12px;">Speed: ${racer.speed.toFixed(0)} mph</p>
                  <p style="margin: 0; font-size: 11px; color: #666;">Simulation Mode</p>
                </div>
              `)
          )
          .addTo(map);
        
        (map as any)[`marker-${racer.id}`] = marker;
      });
      
      // Add alert markers
      alerts.forEach(alert => {
        const el = document.createElement('div');
        el.className = 'simulated-alert';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        
        switch (alert.type) {
          case 'camera':
            el.style.backgroundColor = '#ff0033';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>';
            break;
          case 'police':
            el.style.backgroundColor = '#0066ff';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>';
            break;
          case 'hazard':
            el.style.backgroundColor = '#ff9900';
            el.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
            break;
        }
        
        const marker = new mapboxgl.default.Marker(el)
          .setLngLat([alert.lng, alert.lat])
          .setPopup(
            new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`
                <div style="padding: 8px;">
                  <h4 style="margin: 0 0 4px 0; font-weight: bold;">${alert.type.toUpperCase()}</h4>
                  <p style="margin: 0; font-size: 11px; color: #666;">Simulated Alert</p>
                </div>
              `)
          )
          .addTo(map);
        
        (map as any)[`marker-${alert.id}`] = marker;
      });
    };
    
    addMarkers();
    
    // Update positions periodically
    const id = setInterval(() => {
      setSimulatedRacers(prev => {
        return prev.map(racer => {
          // Update position based on heading and speed
          const speedKmh = racer.speed * 1.60934;
          const distance = (speedKmh / 3600) * 2; // 2 seconds of movement
          const headingRad = racer.heading * Math.PI / 180;
          
          const newLat = racer.lat + (distance / 111) * Math.cos(headingRad);
          const newLng = racer.lng + (distance / (111 * Math.cos(racer.lat * Math.PI / 180))) * Math.sin(headingRad);
          
          // Update heading randomly
          const newHeading = (racer.heading + (Math.random() - 0.5) * 20 + 360) % 360;
          
          // Update speed randomly
          const newSpeed = Math.max(60, Math.min(140, racer.speed + (Math.random() - 0.5) * 10));
          
          // Update marker position
          const marker = (map as any)[`marker-${racer.id}`];
          if (marker) {
            marker.setLngLat([newLng, newLat]);
          }
          
          return {
            ...racer,
            lat: newLat,
            lng: newLng,
            heading: newHeading,
            speed: newSpeed
          };
        });
      });
    }, 2000);
    
    setIntervalId(id);
    
    return () => {
      if (id) {
        clearInterval(id);
      }
    };
  }, [map, isActive]);
  
  return (
    <div className="absolute top-20 right-6 z-20">
      <Button
        onClick={onToggle}
        className={`${
          isActive 
            ? 'bg-racing-yellow/20 hover:bg-racing-yellow/30 text-racing-yellow border-racing-yellow/50' 
            : 'bg-black/70 hover:bg-black/80 text-white/70 hover:text-white'
        } backdrop-blur-sm border`}
      >
        <Zap className="w-4 h-4 mr-2" />
        Simulation Mode
      </Button>
      
      {isActive && (
        <div className="mt-2 bg-black/80 backdrop-blur-sm rounded-lg p-3">
          <h4 className="text-white text-sm font-medium mb-2">Active Simulation</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-3 h-3" />
              <span>{simulatedRacers.length} simulated racers</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <AlertTriangle className="w-3 h-3" />
              <span>{simulatedAlerts.length} fake alerts</span>
            </div>
          </div>
          <p className="text-xs text-racing-yellow mt-2">
            ⚠️ Testing mode only
          </p>
        </div>
      )}
    </div>
  );
}