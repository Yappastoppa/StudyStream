import { useEffect, useRef, useState } from 'react';

interface SimpleMapProps {
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

export function SimpleMap(props: SimpleMapProps) {
  const center = props?.center || [-74.006, 40.7128];
  const zoom = props?.zoom || 13;
  const onMapClick = props?.onMapClick;
  const userLocations = props?.userLocations || [];
  const alerts = props?.alerts || [];
  const className = props?.className || "";

  const hasMapboxToken = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

  // Show fallback interface for now
  return (
    <div className={`relative ${className} bg-racing-dark border-racing-steel/30 rounded-lg overflow-hidden`}>
      <div className="w-full h-full flex flex-col" style={{ minHeight: '400px' }}>
        {/* Map Header */}
        <div className="bg-racing-charcoal/90 border-b border-racing-steel/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Racing Map Interface</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-racing-green rounded-full animate-pulse"></div>
              <span className="text-racing-green text-sm">LIVE</span>
            </div>
          </div>
        </div>

        {/* Map Content Area */}
        <div className="flex-1 relative bg-gradient-to-br from-racing-dark via-racing-charcoal to-racing-dark">
          {/* Grid pattern overlay */}
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

          {/* Center indicator */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-racing-blue rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-racing-blue rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* User locations visualization */}
          {userLocations.map((user, index) => (
            <div
              key={user.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
              style={{
                left: `${30 + (index * 15) % 60}%`,
                top: `${40 + (index * 20) % 40}%`,
              }}
            >
              <div className={`w-3 h-3 rounded-full ${user.isCurrentUser ? 'bg-racing-red' : 'bg-racing-blue'}`}></div>
              <div className="text-xs text-white mt-1 text-center min-w-max">
                {user.username}
              </div>
            </div>
          ))}

          {/* Alerts visualization */}
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
              <div className="text-xs text-racing-yellow mt-1 text-center min-w-max">
                {alert.type}
              </div>
            </div>
          ))}

          {/* Status overlay */}
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
                  <div className="text-racing-green text-lg font-bold">{zoom}</div>
                  <div className="text-racing-gray text-xs">Zoom Level</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}