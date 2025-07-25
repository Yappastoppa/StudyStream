import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Navigation, 
  MapPin, 
  Square,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';

interface NavigationControlsProps {
  isNavigating: boolean;
  voiceEnabled: boolean;
  onStartPlanning: () => void;
  onStopNavigation: () => void;
  onRecenter: () => void;
  onVoiceToggle: () => void;
  className?: string;
}

export function NavigationControls({
  isNavigating,
  voiceEnabled,
  onStartPlanning,
  onStopNavigation,
  onRecenter,
  onVoiceToggle,
  className = ""
}: NavigationControlsProps) {
  return (
    <div className={`fixed bottom-20 right-4 z-40 flex flex-col space-y-2 ${className}`}>
      {/* Main Navigation Control */}
      {!isNavigating ? (
        <Button
          onClick={onStartPlanning}
          className="h-14 w-14 rounded-full bg-racing-blue hover:bg-racing-blue/80 shadow-lg border border-racing-blue/50"
        >
          <Navigation className="h-6 w-6 text-white" />
        </Button>
      ) : (
        <Button
          onClick={onStopNavigation}
          className="h-14 w-14 rounded-full bg-racing-red hover:bg-racing-red/80 shadow-lg border border-racing-red/50"
        >
          <Square className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Additional Controls */}
      <div className="flex flex-col space-y-2">
        {/* Recenter Button */}
        <Button
          onClick={onRecenter}
          size="sm"
          className="h-10 w-10 rounded-full bg-black/80 hover:bg-black/90 border border-white/20"
        >
          <MapPin className="h-4 w-4 text-white" />
        </Button>

        {/* Voice Toggle (only show during navigation) */}
        {isNavigating && (
          <Button
            onClick={onVoiceToggle}
            size="sm"
            className={`h-10 w-10 rounded-full border ${
              voiceEnabled 
                ? 'bg-racing-green/80 hover:bg-racing-green border-racing-green/50' 
                : 'bg-black/80 hover:bg-black/90 border-white/20'
            }`}
          >
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4 text-white" />
            ) : (
              <VolumeX className="h-4 w-4 text-white/60" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}