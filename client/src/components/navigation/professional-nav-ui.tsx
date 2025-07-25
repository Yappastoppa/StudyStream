import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Navigation,
  MapPin,
  AlertTriangle,
  Camera,
  Car,
  Fuel,
  MessageCircle,
  Phone,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  Clock
} from 'lucide-react';

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after?: number;
  };
  name: string;
  way_name?: string;
}

interface ProfessionalNavUIProps {
  isActive: boolean;
  currentStep?: NavigationStep;
  upcomingSteps?: NavigationStep[];
  eta: string;
  remainingDistance: number;
  remainingTime: number;
  currentSpeed?: number;
  speedLimit?: number;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  onStopNavigation: () => void;
  onRecenter: () => void;
  className?: string;
}

export function ProfessionalNavUI({
  isActive,
  currentStep,
  upcomingSteps = [],
  eta,
  remainingDistance,
  remainingTime,
  currentSpeed = 0,
  speedLimit,
  voiceEnabled,
  onVoiceToggle,
  onStopNavigation,
  onRecenter,
  className = ""
}: ProfessionalNavUIProps) {
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [isSpeedingAlert, setIsSpeedingAlert] = useState(false);

  // Check for speeding
  useEffect(() => {
    if (speedLimit && currentSpeed > 0) {
      const currentSpeedKmh = currentSpeed * 3.6;
      setIsSpeedingAlert(currentSpeedKmh > speedLimit + 5); // 5 km/h tolerance
    }
  }, [currentSpeed, speedLimit]);

  if (!isActive) return null;

  // Get maneuver icon with enhanced styling
  const getManeuverIcon = (maneuver: any) => {
    const iconClass = "h-8 w-8 text-white drop-shadow-lg";
    
    switch (maneuver?.type) {
      case 'turn':
        if (maneuver.modifier === 'sharp left') return <ArrowLeft className={`${iconClass} transform -rotate-45`} />;
        if (maneuver.modifier === 'sharp right') return <ArrowRight className={`${iconClass} transform rotate-45`} />;
        return maneuver.modifier === 'left' ? 
          <ArrowLeft className={iconClass} /> : 
          <ArrowRight className={iconClass} />;
      case 'merge':
        return <ArrowUp className={`${iconClass} transform rotate-12`} />;
      case 'on-ramp':
        return <ArrowUp className={`${iconClass} transform rotate-45`} />;
      case 'off-ramp':
        return <ArrowDown className={`${iconClass} transform -rotate-45`} />;
      case 'roundabout':
      case 'rotary':
        return <RotateCcw className={iconClass} />;
      case 'fork':
        return <div className={`${iconClass} text-2xl font-bold`}>Y</div>;
      case 'continue':
      case 'straight':
        return <ArrowUp className={iconClass} />;
      case 'arrive':
        return <MapPin className={`${iconClass} text-racing-green`} />;
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  // Format distance with better precision
  const formatDistance = (meters: number): string => {
    if (meters < 100) {
      return `${Math.round(meters / 10) * 10} m`;
    } else if (meters < 1000) {
      return `${Math.round(meters / 50) * 50} m`;
    } else if (meters < 10000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters / 1000)} km`;
  };

  // Format time with context
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get instruction color based on urgency
  const getInstructionColor = (distance: number): string => {
    if (distance < 100) return 'text-red-400';
    if (distance < 500) return 'text-yellow-400';
    return 'text-white';
  };

  return (
    <div className={`fixed inset-0 pointer-events-none z-40 ${className}`}>
      {/* Main Navigation Instruction - Top Center */}
      {currentStep && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto max-w-md w-full px-4">
          <Card className="bg-gradient-to-r from-black/95 to-black/90 backdrop-blur-xl border-racing-blue/30 shadow-2xl">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Enhanced Maneuver Icon */}
                <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-racing-blue/30 to-racing-blue/10 rounded-2xl flex items-center justify-center border-2 border-racing-blue/40 shadow-lg">
                  {getManeuverIcon(currentStep.maneuver)}
                </div>
                
                {/* Instruction Details */}
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-3xl mb-1 ${getInstructionColor(currentStep.distance)}`}>
                    {formatDistance(currentStep.distance)}
                  </div>
                  <div className="text-white font-semibold text-lg leading-tight">
                    {currentStep.instruction}
                  </div>
                  {(currentStep.name || currentStep.way_name) && (
                    <div className="text-racing-blue text-sm mt-1 font-medium">
                      on {currentStep.name || currentStep.way_name}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Speed Display - Bottom Left */}
      <div className="absolute bottom-32 left-4 pointer-events-auto">
        <Card className={`backdrop-blur-xl border-2 shadow-xl transition-all duration-300 ${
          isSpeedingAlert 
            ? 'bg-red-500/20 border-red-400/60 animate-pulse' 
            : 'bg-black/80 border-white/20'
        }`}>
          <CardContent className="p-4 text-center min-w-[100px]">
            <div className={`font-bold text-3xl transition-colors ${
              isSpeedingAlert ? 'text-red-400' : 'text-white'
            }`}>
              {Math.round(currentSpeed * 3.6)}
            </div>
            <div className={`text-xs font-medium ${
              isSpeedingAlert ? 'text-red-300' : 'text-white/60'
            }`}>
              km/h
            </div>
            {speedLimit && (
              <div className="mt-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs font-bold ${
                    isSpeedingAlert 
                      ? 'border-red-400/60 text-red-400' 
                      : 'border-white/40 text-white/80'
                  }`}
                >
                  {speedLimit}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trip Summary - Bottom Center */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <Card className="bg-gradient-to-r from-black/95 to-black/90 backdrop-blur-xl border-racing-blue/30 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-racing-green font-bold text-xl">
                  {eta}
                </div>
                <div className="text-white/60 text-xs font-medium uppercase tracking-wide">
                  Arrival
                </div>
              </div>
              
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              
              <div className="text-center">
                <div className="text-white font-bold text-xl">
                  {formatTime(remainingTime)}
                </div>
                <div className="text-white/60 text-xs font-medium uppercase tracking-wide">
                  Remaining
                </div>
              </div>
              
              <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
              
              <div className="text-center">
                <div className="text-white font-bold text-xl">
                  {formatDistance(remainingDistance)}
                </div>
                <div className="text-white/60 text-xs font-medium uppercase tracking-wide">
                  Distance
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Control Panel - Top Right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="flex flex-col space-y-2">
          <Button
            onClick={onStopNavigation}
            className="bg-red-600/90 hover:bg-red-600 border border-red-500/50 backdrop-blur-md shadow-lg px-4 py-2 rounded-full font-medium"
          >
            <span className="text-white">End Route</span>
          </Button>
          
          <div className="flex space-x-2">
            <Button
              onClick={onVoiceToggle}
              variant="ghost"
              size="icon"
              className={`w-10 h-10 rounded-full backdrop-blur-md shadow-lg border ${
                voiceEnabled 
                  ? 'bg-racing-blue/20 border-racing-blue/50 text-racing-blue' 
                  : 'bg-black/80 border-white/20 text-white/60'
              }`}
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={onRecenter}
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-black/80 hover:bg-black/90 border border-white/20 backdrop-blur-md shadow-lg text-white/70 hover:text-white"
            >
              <Navigation className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upcoming Steps Preview - Right Side (Expandable) */}
      {upcomingSteps.length > 0 && (
        <div className="absolute right-4 top-32 pointer-events-auto">
          <Button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className="mb-2 bg-black/80 hover:bg-black/90 border border-white/20 backdrop-blur-md shadow-lg text-white/70 hover:text-white px-3 py-2 rounded-full text-xs"
          >
            Next {upcomingSteps.length} steps
          </Button>
          
          {showUpcoming && (
            <Card className="bg-black/95 backdrop-blur-xl border-white/20 shadow-2xl max-w-xs">
              <CardContent className="p-3">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {upcomingSteps.slice(0, 5).map((step, index) => (
                    <div key={index} className="flex items-center space-x-3 py-2">
                      <div className="w-8 h-8 bg-racing-steel/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getManeuverIcon(step.maneuver)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {step.instruction}
                        </div>
                        <div className="text-white/60 text-xs">
                          in {formatDistance(step.distance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}