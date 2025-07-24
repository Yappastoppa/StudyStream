import { MapPin, Car, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapFallbackProps {
  className?: string;
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
}

export function MapFallback({ className = "", userLocations = [], alerts = [] }: MapFallbackProps) {
  return (
    <div className={`relative ${className} bg-racing-dark border-racing-steel/30 rounded-lg`}>
      <div className="w-full h-full flex flex-col items-center justify-center p-8" style={{ minHeight: '400px' }}>
        <div className="text-center text-racing-gray mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-racing-blue to-racing-red rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">Racing Map Interface</h3>
          <p className="text-racing-gray mb-6 max-w-md">
            Map is initializing. The racing interface will show nearby racers, alerts, and track locations.
          </p>
          
          {/* Show current data while map loads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="bg-racing-charcoal rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-racing-blue" />
                <span className="text-sm font-medium text-white">Active Racers</span>
              </div>
              <p className="text-2xl font-bold text-racing-blue">{userLocations.length}</p>
            </div>
            
            <div className="bg-racing-charcoal rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-racing-red" />
                <span className="text-sm font-medium text-white">Active Alerts</span>
              </div>
              <p className="text-2xl font-bold text-racing-red">{alerts.length}</p>
            </div>
          </div>
        </div>
        
        <Button variant="outline" className="bg-racing-steel/20 border-racing-steel text-white hover:bg-racing-steel/30">
          Refresh Map
        </Button>
      </div>
    </div>
  );
}