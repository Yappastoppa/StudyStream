import React, { useState, useCallback } from 'react';
import { CleanRacingMap } from '@/components/ui/clean-racing-map';
import { useGeolocation } from '@/hooks/use-geolocation';

export default function MapDashboard() {
  const [driverView, setDriverView] = useState(false);
  const [center, setCenter] = useState<[number, number]>([-74.006, 40.7128]);

  const { 
    lat, 
    lng, 
    isLoading, 
    error, 
    requestPermission 
  } = useGeolocation({
    onLocationUpdate: (pos) => {
      console.log('📍 Location update received:', pos.coords.latitude, pos.coords.longitude);
      setCenter([pos.coords.longitude, pos.coords.latitude]);
    },
  });

  const startNav = useCallback(async () => {
    console.log('🔥 Starting navigation...');
    try {
      const perm = await requestPermission();
      console.log('🔥 Permission result:', perm);

      if (perm === 'granted' || (lat && lng)) {
        setDriverView(true);
        console.log('🔥 Driver view activated');
      } else {
        alert('Please enable location permission to start navigation');
      }
    } catch (err) {
      console.error('🔥 Permission request failed:', err);
      alert('Location permission failed. Please try again.');
    }
  }, [requestPermission, lat, lng]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Debug overlay */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 9999, 
        color: 'white', 
        background: 'rgba(0,0,0,0.8)', 
        padding: '5px',
        fontSize: '10px'
      }}>
        DEBUG Dashboard: driverView={driverView.toString()}, lat={lat}, lng={lng}, center=[{center[0]}, {center[1]}]
      </div>

      <CleanRacingMap 
        center={center} 
        zoom={driverView ? 15 : 12}
        className="absolute inset-0 z-0"
      />

      {!driverView && (
        <button
          onClick={startNav}
          disabled={isLoading}
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.75rem 1.5rem',
            background: isLoading ? '#666' : '#1E90FF',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            zIndex: 10
          }}
        >
          {isLoading ? 'Locating…' : 'Start Navigation'}
        </button>
      )}

      {error && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,0,0,0.8)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: 4,
            zIndex: 10
          }}
        >
          Error: {error}
        </div>
      )}
    </div>
  );
}