
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, AlertTriangle } from 'lucide-react';
import { useGeolocation } from '@/hooks/use-geolocation';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onPermissionGranted: () => void;
}

export function LocationPermissionModal({ isOpen, onPermissionGranted }: LocationPermissionModalProps) {
  const [error, setError] = useState<string>('');
  
  const { 
    isLoading, 
    error: geoError, 
    lat, 
    lng, 
    getCurrentPosition 
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 3000,
    watchPosition: false
  });

  // Handle successful location
  React.useEffect(() => {
    if (lat !== null && lng !== null) {
      onPermissionGranted();
    }
  }, [lat, lng, onPermissionGranted]);

  // Handle geolocation errors
  React.useEffect(() => {
    if (geoError) {
      setError(geoError);
    }
  }, [geoError]);

  const handleRequestLocation = () => {
    setError('');
    getCurrentPosition();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-black/90 border-racing-blue/50 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-racing-blue/20 rounded-full w-fit">
            <MapPin className="h-8 w-8 text-racing-blue" />
          </div>
          <CardTitle className="text-xl text-white">Location Required for Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/80 text-center">
            This navigation app needs your location to provide turn-by-turn directions. 
            Tap "Allow Location Access" and approve the permission when prompted.
          </p>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 text-sm font-medium mb-1">📱 Important:</p>
            <p className="text-yellow-300 text-xs">
              • You must tap the button below to trigger the permission prompt<br/>
              • If no prompt appears, your browser may have blocked location access<br/>
              • For best results, open this app in Safari or Chrome (not Replit preview)
            </p>
          </div>
          
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-900/30 border border-red-500/50 rounded">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
          
          <Button
            onClick={handleRequestLocation}
            disabled={isLoading}
            className="w-full bg-racing-blue hover:bg-racing-blue/80 text-white"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Getting Location...</span>
              </div>
            ) : (
              'Allow Location Access'
            )}
          </Button>
          
          <p className="text-xs text-white/60 text-center">
            Your location data is processed locally and used only for navigation purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
